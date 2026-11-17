import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
    addDays,
    addMonths,
    eachDayOfInterval,
    endOfMonth,
    endOfWeek,
    format,
    isSameDay,
    isSameMonth,
    isToday,
    parseISO,
    startOfMonth,
    startOfWeek,
    subMonths,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
    CalendarDays,
    ChevronLeft,
    ChevronRight,
    ClipboardList,
    Clock,
    DoorOpen,
    Hexagon,
    HandCoins,
    Plus,
    UserPlus,
} from 'lucide-react'

import { ApiError } from '../api/client'
import {
    aberturaDaSala,
    aceitaInscricao,
    getMeeting,
    listMeetings,
    podeEntrar,
    seloDaReuniao,
    textoDeVagas,
    vagasRestantes,
} from '../api/meetings'
import type { MeetingResponseDTO } from '../api/meetings'
import ApelidoDestaque from '../components/ApelidoDestaque'
import Botao from '../components/Botao'
import Card from '../components/Card'
import Carregando from '../components/Carregando'
import EstadoErro from '../components/EstadoErro'
import EstadoVazio from '../components/EstadoVazio'
import FormularioReuniao from '../components/FormularioReuniao'
import LayoutPainel from '../components/LayoutPainel'
import TermoDeParticipacao from '../components/TermoDeParticipacao'
import { useToast } from '../components/ToastContext'
import useAgora from '../components/useAgora'
import useInscricao from '../components/useInscricao'
import { classeBotao } from '../components/estilos'
import { formatarHorario } from '../components/formatar'
import { useSessao } from '../session/SessaoContext'

/**
 * Dados dos contadores do topo. Por enquanto têm valores de teste;
 * depois vêm do backend e são passados via props.
 */
export interface Contadores {
    diasSobriedade: number
    valorEconomizado: number // em reais
    proximoMarco: {
        semanas: number
        dias: number
        outrosUsuarios: number // quantas pessoas alcançarão o mesmo marco
    }
}

const CONTADORES_TESTE: Contadores = {
    diasSobriedade: 27,
    valorEconomizado: 180,
    proximoMarco: { semanas: 4, dias: 28, outrosUsuarios: 4956 },
}

interface CalendarioProps {
    contadores?: Contadores
    onDiaClick?: (data: Date, reunioesDoDia: MeetingResponseDTO[]) => void
}

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

// O intervalo buscado é medido no dia de São Paulo (decisão do time), mesmo que o navegador esteja em outro fuso
const FUSO_DO_INTERVALO = 'America/Sao_Paulo'

/**
 * Instante (ISO-8601, UTC) da meia-noite de um dia "yyyy-MM-dd" em São Paulo. O deslocamento é lido do fuso para esse
 * dia, em vez de fixar -03:00, para continuar certo se o horário de verão voltar.
 */
function inicioDoDiaEmSaoPaulo(dia: string): string {
    const nome =
        new Intl.DateTimeFormat('en-US', { timeZone: FUSO_DO_INTERVALO, timeZoneName: 'longOffset' })
            .formatToParts(new Date(`${dia}T12:00:00Z`))
            .find((parte) => parte.type === 'timeZoneName')?.value ?? 'GMT-03:00'
    const deslocamento = nome === 'GMT' ? '+00:00' : nome.replace('GMT', '')
    return new Date(`${dia}T00:00:00${deslocamento}`).toISOString()
}

function capitalizar(texto: string) {
    return texto.charAt(0).toUpperCase() + texto.slice(1)
}

/**
 * O painel (dependente e psicólogo): os contadores, o calendário de reuniões do mês e, para o psicólogo, "Criar reunião".
 * Cada dia com reunião abre um popup curto (`PopupReuniao`); o que se faz com a reunião (editar, cancelar, encerrar,
 * cancelar a inscrição, ver os inscritos) fica no detalhe, em /minhas-reunioes/:id.
 */
