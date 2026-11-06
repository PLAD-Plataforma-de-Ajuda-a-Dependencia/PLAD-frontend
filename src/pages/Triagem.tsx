import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, getErrorMessage } from '../api/client'
import { exportMyData } from '../api/me'
import { FREE_TEXT_MAX_LENGTH, getQuestions, resubmitTriage, submitTriage } from '../api/triage'
import type { QuestionResponseDTO, TriageRequestDTO } from '../api/triage'
import { useSessao } from '../session/SessaoContext'

/**
 * Página de Triagem — PLAD
 *
 * Página única que muda de conteúdo conforme o usuário avança nas perguntas
 * (mesmo padrão do print do Figma: contador "Pergunta X de N", botão
 * "Anterior", pergunta em destaque, opções em formato de pílula e botão
 * "Próximo" fixo no rodapé).
 *
 * As perguntas vêm de GET /triage/questions e as respostas vão para
 * POST /triage com os `code`s das opções. Pergunta pulada não é enviada.
 *
 * Quem já enviou a triagem (`has_triage` no GET /me) entra em modo de edição: as respostas atuais vêm do bloco
 * `triage` de GET /me/export (o backend não tem GET /triage) e o envio é PUT /triage, que as substitui.
 */

// Valores respondidos por id de pergunta: códigos das opções ou [texto]
type Answers = Record<number, string[]>

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

// Topo e rodapé comuns a todos os estados da página
function TriagemLayout({ children, footer, wide }: { children: ReactNode; footer?: ReactNode; wide?: boolean }) {
    return (
        <div className="min-h-screen flex flex-col bg-white text-gray-900 font-roboto">
            {/* Topo - Nome da aplicação */}
            <header className="text-center pt-8 pb-4">
                <span className="font-outfit font-semibold text-xl text-black">PLAD</span>
            </header>

            <main className={`w-full ${wide ? 'max-w-3xl' : 'max-w-sm'} mx-auto flex-1 flex flex-col px-4`}>{children}</main>

            {/* Botões fixos no rodapé */}
            {footer && (
                <footer className="w-full bg-white shadow-[0_-8px_16px_-6px_rgba(0,0,0,0.15)] pt-5 pb-6 px-4">
                    <div className="w-full max-w-sm mx-auto">{footer}</div>
                </footer>
            )}
        </div>
    )
}

const primaryButtonClass =
    'w-full py-3.5 px-6 bg-plad hover:bg-plad-hover active:bg-plad-active text-white font-medium rounded-lg transition-colors text-base disabled:opacity-60 disabled:cursor-not-allowed'

