import { useEffect, useId, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { ArrowLeft, CircleCheck } from 'lucide-react'
import { ApiError, getErrorMessage } from '../api/client'
import { exportMyData } from '../api/me'
import { FREE_TEXT_MAX_LENGTH, getQuestions, resubmitTriage, submitTriage } from '../api/triage'
import type { QuestionResponseDTO, TriageRequestDTO } from '../api/triage'
import Botao from '../components/Botao'
import Carregando from '../components/Carregando'
import EstadoErro from '../components/EstadoErro'
import LayoutPagina from '../components/LayoutPagina'
import ModalConfirmacao from '../components/ModalConfirmacao'
import { useToast } from '../components/ToastContext'
import { classeBotao } from '../components/estilos'
import useContagem from '../components/useContagem'
import { useSessao } from '../session/SessaoContext'

/**
 * Página de Triagem — PLAD
 *
 * Uma pergunta por vez (Figma: "Pergunta X de N", "Anterior", pergunta em destaque, opções em pílula e o botão
 * "Próximo" fixo no rodapé). Cada pergunta tem a própria entrada no histórico (`?passo=N`): os botões Voltar e
 * Avançar do navegador andam entre as perguntas sem desmontar a página, então as respostas não se perdem.
 *
 * As respostas ficam SÓ EM MEMÓRIA (state deste componente), nunca em localStorage, sessionStorage nem na URL: são
 * dado de saúde e o computador pode ser compartilhado. Recarregar ou sair da página as descarta (o navegador avisa
 * antes, se houver algo respondido), e elas também são apagadas da memória assim que o envio dá certo.
 *
 * As perguntas vêm de GET /triage/questions e as respostas vão para POST /triage com os `code`s das opções.
 * Pergunta pulada não é enviada.
 *
 * Quem já enviou a triagem (`has_triage` no GET /me) entra em modo de edição: as respostas atuais vêm do bloco
 * `triage` de GET /me/export (o backend não tem GET /triage) e o envio é PUT /triage, que as substitui.
 */

// Valores respondidos por id de pergunta: códigos das opções ou [texto]
type Answers = Record<number, string[]>

// O backend conta o texto livre em code points (um emoji vale 1), e não em unidades UTF-16 como o maxLength do HTML
const contarCaracteres = (texto: string) => Array.from(texto).length
const limitarTexto = (texto: string) =>
    contarCaracteres(texto) > FREE_TEXT_MAX_LENGTH ? Array.from(texto).slice(0, FREE_TEXT_MAX_LENGTH).join('') : texto

function buildRequest(questions: QuestionResponseDTO[], answers: Answers): TriageRequestDTO {
    return {
        answers: questions
            .map((q) => {
                const values = answers[q.id] ?? []
                return {
                    question_id: q.id,
                    values: q.question_type === 'free_text' ? values.map((v) => v.trim()).filter((v) => v !== '') : values,
                }
            })
            .filter((answer) => answer.values.length > 0),
    }
}

// O título acompanha o tamanho do texto: pergunta curta fica grande como no Figma, pergunta longa diminui para não
// virar um bloco de quatro linhas
function classeTitulo(texto: string): string {
    if (texto.length <= 40) return 'text-2xl sm:text-[34px]'
    if (texto.length <= 80) return 'text-xl sm:text-[28px]'
    return 'text-lg sm:text-2xl'
}

// O passo anterior foi aberto por "Próximo" dentro da triagem (e não por um endereço digitado ou recarregado)
function veioDaTriagem(state: unknown): boolean {
    return typeof state === 'object' && state !== null && 'interno' in state && state.interno === true
}

export default function Triagem() {
    const { me, atualizarMe } = useSessao()
    const { avisar } = useToast()
    const navigate = useNavigate()
    const location = useLocation()
    const [searchParams, setSearchParams] = useSearchParams()
    // Definido na entrada da tela e não acompanha o `me`: enviar a triagem pela primeira vez muda has_triage,
    // mas não deve recarregar a tela por baixo da pessoa
    const [modoEdicao] = useState(() => me?.has_triage === true)
    const [questions, setQuestions] = useState<QuestionResponseDTO[] | null>(null)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [tentativa, setTentativa] = useState(0)
    const [answers, setAnswers] = useState<Answers>({})
    // Mexeu em alguma resposta: daí em diante o navegador avisa antes de recarregar ou fechar a aba
    const [alterou, setAlterou] = useState(false)
    const [sending, setSending] = useState(false)
    const [error, setError] = useState<string | null>(null)
    // O POST devolveu 409: já existe triagem, e a tela oferece substituí-la via PUT
    const [alreadySubmitted, setAlreadySubmitted] = useState(false)
    const [confirmandoSubstituir, setConfirmandoSubstituir] = useState(false)
    // 'nenhuma' = o POST respondeu 204: nenhuma pergunta respondida, nada guardado
    const [result, setResult] = useState<'submitted' | 'resubmitted' | 'nenhuma' | null>(null)
    const tituloRef = useRef<HTMLHeadingElement>(null)
    const idTitulo = useId()
    // Depois de enviar (ou atualizar), a tela leva sozinha ao painel em 5 segundos; o botão continua valendo
    const [redirecionar, setRedirecionar] = useState(false)
    const { restante, iniciar } = useContagem()

    useEffect(() => {
        // Sem sessão, a RotaProtegida já mandou para o login
        let ignore = false
        const carregar = async () => {
            const perguntas = await getQuestions()
            const atuais: Answers = {}
            if (modoEdicao) {
                // As respostas guardadas casam com as perguntas pelo código, que não muda entre ambientes
                const exportado = await exportMyData()
                for (const resposta of exportado.triage?.answers ?? []) {
                    const pergunta = perguntas.find((q) => q.code === resposta.question_code)
                    if (pergunta) atuais[pergunta.id] = resposta.values
                }
            }
            if (!ignore) {
                setQuestions(perguntas)
                setAnswers(atuais)
            }
        }
        carregar().catch((err: unknown) => {
            if (!ignore) setLoadError(getErrorMessage(err, 'Não foi possível carregar as perguntas.'))
        })
        return () => {
            ignore = true
        }
    }, [modoEdicao, tentativa])

    // O passo vem da URL. Ausente ou fora de 1..N, é corrigido com `replace`, sem abrir uma entrada no histórico
    const total = questions?.length ?? 0
    const passoBruto = Number(searchParams.get('passo'))
    const passoValido = Number.isInteger(passoBruto) && passoBruto >= 1 && passoBruto <= total
    const passo = passoValido ? passoBruto : Math.min(Math.max(Number.isInteger(passoBruto) ? passoBruto : 1, 1), Math.max(total, 1))

    useEffect(() => {
        if (total === 0 || result || alreadySubmitted) return
        if (!passoValido) setSearchParams({ passo: String(passo) }, { replace: true })
    }, [total, passoValido, passo, result, alreadySubmitted, setSearchParams])

    // A cada pergunta o foco vai para o título: quem usa leitor de tela ouve a pergunta nova
    useEffect(() => {
        if (questions) tituloRef.current?.focus()
    }, [passo, questions])

    useEffect(() => {
        if (redirecionar && restante === 0) navigate('/Calendario', { replace: true })
    }, [redirecionar, restante, navigate])

    // Respostas só na memória: se a aba for recarregada ou fechada, o navegador pergunta antes
    useEffect(() => {
        if (!alterou || result) return
        const avisarAntes = (e: BeforeUnloadEvent) => e.preventDefault()
        window.addEventListener('beforeunload', avisarAntes)
        return () => window.removeEventListener('beforeunload', avisarAntes)
    }, [alterou, result])

    if (loadError) {
        return (
            <LayoutPagina titulo="Triagem" centralizar>
                <EstadoErro
                    titulo="Não conseguimos carregar as perguntas"
                    mensagem={loadError}
                    onTentarNovamente={() => {
                        setLoadError(null)
                        setTentativa((n) => n + 1)
                    }}
                    acao={
                        <Link to="/" className={classeBotao('texto')}>
                            Voltar ao início
                        </Link>
                    }
                />
            </LayoutPagina>
        )
    }

    if (!questions) {
        return (
            <LayoutPagina titulo="Triagem" centralizar>
                <Carregando mensagem="Carregando as perguntas…" />
            </LayoutPagina>
        )
    }

    const send = async (resubmit: boolean, currentAnswers: Answers = answers) => {
        if (sending) return
        const request = buildRequest(questions, currentAnswers)
        // PUT sem respostas é 400 INVALID_TRIAGE e o POST sem respostas não guarda nada: nos dois casos
        // a pessoa só está enviando uma triagem vazia
        if (resubmit && request.answers.length === 0) {
            setError('Responda pelo menos uma pergunta para atualizar a triagem.')
            return
        }
        setSending(true)
        setError(null)
        try {
            if (resubmit) {
                await resubmitTriage(request)
                setResult('resubmitted')
                avisar('Respostas atualizadas.')
                setRedirecionar(true)
                iniciar(5)
            } else {
                const triagem = await submitTriage(request)
                if (triagem) {
                    atualizarMe({ has_triage: true })
                    setResult('submitted')
                    avisar('Triagem enviada. Obrigado por responder!')
                    setRedirecionar(true)
                    iniciar(5)
                } else {
                    // 204: nada foi guardado, então has_triage continua falso e dá para responder depois
                    setResult('nenhuma')
                }
            }
            // Dado de saúde: depois de enviado, não fica na memória da página
            setAnswers({})
            setAlterou(false)
            setConfirmandoSubstituir(false)
        } catch (err) {
            if (!resubmit && err instanceof ApiError && err.code === 'TRIAGE_ALREADY_EXISTS') {
                // O backend já tinha uma triagem que o `me` não mostrava: alinha o estado e oferece substituir
                atualizarMe({ has_triage: true })
                setAlreadySubmitted(true)
            } else {
                setError(getErrorMessage(err, 'Não foi possível enviar a triagem.'))
                setConfirmandoSubstituir(false)
            }
        } finally {
            setSending(false)
        }
    }

    if (result) {
        const titulo =
            result === 'submitted' ? 'Triagem enviada!' : result === 'resubmitted' ? 'Respostas atualizadas!' : 'Nenhuma resposta enviada'
        const texto =
            result === 'nenhuma'
                ? 'Você não respondeu nenhuma pergunta, então nada foi guardado. Você pode responder quando quiser.'
                : 'Obrigado por responder. Suas respostas foram registradas.'
        return (
            <LayoutPagina
                titulo={titulo}
                centralizar
                acoes={
                    <>
                        <Link to="/Calendario" className={classeBotao('primario', true)}>
                            Ir para o meu painel
                        </Link>
                        {result === 'nenhuma' && (
                            <Botao
                                variante="secundario"
                                bloco
                                onClick={() => {
                                    setResult(null)
                                    navigate({ search: '?passo=1' }, { replace: true })
                                }}
                            >
                                Responder agora
                            </Botao>
                        )}
                    </>
                }
            >
                <div className="flex flex-col items-center gap-3 text-center">
                    <span className="flex size-14 items-center justify-center rounded-full bg-sucesso-fundo text-sucesso" aria-hidden="true">
                        <CircleCheck size={28} />
                    </span>
                    <h1 ref={tituloRef} tabIndex={-1} className="font-outfit text-2xl font-semibold text-black focus:outline-none">
                        {titulo}
                    </h1>
                    <p className="max-w-sm text-sm text-texto-suave">{texto}</p>
                    {redirecionar && (
                        <p className="text-sm text-texto-suave">
                            Você será levado ao painel em {restante} {restante === 1 ? 'segundo' : 'segundos'}.
                        </p>
                    )}
                </div>
            </LayoutPagina>
        )
    }

    if (alreadySubmitted) {
        return (
            <LayoutPagina
                titulo="Triagem já enviada"
                centralizar
                acoes={
                    <>
                        {error && (
                            <p role="alert" className="text-center text-sm text-erro">
                                {error}
                            </p>
                        )}
                        <Botao bloco onClick={() => setConfirmandoSubstituir(true)}>
                            Substituir respostas anteriores
                        </Botao>
                        <Link to="/" className={classeBotao('texto', true)}>
                            Voltar ao início
                        </Link>
                        <ModalConfirmacao
                            aberto={confirmandoSubstituir}
                            titulo="Substituir as respostas anteriores?"
                            descricao="As respostas que você enviou antes serão trocadas por estas, que você acabou de preencher."
                            rotuloConfirmar="Substituir"
                            carregando={sending}
                            onConfirmar={() => void send(true)}
                            onCancelar={() => setConfirmandoSubstituir(false)}
                        />
                    </>
                }
            >
                <div className="text-center">
                    <h1 ref={tituloRef} tabIndex={-1} className="mb-4 font-outfit text-2xl font-semibold leading-snug text-black focus:outline-none">
                        Você já enviou sua triagem.
                    </h1>
                    <p className="text-sm text-texto-suave">
                        Se quiser, substitua as respostas anteriores pelas que você acabou de preencher.
                    </p>
                </div>
            </LayoutPagina>
        )
    }

    if (questions.length === 0) {
        return (
            <LayoutPagina titulo="Triagem" centralizar>
                <EstadoErro
                    titulo="Ainda não há perguntas"
                    mensagem="Nenhuma pergunta está disponível no momento. Tente de novo mais tarde."
                    onTentarNovamente={() => {
                        setQuestions(null)
                        setTentativa((n) => n + 1)
                    }}
                />
            </LayoutPagina>
        )
    }

    const question = questions[passo - 1]
    const isLast = passo === total
    const isMulti = question.question_type === 'multi_choice'
    const currentValues = answers[question.id] ?? []
    const textoLivre = currentValues[0] ?? ''

    const selectOption = (code: string) => {
        setAlterou(true)
        setAnswers((prev) => {
            if (!isMulti) return { ...prev, [question.id]: [code] }
            const values = prev[question.id] ?? []
            return {
                ...prev,
                [question.id]: values.includes(code) ? values.filter((v) => v !== code) : [...values, code],
            }
        })
    }

    const setTextValue = (value: string) => {
        setAlterou(true)
        setAnswers((prev) => ({ ...prev, [question.id]: [limitarTexto(value)] }))
    }

    // Cada "Próximo" abre uma entrada no histórico, marcada como interna: o Voltar do navegador (ou o botão
    // "Anterior") volta uma pergunta e o Avançar, para a seguinte
    const irPara = (n: number) => navigate({ search: `?passo=${n}` }, { state: { interno: true } })

    const goBack = () => {
        if (passo <= 1) return
        if (veioDaTriagem(location.state)) navigate(-1)
        else setSearchParams({ passo: String(passo - 1) }, { replace: true })
    }

    const goNext = () => {
        if (isLast) {
            void send(modoEdicao)
            return
        }
        irPara(passo + 1)
    }

    const skip = () => {
        setAlterou(true)
        const next = { ...answers, [question.id]: [] }
        setAnswers(next)
        if (isLast) {
            // envia o valor já limpo, porque o state só atualiza no próximo render
            void send(modoEdicao, next)
            return
        }
        irPara(passo + 1)
    }

    const ehTextoLivre = question.question_type === 'free_text'
    // Medidas do Figma (frames 1440): pílulas de 347 px, caixa de texto de 375 px, texto alinhado ao grid de 884 px
    const larguraColuna = ehTextoLivre ? 'max-w-[375px]' : 'max-w-[347px]'

    return (
        <LayoutPagina
            titulo={`Triagem, pergunta ${passo} de ${total}`}
            largura="larga"
            acoes={
                <>
                    {error && (
                        <p role="alert" className="text-center text-sm text-erro">
                            {error}
                        </p>
                    )}
                    <Botao bloco carregando={sending} onClick={goNext}>
                        {isLast ? (sending ? 'Enviando…' : modoEdicao ? 'Atualizar respostas' : 'Concluir') : 'Próximo'}
                    </Botao>
                </>
            }
        >
            {modoEdicao && (
                <p className="mx-auto mt-2 w-full max-w-[375px] rounded-md bg-plad-fundo px-3.5 py-2.5 text-center text-sm text-plad-rodape">
                    Suas respostas atuais estão marcadas. Altere o que quiser e atualize no final.
                </p>
            )}

            {/* Grid do Figma: o contador fica à esquerda da coluna de 884 px, o título no centro e o "Anterior" no
                vão da esquerda (a partir de xl); nas telas menores o "Anterior" fica entre o contador e o título */}
            <div className="relative mx-auto mt-6 w-full max-w-[884px] sm:mt-10">
                <p className="text-base text-black">
                    Pergunta {String(passo).padStart(2, '0')} de {String(total).padStart(2, '0')}
                </p>

                {/* O "Anterior" acompanha o título: no vão da esquerda, na altura dele, a partir de xl; acima dele nas telas menores */}
                <div className="relative mt-1">
                    <button
                        type="button"
                        onClick={goBack}
                        disabled={sending}
                        aria-hidden={passo <= 1 || undefined}
                        tabIndex={passo <= 1 ? -1 : undefined}
                        className={`-ml-2 inline-flex min-h-11 items-center gap-2 rounded-botao px-2 text-base text-black hover:text-gray-600 disabled:opacity-60 xl:absolute xl:-left-[168px] xl:top-1/2 xl:ml-0 xl:-translate-y-1/2 ${
                            passo <= 1 ? 'invisible' : ''
                        }`}
                    >
                        <ArrowLeft size={24} aria-hidden="true" /> Anterior
                    </button>

                    <h1
                        id={idTitulo}
                        ref={tituloRef}
                        tabIndex={-1}
                        className={`mx-auto mb-10 max-w-[778px] text-balance text-center font-outfit font-semibold leading-snug text-black focus:outline-none sm:mb-12 ${classeTitulo(question.question_text)}`}
                    >
                        {question.question_text}
                    </h1>
                </div>
            </div>
            <div className={`mx-auto flex w-full flex-col ${larguraColuna}`}>
                {!ehTextoLivre && (
                    <div role="group" aria-labelledby={idTitulo} className="space-y-2">
                        {question.options.map((option) => {
                            const selected = currentValues.includes(option.code)
                            return (
                                <button
                                    key={option.code}
                                    type="button"
                                    aria-pressed={selected}
                                    onClick={() => selectOption(option.code)}
                                    className={`flex min-h-11 w-full items-center gap-3 rounded-full px-4 py-2 text-left transition ${
                                        selected ? 'bg-plad-fundo ring-2 ring-plad' : 'bg-opcao hover:bg-opcao-hover'
                                    }`}
                                >
                                    {/* Quadrado na múltipla escolha, círculo na escolha única */}
                                    <span
                                        aria-hidden="true"
                                        className={`flex size-5 shrink-0 items-center justify-center border ${
                                            isMulti ? 'rounded-sm' : 'rounded-full'
                                        } ${selected ? 'border-plad bg-plad' : 'border-gray-500 bg-white'}`}
                                    >
                                        {selected && (
                                            <svg viewBox="0 0 16 16" className="size-3 fill-white">
                                                <path d="M6.2 10.6 3.6 8l-1 1 3.6 3.6 7-7-1-1z" />
                                            </svg>
                                        )}
                                    </span>
                                    <span className="text-sm leading-snug text-gray-800">{option.label}</span>
                                </button>
                            )
                        })}
                    </div>
                )}

                {isMulti && <p className="mt-3 text-sm text-texto-suave">Você pode marcar mais de uma opção.</p>}

                {ehTextoLivre && (
                    <>
                        <textarea
                            aria-labelledby={idTitulo}
                            value={textoLivre}
                            onChange={(e) => setTextValue(e.target.value)}
                            placeholder="Tente descrever algo que você sentiu."
                            className="h-[140px] w-full resize-none rounded-campo border border-plad bg-white px-4 py-3 text-sm text-gray-900 placeholder:text-texto-suave focus:outline-2 focus:outline-plad"
                        />
                        <p className="mt-2 flex justify-between gap-4 text-sm text-texto-suave">
                            <span>Esta pergunta é opcional.</span>
                            <span>
                                {contarCaracteres(textoLivre)}/{FREE_TEXT_MAX_LENGTH}
                            </span>
                        </p>
                    </>
                )}

                <Botao variante="texto" onClick={skip} disabled={sending} className="-ml-3 mt-3 self-start">
                    Pular esta pergunta
                </Botao>
            </div>
        </LayoutPagina>
    )
}