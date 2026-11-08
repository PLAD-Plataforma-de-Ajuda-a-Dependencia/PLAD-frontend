import { LogLevel, Room, RoomEvent, setLogLevel } from 'livekit-client'
import type { DisconnectReason } from 'livekit-client'
import { entrarNaSala } from '../api/sala'

// Os avisos do SDK podem trazer identidade, nome da sala e endereço do servidor: nada disso vai para o console
// (privacidade da sala ao vivo: nenhum log com token, identidade ou nome real).
setLogLevel(LogLevel.silent)

export interface SalaConectada {
    room: Room
    /** A identidade opaca de quem está nesta sala */
    identity: string
    /** A do psicólogo anfitrião: quem tem `identity === hostIdentity` é o psicólogo (nunca pelo nome ou metadata) */
    hostIdentity: string
}

/**
 * Pede um token novo ao backend e conecta. O token só existe na variável local desta função: depois do `connect` ele sai de
 * escopo e nada o guarda (nem storage, nem URL, nem estado ou contexto), porque vale 2 minutos e o LiveKit só o confere na
 * primeira conexão. Cada entrada (clique em Entrar, reconexão depois de queda longa, recarga da página) chama esta função.
 * Por isso NÃO se usa `<LiveKitRoom token=...>`: ele guarda o token como prop.
 *
 * Erros do backend (`ApiError`: 403 removido, 409 sala fechada, 503...) sobem como estão; uma falha de rede ou do próprio
 * LiveKit sobe como `Error` comum.
 */
export async function abrirSala(
    reuniaoId: number,
    aoDesconectar: (room: Room, motivo?: DisconnectReason) => void,
): Promise<SalaConectada> {
    const { server_url, token, identity, host_identity } = await entrarNaSala(reuniaoId)
    const room = new Room({ adaptiveStream: true, dynacast: true })
    room.on(RoomEvent.Disconnected, (motivo) => aoDesconectar(room, motivo))
    try {
        await room.connect(server_url, token)
    } catch (erro) {
        await room.disconnect()
        throw erro
    }
    return { room, identity, hostIdentity: host_identity }
}

export interface OpcoesDeMidia {
    camera: boolean
    microfone: boolean
}

/** Liga a câmera e o microfone do psicólogo ao entrar. Devolve o que falhou ("a câmera"), sem lançar: a sala segue sem eles */
export async function ligarMidia(room: Room, opcoes: OpcoesDeMidia): Promise<string[]> {
    const falhas: string[] = []
    if (opcoes.microfone) {
        try {
            await room.localParticipant.setMicrophoneEnabled(true)
        } catch {
            falhas.push('o microfone')
        }
    }
    if (opcoes.camera) {
        try {
            await room.localParticipant.setCameraEnabled(true)
        } catch {
            falhas.push('a câmera')
        }
    }
    return falhas
}
