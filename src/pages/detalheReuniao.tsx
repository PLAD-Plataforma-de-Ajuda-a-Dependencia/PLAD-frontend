import { useCallback, useEffect, useId, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, CalendarDays, Check, ClipboardList, DoorOpen, Pencil, UserMinus, UserPlus, Users, Video, X } from 'lucide-react'

import { ApiError } from '../api/client'
import {
    aberturaDaSala,
    aceitaInscricao,
    cancelMeeting,
    cancelRegistration,
    endMeeting,
    getMeeting,
    listParticipants,
    mensagemDeInscricao,
    podeEntrar,
    seloDaReuniao,
    textoDeVagas,
    vagasRestantes,
} from '../api/meetings'
import type { MeetingParticipantDTO, MeetingResponseDTO } from '../api/meetings'
import Botao from '../components/Botao'
import Carregando from '../components/Carregando'
import EstadoErro from '../components/EstadoErro'
import EstadoVazio from '../components/EstadoVazio'
import FormularioReuniao from '../components/FormularioReuniao'
import LayoutPainel from '../components/LayoutPainel'
import ModalConfirmacao from '../components/ModalConfirmacao'
import TermoDeParticipacao from '../components/TermoDeParticipacao'
import { useToast } from '../components/ToastContext'
import useAgora from '../components/useAgora'
import useInscricao from '../components/useInscricao'
import useVoltar from '../components/useVoltar'
import { classeBotao } from '../components/estilos'
import { formatarHorario, formatarRegistro } from '../components/formatar'
import { useSessao } from '../session/SessaoContext'

/**
 * Detalhe de uma reunião (/minhas-reunioes/:id), para o dependente e para o psicólogo. Sem frame no Figma (provisório):
 * segue a linguagem do frame "/reuniao" (4:234), o mesmo de Minhas reuniões. Lê só GET /meetings/{id}, que já traz tudo
 * (título, descrição, anfitrião e registro, horário, vagas, situação, `owned_by_me`, `registered_by_me`).
 * - Dependente: inscrever-se (consentimento de saúde → termo → POST, `useInscricao`), cancelar a inscrição e entrar.
 * - Anfitrião: editar (o mesmo FormularioReuniao do painel), encerrar, cancelar, entrar e a lista de inscritos, que é
 *   auditada (ver `ListaInscritos`).
 * - Outro psicólogo vê só as informações.
 * No máximo uma ação principal (Entrar, ou Inscrever-se); as destrutivas são `perigo-contorno` e pedem confirmação.
 */

interface Carga {
    versao: number // a que pedido de busca esta resposta pertence
    reuniao: MeetingResponseDTO | null
    naoEncontrada: boolean
    erro: string | null
}

type Confirmacao = 'cancelar-inscricao' | 'cancelar-reuniao' | 'encerrar'

// Só um inteiro positivo é um id de reunião; o resto é "não encontrada" sem nem perguntar ao backend
function lerId(valor: string | undefined): number | null {
    return valor && /^[1-9]\d{0,15}$/.test(valor) ? Number(valor) : null
}

