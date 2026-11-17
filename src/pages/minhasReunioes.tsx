import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { format, isToday, isYesterday, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarClock, CalendarDays, ChevronRight, DoorOpen, Video } from 'lucide-react'

import { ApiError } from '../api/client'
import { aberturaDaSala, listMeetings, podeEntrar, seloDaReuniao, textoDeVagas, vagasRestantes } from '../api/meetings'
import type { MeetingResponseDTO } from '../api/meetings'
import Carregando from '../components/Carregando'
import EstadoErro from '../components/EstadoErro'
import EstadoVazio from '../components/EstadoVazio'
import LayoutPainel from '../components/LayoutPainel'
import useAgora from '../components/useAgora'
import { classeBotao } from '../components/estilos'
import { formatarHorario, formatarRegistro } from '../components/formatar'
import { useSessao } from '../session/SessaoContext'

/**
 * Minhas reuniões (dependente e psicólogo), a partir do frame "/reuniao" do Figma (4:234): "Próximas" em cartões (o
 * primeiro, o mais perto, em azul) e "Recentes" em lista agrupada por dia. O backend não tem uma rota "as minhas": a tela
 * lê o calendário (GET /meetings) e fica com as de `registered_by_me` (dependente) ou `owned_by_me` (psicólogo). Cada
 * leitura cobre no máximo 61 dias (o teto do backend é 62), a partir de 3 horas atrás (uma reunião dura até 180 minutos:
 * as que começaram antes disso já terminaram): uma para frente, para as próximas, e uma para trás, para as recentes. Uma
 * reunião daqui a mais de dois meses só aparece quando chegar perto.
 * Cada cartão leva ao detalhe (/minhas-reunioes/:id), onde ficam as ações (cancelar a inscrição, editar, cancelar...);
 * aqui fica só "Entrar", que leva à sala ao vivo e aparece dentro da janela (10 min antes do início até o fim, reunião
 * agendada: `podeEntrar`), habilitado sozinho (`useAgora`), sem recarregar a página.
 * Do frame ficaram de fora "Chegar atrasado" e "Lembrete" (não há lembretes no backend),
 * os filtros "Todas/Conteúdo" (não há conteúdo) e o tipo "Reunião Informativa" (a reunião não tem tipo: no lugar, as vagas).
 */

const JANELA_DIAS = 61
const MS_POR_DIA = 24 * 60 * 60 * 1000
const MS_DE_UMA_REUNIAO_MAXIMA = 180 * 60 * 1000
const MAX_RECENTES = 10

interface Carga {
    versao: number // a que pedido de busca esta resposta pertence
    agora: number // o instante em que a busca foi feita: tudo é classificado em relação a ele
    reunioes: MeetingResponseDTO[] // só as minhas (inscritas ou criadas)
    erro: string | null
}

function capitalizar(texto: string) {
    return texto.charAt(0).toUpperCase() + texto.slice(1)
}

// Ainda vale como "próxima": não terminou e o anfitrião não a encerrou. Cancelada que ainda não passou fica, riscada e
// com o selo, porque é aqui que a pessoa descobre (o sistema não manda notificação)
function ehProxima(m: MeetingResponseDTO, agora: number) {
    return Date.parse(m.ends_at) > agora && m.status !== 'ended'
}

// Botão branco dos cartões, como no frame (branco sobre o azul e sobre o lilás), com 44 px de altura
const CLASSE_BOTAO_CARTAO =
    'inline-flex min-h-11 items-center gap-1.5 rounded-botao bg-white px-4 text-sm font-medium text-black transition-colors hover:bg-gray-100'

