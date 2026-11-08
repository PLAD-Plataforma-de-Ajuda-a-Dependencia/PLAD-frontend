import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { format, isToday, isYesterday, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarClock, CalendarDays, DoorOpen, UserMinus, Video } from 'lucide-react'

import { ApiError } from '../api/client'
import {
    aberturaDaSala,
    cancelRegistration,
    listMeetings,
    mensagemDeInscricao,
    podeEntrar,
    textoDeVagas,
    vagasRestantes,
} from '../api/meetings'
import type { MeetingResponseDTO } from '../api/meetings'
import Carregando from '../components/Carregando'
import EstadoErro from '../components/EstadoErro'
import EstadoVazio from '../components/EstadoVazio'
import LayoutPainel from '../components/LayoutPainel'
import ModalConfirmacao from '../components/ModalConfirmacao'
import { useToast } from '../components/ToastContext'
import useAgora from '../components/useAgora'
import { classeBotao } from '../components/estilos'

/**
 * Minhas reuniões (dependente), a partir do frame "Reunião" do Figma: "Próximas" em cartões (o primeiro, o mais perto,
 * em azul) e "Recentes" em lista agrupada por dia. O backend não tem uma rota "as minhas": a tela lê o calendário
 * (GET /meetings) e fica com as de `registered_by_me`. Cada leitura cobre no máximo 61 dias (o teto do backend é 62),
 * a partir de 3 horas atrás (uma reunião dura até 180 minutos: as que começaram antes disso já terminaram): uma para
 * frente, para as próximas, e uma para trás, para as recentes. Uma reunião daqui a mais de dois meses só aparece quando
 * chegar perto.
 * "Entrar" leva à sala ao vivo (`/reuniao/:id`) e só aparece dentro da janela (10 min antes do início até o fim, reunião
 * agendada: `podeEntrar`); ele se habilita sozinho (`useAgora`), sem recarregar a página.
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
    reunioes: MeetingResponseDTO[] // só as inscritas
    erro: string | null
}

function capitalizar(texto: string) {
    return texto.charAt(0).toUpperCase() + texto.slice(1)
}

// Ainda vale como "próxima": não terminou e o anfitrião não a encerrou. Cancelada que ainda não passou fica, riscada e
// com o aviso, porque é aqui que a pessoa descobre (o sistema não manda notificação)
function ehProxima(m: MeetingResponseDTO, agora: number) {
    return Date.parse(m.ends_at) > agora && m.status !== 'ended'
}

// Botões brancos dos cartões, como no frame (branco sobre o azul e sobre o lilás), com 44 px de altura
const CLASSE_BOTAO_CARTAO =
    'inline-flex min-h-11 items-center gap-1.5 rounded-botao bg-white px-4 text-sm font-medium text-black transition-colors hover:bg-gray-100 disabled:cursor-wait disabled:opacity-60'

export default function MinhasReunioes() {
    const { avisar } = useToast()
    const [versao, setVersao] = useState(0)
    const [carga, setCarga] = useState<Carga | null>(null)
    const [aCancelar, setACancelar] = useState<MeetingResponseDTO | null>(null)
    const [cancelando, setCancelando] = useState(false)

    const recarregar = useCallback(() => setVersao((v) => v + 1), [])

    useEffect(() => {
        let obsoleta = false
        const agora = Date.now()
        const corte = agora - MS_DE_UMA_REUNIAO_MAXIMA
        const limite = JANELA_DIAS * MS_POR_DIA
        Promise.all([
            listMeetings(new Date(corte).toISOString(), new Date(corte + limite).toISOString()),
            listMeetings(new Date(corte - limite).toISOString(), new Date(corte).toISOString()),
        ])
            .then(([adiante, atras]) => {
                if (obsoleta) return
                setCarga({ versao, agora, reunioes: [...atras, ...adiante].filter((m) => m.registered_by_me), erro: null })
            })
            .catch((erro: unknown) => {
                if (obsoleta) return
                const mensagem = erro instanceof ApiError ? erro.message : 'Algo deu errado. Tente novamente em instantes.'
                setCarga({ versao, agora, reunioes: [], erro: mensagem })
            })
        return () => {
            obsoleta = true
        }
    }, [versao])

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

    async function confirmarCancelamento() {
        if (!aCancelar || cancelando) return
        const reuniao = aCancelar
        setCancelando(true)
        try {
            await cancelRegistration(reuniao.id)
            avisar('Inscrição cancelada.', 'sucesso')
            // Já não está inscrita: sai daqui sem buscar tudo de novo
            setCarga((atual) => atual && { ...atual, reunioes: atual.reunioes.filter((m) => m.id !== reuniao.id) })
        } catch (erro) {
            avisar(mensagemDeInscricao(erro), 'erro')
            // O motivo costuma ser a reunião ter mudado de situação: busca de novo
            recarregar()
        } finally {
            setCancelando(false)
            setACancelar(null)
        }
    }

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
                                        titulo="Você ainda não se inscreveu em nenhuma reunião"
                                        descricao="Veja no calendário as reuniões marcadas e escolha uma para se inscrever."
                                        acao={
                                            <Link to="/Calendario" className={classeBotao()}>
                                                Ver o calendário
                                            </Link>
                                        }
                                    />
                                ) : (
                                    <ul className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
                                        {proximas.map((m, i) => (
                                            <li key={m.id}>
                                                <CartaoProxima
                                                    reuniao={m}
                                                    agora={agoraVivo}
                                                    destaque={i === 0}
                                                    onCancelarInscricao={() => setACancelar(m)}
                                                />
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
                                        As reuniões em que você se inscreveu e que já terminaram aparecem aqui.
                                    </p>
                                ) : (
                                    <ListaRecentes reunioes={recentes} />
                                )}
                            </section>
                        </>
                    )}
                </div>
            </main>

            <ModalConfirmacao
                aberto={aCancelar !== null}
                titulo="Cancelar a sua inscrição?"
                descricao={
                    aCancelar
                        ? `Você deixa de ter um lugar em "${aCancelar.title}". Se a reunião lotar, pode não ser possível voltar.`
                        : undefined
                }
                rotuloConfirmar="Cancelar inscrição"
                rotuloCancelar="Voltar"
                carregando={cancelando}
                onConfirmar={confirmarCancelamento}
                onCancelar={() => setACancelar(null)}
            />
        </LayoutPainel>
    )
}

interface CartaoProximaProps {
    reuniao: MeetingResponseDTO
    agora: number
    /** O primeiro cartão, o mais próximo, vai em azul, como no frame */
    destaque: boolean
    onCancelarInscricao: () => void
}