export default function Calendario({ contadores = CONTADORES_TESTE, onDiaClick }: CalendarioProps) {
    const [mesAtual, setMesAtual] = useState(() => new Date())
    const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null)
    // Resultado da última busca e para qual intervalo ele vale (`chave`): enquanto a chave atual não tem resultado,
    // a tela está carregando. Assim o efeito só grava estado quando a resposta chega, nunca de forma síncrona
    const [carga, setCarga] = useState<{ chave: string; reunioes: MeetingResponseDTO[]; erro: string | null } | null>(null)
    // Muda para pedir a busca de novo ("Tentar de novo")
    const [versaoCarga, setVersaoCarga] = useState(0)

    // Monta a grade de dias do mês (incluindo as pontas da semana anterior/seguinte,
    // que ficam em branco) sempre em cima do mês atual — isso é o que faz o
    // calendário responder à data real, e não a números fixos.
    const dias = useMemo(() => {
        const inicioMes = startOfMonth(mesAtual)
        const fimMes = endOfMonth(mesAtual)
        const inicioGrade = startOfWeek(inicioMes)
        const fimGrade = endOfWeek(fimMes)
        return eachDayOfInterval({ start: inicioGrade, end: fimGrade })
    }, [mesAtual])

    // Do primeiro ao último dia da grade (no máximo 42 dias, abaixo do teto de 62 do backend)
    const primeiroDia = format(dias[0], 'yyyy-MM-dd')
    const ultimoDia = format(dias[dias.length - 1], 'yyyy-MM-dd')

    const recarregar = useCallback(() => setVersaoCarga((v) => v + 1), [])

    const chaveCarga = `${primeiroDia}|${ultimoDia}|${versaoCarga}`
    const cargaAtual = carga?.chave === chaveCarga ? carga : null
    const carregando = cargaAtual === null
    const erroCarga = cargaAtual?.erro ?? null
    const reunioes = useMemo(() => cargaAtual?.reunioes ?? [], [cargaAtual])

    useEffect(() => {
        // Se a pessoa trocar de mês antes da resposta chegar, a resposta velha é descartada
        let obsoleta = false
        const depoisDoUltimoDia = format(addDays(parseISO(ultimoDia), 1), 'yyyy-MM-dd')
        listMeetings(inicioDoDiaEmSaoPaulo(primeiroDia), inicioDoDiaEmSaoPaulo(depoisDoUltimoDia))
            .then((lista) => {
                if (!obsoleta) setCarga({ chave: chaveCarga, reunioes: lista, erro: null })
            })
            .catch((erro: unknown) => {
                if (obsoleta) return
                const mensagem = erro instanceof ApiError ? erro.message : 'Algo deu errado. Tente novamente em instantes.'
                setCarga({ chave: chaveCarga, reunioes: [], erro: mensagem })
            })
        return () => {
            obsoleta = true
        }
    }, [chaveCarga, primeiroDia, ultimoDia])

    const semanas = useMemo(() => {
        const linhas: Date[][] = []
        for (let i = 0; i < dias.length; i += 7) {
            linhas.push(dias.slice(i, i + 7))
        }
        return linhas
    }, [dias])

    // O dia de uma reunião é o do início, no fuso do navegador (o backend manda instantes em UTC)
    function reunioesDoDia(dia: Date) {
        return reunioes.filter((m) => isSameDay(parseISO(m.starts_at), dia))
    }

    // O backend é quem garante o acesso (403 para quem não é psicólogo); aqui é só para não mostrar botões inúteis
    const { me } = useSessao()
    const navigate = useNavigate()
    const { avisar } = useToast()
    const ehPsicologo = me?.type_user === 'psicologo'
    const ehDependente = me?.type_user === 'dependente'

    function handleClickDia(dia: Date) {
        const doDia = reunioesDoDia(dia)
        const chave = format(dia, 'yyyy-MM-dd')

        // Só um dia com reunião abre o popup (criar reunião é o botão "Criar reunião", no topo)
        if (doDia.length === 0) {
            setDiaSelecionado(null)
            return
        }

        setDiaSelecionado((atual) => (atual === chave ? null : chave))
        onDiaClick?.(dia, doDia)
    }

    // Criar reunião (psicólogo): ao salvar, a pessoa vai para o detalhe da reunião nova
    const [criando, setCriando] = useState(false)

    function aoCriar(reuniao: MeetingResponseDTO) {
        setCriando(false)
        avisar('Reunião criada.', 'sucesso')
        navigate(`/minhas-reunioes/${reuniao.id}`)
    }

    // Inscrição (dependente): o popup troca de estado com a reunião que a API devolve, sem buscar o mês inteiro de novo
    function substituirReuniao(atualizada: MeetingResponseDTO) {
        setCarga((atual) => atual && { ...atual, reunioes: atual.reunioes.map((m) => (m.id === atualizada.id ? atualizada : m)) })
    }

    // Depois de um erro (reunião lotada, começou, cancelada) a tela pode estar velha: lê só essa reunião, em silêncio
    async function atualizarReuniao(id: number) {
        try {
            substituirReuniao(await getMeeting(id))
        } catch {
            // fica como está; o mês é buscado de novo ao trocar de mês ou ao pedir "Tentar de novo"
        }
    }

    const inscricao = useInscricao({
        origem: '/Calendario',
        aoInscrever: substituirReuniao,
        aoFalhar: (id) => void atualizarReuniao(id),
    })

    return (
        // A barra lateral (com o menu da conta) e o rodapé vêm do LayoutPainel; por enquanto o Painel é esta página
        <LayoutPainel titulo="Painel">
            {/* Conteúdo principal */}
            <main id="conteudo" tabIndex={-1} className="min-w-0 flex-1 px-3 py-6 focus:outline-none sm:px-4 md:px-10 md:py-10">
                <ApelidoDestaque />

                {/* A triagem é opcional (o backend não a exige para a inscrição, decisão 24): um convite, nunca um desvio */}
                {me?.type_user === 'dependente' && me.has_triage === false && <CartaoTriagem idUsuario={me.id} />}

                {/* Contadores: 1 coluna no celular, 2 de 640 px (o terceiro ocupa a linha) e 3 a partir de 1024 px */}
                <section aria-label="Contadores" className="mb-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    <CardContador
                        titulo="Contador de sobriedade"
                        subtitulo="Livre de álcool há:"
                        emblema={<Clock size={20} aria-hidden="true" />}
                    >
                        <span className="font-outfit text-[16cqw] font-bold leading-none text-black">
                            {contadores.diasSobriedade} {contadores.diasSobriedade === 1 ? 'dia' : 'dias'}
                        </span>
                    </CardContador>

                    <CardContador
                        titulo="Contador de economia"
                        subtitulo="Economizados:"
                        emblema={<HandCoins size={20} aria-hidden="true" />}
                    >
                        <span className="font-outfit text-[16cqw] font-bold leading-none text-black">
                            R${contadores.valorEconomizado.toLocaleString('pt-BR')}
                        </span>
                        <span className="mt-2 text-xs font-bold text-black">REAIS</span>
                    </CardContador>

                    <CardContador
                        titulo="Próximo marco"
                        subtitulo={
                            <>
                                <strong className="text-black">
                                    Você e {contadores.proximoMarco.outrosUsuarios.toLocaleString('pt-BR')} outros
                                </strong>{' '}
                                alcançarão este marco a seguir
                            </>
                        }
                        emblema={
                            <span className="relative flex size-8 items-center justify-center text-plad">
                                <Hexagon size={32} fill="currentColor" aria-hidden="true" className="absolute" />
                                <span className="relative text-xs font-bold text-white">{contadores.proximoMarco.dias}</span>
                            </span>
                        }
                        className="sm:col-span-2 lg:col-span-1"
                    >
                        <span className="font-outfit text-[10cqw] font-bold leading-tight text-black">
                            {contadores.proximoMarco.semanas} {contadores.proximoMarco.semanas === 1 ? 'semana' : 'semanas'}
                        </span>
                        <span className="mt-1 text-xs text-texto-suave">{contadores.proximoMarco.dias} dias</span>
                        <span className="mt-1 h-px w-[36%] bg-plad" />
                    </CardContador>
                </section>
                <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
                    <div>
                        <h1 className="font-outfit text-2xl font-bold text-black">Calendário de reuniões</h1>
                        <p className="mt-1 text-sm text-texto-suave">Visualize as reuniões marcadas e participe</p>
                    </div>
                    {/* A única ação principal do painel do psicólogo */}
                    {ehPsicologo && (
                        <Botao onClick={() => setCriando(true)}>
                            <Plus size={18} aria-hidden="true" />
                            Criar reunião
                        </Botao>
                    )}
                </div>

                <div className="rounded-painel border border-gray-100 bg-white p-2 shadow-painel sm:p-3 md:p-8">
                    {/* Cabeçalho do mês */}
                    <div className="mb-4 flex items-center justify-between md:mb-6">
                        <h2 className="font-outfit text-lg font-bold text-black">
                            {capitalizar(format(mesAtual, "MMMM 'de' yyyy", { locale: ptBR }))}
                        </h2>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => {
                                    setMesAtual((m) => subMonths(m, 1))
                                    setDiaSelecionado(null)
                                }}
                                className="flex size-11 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-50"
                                aria-label="Mês anterior"
                            >
                                <ChevronLeft size={18} aria-hidden="true" />
                            </button>
                            <button
                                type="button"
                                onClick={() => {
                                    setMesAtual((m) => addMonths(m, 1))
                                    setDiaSelecionado(null)
                                }}
                                className="flex size-11 items-center justify-center rounded-lg border border-gray-200 text-gray-600 transition hover:bg-gray-50"
                                aria-label="Próximo mês"
                            >
                                <ChevronRight size={18} aria-hidden="true" />
                            </button>
                        </div>
                    </div>

                    {carregando && <Carregando mensagem="Carregando as reuniões…" />}

                    {!carregando && erroCarga && <EstadoErro mensagem={erroCarga} onTentarNovamente={recarregar} />}

                    {!carregando && !erroCarga && reunioes.length === 0 && (
                        <EstadoVazio
                            className="mb-4 rounded-cartao border border-dashed border-gray-300"
                            icone={<CalendarDays size={26} />}
                            titulo="Nenhuma reunião neste período"
                            descricao={
                                ehPsicologo
                                    ? 'Use "Criar reunião" para marcar a primeira.'
                                    : 'Quando houver reuniões, elas aparecem marcadas no calendário.'
                            }
                        />
                    )}

                    {/* Dias da semana */}
                    <div className="mb-2 grid grid-cols-7 gap-1 md:mb-3 md:gap-3">
                        {DIAS_SEMANA.map((dia) => (
                            <span key={dia} className="text-center text-xs font-semibold uppercase tracking-wide text-texto-suave">
                                {dia}
                            </span>
                        ))}
                    </div>

                    {/* Semanas */}
                    <div className="flex flex-col gap-1 md:gap-3">
                        {semanas.map((semana, i) => (
                            <div key={i} className="grid grid-cols-7 gap-1 md:gap-3">
                                {semana.map((dia) => {
                                    const noMes = isSameMonth(dia, mesAtual)
                                    const chave = format(dia, 'yyyy-MM-dd')

                                    // Dias fora do mês atual ficam em branco, sem número —
                                    // igual ao layout do Figma.
                                    if (!noMes) {
                                        return <div key={chave} className="h-12 rounded-2xl md:h-16" />
                                    }

                                    const doDia = reunioesDoDia(dia)
                                    const temReuniao = doDia.length > 0
                                    const selecionado = diaSelecionado === chave
                                    const descricaoDia = `${format(dia, "d 'de' MMMM", { locale: ptBR })}${
                                        temReuniao ? `, ${doDia.length === 1 ? '1 reunião' : `${doDia.length} reuniões`}` : ''
                                    }`

                                    return (
                                        <div key={chave} className="relative">
                                            <button
                                                type="button"
                                                onClick={() => handleClickDia(dia)}
                                                aria-label={descricaoDia}
                                                aria-expanded={temReuniao ? selecionado : undefined}
                                                aria-current={isToday(dia) ? 'date' : undefined}
                                                className={[
                                                    'flex h-12 w-full items-start justify-start rounded-2xl p-1.5 text-left text-sm font-semibold transition md:h-16 md:p-3',
                                                    selecionado
                                                        ? 'bg-plad text-white'
                                                        : temReuniao
                                                          ? 'bg-plad-fundo text-black hover:bg-borda-suave'
                                                          : 'text-gray-700 hover:bg-gray-50',
                                                    isToday(dia) && !selecionado ? 'ring-1 ring-plad' : '',
                                                ].join(' ')}
                                            >
                                                {format(dia, 'd')}
                                            </button>

                                            {selecionado && temReuniao && (
                                                <PopupReuniao
                                                    reunioes={doDia}
                                                    ehDependente={ehDependente}
                                                    inscricaoEmCurso={inscricao.emCurso}
                                                    onInscrever={inscricao.pedir}
                                                />
                                            )}
                                        </div>
                                    )
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            {criando && (
                <FormularioReuniao
                    reuniao={null}
                    diaInicial={format(new Date(), 'yyyy-MM-dd')}
                    onFechar={() => setCriando(false)}
                    onSalvo={aoCriar}
                />
            )}

            {/* Termo de participação: a inscrição só é enviada depois do aceite, com a versão do termo */}
            {inscricao.termoAberto && (
                <TermoDeParticipacao
                    reuniao={inscricao.termoAberto}
                    enviando={inscricao.emCurso !== null}
                    onAceitar={() => void inscricao.aceitar()}
                    onVoltar={inscricao.fecharTermo}
                />
            )}
        </LayoutPainel>
    )
}

// Quem já fechou o cartão da triagem, por id de usuário. Só em memória (volta ao recarregar), como o ApelidoDestaque
let triagemAdiadaPor: number | null = null

/**
 * O convite para a triagem, no painel do dependente que ainda não a enviou. A triagem é opcional (o backend não a exige
 * para a inscrição, decisão 24): ninguém é mandado para ela. O consentimento de saúde só aparece quando a pessoa a começa.
 */
function CartaoTriagem({ idUsuario }: { idUsuario: number }) {
    const [, atualizar] = useState(0)
    if (triagemAdiadaPor === idUsuario) {
        return null
    }

    const adiar = () => {
        triagemAdiadaPor = idUsuario
        atualizar((n) => n + 1)
    }

    return (
        <section
            aria-labelledby="titulo-cartao-triagem"
            className="mb-8 flex flex-col gap-4 rounded-cartao border border-borda-cartao bg-white p-4 shadow-cartao sm:flex-row sm:items-center md:p-5"
        >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-plad-fundo text-plad" aria-hidden="true">
                <ClipboardList size={24} />
            </span>
            <div className="min-w-0 flex-1">
                <h2 id="titulo-cartao-triagem" className="font-outfit text-lg font-semibold text-black">
                    Conte um pouco sobre você
                </h2>
                <p className="mt-1 text-sm text-gray-700">
                    A triagem é opcional: algumas perguntas sobre como você está. Só o psicólogo das reuniões em que você se
                    inscrever lê as respostas, até 30 dias depois da reunião.
                </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <Link to="/Triagem" className={classeBotao('secundario')}>
                    Responder a triagem
                </Link>
                <Botao variante="texto" onClick={adiar}>
                    Agora não
                </Botao>
            </div>
        </section>
    )
}

const MARGEM_TELA = 8 // folga mínima entre o popup e a borda da janela
const DISTANCIA_POPUP = 12 // espaço entre o dia e o popup (equivale ao antigo ml-3)

interface PosicaoPopup {
    lado: 'direita' | 'esquerda'
    vertical: 'topo' | 'base'
    dx: number
    dy: number
}

interface PopupReuniaoProps {
    reunioes: MeetingResponseDTO[]
    /** Quem vê o popup é um dependente: ele pode se inscrever */
    ehDependente: boolean
    /** Id da reunião cuja inscrição está sendo enviada agora (o botão fica ocupado) */
    inscricaoEmCurso: number | null
    onInscrever: (reuniao: MeetingResponseDTO) => void
}

// O popup é roxo escuro (plad-rodape): a ação principal é branca e cheia; "Ver detalhes" é um link de texto. 44 px de alvo
const CLASSE_ACAO_PRINCIPAL_POPUP =
    'inline-flex min-h-11 items-center gap-1.5 rounded-botao bg-white px-4 text-sm font-medium text-plad-rodape transition-colors hover:bg-plad-fundo disabled:cursor-wait disabled:opacity-60'
const CLASSE_LINK_POPUP = 'inline-flex min-h-11 items-center gap-1 text-sm font-medium text-white underline-offset-4 hover:underline'

/**
 * Popup das reuniões do dia, um padrão só para todos os papéis: título, data e hora, vagas e um selo de situação, no
 * máximo UMA ação principal (Entrar, só dentro da janela da sala; senão Inscrever-se, para o dependente) e "Ver
 * detalhes", que leva ao detalhe da reunião, onde ficam as outras ações. Tudo na grade de espaçamento `popup` do @theme.
 * Abre à direita e alinhado ao topo do dia; se não couber na janela, vai para a esquerda e/ou sobe, e por fim é
 * deslocado o mínimo necessário para ficar totalmente visível.
 */
function PopupReuniao({ reunioes, ehDependente, inscricaoEmCurso, onInscrever }: PopupReuniaoProps) {
    // "Agora" anda sozinho nos limites das reuniões do dia (a sala abre 10 min antes, o início, o fim): o "Entrar" aparece
    // e o selo muda sem fechar o popup. Se a situação ainda assim mudar sem que a tela perceba, o backend responde 409.
    const limitesDoRelogio = useMemo(
        () => reunioes.flatMap((m) => [aberturaDaSala(m), Date.parse(m.starts_at), Date.parse(m.ends_at)]),
        [reunioes],
    )
    const agora = useAgora(limitesDoRelogio)
    const popupRef = useRef<HTMLDivElement>(null)
    const [pos, setPos] = useState<PosicaoPopup>({ lado: 'direita', vertical: 'topo', dx: 0, dy: 0 })

    useLayoutEffect(() => {
        function reposicionar() {
            const popup = popupRef.current
            const ancora = popup?.parentElement
            if (!popup || !ancora) return

            const a = ancora.getBoundingClientRect()
            const largura = popup.offsetWidth
            const altura = popup.offsetHeight
            const telaL = document.documentElement.clientWidth
            const telaA = document.documentElement.clientHeight

            const cabeDireita = a.right + DISTANCIA_POPUP + largura <= telaL - MARGEM_TELA
            const cabeEsquerda = a.left - DISTANCIA_POPUP - largura >= MARGEM_TELA
            const lado: PosicaoPopup['lado'] =
                cabeDireita || (!cabeEsquerda && telaL - a.right >= a.left) ? 'direita' : 'esquerda'
            const esquerda = lado === 'direita' ? a.right + DISTANCIA_POPUP : a.left - DISTANCIA_POPUP - largura

            const vertical: PosicaoPopup['vertical'] = a.top + altura <= telaA - MARGEM_TELA ? 'topo' : 'base'
            const topo = vertical === 'topo' ? a.top : a.bottom - altura

            const limitar = (valor: number, tamanho: number, tela: number) =>
                Math.max(MARGEM_TELA, Math.min(valor, tela - MARGEM_TELA - tamanho))

            const proxima = {
                lado,
                vertical,
                dx: Math.round(limitar(esquerda, largura, telaL) - esquerda),
                dy: Math.round(limitar(topo, altura, telaA) - topo),
            }
            setPos((atual) =>
                atual.lado === proxima.lado &&
                atual.vertical === proxima.vertical &&
                atual.dx === proxima.dx &&
                atual.dy === proxima.dy
                    ? atual
                    : proxima,
            )
        }

        reposicionar()
        window.addEventListener('resize', reposicionar)
        return () => window.removeEventListener('resize', reposicionar)
        // A altura muda quando uma reunião do dia muda (a inscrição tira o botão e põe o selo): reposiciona
    }, [reunioes])

    return (
        <div
            ref={popupRef}
            role="region"
            aria-label="Reuniões do dia"
            style={pos.dx || pos.dy ? { transform: `translate(${pos.dx}px, ${pos.dy}px)` } : undefined}
            className={[
                'absolute z-20 w-72 divide-y divide-white/20 rounded-cartao bg-plad-rodape px-popup text-white shadow-2xl',
                pos.lado === 'direita' ? 'left-full ml-3' : 'right-full mr-3',
                pos.vertical === 'topo' ? 'top-0' : 'bottom-0',
            ].join(' ')}
        >
            {reunioes.map((m) => {
                const selo = seloDaReuniao(m, agora)
                const aceita = aceitaInscricao(m, agora)
                const vagas = vagasRestantes(m.capacity, m.registered_count)
                const entrar = podeEntrar(m, agora)
                const inscrever = !entrar && ehDependente && aceita && !m.registered_by_me && vagas > 0
                return (
                    <article key={m.id} aria-label={m.title} className="flex flex-col gap-popup py-popup">
                        <div>
                            <p
                                className={`font-outfit text-sm font-semibold leading-snug ${m.status === 'cancelled' ? 'line-through' : ''}`.trim()}
                            >
                                {m.title}
                            </p>
                            <p className="text-xs text-gray-200">{formatarHorario(m.starts_at, m.ends_at)}</p>
                        </div>

                        {/* O risco no título sozinho não basta (leitor de tela, daltonismo): a situação também vai em texto */}
                        {(aceita || selo) && (
                            <div className="flex flex-wrap items-center gap-popup text-xs">
                                {/* Vagas: só enquanto a reunião aceita inscrição (nas outras, o número não diz nada) */}
                                {aceita && <span className="font-semibold">{textoDeVagas(vagas)}</span>}
                                {selo && (
                                    <span className="rounded-botao border border-white/60 px-2 py-0.5 font-semibold">{selo}</span>
                                )}
                            </div>
                        )}

                        <div className="flex flex-wrap items-center gap-popup">
                            {/* A sala: o anfitrião e o dependente inscrito entram de 10 min antes do início até o fim */}
                            {entrar && (
                                <Link to={`/reuniao/${m.id}`} className={CLASSE_ACAO_PRINCIPAL_POPUP}>
                                    <DoorOpen size={16} aria-hidden="true" />
                                    Entrar
                                </Link>
                            )}
                            {inscrever && (
                                <button
                                    type="button"
                                    onClick={() => onInscrever(m)}
                                    disabled={inscricaoEmCurso !== null}
                                    aria-busy={inscricaoEmCurso === m.id}
                                    className={CLASSE_ACAO_PRINCIPAL_POPUP}
                                >
                                    <UserPlus size={16} aria-hidden="true" />
                                    {inscricaoEmCurso === m.id ? 'Inscrevendo…' : 'Inscrever-se'}
                                </button>
                            )}
                            <Link to={`/minhas-reunioes/${m.id}`} className={CLASSE_LINK_POPUP}>
                                Ver detalhes
                                <ChevronRight size={16} aria-hidden="true" />
                            </Link>
                        </div>
                    </article>
                )
            })}
        </div>
    )
}

function CardContador({
    titulo,
    subtitulo,
    emblema,
    className = '',
    children,
}: {
    titulo: string
    subtitulo: React.ReactNode
    emblema: React.ReactNode
    className?: string
    children: React.ReactNode
}) {
    return (
        <Card titulo={titulo} className={`flex flex-col md:p-5 ${className}`.trim()}>
            <p className="mt-2 min-h-[2.75rem] text-sm leading-snug text-gray-800">{subtitulo}</p>

            {/* Anel de até 250 px com brilho azul e círculo branco de 64% (160 px no Figma). O tamanho dos números
                acompanha o anel (unidades cqw), então o contador cabe em qualquer largura de cartão */}
            <div className="@container relative mx-auto mt-3 aspect-square w-full max-w-[250px]">
                <div
                    aria-hidden="true"
                    className="absolute inset-0 rounded-full border border-gray-300"
                    style={{
                        // O degradê nasce na borda do círculo de dentro e vai sumindo até o anel de fora
                        background: 'radial-gradient(circle closest-side, rgba(131,151,255,0.6) 64%, rgba(131,151,255,0) 100%)',
                    }}
                />
                <div className="absolute left-1/2 top-1/2 flex aspect-square w-[64%] -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full bg-white">
                    {children}
                </div>
                <div className="absolute left-[18%] top-[13%] flex size-10 items-center justify-center rounded-full bg-white text-black shadow">
                    {emblema}
                </div>
            </div>
        </Card>
    )
}