export default function Triagem() {
    const { me, atualizarMe } = useSessao()
    // Definido na entrada da tela e não acompanha o `me`: enviar a triagem pela primeira vez muda has_triage,
    // mas não deve recarregar a tela por baixo da pessoa
    const [modoEdicao] = useState(() => me?.has_triage === true)
    const [questions, setQuestions] = useState<QuestionResponseDTO[] | null>(null)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [currentIndex, setCurrentIndex] = useState(0)
    const [answers, setAnswers] = useState<Answers>({})
    const [sending, setSending] = useState(false)
    const [error, setError] = useState<string | null>(null)
    // O POST devolveu 409: já existe triagem, e a tela oferece substituí-la via PUT
    const [alreadySubmitted, setAlreadySubmitted] = useState(false)
    // 'nenhuma' = o POST respondeu 204: nenhuma pergunta respondida, nada guardado
    const [result, setResult] = useState<'submitted' | 'resubmitted' | 'nenhuma' | null>(null)

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
    }, [modoEdicao])

    if (loadError) {
        return (
            <TriagemLayout>
                <p role="alert" className="text-sm text-red-600">{loadError}</p>
            </TriagemLayout>
        )
    }

    if (!questions) {
        return (
            <TriagemLayout>
                <p className="text-sm text-gray-500">Carregando perguntas…</p>
            </TriagemLayout>
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
            } else {
                const triagem = await submitTriage(request)
                if (triagem) {
                    atualizarMe({ has_triage: true })
                    setResult('submitted')
                } else {
                    // 204: nada foi guardado, então has_triage continua falso e dá para responder depois
                    setResult('nenhuma')
                }
            }
        } catch (err) {
            if (!resubmit && err instanceof ApiError && err.code === 'TRIAGE_ALREADY_EXISTS') {
                // O backend já tinha uma triagem que o `me` não mostrava: alinha o estado e oferece substituir
                atualizarMe({ has_triage: true })
                setAlreadySubmitted(true)
            } else {
                setError(getErrorMessage(err, 'Não foi possível enviar a triagem.'))
            }
        } finally {
            setSending(false)
        }
    }

    if (result) {
        return (
            <TriagemLayout>
                <h1 className="font-outfit text-2xl font-semibold text-black mb-4 leading-snug">
                    {result === 'submitted'
                        ? 'Triagem enviada!'
                        : result === 'resubmitted'
                          ? 'Respostas atualizadas!'
                          : 'Nenhuma resposta enviada'}
                </h1>
                <p className="text-sm text-gray-600">
                    {result === 'nenhuma'
                        ? 'Você não respondeu nenhuma pergunta, então nada foi guardado. Você pode responder quando quiser.'
                        : 'Obrigado por responder. Suas respostas foram registradas.'}
                </p>
                {result === 'nenhuma' && (
                    <button
                        type="button"
                        onClick={() => {
                            setResult(null)
                            setCurrentIndex(0)
                        }}
                        className="mt-6 text-xs text-plad hover:underline self-start font-medium"
                    >
                        Responder agora
                    </button>
                )}
                <Link to="/Calendario" className="mt-6 text-xs text-plad hover:underline self-start font-medium">
                    Prosseguir
                </Link>
            </TriagemLayout>
        )
    }

    if (alreadySubmitted) {
        return (
            <TriagemLayout
                footer={
                    <>
                        {error && (
                            <p role="alert" className="mb-3 text-sm text-red-600 text-center">
                                {error}
                            </p>
                        )}
                        <button type="button" onClick={() => send(true)} disabled={sending} className={primaryButtonClass}>
                            {sending ? 'Enviando…' : 'Substituir respostas anteriores'}
                        </button>
                    </>
                }
            >
                <h1 className="font-outfit text-2xl font-semibold text-black mb-4 leading-snug">Você já enviou sua triagem.</h1>
                <p className="text-sm text-gray-600">
                    Se quiser, substitua as respostas anteriores pelas que você acabou de preencher.
                </p>
                <Link to="/" className="mt-6 text-xs text-plad hover:underline self-start font-medium">
                    Voltar ao início
                </Link>
            </TriagemLayout>
        )
    }

    if (questions.length === 0) {
        return (
            <TriagemLayout>
                <p className="text-sm text-gray-500">Nenhuma pergunta disponível no momento.</p>
            </TriagemLayout>
        )
    }

    const question = questions[currentIndex]
    const total = questions.length
    const isLast = currentIndex === total - 1
    const isMulti = question.question_type === 'multi_choice'
    const currentValues = answers[question.id] ?? []

    const selectOption = (code: string) => {
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
        setAnswers((prev) => ({ ...prev, [question.id]: [value] }))
    }

    const goBack = () => {
        if (currentIndex > 0) setCurrentIndex((i) => i - 1)
    }

    const goNext = () => {
        if (isLast) {
            send(modoEdicao)
            return
        }
        setCurrentIndex((i) => i + 1)
    }

    const skip = () => {
        const next = { ...answers, [question.id]: [] }
        setAnswers(next)
        if (isLast) {
            // envia o valor já limpo, porque o state só atualiza no próximo render
            send(modoEdicao, next)
            return
        }
        setCurrentIndex((i) => i + 1)
    }

    return (
        <TriagemLayout
            wide
            footer={
                <>
                    {error && (
                        <p role="alert" className="mb-3 text-sm text-red-600 text-center">
                            {error}
                        </p>
                    )}
                    <button type="button" onClick={goNext} disabled={sending} className={primaryButtonClass}>
                        {isLast ? (sending ? 'Enviando…' : modoEdicao ? 'Atualizar respostas' : 'Concluir') : 'Próximo'}
                    </button>
                </>
            }
        >
            {modoEdicao && (
                <p className="text-xs text-gray-600 mt-4 text-center">
                    Suas respostas atuais estão marcadas. Altere o que quiser e atualize no final.
                </p>
            )}

            {/* Conteúdo da pergunta atual */}
            <span className="text-xs text-black mt-4 mb-3">
                Pergunta {String(currentIndex + 1).padStart(2, '0')} de {String(total).padStart(2, '0')}
            </span>

            {/* "Anterior" fica à esquerda da pergunta no desktop e acima dela no mobile */}
            <div className="flex flex-col items-start gap-3 mb-8 sm:block sm:relative">
                <button
                    type="button"
                    onClick={goBack}
                    disabled={currentIndex === 0 || sending}
                    className="flex items-center gap-1.5 text-sm text-black hover:text-gray-600 disabled:opacity-0 disabled:pointer-events-none transition sm:absolute sm:left-0 xl:-left-40 sm:top-1/2 sm:-translate-y-1/2"
                >
                    <span aria-hidden>←</span> Anterior
                </button>
                <h1 className="font-outfit text-2xl sm:text-3xl font-semibold text-black text-center leading-snug w-full sm:px-24">
                    {question.question_text}
                </h1>
            </div>

            <div className="w-full max-w-sm mx-auto flex flex-col">
            {question.question_type !== 'free_text' && (
                <div className="space-y-3">
                    {question.options.map((option) => {
                        const selected = currentValues.includes(option.code)
                        return (
                            <button
                                key={option.code}
                                type="button"
                                aria-pressed={selected}
                                onClick={() => selectOption(option.code)}
                                className={`w-full flex items-center gap-3 text-left px-4 py-2.5 rounded-full transition focus-visible:outline-2 focus-visible:outline-plad ${
                                    selected ? 'bg-[#ebebeb]' : 'bg-[#ebebeb] hover:bg-[#e0e0e0]'
                                }`}
                            >
                                {/* Quadrado na múltipla escolha, círculo na escolha única */}
                                <span
                                    className={`flex items-center justify-center w-4 h-4 border shrink-0 ${
                                        isMulti ? 'rounded-sm' : 'rounded-full'
                                    } ${selected ? 'bg-plad border-plad' : 'bg-white border-gray-400'}`}
                                >
                                    {selected && (
                                        <svg viewBox="0 0 16 16" className="w-2.5 h-2.5 fill-white">
                                            <path d="M6.2 10.6 3.6 8l-1 1 3.6 3.6 7-7-1-1z" />
                                        </svg>
                                    )}
                                </span>
                                <span className="text-sm text-gray-700">{option.label}</span>
                            </button>
                        )
                    })}
                </div>
            )}

            {isMulti && <p className="text-xs text-gray-500 mt-3">Você pode marcar mais de uma opção.</p>}

            {question.question_type === 'free_text' && (
                <>
                    <textarea
                        value={currentValues[0] ?? ''}
                        onChange={(e) => setTextValue(e.target.value)}
                        placeholder="Campo opcional — escreva à vontade"
                        rows={5}
                        maxLength={FREE_TEXT_MAX_LENGTH}
                        className="w-full px-4 py-3 border border-plad/60 rounded-sm text-sm text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-plad transition bg-white resize-none"
                    />
                    <p className="text-xs text-gray-500 mt-3">Esta pergunta é opcional.</p>
                </>
            )}

            <button
                type="button"
                onClick={skip}
                disabled={sending}
                className="mt-4 text-xs text-plad hover:underline self-start font-medium"
            >
                Pular esta pergunta
            </button>
            </div>
        </TriagemLayout>
    )
}
