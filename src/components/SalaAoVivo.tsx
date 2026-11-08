import '@livekit/components-styles'
import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { ConnectionState, RoomEvent } from 'livekit-client'
import type { Participant, Room } from 'livekit-client'
import {
    RoomAudioRenderer,
    RoomContext,
    StartAudio,
    useChat,
    useConnectionState,
    useLocalParticipantPermissions,
    useSpeakingParticipants,
} from '@livekit/components-react'
import { MessageSquare, Users } from 'lucide-react'

import { ApiError } from '../api/client'
import { formatarEspera } from '../api/erros'
import { endMeeting } from '../api/meetings'
import type { MeetingParticipantDTO, MeetingResponseDTO } from '../api/meetings'
import { repetirSeSalaIndisponivel } from '../api/sala'
import Abas from './Abas'
import ChatDaSala from './ChatDaSala'
import ControlesDaSala from './ControlesDaSala'
import type { AbaDoPainel } from './ControlesDaSala'
import ModalConfirmacao from './ModalConfirmacao'
import PainelDoAnfitriao from './PainelDoAnfitriao'
import PalcoDaSala from './PalcoDaSala'
import { useToast } from './ToastContext'
import { codificarMao, TOPICO_MAO } from './salaProtocolo'
import useAgora from './useAgora'
import useMaosLevantadas from './useMaosLevantadas'

export interface SalaAoVivoProps {
    /** A sala já conectada (`abrirSala`); o token nunca chega até aqui */
    room: Room
    reuniao: MeetingResponseDTO
    /** A identidade de quem está vendo, e a do anfitrião: `identity === hostIdentity` é quem é o psicólogo */
    identity: string
    hostIdentity: string
    /** Só o anfitrião: a lista de inscritos lida UMA vez ao entrar (leitura auditada) */
    inscritos: MeetingParticipantDTO[] | null
    erroDaLista: string | null
    lendoALista: boolean
    onLerDeNovo: () => void
    onRemovido: (identidade: string) => void
    /** "Sair" (o botão vermelho): sai da sala sem encerrar a reunião */
    onSair: () => void
    /** O anfitrião encerrou a reunião para todos (POST /end deu certo) */
    onEncerrada: () => void
}

/**
 * A sala ao vivo, já conectada: palco com o psicólogo, barra de controles, chat e, para o anfitrião, o painel de inscritos
 * (conectados, mãos levantadas, liberar ou cortar a fala, remover). Mostra a mesma sala para os dois papéis; só muda o que
 * cada um pode: o dependente não vê microfone e câmera até o psicólogo liberar. O `room` vem de `new Room()` + `connect`,
 * e o `RoomContext` o entrega aos hooks da LiveKit.
 */
export default function SalaAoVivo(props: SalaAoVivoProps) {
    return (
        <RoomContext.Provider value={props.room}>
            <Conteudo {...props} />
        </RoomContext.Provider>
    )
}

/** Uma região `aria-live` única para avisar "mão levantada", "fala liberada"... Cada aviso novo troca o nó, para repetir o texto */
function useAnuncios() {
    const [anuncio, setAnuncio] = useState({ texto: '', n: 0 })
    const anunciar = useCallback((texto: string) => setAnuncio((a) => ({ texto, n: a.n + 1 })), [])
    return { anuncio, anunciar }
}