export default function MinhasReunioes() {
    const { me } = useSessao()
    const ehPsicologo = me?.type_user === 'psicologo'
    const [versao, setVersao] = useState(0)
    const [carga, setCarga] = useState<Carga | null>(null)

    const recarregar = useCallback(() => setVersao((v) => v + 1), [])

    useEffect(() => {
        let obsoleta = false
        const agora = Date.now()
        const corte = agora - MS_DE_UMA_REUNIAO_MAXIMA
        const limite = JANELA_DIAS * MS_POR_DIA
        // O psicólogo vê as que ele criou; o dependente, as em que se inscreveu
        const minha = (m: MeetingResponseDTO) => (ehPsicologo ? m.owned_by_me : m.registered_by_me)
        Promise.all([
            listMeetings(new Date(corte).toISOString(), new Date(corte + limite).toISOString()),
            listMeetings(new Date(corte - limite).toISOString(), new Date(corte).toISOString()),
        ])
            .then(([adiante, atras]) => {
                if (obsoleta) return
                setCarga({ versao, agora, reunioes: [...atras, ...adiante].filter(minha), erro: null })
            })
            .catch((erro: unknown) => {
                if (obsoleta) return
                const mensagem = erro instanceof ApiError ? erro.message : 'Algo deu errado. Tente novamente em instantes.'
                setCarga({ versao, agora, reunioes: [], erro: mensagem })
            })
        return () => {
            obsoleta = true
        }
    }, [versao, ehPsicologo])

    const cargaAtual = carga?.versao === versao ? carga : null

    const { proximas, recentes } = useMemo(() => {
        if (!cargaAtual) return { proximas: [], recentes: [] }
        const agora = cargaAtual.agora
        const porInicio = (a: MeetingResponseDTO, b: MeetingResponseDTO) => Date.parse(a.starts_at) - Date.parse(b.starts_at)
        return {
            proximas: cargaAtual.reunioes.filter((m) => ehProxima(m, agora)).sort(porInicio),
            recentes: cargaAtual.reunioes
                .filter((m) => !ehProxima(m, agora))
                .sort((a, b) => porInicio(b, a))
                .slice(0, MAX_RECENTES),
        }
    }, [cargaAtual])

    // O "agora" dos cartões anda sozinho: o "Entrar" aparece quando a sala abre e "Em andamento" muda no início, sem
    // recarregar. A classificação em próximas/recentes continua presa ao instante da busca, para um cartão não pular de
    // lugar com a pessoa olhando para ele.
    const limitesDoRelogio = useMemo(
        () => proximas.flatMap((m) => [aberturaDaSala(m), Date.parse(m.starts_at), Date.parse(m.ends_at)]),
        [proximas],
    )
    const agoraVivo = useAgora(limitesDoRelogio)

    return (
        <LayoutPainel titulo="Minhas reuniões">
            <main id="conteudo" tabIndex={-1} className="min-w-0 flex-1 focus:outline-none">
                <header className="flex items-center gap-3 border-b border-borda-suave px-4 py-4 md:px-6">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-plad text-white">
                        <Video size={20} aria-hidden="true" />
                    </span>
                    <h1 className="font-outfit text-base font-semibold text-black">Minhas reuniões</h1>
                </header>

                <div className="space-y-10 px-4 py-6 md:px-6 md:py-8">
                    {cargaAtual === null && <Carregando mensagem="Carregando as suas reuniões…" />}

                    {cargaAtual?.erro && <EstadoErro mensagem={cargaAtual.erro} onTentarNovamente={recarregar} />}

                    {cargaAtual && !cargaAtual.erro && (
                        <>
                            <section aria-labelledby="titulo-proximas">
                                <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                                    <h2 id="titulo-proximas" className="font-outfit text-xl font-semibold text-black">
                                        Próximas
                                    </h2>
                                    <Link
                                        to="/Calendario"
                                        className="inline-flex min-h-11 items-center gap-2 text-sm font-medium text-black hover:underline"
                                    >
                                        <CalendarClock size={22} aria-hidden="true" />
                                        Abrir calendário
                                    </Link>
                                </div>

                                {proximas.length === 0 ? (
                                    <EstadoVazio
                                        className="rounded-cartao border border-dashed border-gray-300"
                                        icone={<CalendarDays size={26} />}
                                        titulo={
                                            ehPsicologo
                                                ? 'Você não tem reuniões marcadas'
                                                : 'Você ainda não se inscreveu em nenhuma reunião'
                                        }
                                        descricao={
                                            ehPsicologo
                                                ? 'Use "Criar reunião" no painel para marcar uma.'
                                                : 'Veja no calendário as reuniões marcadas e escolha uma para se inscrever.'
                                        }
                                        acao={
                                            <Link to="/Calendario" className={classeBotao()}>
                                                {ehPsicologo ? 'Ir para o painel' : 'Ver o calendário'}
                                            </Link>
                                        }
                                    />
                                ) : (
                                    <ul className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                                        {proximas.map((m, i) => (
                                            <li key={m.id}>
                                                <CartaoProxima reuniao={m} agora={agoraVivo} destaque={i === 0} />
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>

                            <section aria-labelledby="titulo-recentes">
                                <h2 id="titulo-recentes" className="mb-5 font-outfit text-xl font-semibold text-black">
                                    Recentes
                                </h2>
                                {recentes.length === 0 ? (
                                    <p className="text-sm text-texto-suave">
                                        {ehPsicologo
                                            ? 'As reuniões que você conduziu e que já terminaram aparecem aqui.'
                                            : 'As reuniões em que você se inscreveu e que já terminaram aparecem aqui.'}
                                    </p>
                                ) : (
                                    <ListaRecentes reunioes={recentes} />
                                )}
                            </section>
                        </>
                    )}
                </div>
            </main>
        </LayoutPainel>
    )
}

interface CartaoProximaProps {
    reuniao: MeetingResponseDTO
    agora: number
    /** O primeiro cartão, o mais próximo, vai em azul, como no frame */
    destaque: boolean
}

function CartaoProxima({ reuniao: m, agora, destaque }: CartaoProximaProps) {
    const cancelada = m.status === 'cancelled'
    const jaComecou = Date.parse(m.starts_at) <= agora
    // O selo da situação; a uma reunião que ainda aceita inscrição, as vagas (ou "N de C inscritos", para o anfitrião)
    const selo = seloDaReuniao(m, agora)
    const vagas =
        !cancelada && !jaComecou
            ? m.owned_by_me
                ? `${m.registered_count} de ${m.capacity} inscritos`
                : textoDeVagas(vagasRestantes(m.capacity, m.registered_count))
            : null
    const suave = destaque ? 'text-white' : 'text-texto-suave'

    return (
        <article
            aria-labelledby={`titulo-reuniao-${m.id}`}
            className={`flex h-full flex-col justify-between gap-5 rounded-cartao p-6 ${destaque ? 'bg-plad text-white' : 'bg-plad-fundo text-black'}`}
        >
            <div className="flex gap-3">
                <span aria-hidden="true" className={`w-1 shrink-0 rounded-full ${destaque ? 'bg-white' : 'bg-plad'}`} />
                <div className="min-w-0 space-y-1">
                    <h3
                        id={`titulo-reuniao-${m.id}`}
                        className={`font-outfit text-base font-semibold leading-snug ${cancelada ? 'line-through' : ''}`.trim()}
                    >
                        <Link to={`/minhas-reunioes/${m.id}`} className="hover:underline">
                            {m.title}
                        </Link>
                    </h3>
                    <p className={`text-xs ${suave}`}>{formatarHorario(m.starts_at, m.ends_at)}</p>
                    {/* O registro no conselho é o que o anfitrião informou no cadastro (o sistema não o confere): está aqui
                        para quem vai participar conferir quem conduz. O anfitrião não vê a própria linha */}
                    {!m.owned_by_me && (
                        <p className={`text-xs ${suave}`}>
                            Com {m.host.name} · {formatarRegistro(m.host)}
                        </p>
                    )}
                    {vagas && <p className={`text-xs ${suave}`}>{vagas}</p>}
                </div>
            </div>

            <div className="space-y-4">
                {selo && (
                    <span
                        className={`inline-block rounded-botao px-2.5 py-1 text-xs font-medium ${destaque ? 'border border-white text-white' : 'bg-plad text-white'}`}
                    >
                        {selo}
                    </span>
                )}
                <div className="flex flex-wrap items-center gap-3">
                    {/* Só dentro da janela da sala (10 min antes do início até o fim); se o relógio daqui estiver adiantado, a
                        sala responde 409 e explica quando abre */}
                    {podeEntrar(m, agora) && (
                        <Link to={`/reuniao/${m.id}`} className={CLASSE_BOTAO_CARTAO}>
                            <DoorOpen size={16} aria-hidden="true" />
                            Entrar na reunião
                        </Link>
                    )}
                    <Link
                        to={`/minhas-reunioes/${m.id}`}
                        aria-label={`Ver detalhes de ${m.title}`}
                        className="inline-flex min-h-11 items-center gap-1 text-sm font-medium underline-offset-4 hover:underline"
                    >
                        Ver detalhes
                        <ChevronRight size={16} aria-hidden="true" />
                    </Link>
                </div>
            </div>
        </article>
    )
}

// "Hoje", "Ontem" ou o dia por extenso
function rotuloDoDia(dia: Date) {
    if (isToday(dia)) return 'Hoje'
    if (isYesterday(dia)) return 'Ontem'
    return capitalizar(format(dia, "EEEE, d 'de' MMMM", { locale: ptBR }))
}

function ListaRecentes({ reunioes }: { reunioes: MeetingResponseDTO[] }) {
    // Já vêm da mais nova para a mais antiga: agrupa por dia mantendo essa ordem
    const grupos: { chave: string; rotulo: string; itens: MeetingResponseDTO[] }[] = []
    for (const m of reunioes) {
        const dia = parseISO(m.starts_at)
        const chave = format(dia, 'yyyy-MM-dd')
        const ultimo = grupos[grupos.length - 1]
        if (ultimo?.chave === chave) {
            ultimo.itens.push(m)
        } else {
            grupos.push({ chave, rotulo: rotuloDoDia(dia), itens: [m] })
        }
    }

    return (
        <div className="space-y-6 rounded-cartao bg-plad-fundo p-4 md:p-6">
            {grupos.map((grupo) => (
                <div key={grupo.chave}>
                    <h3 className="mb-2 text-xs font-medium text-texto-suave">{grupo.rotulo}</h3>
                    <ul>
                        {grupo.itens.map((m) => {
                            const cancelada = m.status === 'cancelled'
                            return (
                                <li
                                    key={m.id}
                                    className="flex flex-col gap-3 border-b border-white py-4 last:border-b-0 sm:flex-row sm:items-center"
                                >
                                    <div className="flex min-w-0 flex-1 items-center gap-3">
                                        <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-black">
                                            <CalendarDays size={20} aria-hidden="true" />
                                        </span>
                                        <div className="min-w-0">
                                            <Link
                                                to={`/minhas-reunioes/${m.id}`}
                                                className={`font-outfit text-base font-semibold text-black hover:underline ${cancelada ? 'line-through' : ''}`.trim()}
                                            >
                                                {m.title}
                                            </Link>
                                            <p className="text-xs text-texto-suave">
                                                {format(parseISO(m.starts_at), 'HH:mm')} - {format(parseISO(m.ends_at), 'HH:mm')}
                                            </p>
                                        </div>
                                    </div>
                                    {!m.owned_by_me && (
                                        <div className="flex items-center gap-2 pl-13 sm:pl-0">
                                            <span aria-hidden="true" className="size-6 shrink-0 rounded-full bg-avatar" />
                                            <span className="text-xs text-black">{m.host.name}</span>
                                        </div>
                                    )}
                                    <span className="self-start rounded-botao bg-plad px-2.5 py-1 text-xs font-medium text-white sm:self-center">
                                        {cancelada ? 'Cancelada' : 'Encerrada'}
                                    </span>
                                </li>
                            )
                        })}
                    </ul>
                </div>
            ))}
        </div>
    )
}