export default function DetalheReuniao() {
    const { id } = useParams()
    const idReuniao = lerId(id)
    const { me } = useSessao()
    const { avisar } = useToast()
    const voltar = useVoltar('/minhas-reunioes')
    const [versao, setVersao] = useState(0)
    const [carga, setCarga] = useState<Carga | null>(null)
    const [editando, setEditando] = useState(false)
    const [confirmacao, setConfirmacao] = useState<Confirmacao | null>(null)
    const [executando, setExecutando] = useState(false)
    // Depois da inscrição de quem ainda não respondeu a triagem: o convite opcional
    const [conviteTriagem, setConviteTriagem] = useState(false)

    const recarregar = useCallback(() => setVersao((v) => v + 1), [])

    useEffect(() => {
        if (idReuniao === null) return
        let obsoleta = false
        getMeeting(idReuniao)
            .then((reuniao) => {
                if (!obsoleta) setCarga({ versao, reuniao, naoEncontrada: false, erro: null })
            })
            .catch((erro: unknown) => {
                if (obsoleta) return
                const naoEncontrada = erro instanceof ApiError && erro.status === 404
                const mensagem = erro instanceof ApiError ? erro.message : 'Algo deu errado. Tente novamente em instantes.'
                setCarga({ versao, reuniao: null, naoEncontrada, erro: naoEncontrada ? null : mensagem })
            })
        return () => {
            obsoleta = true
        }
    }, [idReuniao, versao])

    const cargaAtual = carga?.versao === versao ? carga : null
    const reuniao = cargaAtual?.reuniao ?? null

    // A tela troca a reunião pela que a API devolve depois de cada ação, sem buscar de novo
    const trocarReuniao = useCallback((atualizada: MeetingResponseDTO) => {
        setCarga((atual) => atual && { ...atual, reuniao: atualizada })
    }, [])

    const limitesDoRelogio = useMemo(
        () => (reuniao ? [aberturaDaSala(reuniao), Date.parse(reuniao.starts_at), Date.parse(reuniao.ends_at)] : []),
        [reuniao],
    )
    const agora = useAgora(limitesDoRelogio)

    // Depois de um erro (a reunião lotou, começou, foi cancelada) a tela pode estar velha: lê de novo, sem tirá-la da tela
    const relerEmSilencio = useCallback(
        (idLido: number) => {
            getMeeting(idLido)
                .then(trocarReuniao)
                .catch(() => {
                    // fica como está; "Voltar" e abrir de novo buscam outra vez
                })
        },
        [trocarReuniao],
    )

    const inscricao = useInscricao({
        origem: `/minhas-reunioes/${id ?? ''}`,
        aoInscrever: (atualizada) => {
            trocarReuniao(atualizada)
            if (me?.has_triage === false) setConviteTriagem(true)
        },
        aoFalhar: relerEmSilencio,
    })

    async function confirmar() {
        if (!reuniao || !confirmacao || executando) return
        setExecutando(true)
        try {
            if (confirmacao === 'cancelar-inscricao') {
                await cancelRegistration(reuniao.id)
                avisar('Inscrição cancelada.', 'sucesso')
                setConviteTriagem(false)
                // O DELETE não devolve a reunião: lê de novo (as vagas mudaram)
                relerEmSilencio(reuniao.id)
            } else if (confirmacao === 'cancelar-reuniao') {
                trocarReuniao(await cancelMeeting(reuniao.id))
                avisar('Reunião cancelada.', 'sucesso')
            } else {
                trocarReuniao(await endMeeting(reuniao.id))
                avisar('Reunião encerrada.', 'sucesso')
            }
        } catch (erro) {
            avisar(
                confirmacao === 'cancelar-inscricao'
                    ? mensagemDeInscricao(erro)
                    : erro instanceof ApiError
                      ? erro.message
                      : 'Algo deu errado. Tente novamente em instantes.',
                'erro',
            )
            // O motivo costuma ser a reunião ter mudado de situação: lê de novo
            relerEmSilencio(reuniao.id)
        } finally {
            setExecutando(false)
            setConfirmacao(null)
        }
    }

    const naoEncontrada = idReuniao === null || cargaAtual?.naoEncontrada === true

    return (
        <LayoutPainel titulo={reuniao?.title ?? 'Reunião'}>
            <main id="conteudo" tabIndex={-1} className="min-w-0 flex-1 focus:outline-none">
                <header className="flex items-center gap-3 border-b border-borda-suave px-4 py-4 md:px-6">
                    <span className="flex size-9 items-center justify-center rounded-lg bg-plad text-white">
                        <Video size={20} aria-hidden="true" />
                    </span>
                    <p className="font-outfit text-base font-semibold text-black">Reunião</p>
                </header>

                <div className="space-y-6 px-4 py-6 md:px-6 md:py-8">
                    <button
                        type="button"
                        onClick={voltar}
                        className="-ml-3 inline-flex min-h-11 items-center gap-1.5 px-3 text-sm font-medium text-plad hover:underline"
                    >
                        <ArrowLeft size={16} aria-hidden="true" /> Voltar
                    </button>

                    {naoEncontrada && (
                        <EstadoVazio
                            className="rounded-cartao border border-dashed border-gray-300"
                            icone={<CalendarDays size={26} />}
                            titulo="Reunião não encontrada"
                            descricao="Ela pode ter sido apagada, ou o endereço está incompleto. Veja as suas reuniões ou o calendário."
                            acao={
                                <Link to="/minhas-reunioes" className={classeBotao()}>
                                    Ver minhas reuniões
                                </Link>
                            }
                        />
                    )}

                    {!naoEncontrada && cargaAtual === null && <Carregando mensagem="Carregando a reunião…" />}

                    {cargaAtual?.erro && <EstadoErro mensagem={cargaAtual.erro} onTentarNovamente={recarregar} />}

                    {reuniao && me && (
                        <>
                            <CartaoReuniao
                                reuniao={reuniao}
                                agora={agora}
                                ehDependente={me.type_user === 'dependente'}
                                inscrevendo={inscricao.emCurso !== null}
                                onInscrever={() => inscricao.pedir(reuniao)}
                                onCancelarInscricao={() => setConfirmacao('cancelar-inscricao')}
                                onEditar={() => setEditando(true)}
                                onEncerrar={() => setConfirmacao('encerrar')}
                                onCancelarReuniao={() => setConfirmacao('cancelar-reuniao')}
                            />

                            {conviteTriagem && me.has_triage === false && (
                                <ConviteTriagem onFechar={() => setConviteTriagem(false)} />
                            )}

                            {/* O anfitrião vê quem se inscreveu, em qualquer situação da reunião (cancelada e encerrada incluídas) */}
                            {reuniao.owned_by_me && (
                                <ListaInscritos key={reuniao.id} reuniaoId={reuniao.id} total={reuniao.registered_count} />
                            )}
                        </>
                    )}
                </div>
            </main>

            {editando && reuniao && (
                <FormularioReuniao
                    reuniao={reuniao}
                    diaInicial=""
                    onFechar={() => setEditando(false)}
                    onSalvo={(salva) => {
                        setEditando(false)
                        trocarReuniao(salva)
                        avisar('Reunião atualizada.', 'sucesso')
                    }}
                />
            )}

            {inscricao.termoAberto && (
                <TermoDeParticipacao
                    reuniao={inscricao.termoAberto}
                    enviando={inscricao.emCurso !== null}
                    onAceitar={() => void inscricao.aceitar()}
                    onVoltar={inscricao.fecharTermo}
                />
            )}

            <ModalConfirmacao
                aberto={confirmacao !== null}
                titulo={
                    confirmacao === 'cancelar-inscricao'
                        ? 'Cancelar a sua inscrição?'
                        : confirmacao === 'cancelar-reuniao'
                          ? 'Cancelar esta reunião?'
                          : 'Encerrar esta reunião?'
                }
                descricao={
                    !reuniao
                        ? undefined
                        : confirmacao === 'cancelar-inscricao'
                          ? `Você deixa de ter um lugar em "${reuniao.title}". Se a reunião lotar, pode não ser possível voltar.`
                          : confirmacao === 'cancelar-reuniao'
                            ? `"${reuniao.title}" continua no calendário, mas marcada como cancelada. Não dá para desfazer.`
                            : `"${reuniao.title}" passa a constar como encerrada. Não dá para desfazer.`
                }
                rotuloConfirmar={
                    confirmacao === 'cancelar-inscricao'
                        ? 'Cancelar inscrição'
                        : confirmacao === 'cancelar-reuniao'
                          ? 'Cancelar reunião'
                          : 'Encerrar reunião'
                }
                rotuloCancelar="Voltar"
                // Cancelar a inscrição ou a reunião é destrutivo (vermelho); encerrar não apaga nada, como na sala
                perigo={confirmacao !== 'encerrar'}
                carregando={executando}
                onConfirmar={() => void confirmar()}
                onCancelar={() => setConfirmacao(null)}
            />
        </LayoutPainel>
    )
}