function Conteudo({
    room,
    reuniao,
    identity,
    hostIdentity,
    inscritos,
    erroDaLista,
    lendoALista,
    onLerDeNovo,
    onRemovido,
    onSair,
    onEncerrada,
}: SalaAoVivoProps) {
    const ehAnfitriao = identity === hostIdentity
    const idBase = useId()
    const { avisar } = useToast()
    const { anuncio, anunciar } = useAnuncios()
    const chat = useChat()
    const estadoDaConexao = useConnectionState()
    const permissoes = useLocalParticipantPermissions()
    const falando = useSpeakingParticipants()
    const agora = useAgora([Date.parse(reuniao.starts_at)])

    // O dependente só ganha microfone e câmera quando o psicólogo libera (`canPublish`); o anfitrião sempre tem
    const podePublicar = ehAnfitriao || permissoes?.canPublish === true
    const podeEncerrar = agora >= Date.parse(reuniao.starts_at)

    const [maoLevantada, setMaoLevantada] = useState(false)
    const [painelAberto, setPainelAberto] = useState(() => ehAnfitriao && window.matchMedia('(min-width: 1024px)').matches)
    const [aba, setAba] = useState<AbaDoPainel>(ehAnfitriao ? 'inscritos' : 'chat')
    const painelRef = useRef<HTMLElement>(null)
    const [confirmandoFim, setConfirmandoFim] = useState(false)
    const [encerrando, setEncerrando] = useState(false)

    const aoLevantarMao = useCallback((apelido: string) => anunciar(`${apelido} levantou a mão.`), [anunciar])
    const { maos, baixar } = useMaosLevantadas(room, hostIdentity, ehAnfitriao, aoLevantarMao)

    // Avisa, em voz e em texto, quando o psicólogo libera ou corta a fala do dependente
    useEffect(() => {
        if (ehAnfitriao) return
        function aoMudarPermissao(anterior: { canPublish?: boolean } | undefined, participante: Participant) {
            if (!participante.isLocal) return
            const antes = anterior?.canPublish === true
            const depois = participante.permissions?.canPublish === true
            if (antes === depois) return
            if (depois) {
                setMaoLevantada(false)
                anunciar('Você pode falar agora. Os botões de microfone e câmera apareceram.')
            } else {
                anunciar('A sua fala foi encerrada. Você continua ouvindo e pode usar o chat.')
            }
        }
        room.on(RoomEvent.ParticipantPermissionsChanged, aoMudarPermissao)
        return () => {
            room.off(RoomEvent.ParticipantPermissionsChanged, aoMudarPermissao)
        }
    }, [room, ehAnfitriao, anunciar])

    // Em tela estreita o painel abre embaixo do vídeo: leva a pessoa até ele
    useEffect(() => {
        if (painelAberto && !window.matchMedia('(min-width: 1024px)').matches) {
            painelRef.current?.scrollIntoView({ block: 'nearest' })
        }
    }, [painelAberto, aba])

    function alternarPainel(qual: AbaDoPainel) {
        if (painelAberto && aba === qual) {
            setPainelAberto(false)
        } else {
            setAba(qual)
            setPainelAberto(true)
        }
    }

    /**
     * Mão levantada: mensagem de dados só para o anfitrião (`destinationIdentities`), que guarda o estado. O dependente não
     * tem permissão de atualizar metadados nem o próprio nome (decisão 30); nada vai ao servidor da PLAD.
     */
    async function alternarMao() {
        if (!room.remoteParticipants.has(hostIdentity)) {
            avisar('O psicólogo ainda não está na sala. Levante a mão quando ele entrar.', 'info')
            return
        }
        const nova = !maoLevantada
        try {
            await room.localParticipant.publishData(codificarMao(nova), {
                reliable: true,
                destinationIdentities: [hostIdentity],
                topic: TOPICO_MAO,
            })
            setMaoLevantada(nova)
            anunciar(nova ? 'Você levantou a mão. O psicólogo foi avisado.' : 'Você baixou a mão.')
        } catch {
            avisar('Não foi possível avisar o psicólogo. Tente de novo.', 'erro')
        }
    }

    async function enviarMensagem(texto: string) {
        try {
            await chat.send(texto)
            return true
        } catch {
            avisar('Não foi possível enviar a mensagem. Tente de novo.', 'erro')
            return false
        }
    }

    async function encerrar() {
        setEncerrando(true)
        try {
            await repetirSeSalaIndisponivel(
                () => endMeeting(reuniao.id),
                (segundos) => avisar(`A sala de vídeo não respondeu. Tentando de novo em ${formatarEspera(segundos)}.`, 'info'),
            )
            onEncerrada()
        } catch (erro) {
            avisar(
                erro instanceof ApiError
                    ? erro.code === 'MEETING_CONFLICT'
                        ? 'A reunião não pode ser encerrada agora: ela ainda não começou ou já terminou.'
                        : erro.message
                    : 'Algo deu errado. Tente novamente em instantes.',
                'erro',
            )
            setEncerrando(false)
            setConfirmandoFim(false)
        }
    }

    const quemFala = falando.find((p) => p.identity !== hostIdentity)
    const reconectando =
        estadoDaConexao === ConnectionState.Reconnecting || estadoDaConexao === ConnectionState.SignalReconnecting

    return (
        <div
            data-lk-theme="default"
            className="mx-auto flex w-full min-w-0 max-w-[1440px] flex-1 flex-col gap-6 px-4 py-6 lg:flex-row lg:px-8 lg:py-10"
        >
            <section aria-label="Reunião ao vivo" className="min-w-0 flex-1 space-y-4">
                <h1 className="sr-only">{reuniao.title}</h1>

                {reconectando && (
                    <p role="status" className="rounded-campo bg-white/10 p-3 text-sm text-white">
                        A conexão oscilou. Reconectando à sala…
                    </p>
                )}

                <PalcoDaSala hostIdentity={hostIdentity} ehAnfitriao={ehAnfitriao} />

                <div className="grid items-center gap-3 lg:grid-cols-[1fr_auto_1fr]">
                    <p className="min-w-0 text-lg text-white">
                        <span className="sr-only">No palco: </span>
                        {reuniao.host}
                        {quemFala && (
                            <span className="block text-sm text-gray-300">
                                {quemFala.isLocal ? 'Você está falando' : `${quemFala.name || 'Alguém'} está falando`}
                            </span>
                        )}
                    </p>
                    <ControlesDaSala
                        ehAnfitriao={ehAnfitriao}
                        podePublicar={podePublicar}
                        maoLevantada={maoLevantada}
                        onAlternarMao={alternarMao}
                        painelAberto={painelAberto}
                        abaDoPainel={aba}
                        onAlternarPainel={alternarPainel}
                        maosPendentes={maos.size}
                        podeEncerrar={podeEncerrar}
                        onEncerrar={() => setConfirmandoFim(true)}
                        onSair={onSair}
                    />
                    <span aria-hidden="true" />
                </div>

                {/* Aparece só se o navegador bloqueou o som (política de autoplay): um clique libera */}
                <StartAudio
                    label="Ativar o som da reunião"
                    className="inline-flex min-h-11 items-center rounded-botao bg-white px-4 text-sm font-medium text-black hover:bg-gray-200"
                />
            </section>

            {painelAberto && (
                <aside
                    ref={painelRef}
                    aria-label={ehAnfitriao ? 'Chat e inscritos' : 'Chat'}
                    className="w-full shrink-0 space-y-4 rounded-cartao bg-sala-barra p-4 text-white lg:w-96"
                >
                    {ehAnfitriao ? (
                        <>
                            <Abas
                                tema="escuro"
                                rotulo="Painel da reunião"
                                idBase={idBase}
                                ativa={aba}
                                onEscolher={setAba}
                                abas={[
                                    { id: 'inscritos', rotulo: 'Inscritos', icone: Users },
                                    { id: 'chat', rotulo: 'Chat', icone: MessageSquare },
                                ]}
                            />
                            <div
                                role="tabpanel"
                                id={`${idBase}-painel-chat`}
                                aria-labelledby={`${idBase}-aba-chat`}
                                hidden={aba !== 'chat'}
                            >
                                <ChatDaSala
                                    mensagens={chat.chatMessages}
                                    enviando={chat.isSending}
                                    hostIdentity={hostIdentity}
                                    onEnviar={enviarMensagem}
                                />
                            </div>
                            <div
                                role="tabpanel"
                                id={`${idBase}-painel-inscritos`}
                                aria-labelledby={`${idBase}-aba-inscritos`}
                                hidden={aba !== 'inscritos'}
                            >
                                <PainelDoAnfitriao
                                    reuniaoId={reuniao.id}
                                    inscritos={inscritos}
                                    erroDaLista={erroDaLista}
                                    lendoALista={lendoALista}
                                    onLerDeNovo={onLerDeNovo}
                                    maos={maos}
                                    onBaixarMao={baixar}
                                    onRemovido={onRemovido}
                                />
                            </div>
                        </>
                    ) : (
                        <>
                            <h2 className="font-outfit text-base font-semibold">Chat</h2>
                            <ChatDaSala
                                mensagens={chat.chatMessages}
                                enviando={chat.isSending}
                                hostIdentity={hostIdentity}
                                onEnviar={enviarMensagem}
                            />
                        </>
                    )}
                </aside>
            )}

            <RoomAudioRenderer />

            <div role="status" aria-live="polite" className="sr-only">
                <p key={anuncio.n}>{anuncio.texto}</p>
            </div>

            <ModalConfirmacao
                aberto={confirmandoFim}
                titulo="Encerrar a reunião para todos?"
                descricao="Todas as pessoas saem da sala e a reunião é marcada como encerrada. Isso não pode ser desfeito."
                rotuloConfirmar="Encerrar a reunião"
                rotuloCancelar="Voltar"
                carregando={encerrando}
                onConfirmar={encerrar}
                onCancelar={() => setConfirmandoFim(false)}
            />
        </div>
    )
}
