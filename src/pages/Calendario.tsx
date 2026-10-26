import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
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
    LayoutDashboard,
    // CalendarDays, Video, Users — voltam quando os itens do menu forem reativados
    ChevronLeft,
    ChevronRight,
    MoreHorizontal,
    ExternalLink,
    User,
    Clock,
    Coins,
    Award,
} from 'lucide-react'

// Mesmos ícones usados no footer da Home
import instaIcon from '../assets/insta.png'
import youtubeIcon from '../assets/youtube.png'
import xIcon from '../assets/x.png'
import linkedinIcon from '../assets/linkedin.png'

/**
 * Uma reunião marcada em uma data.
 * Por enquanto esses dados chegam via props (mock/estático).
 * Depois é só trocar a origem: buscar do backend por mês/ano
 * (ex: GET /reunioes?mes=10&ano=2025) e passar o array retornado
 * pra esse mesmo componente — o calendário em si não muda.
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
 * Dados de teste inseridos manualmente, direto aqui no arquivo.
 * Serve pra validar o calendário sem precisar de backend ainda.
 * Quando integrar com o banco, é só remover esse array e passar
 * as reuniões reais via prop `reunioes` (ou trocar o valor padrão
 * abaixo por um fetch).
 *
 * IMPORTANTE: a data é sempre no formato ISO "yyyy-MM-dd".
 */
const REUNIOES_TESTE: Reuniao[] = [
    {
        id: '1',
        data: '2026-09-22',
        titulo: 'Apresentação do projeto',
        horaInicio: '18:00',
        horaFim: '22:00',
        responsavel: 'PLAD Equipe',
    },
    {
        id: '2',
        data: '2026-09-05',
        titulo: 'Reunião com psicólogo voluntário',
        horaInicio: '09:00',
        horaFim: '10:00',
        responsavel: 'Dra. Ana Souza',
    },
    {
        id: '3',
        data: '2026-10-03',
        titulo: 'Revisão de triagens',
        horaInicio: '14:00',
        horaFim: '15:30',
    },
]

function capitalizar(texto: string) {
    return texto.charAt(0).toUpperCase() + texto.slice(1)
}