interface CartaoReuniaoProps {
    reuniao: MeetingResponseDTO
    agora: number
    ehDependente: boolean
    inscrevendo: boolean
    onInscrever: () => void
    onCancelarInscricao: () => void
    onEditar: () => void
    onEncerrar: () => void
    onCancelarReuniao: () => void
}

/** O cartão da reunião (lilás, com a barra azul à esquerda, como os cartões do frame "/reuniao") e as ações dela */
function CartaoReuniao({
    reuniao: m,
    agora,
    ehDependente,
    inscrevendo,
    onInscrever,
    onCancelarInscricao,
    onEditar,
    onEncerrar,
    onCancelarReuniao,
}: CartaoReuniaoProps) {
    const selo = seloDaReuniao(m, agora)
    const aceita = aceitaInscricao(m, agora)
    const vagas = vagasRestantes(m.capacity, m.registered_count)
    const entrar = podeEntrar(m, agora)
    const agendada = m.status === 'scheduled'
    const comecou = agora >= Date.parse(m.starts_at)
    const terminou = agora >= Date.parse(m.ends_at)

    // Dependente: entrar (na janela), ou se inscrever (com vaga), e cancelar a inscrição até a reunião começar
    const inscrever = ehDependente && !entrar && aceita && !m.registered_by_me && vagas > 0
    const cancelarInscricao = ehDependente && aceita && m.registered_by_me
    // Anfitrião: editar antes do início, encerrar depois dele, cancelar até o fim (só reunião agendada)
    const editar = m.owned_by_me && agendada && !comecou
    const encerrar = m.owned_by_me && agendada && comecou
    const cancelarReuniao = m.owned_by_me && agendada && !terminou
    const temAcoes = entrar || inscrever || cancelarInscricao || editar || encerrar || cancelarReuniao

    return (
        <article aria-labelledby="titulo-reuniao" className="max-w-3xl space-y-6 rounded-cartao bg-plad-fundo p-6 md:p-8">
            <div className="flex gap-3">
                <span aria-hidden="true" className="w-1 shrink-0 rounded-full bg-plad" />
                <div className="min-w-0 space-y-2">
                    <h1
                        id="titulo-reuniao"
                        className={`font-outfit text-2xl font-semibold leading-snug text-black ${m.status === 'cancelled' ? 'line-through' : ''}`.trim()}
                    >
                        {m.title}
                    </h1>
                    {selo && (
                        <span className="inline-block rounded-botao bg-plad px-2.5 py-1 text-xs font-medium text-white">{selo}</span>
                    )}
                </div>
            </div>

            {m.description && <p className="whitespace-pre-line text-sm text-gray-800">{m.description}</p>}

            <dl className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                <Item rotulo="Data e hora">{formatarHorario(m.starts_at, m.ends_at)}</Item>
                {/* O registro é o que o anfitrião informou no cadastro (o sistema não o confere): para quem participa conferir
                    quem conduz. Ao próprio anfitrião não se mostra */}
                <Item rotulo="Psicólogo">{m.owned_by_me ? 'Você' : `${m.host.name} · ${formatarRegistro(m.host)}`}</Item>
                <Item rotulo="Vagas">
                    {m.registered_count} de {m.capacity} inscritos
                    {aceita && ` · ${textoDeVagas(vagas)}`}
                </Item>
                <Item rotulo="Situação">
                    {m.status === 'cancelled' ? 'Cancelada' : m.status === 'ended' || terminou ? 'Encerrada' : comecou ? 'Em andamento' : 'Agendada'}
                </Item>
            </dl>

            {temAcoes && (
                <div className="flex flex-wrap items-center gap-3 border-t border-white pt-6">
                    {entrar && (
                        <Link to={`/reuniao/${m.id}`} className={classeBotao()}>
                            <DoorOpen size={18} aria-hidden="true" />
                            Entrar na reunião
                        </Link>
                    )}
                    {inscrever && (
                        <Botao onClick={onInscrever} carregando={inscrevendo}>
                            <UserPlus size={18} aria-hidden="true" />
                            {inscrevendo ? 'Inscrevendo…' : 'Inscrever-se'}
                        </Botao>
                    )}
                    {editar && (
                        <Botao variante="secundario" onClick={onEditar}>
                            <Pencil size={18} aria-hidden="true" />
                            Editar
                        </Botao>
                    )}
                    {encerrar && (
                        <Botao variante="secundario" onClick={onEncerrar}>
                            <Check size={18} aria-hidden="true" />
                            Encerrar
                        </Botao>
                    )}
                    {cancelarInscricao && (
                        <Botao variante="perigo-contorno" onClick={onCancelarInscricao}>
                            <UserMinus size={18} aria-hidden="true" />
                            Cancelar inscrição
                        </Botao>
                    )}
                    {cancelarReuniao && (
                        <Botao variante="perigo-contorno" onClick={onCancelarReuniao}>
                            Cancelar reunião
                        </Botao>
                    )}
                </div>
            )}

            {ehDependente && aceita && !m.registered_by_me && vagas === 0 && (
                <p className="text-sm text-texto-suave">Esta reunião está lotada. Se alguém cancelar, a vaga volta a aparecer aqui.</p>
            )}
        </article>
    )
}

