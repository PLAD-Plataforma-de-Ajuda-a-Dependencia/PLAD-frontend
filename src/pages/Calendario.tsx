import { useCallback, useEffect, useId, useLayoutEffect, useMemo, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { createPortal } from 'react-dom'
import {
    addDays,
    addMonths,
    eachDayOfInterval,
    endOfMonth,
    endOfWeek,
    format,
    isBefore,
    isSameDay,
    isSameMonth,
    isToday,
    parseISO,
    startOfDay,
    startOfMonth,
    startOfWeek,
    subMonths,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import {
    Ban,
    CalendarDays,
    Check,
    ChevronLeft,
    ChevronRight,
    Clock,
    Hexagon,
    HandCoins,
    Maximize2,
    Minimize2,
    Pencil,
    Plus,
    User,
} from 'lucide-react'

import { ApiError, errosPorCampo } from '../api/client'
import { cancelMeeting, createMeeting, endMeeting, listMeetings, updateMeeting } from '../api/meetings'
import type { MeetingRequestDTO, MeetingResponseDTO, MeetingStatus } from '../api/meetings'
import ApelidoDestaque from '../components/ApelidoDestaque'
import Botao from '../components/Botao'
import Campo from '../components/Campo'
import Card from '../components/Card'
import Carregando from '../components/Carregando'
import EstadoErro from '../components/EstadoErro'
import EstadoVazio from '../components/EstadoVazio'
import LayoutPainel from '../components/LayoutPainel'
import ModalConfirmacao from '../components/ModalConfirmacao'
import { useToast } from '../components/ToastContext'
import useArmadilhaFoco from '../components/useArmadilhaFoco'
import { useSessao } from '../session/SessaoContext'

/**
 * Uma reunião marcada em uma data, já no fuso do navegador (o backend manda instantes em UTC: `daReuniaoDaApi`).
 * As reuniões vêm de GET /meetings, buscadas para o intervalo que a grade mostra (do primeiro ao último dia).
 */
export interface Reuniao {
    id: string
    data: string // ISO "yyyy-MM-dd", no fuso local
    titulo: string
    horaInicio: string // "18:30", no fuso local
    horaFim: string // "22:30", no fuso local
    inicio: string // instante ISO-8601 do início, para saber se já começou
    fim: string // instante ISO-8601 do fim, para saber se já terminou
    responsavel?: string // nome do psicólogo anfitrião
    status: MeetingStatus // cancelada aparece riscada; encerrada, com o aviso "Encerrada"
    descricao: string | null
    capacidade: number
    minha: boolean // quem está vendo é o anfitrião
}

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
    onDiaClick?: (data: Date, reunioesDoDia: Reuniao[]) => void
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

/** O instante do backend (UTC) vira data e hora no fuso do navegador, que é o que a pessoa espera ver */
function daReuniaoDaApi(m: MeetingResponseDTO): Reuniao {
    const inicio = parseISO(m.starts_at)
    return {
        id: String(m.id),
        data: format(inicio, 'yyyy-MM-dd'),
        titulo: m.title,
        horaInicio: format(inicio, 'HH:mm'),
        horaFim: format(parseISO(m.ends_at), 'HH:mm'),
        inicio: m.starts_at,
        fim: m.ends_at,
        responsavel: m.host,
        status: m.status,
        descricao: m.description,
        capacidade: m.capacity,
        minha: m.owned_by_me,
    }
}

function capitalizar(texto: string) {
    return texto.charAt(0).toUpperCase() + texto.slice(1)
}

export default function Calendario({ contadores = CONTADORES_TESTE, onDiaClick }: CalendarioProps) {
    const [mesAtual, setMesAtual] = useState(() => new Date())
    const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null)
    // Resultado da última busca e para qual intervalo ele vale (`chave`): enquanto a chave atual não tem resultado,
    // a tela está carregando. Assim o efeito só grava estado quando a resposta chega, nunca de forma síncrona
    const [carga, setCarga] = useState<{ chave: string; reunioes: Reuniao[]; erro: string | null } | null>(null)
    // Muda para pedir a busca de novo (Tentar de novo, e depois de criar, editar ou cancelar uma reunião)
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
                if (!obsoleta) setCarga({ chave: chaveCarga, reunioes: lista.map(daReuniaoDaApi), erro: null })
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

    function reunioesDoDia(dia: Date) {
        return reunioes.filter((r) => isSameDay(parseISO(r.data), dia))
    }

    // O backend é quem garante o acesso (403 para quem não é psicólogo); aqui é só para não mostrar botões inúteis
    const ehPsicologo = useSessao().me?.type_user === 'psicologo'
    // Um dia que já passou não recebe reunião nova (o início precisa ser daqui a pelo menos 60 minutos)
    const podeCriarNoDia = (dia: Date) => ehPsicologo && !isBefore(dia, startOfDay(new Date()))

    function handleClickDia(dia: Date) {
        const doDia = reunioesDoDia(dia)
        const chave = format(dia, 'yyyy-MM-dd')

        // O psicólogo também abre um dia vazio, para criar uma reunião nele
        if (doDia.length === 0 && !podeCriarNoDia(dia)) {
            setDiaSelecionado(null)
            return
        }

        setDiaSelecionado((atual) => (atual === chave ? null : chave))
        onDiaClick?.(dia, doDia)
    }

    // Criar/editar (formulário) e cancelar/encerrar (confirmação): só um deles aberto por vez
    const { avisar } = useToast()
    const [formulario, setFormulario] = useState<{ reuniao: Reuniao | null; dia: string } | null>(null)
    const [acaoPendente, setAcaoPendente] = useState<{ tipo: 'cancelar' | 'encerrar'; reuniao: Reuniao } | null>(null)
    const [executando, setExecutando] = useState(false)

    function abrirFormulario(reuniao: Reuniao | null, dia: string) {
        setDiaSelecionado(null)
        setFormulario({ reuniao, dia })
    }

    function aoSalvar(editada: boolean) {
        setFormulario(null)
        avisar(editada ? 'Reunião atualizada.' : 'Reunião criada.', 'sucesso')
        recarregar()
    }

    async function confirmarAcao() {
        if (!acaoPendente || executando) return
        const { tipo, reuniao } = acaoPendente
        setExecutando(true)
        try {
            if (tipo === 'cancelar') {
                await cancelMeeting(Number(reuniao.id))
                avisar('Reunião cancelada.', 'sucesso')
            } else {
                await endMeeting(Number(reuniao.id))
                avisar('Reunião encerrada.', 'sucesso')
            }
        } catch (erro) {
            avisar(erro instanceof ApiError ? erro.message : 'Algo deu errado. Tente novamente em instantes.', 'erro')
        } finally {
            // Mesmo com erro a lista é buscada de novo: o motivo costuma ser a reunião ter mudado de situação
            setExecutando(false)
            setAcaoPendente(null)
            setDiaSelecionado(null)
            recarregar()
        }
    }

    return (
        // A barra lateral (com o menu da conta) e o rodapé vêm do LayoutPainel; por enquanto o Painel é esta página
        <LayoutPainel titulo="Painel">
            {/* Conteúdo principal */}
            <main id="conteudo" tabIndex={-1} className="min-w-0 flex-1 px-3 py-6 focus:outline-none sm:px-4 md:px-10 md:py-10">
                <ApelidoDestaque />

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
                    {ehPsicologo && (
                        <Botao onClick={() => abrirFormulario(null, format(new Date(), 'yyyy-MM-dd'))}>
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
                                    ? 'Use "Criar reunião" ou clique em um dia para marcar a primeira.'
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
                                    const abre = temReuniao || podeCriarNoDia(dia) // dia que abre o popup
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
                                                aria-expanded={abre ? selecionado : undefined}
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

                                            {selecionado && abre && (
                                                <PopupReuniao
                                                    dia={dia}
                                                    reunioes={doDia}
                                                    onCriar={podeCriarNoDia(dia) ? () => abrirFormulario(null, chave) : undefined}
                                                    onEditar={(r) => abrirFormulario(r, r.data)}
                                                    onCancelar={(r) => setAcaoPendente({ tipo: 'cancelar', reuniao: r })}
                                                    onEncerrar={(r) => setAcaoPendente({ tipo: 'encerrar', reuniao: r })}
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

            {formulario && (
                <FormularioReuniao
                    reuniao={formulario.reuniao}
                    diaInicial={formulario.dia}
                    onFechar={() => setFormulario(null)}
                    onSalvo={aoSalvar}
                />
            )}

            <ModalConfirmacao
                aberto={acaoPendente !== null}
                titulo={acaoPendente?.tipo === 'cancelar' ? 'Cancelar esta reunião?' : 'Encerrar esta reunião?'}
                descricao={
                    acaoPendente?.tipo === 'cancelar'
                        ? `"${acaoPendente.reuniao.titulo}" continua no calendário, mas marcada como cancelada. Não dá para desfazer.`
                        : acaoPendente
                          ? `"${acaoPendente.reuniao.titulo}" passa a constar como encerrada. Não dá para desfazer.`
                          : undefined
                }
                rotuloConfirmar={acaoPendente?.tipo === 'cancelar' ? 'Cancelar reunião' : 'Encerrar reunião'}
                rotuloCancelar="Voltar"
                perigo={acaoPendente?.tipo === 'cancelar'}
                carregando={executando}
                onConfirmar={confirmarAcao}
                onCancelar={() => setAcaoPendente(null)}
            />
        </LayoutPainel>
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


// "09:00" - "10:30" → "1 h 30 min"; só para o detalhe do popup expandido
function duracao(inicio: string, fim: string): string | null {
    const minutos = (hora: string) => {
        const [h, m] = hora.split(':').map(Number)
        return h * 60 + m
    }
    const total = minutos(fim) - minutos(inicio)
    if (!Number.isFinite(total) || total <= 0) return null
    const h = Math.floor(total / 60)
    const m = total % 60
    return [h ? `${h} h` : '', m ? `${m} min` : ''].filter(Boolean).join(' ')
}

interface PopupReuniaoProps {
    dia: Date
    reunioes: Reuniao[]
    /** Só existe para o psicólogo, em dia de hoje ou futuro */
    onCriar?: () => void
    onEditar: (reuniao: Reuniao) => void
    onCancelar: (reuniao: Reuniao) => void
    onEncerrar: (reuniao: Reuniao) => void
}

// Botões do popup: ele é roxo escuro, então os do tema (azul sobre azul) não têm contraste; contorno branco, 44 px
const CLASSE_ACAO_POPUP =
    'inline-flex min-h-11 items-center gap-1.5 rounded-botao border border-white/50 px-3 text-sm font-medium text-white transition-colors hover:bg-white/10'

/**
 * Popup com os detalhes das reuniões do dia. Abre à direita e alinhado ao topo
 * do dia; se não couber na janela, vai para a esquerda e/ou sobe, e por fim é
 * deslocado o mínimo necessário para ficar totalmente visível.
 * O anfitrião vê, nas reuniões dele, o que ainda pode fazer: editar (antes de começar), cancelar (até terminar) e
 * encerrar (depois de começar). Só reunião agendada tem ações.
 */
function PopupReuniao({ dia, reunioes, onCriar, onEditar, onCancelar, onEncerrar }: PopupReuniaoProps) {
    // O popup é montado ao abrir o dia, então "agora" é o instante da abertura; se a situação mudar enquanto ele está
    // aberto, o backend responde 409 e a lista é buscada de novo
    const [agora] = useState(() => Date.now())
    const popupRef = useRef<HTMLDivElement>(null)
    const [pos, setPos] = useState<PosicaoPopup>({ lado: 'direita', vertical: 'topo', dx: 0, dy: 0 })
    // O botão de expandir (canto do popup) mostra a duração e quem organiza; o popup cresce e se reposiciona
    const [expandido, setExpandido] = useState(false)

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
    }, [expandido])

    return (
        <div
            ref={popupRef}
            role="region"
            aria-label="Reuniões do dia"
            style={pos.dx || pos.dy ? { transform: `translate(${pos.dx}px, ${pos.dy}px)` } : undefined}
            className={[
                'absolute z-20 space-y-3 rounded-xl bg-plad-rodape p-4 text-white shadow-2xl transition-[width]',
                expandido ? 'w-80' : 'w-64',
                pos.lado === 'direita' ? 'left-full ml-3' : 'right-full mr-3',
                pos.vertical === 'topo' ? 'top-0' : 'bottom-0',
            ].join(' ')}
        >
            <button
                type="button"
                onClick={() => setExpandido((atual) => !atual)}
                aria-expanded={expandido}
                aria-label={expandido ? 'Recolher detalhes da reunião' : 'Expandir detalhes da reunião'}
                className="-mr-2 -mt-2 ml-auto flex size-11 items-center justify-center rounded-botao text-plad-claro transition hover:bg-white/10"
            >
                {expandido ? <Minimize2 size={16} aria-hidden="true" /> : <Maximize2 size={16} aria-hidden="true" />}
            </button>
            {reunioes.map((r) => (
                <div key={r.id} className="-mt-3 space-y-1">
                    <p className={`font-outfit text-sm font-semibold leading-snug ${r.status === 'cancelled' ? 'line-through' : ''}`.trim()}>
                        {r.titulo}
                    </p>
                    <p className="text-xs text-gray-200">
                        {capitalizar(format(dia, "EEEE, d 'de' MMMM", { locale: ptBR }))} · {r.horaInicio} - {r.horaFim}
                    </p>
                    {/* O risco sozinho não basta (leitor de tela, daltonismo): o estado também vai em texto */}
                    {r.status !== 'scheduled' && (
                        <p className="text-xs font-semibold text-gray-200">
                            {r.status === 'cancelled' ? 'Reunião cancelada' : 'Reunião encerrada'}
                        </p>
                    )}
                    {r.minha && r.status === 'scheduled' && (
                        <div className="flex flex-wrap gap-2 pt-1">
                            {agora < Date.parse(r.inicio) && (
                                <button type="button" onClick={() => onEditar(r)} className={CLASSE_ACAO_POPUP}>
                                    <Pencil size={14} aria-hidden="true" />
                                    Editar
                                </button>
                            )}
                            {agora >= Date.parse(r.inicio) && (
                                <button type="button" onClick={() => onEncerrar(r)} className={CLASSE_ACAO_POPUP}>
                                    <Check size={14} aria-hidden="true" />
                                    Encerrar
                                </button>
                            )}
                            {agora < Date.parse(r.fim) && (
                                <button type="button" onClick={() => onCancelar(r)} className={CLASSE_ACAO_POPUP}>
                                    <Ban size={14} aria-hidden="true" />
                                    Cancelar
                                </button>
                            )}
                        </div>
                    )}
                    {expandido && (
                        <dl className="space-y-1 border-t border-white/20 pt-2 text-xs text-gray-200">
                            {duracao(r.horaInicio, r.horaFim) && (
                                <div className="flex gap-2">
                                    <dt className="font-semibold text-white">Duração</dt>
                                    <dd>{duracao(r.horaInicio, r.horaFim)}</dd>
                                </div>
                            )}
                            {r.responsavel && (
                                <div className="flex items-center gap-2">
                                    <dt className="flex items-center gap-1.5 font-semibold text-white">
                                        <User size={12} aria-hidden="true" />
                                        Organizador
                                    </dt>
                                    <dd>{r.responsavel}</dd>
                                </div>
                            )}
                        </dl>
                    )}
                </div>
            ))}
            {reunioes.length === 0 && (
                <p className="-mt-3 text-sm text-gray-200">Nenhuma reunião neste dia.</p>
            )}
            {onCriar && (
                <button type="button" onClick={onCriar} className={CLASSE_ACAO_POPUP}>
                    <Plus size={14} aria-hidden="true" />
                    Criar reunião neste dia
                </button>
            )}
        </div>
    )
}

interface FormularioReuniaoProps {
    /** Null para criar; a reunião para editar */
    reuniao: Reuniao | null
    /** "yyyy-MM-dd" que já vem no campo Data ao criar */
    diaInicial: string
    onFechar: () => void
    onSalvo: (editada: boolean) => void
}

type CamposReuniao = 'title' | 'description' | 'data' | 'starts_at' | 'ends_at' | 'capacity'

/**
 * Criar e editar reunião (psicólogo). Data e horários são no fuso do navegador e viram instantes ISO-8601 no envio.
 * Os erros do backend (VALIDATION_ERROR e INVALID_MEETING trazem `errors` por campo) aparecem ao lado de cada campo;
 * o 409 (cruza outra reunião sua, ou a reunião mudou de situação) vai num aviso geral. Nada digitado se perde no erro.
 */
function FormularioReuniao({ reuniao, diaInicial, onFechar, onSalvo }: FormularioReuniaoProps) {
    const painel = useRef<HTMLDivElement>(null)
    const formRef = useRef<HTMLFormElement>(null)
    const idTitulo = useId()
    const [titulo, setTitulo] = useState(reuniao?.titulo ?? '')
    const [descricao, setDescricao] = useState(reuniao?.descricao ?? '')
    const [data, setData] = useState(reuniao?.data ?? diaInicial)
    const [inicio, setInicio] = useState(reuniao?.horaInicio ?? '')
    const [fim, setFim] = useState(reuniao?.horaFim ?? '')
    const [capacidade, setCapacidade] = useState(reuniao ? String(reuniao.capacidade) : '')
    const [erros, setErros] = useState<Partial<Record<CamposReuniao, string>>>({})
    const [erroGeral, setErroGeral] = useState<string | null>(null)
    const [enviando, setEnviando] = useState(false)

    useArmadilhaFoco(painel, true, () => {
        if (!enviando) onFechar()
    })

    // Depois de mostrar os erros, o foco vai para o primeiro campo inválido
    function focarPrimeiroInvalido() {
        requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
    }

    async function enviar(e: FormEvent) {
        e.preventDefault()
        if (enviando) return

        const locais: Partial<Record<CamposReuniao, string>> = {}
        if (!titulo.trim()) locais.title = 'Campo obrigatório.'
        if (!data) locais.data = 'Campo obrigatório.'
        if (!inicio) locais.starts_at = 'Campo obrigatório.'
        if (!fim) locais.ends_at = 'Campo obrigatório.'
        if (!capacidade) locais.capacity = 'Campo obrigatório.'
        setErroGeral(null)
        if (Object.keys(locais).length > 0) {
            setErros(locais)
            focarPrimeiroInvalido()
            return
        }

        const corpo: MeetingRequestDTO = {
            title: titulo.trim(),
            description: descricao.trim() || null,
            // data e horas digitadas são do fuso do navegador; o backend recebe o instante
            starts_at: new Date(`${data}T${inicio}`).toISOString(),
            ends_at: new Date(`${data}T${fim}`).toISOString(),
            capacity: Number(capacidade),
        }

        setEnviando(true)
        try {
            if (reuniao) {
                await updateMeeting(Number(reuniao.id), corpo)
            } else {
                await createMeeting(corpo)
            }
            onSalvo(reuniao !== null)
        } catch (erro) {
            const doServidor = errosPorCampo(erro)
            const porCampo: Partial<Record<CamposReuniao, string>> = {}
            for (const campo of ['title', 'description', 'starts_at', 'ends_at', 'capacity'] as const) {
                if (doServidor[campo]) porCampo[campo] = doServidor[campo]
            }
            setErros(porCampo)
            if (Object.keys(porCampo).length > 0) {
                focarPrimeiroInvalido()
            } else {
                // 409, 403, 404, rede fora do ar...: a mensagem já vem em pt-BR do ApiError
                setErroGeral(erro instanceof ApiError ? erro.message : 'Algo deu errado. Tente novamente em instantes.')
            }
        } finally {
            setEnviando(false)
        }
    }

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget && !enviando) onFechar()
            }}
        >
            <div
                ref={painel}
                role="dialog"
                aria-modal="true"
                aria-labelledby={idTitulo}
                tabIndex={-1}
                className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-cartao bg-white p-6 shadow-xl"
            >
                <form ref={formRef} onSubmit={enviar} noValidate className="space-y-4">
                    <h2 id={idTitulo} className="font-outfit text-xl font-semibold text-black">
                        {reuniao ? 'Editar reunião' : 'Criar reunião'}
                    </h2>

                    <Campo rotulo="Título" erro={erros.title}>
                        {(c) => (
                            <input
                                {...c}
                                type="text"
                                name="title"
                                value={titulo}
                                onChange={(e) => setTitulo(e.target.value)}
                                maxLength={120}
                                autoComplete="off"
                                aria-required="true"
                            />
                        )}
                    </Campo>

                    <Campo rotulo="Descrição (opcional)" erro={erros.description} ajuda="Conte do que se trata a reunião.">
                        {(c) => (
                            <textarea
                                {...c}
                                name="description"
                                value={descricao}
                                onChange={(e) => setDescricao(e.target.value)}
                                maxLength={2000}
                                rows={3}
                            />
                        )}
                    </Campo>

                    <Campo rotulo="Data" erro={erros.data}>
                        {(c) => (
                            <input
                                {...c}
                                type="date"
                                name="date"
                                value={data}
                                onChange={(e) => setData(e.target.value)}
                                aria-required="true"
                            />
                        )}
                    </Campo>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <Campo rotulo="Início" erro={erros.starts_at} ajuda="Pelo menos 60 minutos a partir de agora.">
                            {(c) => (
                                <input
                                    {...c}
                                    type="time"
                                    name="starts_at"
                                    value={inicio}
                                    onChange={(e) => setInicio(e.target.value)}
                                    aria-required="true"
                                />
                            )}
                        </Campo>
                        <Campo rotulo="Fim" erro={erros.ends_at} ajuda="A reunião dura de 15 minutos a 3 horas.">
                            {(c) => (
                                <input
                                    {...c}
                                    type="time"
                                    name="ends_at"
                                    value={fim}
                                    onChange={(e) => setFim(e.target.value)}
                                    aria-required="true"
                                />
                            )}
                        </Campo>
                    </div>

                    <Campo rotulo="Capacidade" erro={erros.capacity} ajuda="De 2 a 30 pessoas.">
                        {(c) => (
                            <input
                                {...c}
                                type="number"
                                inputMode="numeric"
                                name="capacity"
                                value={capacidade}
                                onChange={(e) => setCapacidade(e.target.value)}
                                min={2}
                                max={30}
                                aria-required="true"
                            />
                        )}
                    </Campo>

                    {erroGeral && (
                        <p role="alert" className="rounded-campo bg-erro-fundo px-4 py-3 text-sm text-erro">
                            {erroGeral}
                        </p>
                    )}

                    <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                        <Botao variante="secundario" onClick={onFechar} disabled={enviando}>
                            Voltar
                        </Botao>
                        <Botao type="submit" carregando={enviando}>
                            {reuniao ? 'Salvar alterações' : 'Criar reunião'}
                        </Botao>
                    </div>
                </form>
            </div>
        </div>,
        document.body,
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