export default function Calendario({
                                       reunioes = REUNIOES_TESTE,
                                       contadores = CONTADORES_TESTE,
                                       onDiaClick,
                                   }: CalendarioProps) {
    const [mesAtual, setMesAtual] = useState(() => new Date())
    const [diaSelecionado, setDiaSelecionado] = useState<string | null>(null)

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

    return (
        <div className="w-full min-h-screen bg-[#f4f5fd] flex flex-col font-sans text-slate-900">
            <div className="flex flex-1">
                {/* Sidebar */}
                <aside className="w-24 lg:w-28 bg-white flex flex-col items-center py-8 shadow-sm shrink-0">
                <span className="font-extrabold text-sm tracking-wider text-black uppercase mb-10">
                    PLAD
                </span>

                    <nav className="flex flex-col items-center gap-8 flex-1">
                        {/* Por enquanto o Painel é a própria página de calendário */}
                        <SidebarLink to="/calendario" icon={<LayoutDashboard size={20} />} label="Painel" active />
                        {/* Ocultados até as páginas existirem:
                        <SidebarLink to="/calendario" icon={<CalendarDays size={20} />} label="Calendário" />
                        <SidebarLink to="/reuniao" icon={<Video size={20} />} label="Reunião" />
                        <SidebarLink to="/comunidade" icon={<Users size={20} />} label="Comunidade" />
                        */}
                    </nav>

                    <button
                        type="button"
                        className="text-gray-400 hover:text-gray-600 transition mb-4"
                        aria-label="Mais opções"
                    >
                        <MoreHorizontal size={20} />
                    </button>
                    <div className="w-8 h-8 rounded-full bg-[#8397ff]" />
                </aside>

                {/* Conteúdo principal */}
                <main className="flex-1 px-10 py-10">
                    {/* Contadores */}
                    <section className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                        <CardContador
                            titulo="Contador de sobriedade"
                            subtitulo="Livre de álcool há:"
                            icone={<Clock size={16} />}
                        >
                        <span className="text-3xl font-black text-black">
                            {contadores.diasSobriedade} {contadores.diasSobriedade === 1 ? 'dia' : 'dias'}
                        </span>
                        </CardContador>

                        <CardContador
                            titulo="Contador de economia"
                            subtitulo="Economizados:"
                            icone={<Coins size={16} />}
                        >
                        <span className="text-3xl font-black text-black leading-none">
                            {contadores.valorEconomizado.toLocaleString('pt-BR', {
                                style: 'currency',
                                currency: 'BRL',
                                maximumFractionDigits: 0,
                            })}
                        </span>
                            <span className="text-[10px] font-bold text-black mt-1">REAIS</span>
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
                            icone={<Award size={16} />}
                        >
                        <span className="text-xl font-black text-black leading-tight">
                            {contadores.proximoMarco.semanas}{' '}
                            {contadores.proximoMarco.semanas === 1 ? 'semana' : 'semanas'}
                        </span>
                            <span className="text-[10px] text-orange-500 mt-0.5">
                            {contadores.proximoMarco.dias} dias
                        </span>
                            <span className="w-16 h-px bg-[#5271ff] mt-1" />
                        </CardContador>
                    </section>

                    <h1 className="text-2xl font-black text-black">Calendário de reuniões</h1>
                    <p className="text-gray-500 text-sm mt-1 mb-8">
                        Visualize as reuniões marcadas e participe
                    </p>

                    <div className="bg-white rounded-3xl shadow-xl shadow-indigo-100 border border-gray-100 p-8">
                        {/* Cabeçalho do mês */}
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-lg font-bold text-black">
                                {capitalizar(format(mesAtual, "MMMM 'de' yyyy", { locale: ptBR }))}
                            </h2>
                            <div className="flex items-center gap-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMesAtual((m) => subMonths(m, 1))
                                        setDiaSelecionado(null)
                                    }}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition"
                                    aria-label="Mês anterior"
                                >
                                    <ChevronLeft size={16} />
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setMesAtual((m) => addMonths(m, 1))
                                        setDiaSelecionado(null)
                                    }}
                                    className="w-8 h-8 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition"
                                    aria-label="Próximo mês"
                                >
                                    <ChevronRight size={16} />
                                </button>
                            </div>
                        </div>

                        {/* Dias da semana */}
                        <div className="grid grid-cols-7 gap-3 mb-3">
                            {DIAS_SEMANA.map((dia) => (
                                <span
                                    key={dia}
                                    className="text-xs font-semibold text-gray-400 text-center uppercase tracking-wide"
                                >
                                {dia}
                            </span>
                            ))}
                        </div>

                        {/* Semanas */}
                        <div className="flex flex-col gap-3">
                            {semanas.map((semana, i) => (
                                <div key={i} className="grid grid-cols-7 gap-3">
                                    {semana.map((dia) => {
                                        const noMes = isSameMonth(dia, mesAtual)
                                        const chave = format(dia, 'yyyy-MM-dd')

                                        // Dias fora do mês atual ficam em branco, sem número —
                                        // igual ao layout do Figma.
                                        if (!noMes) {
                                            return <div key={chave} className="h-16 rounded-2xl" />
                                        }

                                        const doDia = reunioesDoDia(dia)
                                        const temReuniao = doDia.length > 0
                                        const selecionado = diaSelecionado === chave

                                        return (
                                            <div key={chave} className="relative">
                                                <button
                                                    type="button"
                                                    onClick={() => handleClickDia(dia)}
                                                    className={[
                                                        'h-16 w-full rounded-2xl flex items-start justify-start p-3 text-sm font-semibold transition text-left',
                                                        selecionado
                                                            ? 'bg-[#5271ff] text-white'
                                                            : temReuniao
                                                                ? 'bg-indigo-50 text-black hover:bg-indigo-100'
                                                                : 'text-gray-700 hover:bg-gray-50',
                                                        isToday(dia) && !selecionado ? 'ring-1 ring-[#5271ff]' : '',
                                                    ].join(' ')}
                                                >
                                                    {format(dia, 'd')}
                                                </button>

                                                {selecionado && temReuniao && (
                                                    <PopupReuniao dia={dia} reunioes={doDia} />
                                                )}
                                            </div>
                                        )
                                    })}
                                </div>
                            ))}
                        </div>
                    </div>
                </main>
            </div>

            {/* Footer */}
            <footer id="contato" className="bg-[#120063] text-white py-12 px-8">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-gray-300">
                    <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
                        <span>Plad</span>
                        <span>|</span>
                        <span>Sobre</span>
                        <span>|</span>
                        <span>Ética e Compliance</span>
                        <span>|</span>
                        <span>Fale Conosco</span>
                        <span>|</span>
                        <span>Informações Legais</span>
                        <span>|</span>
                        <span>Privacidade</span>
                    </div>

                    {/* Ícones Sociais no Footer */}
                    <div className="flex items-center space-x-5">
                        <a href="#instagram" aria-label="Instagram" className="hover:opacity-80 transition-opacity">
                            <img src={instaIcon} alt="Instagram" className="w-5 h-5 object-contain" />
                        </a>
                        <a href="#youtube" aria-label="YouTube" className="hover:opacity-80 transition-opacity">
                            <img src={youtubeIcon} alt="YouTube" className="w-5 h-5 object-contain" />
                        </a>
                        <a href="#linkedin" aria-label="LinkedIn" className="hover:opacity-80 transition-opacity">
                            <img src={linkedinIcon} alt="LinkedIn" className="w-5 h-5 object-contain" />
                        </a>
                        <a href="#x" aria-label="X" className="hover:opacity-80 transition-opacity">
                            <img src={xIcon} alt="X" className="w-5 h-5 object-contain" />
                        </a>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto mt-8 text-center md:text-left text-xs text-gray-400">
                    © Plataforma de Ajuda a Dependência
                </div>
            </footer>
        </div>
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