function CartaoProxima({ reuniao: m, agora, destaque, onCancelarInscricao }: CartaoProximaProps) {
    const inicio = parseISO(m.starts_at)
    const cancelada = m.status === 'cancelled'
    const jaComecou = Date.parse(m.starts_at) <= agora
    const terminou = Date.parse(m.ends_at) <= agora
    const rotulo = cancelada
        ? 'Reunião cancelada'
        : terminou
          ? 'Reunião terminada'
          : jaComecou
            ? 'Em andamento'
            : textoDeVagas(vagasRestantes(m.capacity, m.registered_count))

    return (
        <article
            className={`flex h-full flex-col justify-between gap-5 rounded-cartao p-6 ${destaque ? 'bg-plad text-white' : 'bg-plad-fundo text-black'}`}
        >
            <div className="flex gap-3">
                <span aria-hidden="true" className={`w-1 shrink-0 rounded-full ${destaque ? 'bg-white' : 'bg-plad'}`} />
                <div className="min-w-0 space-y-1">
                    <h3 className={`font-outfit text-base font-semibold leading-snug ${cancelada ? 'line-through' : ''}`.trim()}>
                        {m.title}
                    </h3>
                    <p className={`text-xs ${destaque ? 'text-white' : 'text-texto-suave'}`}>
                        {capitalizar(format(inicio, "EEEE, d 'de' MMMM", { locale: ptBR }))} · {format(inicio, 'HH:mm')} -{' '}
                        {format(parseISO(m.ends_at), 'HH:mm')}
                    </p>
                    <p className={`text-xs ${destaque ? 'text-white' : 'text-texto-suave'}`}>Com {m.host}</p>
                </div>
            </div>

            <div className="space-y-4">
                <span
                    className={`inline-block rounded-botao px-2.5 py-1 text-xs font-medium ${destaque ? 'border border-white text-white' : 'bg-plad text-white'}`}
                >
                    {rotulo}
                </span>
                {/* Depois que a reunião começa (ou é cancelada) a inscrição não muda mais: o backend recusaria */}
                {!cancelada && !jaComecou && (
                    <div>
                        <button type="button" onClick={onCancelarInscricao} className={CLASSE_BOTAO_CARTAO}>
                            <UserMinus size={16} aria-hidden="true" />
                            Cancelar inscrição
                        </button>
                    </div>
                )}
                {/* Só dentro da janela da sala (10 min antes do início até o fim); se o relógio daqui estiver adiantado, a sala
                    responde 409 e explica quando abre */}
                {podeEntrar(m, agora) && (
                    <div>
                        <Link to={`/reuniao/${m.id}`} className={CLASSE_BOTAO_CARTAO}>
                            <DoorOpen size={16} aria-hidden="true" />
                            Entrar na reunião
                        </Link>
                    </div>
                )}
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
                                            <p className={`font-outfit text-base font-semibold text-black ${cancelada ? 'line-through' : ''}`.trim()}>
                                                {m.title}
                                            </p>
                                            <p className="text-xs text-texto-suave">
                                                {format(parseISO(m.starts_at), 'HH:mm')} - {format(parseISO(m.ends_at), 'HH:mm')}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2 pl-13 sm:pl-0">
                                        <span aria-hidden="true" className="size-6 shrink-0 rounded-full bg-avatar" />
                                        <span className="text-xs text-black">{m.host}</span>
                                    </div>
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
