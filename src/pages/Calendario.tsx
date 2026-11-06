import { useLayoutEffect, useMemo, useRef, useState } from 'react'
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
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Hexagon, HandCoins, Maximize2, Minimize2, User } from 'lucide-react'

import ApelidoDestaque from '../components/ApelidoDestaque'
import Botao from '../components/Botao'
import Card from '../components/Card'
import EstadoVazio from '../components/EstadoVazio'
import FaixaDemonstrativa from '../components/FaixaDemonstrativa'
import LayoutPainel from '../components/LayoutPainel'
import { useToast } from '../components/ToastContext'

/**
 * Uma reunião marcada em uma data.
 * Ainda não há endpoint de reuniões: o calendário nasce vazio e a pessoa pode carregar dados demonstrativos
 * (fictícios) para conhecer a tela. Depois é só trocar a origem: buscar do backend por mês/ano
 * (ex: GET /reunioes?mes=10&ano=2025) e passar o array retornado pela prop `reunioes` — o calendário em si não muda.
 */
export interface Reuniao {
    id: string
    data: string // ISO "yyyy-MM-dd"
    titulo: string
    horaInicio: string // "18:30"
    horaFim: string // "22:30"
    responsavel?: string // ex: "PLAD Equipe"
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
    reunioes?: Reuniao[]
    contadores?: Contadores
    onDiaClick?: (data: Date, reunioesDoDia: Reuniao[]) => void
}

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

/**
 * Reuniões fictícias para a opção "Carregar dados demonstrativos". As datas são relativas ao mês atual (e não fixas),
 * para sempre aparecerem na grade que a pessoa está vendo.
 */
function gerarReunioesDemonstrativas(): Reuniao[] {
    const inicioDoMes = startOfMonth(new Date())
    const iso = (diasDepois: number) => format(addDays(inicioDoMes, diasDepois), 'yyyy-MM-dd')
    return [
        { id: 'demo-1', data: iso(4), titulo: 'Apresentação do projeto', horaInicio: '18:00', horaFim: '22:00', responsavel: 'PLAD Equipe' },
        { id: 'demo-2', data: iso(11), titulo: 'Reunião com psicólogo voluntário', horaInicio: '09:00', horaFim: '10:00', responsavel: 'Psicóloga voluntária' },
        { id: 'demo-3', data: iso(19), titulo: 'Roda de conversa', horaInicio: '14:00', horaFim: '15:30' },
    ]
}

function capitalizar(texto: string) {
    return texto.charAt(0).toUpperCase() + texto.slice(1)
}

export default function Calendario({ reunioes: reunioesProp, contadores = CONTADORES_TESTE, onDiaClick }: CalendarioProps) {
    const { avisar } = useToast()
    const [mesAtual, setMesAtual] = useState(() => new Date())
    const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null)
    const [demonstrativo, setDemonstrativo] = useState(false)
    const reunioes = useMemo(
        () => reunioesProp ?? (demonstrativo ? gerarReunioesDemonstrativas() : []),
        [reunioesProp, demonstrativo],
    )

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

    function handleClickDia(dia: Date) {
        const doDia = reunioesDoDia(dia)
        const chave = format(dia, 'yyyy-MM-dd')

        if (doDia.length === 0) {
            setDiaSelecionado(null)
            return
        }

        setDiaSelecionado((atual) => (atual === chave ? null : chave))
        onDiaClick?.(dia, doDia)
    }

    function carregarDemonstrativos() {
        setDemonstrativo(true)
        avisar('Dados demonstrativos carregados. São fictícios.', 'info')
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
                <h1 className="font-outfit text-2xl font-bold text-black">Calendário de reuniões</h1>
                <p className="mb-6 mt-1 text-sm text-texto-suave">Visualize as reuniões marcadas e participe</p>

                {demonstrativo && <FaixaDemonstrativa onRemover={() => setDemonstrativo(false)} />}

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

                    {reunioes.length === 0 && (
                        <EstadoVazio
                            className="mb-4 rounded-cartao border border-dashed border-gray-300"
                            icone={<CalendarDays size={26} />}
                            titulo="Nenhuma reunião marcada ainda"
                            descricao="Quando houver reuniões, elas aparecem marcadas no calendário. Você pode conhecer a tela com exemplos."
                            acao={
                                <Botao variante="secundario" onClick={carregarDemonstrativos}>
                                    Carregar dados demonstrativos
                                </Botao>
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

                                            {selecionado && temReuniao && <PopupReuniao dia={dia} reunioes={doDia} />}
                                        </div>
                                    )
                                })}
                            </div>
                        ))}
                    </div>
                </div>
            </main>
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

/**
 * Popup com os detalhes das reuniões do dia. Abre à direita e alinhado ao topo
 * do dia; se não couber na janela, vai para a esquerda e/ou sobe, e por fim é
 * deslocado o mínimo necessário para ficar totalmente visível.
 */function PopupReuniao({ dia, reunioes }: { dia: Date; reunioes: Reuniao[] }) {
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
                    <p className="font-outfit text-sm font-semibold leading-snug">{r.titulo}</p>
                    <p className="text-xs text-gray-200">
                        {capitalizar(format(dia, "EEEE, d 'de' MMMM", { locale: ptBR }))} · {r.horaInicio} - {r.horaFim}
                    </p>
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