/**
 * Popup com os detalhes das reuniões do dia. Abre à direita e alinhado ao topo
 * do dia; se não couber na janela, vai para a esquerda e/ou sobe, e por fim é
 * deslocado o mínimo necessário para ficar totalmente visível.
 */
function PopupReuniao({ dia, reunioes }: { dia: Date; reunioes: Reuniao[] }) {
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
                    : proxima
            )
        }

        reposicionar()
        window.addEventListener('resize', reposicionar)
        return () => window.removeEventListener('resize', reposicionar)
    }, [])

    return (
        <div
            ref={popupRef}
            style={pos.dx || pos.dy ? { transform: `translate(${pos.dx}px, ${pos.dy}px)` } : undefined}
            className={[
                'absolute z-20 w-64 bg-[#120063] text-white rounded-xl shadow-2xl p-4 space-y-3',
                pos.lado === 'direita' ? 'left-full ml-3' : 'right-full mr-3',
                pos.vertical === 'topo' ? 'top-0' : 'bottom-0',
            ].join(' ')}
        >
            <ExternalLink size={14} className="text-gray-300 ml-auto" />
            {reunioes.map((r) => (
                <div key={r.id} className="space-y-1">
                    <p className="font-bold text-sm leading-snug">{r.titulo}</p>
                    <p className="text-xs text-gray-300">
                        {capitalizar(format(dia, "EEEE, d 'de' MMMM", { locale: ptBR }))} · {r.horaInicio} -{' '}
                        {r.horaFim}
                    </p>
                    {r.responsavel && (
                        <p className="flex items-center gap-1.5 text-xs text-gray-300 pt-1">
                            <User size={12} />
                            {r.responsavel}
                        </p>
                    )}
                </div>
            ))}
        </div>
    )
}

function CardContador({
                          titulo,
                          subtitulo,
                          icone,
                          children,
                      }: {
    titulo: string
    subtitulo: React.ReactNode
    icone: React.ReactNode
    children: React.ReactNode
}) {
    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 flex flex-col items-center shadow-sm">
            <div className="w-full">
                <span className="inline-block bg-[#5271ff] text-white text-sm font-medium px-3 py-0.5 rounded-md">
                    {titulo}
                </span>
                <p className="text-xs text-gray-700 mt-2 ml-1 min-h-[2rem] leading-snug">{subtitulo}</p>
            </div>

            {/* Círculo com halo */}
            <div className="relative mt-4 mb-2">
                <div
                    className="w-44 h-44 rounded-full border border-gray-200 flex items-center justify-center"
                    style={{
                        // O degradê nasce na borda do círculo de dentro (~73% do raio)
                        // e vai sumindo até o anel de fora.
                        background:
                            'radial-gradient(circle closest-side, rgba(131,151,255,0.6) 70%, rgba(131,151,255,0) 100%)',
                    }}
                >
                    <div className="w-32 h-32 rounded-full bg-white flex flex-col items-center justify-center">
                        {children}
                    </div>
                </div>
                <div className="absolute top-2 left-2 w-8 h-8 rounded-full bg-white shadow flex items-center justify-center text-[#5271ff]">
                    {icone}
                </div>
            </div>
        </div>
    )
}

function SidebarLink({
                         to,
                         icon,
                         label,
                         active = false,
                     }: {
    to: string
    icon: React.ReactNode
    label: string
    active?: boolean
}) {
    return (
        <Link
            to={to}
            className={[
                'flex flex-col items-center gap-1 text-[11px] font-medium transition',
                active ? 'text-[#5271ff]' : 'text-gray-400 hover:text-gray-600',
            ].join(' ')}
        >
            {icon}
            {label}
        </Link>
    )
}

/**
 * Como testar com datas manuais:
 * basta editar o array REUNIOES_TESTE lá em cima — adicione,
 * troque ou remova objetos com a data (ISO "yyyy-MM-dd"), título,
 * horário e responsável que quiser. Como ele é o valor padrão da
 * prop `reunioes`, renderizando <Calendario /> sem passar nada
 * você já vê essas datas marcadas no mês certo.
 *
 * Se algum dia quiser passar reuniões vindas de outro lugar
 * (ex: do banco), é só usar <Calendario reunioes={dadosReais} />
 * — a prop explícita sempre sobrescreve o array de teste.
 */