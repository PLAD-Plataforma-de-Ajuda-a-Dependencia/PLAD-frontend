import { Track } from 'livekit-client'
import { isTrackReference, useParticipants, useSpeakingParticipants, useTracks, VideoTrack } from '@livekit/components-react'

interface PalcoDaSalaProps {
    /** Quem é o psicólogo: `identity === hostIdentity`, nunca pelo nome ou metadata de um participante */
    hostIdentity: string
    /** Quem está vendo é o próprio anfitrião (muda só o texto de "sem vídeo") */
    ehAnfitriao: boolean
}

/**
 * O palco, como no frame /reuniao-2: o vídeo com a borda `plad`, o indicador de quem fala no canto de cima e, por baixo,
 * as miniaturas de quem mais está com a câmera ligada (um dependente liberado, por exemplo). O psicólogo fica em destaque;
 * quando ele compartilha a tela, ela vira o palco e a câmera dele passa para as miniaturas. Sem vídeo, o palco branco diz
 * por quê, em texto. Vem dentro de um `RoomContext`.
 */
export default function PalcoDaSala({ hostIdentity, ehAnfitriao }: PalcoDaSalaProps) {
    const trilhas = useTracks([Track.Source.Camera, Track.Source.ScreenShare]).filter(isTrackReference)
    const participantes = useParticipants()
    const falando = useSpeakingParticipants()

    const doAnfitriao = trilhas.filter((t) => t.participant.identity === hostIdentity && !t.publication.isMuted)
    const tela = doAnfitriao.find((t) => t.source === Track.Source.ScreenShare)
    const cameraDoAnfitriao = doAnfitriao.find((t) => t.source === Track.Source.Camera)
    const principal = tela ?? cameraDoAnfitriao

    const miniaturas = [
        ...(tela && cameraDoAnfitriao ? [cameraDoAnfitriao] : []),
        ...trilhas.filter(
            (t) =>
                t.participant.identity !== hostIdentity && t.source === Track.Source.Camera && !t.publication.isMuted,
        ),
    ]

    const anfitriaoNaSala = ehAnfitriao || participantes.some((p) => p.identity === hostIdentity)
    const alguemFalando = falando.length > 0

    return (
        <div className="space-y-3">
            <div className="relative aspect-video w-full overflow-hidden rounded-cartao border-[6px] border-plad bg-white">
                {principal ? (
                    <VideoTrack
                        trackRef={principal}
                        // A câmera do próprio anfitrião aparece espelhada, como num espelho; a tela compartilhada nunca
                        className={`size-full bg-sala-fundo object-contain ${
                            principal.participant.isLocal && principal.source === Track.Source.Camera ? '-scale-x-100' : ''
                        }`}
                    />
                ) : (
                    <p
                        role="status"
                        className="absolute inset-0 flex items-center justify-center p-6 text-center text-base text-black"
                    >
                        {ehAnfitriao
                            ? 'Sua câmera está desligada.'
                            : anfitriaoNaSala
                              ? 'A câmera do psicólogo está desligada. Você continua ouvindo.'
                              : 'Aguardando o psicólogo entrar na sala…'}
                    </p>
                )}

                {/* Indicador de fala do frame: decorativo (quem fala também aparece em texto, na legenda) */}
                <div
                    aria-hidden="true"
                    className="absolute right-4 top-4 flex h-11 items-center rounded-full bg-sala-botao px-4"
                >
                    <span className={`flex h-5 items-center gap-1 ${alguemFalando ? '' : 'opacity-50'}`}>
                        <span className={`h-3 w-1.5 rounded-full bg-plad ${alguemFalando ? 'animate-pulse' : ''}`} />
                        <span className={`h-5 w-1.5 rounded-full bg-plad ${alguemFalando ? 'animate-pulse' : ''}`} />
                        <span className={`h-3 w-1.5 rounded-full bg-plad ${alguemFalando ? 'animate-pulse' : ''}`} />
                    </span>
                </div>
            </div>

            {miniaturas.length > 0 && (
                <ul className="flex flex-wrap gap-3" aria-label="Outras câmeras ligadas">
                    {miniaturas.map((t) => (
                        <li
                            key={`${t.participant.identity}-${t.source}`}
                            className="relative aspect-video w-40 overflow-hidden rounded-campo border border-white/20 bg-sala-barra"
                        >
                            <VideoTrack
                                trackRef={t}
                                className={`size-full object-cover ${t.participant.isLocal ? '-scale-x-100' : ''}`}
                            />
                            <span className="absolute bottom-1 left-1 max-w-[90%] truncate rounded bg-black/70 px-1.5 py-0.5 text-xs text-white">
                                {t.participant.isLocal ? 'Você' : t.participant.name || 'Participante'}
                            </span>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    )
}