function Item({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
    return (
        <div>
            <dt className="text-xs font-medium text-texto-suave">{rotulo}</dt>
            <dd className="mt-0.5 text-black">{children}</dd>
        </div>
    )
}

/**
 * O convite opcional para a triagem, depois da inscrição de quem ainda não a respondeu. Só um convite: a inscrição já
 * está feita e não depende dela (decisão 24 do backend).
 */
function ConviteTriagem({ onFechar }: { onFechar: () => void }) {
    return (
        <section
            aria-labelledby="titulo-convite-triagem"
            className="relative flex max-w-3xl flex-col gap-4 rounded-cartao border border-borda-cartao bg-white p-5 pr-14 shadow-cartao sm:flex-row sm:items-center"
        >
            <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-plad-fundo text-plad" aria-hidden="true">
                <ClipboardList size={24} />
            </span>
            <div className="min-w-0 flex-1">
                <h2 id="titulo-convite-triagem" className="font-outfit text-lg font-semibold text-black">
                    Quer contar um pouco sobre você?
                </h2>
                <p className="mt-1 text-sm text-gray-700">
                    É opcional. O psicólogo que conduz a reunião lê as respostas da triagem, até 30 dias depois dela. Você pode
                    responder agora ou quando quiser, pelo painel.
                </p>
            </div>
            <Link to="/Triagem" className={classeBotao('secundario')}>
                Responder a triagem
            </Link>
            <button
                type="button"
                onClick={onFechar}
                aria-label="Fechar convite"
                className="absolute right-1 top-1 flex size-11 items-center justify-center rounded-botao text-gray-700 transition hover:bg-black/5 hover:text-black"
            >
                <X size={20} aria-hidden="true" />
            </button>
        </section>
    )
}

/**
 * Lista de quem se inscreveu na reunião, só para o anfitrião. É o único lugar da interface com o NOME REAL de um
 * dependente (decisão 26 do backend). Cada leitura é auditada (uma entrada por inscrito, que ele vê no log de acessos),
 * por isso: o aviso aparece antes do botão; nada de buscar ao abrir a página, só quando a pessoa pede; ao esconder e
 * mostrar de novo, usa o que já leu em vez de ler outra vez; e a lista fica só neste estado, que some ao sair da página
 * (nunca em contexto, storage ou URL).
 */
function ListaInscritos({ reuniaoId, total }: { reuniaoId: number; total: number }) {
    const idAviso = useId()
    const [inscritos, setInscritos] = useState<MeetingParticipantDTO[] | null>(null)
    const [aberta, setAberta] = useState(false)
    const [carregando, setCarregando] = useState(false)
    const [erro, setErro] = useState<string | null>(null)

    async function alternar() {
        setErro(null)
        if (aberta) {
            setAberta(false)
            return
        }
        if (inscritos) {
            setAberta(true)
            return
        }
        setCarregando(true)
        try {
            setInscritos(await listParticipants(reuniaoId))
            setAberta(true)
        } catch (e) {
            setErro(e instanceof ApiError ? e.message : 'Não foi possível carregar os inscritos.')
        } finally {
            setCarregando(false)
        }
    }

    return (
        <section aria-labelledby="titulo-inscritos" className="max-w-3xl space-y-3 rounded-cartao border border-borda-cartao p-6">
            <h2 id="titulo-inscritos" className="font-outfit text-lg font-semibold text-black">
                Inscritos
            </h2>
            {total === 0 ? (
                <p className="text-sm text-texto-suave">Ninguém se inscreveu ainda.</p>
            ) : (
                <>
                    <p id={idAviso} className="text-sm text-texto-suave">
                        Ao abrir a lista, o acesso fica registrado e cada pessoa listada pode ver que um psicólogo a consultou.
                    </p>
                    <Botao
                        variante="secundario"
                        onClick={() => void alternar()}
                        carregando={carregando}
                        aria-expanded={aberta}
                        aria-describedby={idAviso}
                    >
                        <Users size={18} aria-hidden="true" />
                        {carregando ? 'Carregando…' : aberta ? 'Esconder inscritos' : `Ver inscritos (${total})`}
                    </Botao>
                    {erro && (
                        <p role="alert" className="text-sm text-erro">
                            {erro}
                        </p>
                    )}
                    {aberta && inscritos && (
                        <ul className="divide-y divide-borda-cartao rounded-campo border border-borda-cartao text-sm">
                            {inscritos.length === 0 && <li className="p-3 text-texto-suave">Ninguém se inscreveu ainda.</li>}
                            {inscritos.map((p) => (
                                <li key={p.identity} className="p-3">
                                    <span className="sr-only">Apelido: </span>
                                    <span className="font-semibold text-black">{p.nickname}</span>
                                    <span className="sr-only">. Nome: </span>
                                    <span className="block text-gray-700">{p.real_name}</span>
                                </li>
                            ))}
                        </ul>
                    )}
                </>
            )}
        </section>
    )
}
