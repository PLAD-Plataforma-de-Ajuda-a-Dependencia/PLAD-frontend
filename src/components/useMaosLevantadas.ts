import { useCallback, useEffect, useState } from 'react'
import { RoomEvent } from 'livekit-client'
import type { RemoteParticipant, Room } from 'livekit-client'
import { decodificarMao, TOPICO_MAO } from './salaProtocolo'

/**
 * As mãos levantadas, na memória do psicólogo (nada no servidor: decisão 30). A chave é `participant.identity` de quem
 * ENVIOU, que a LiveKit preenche e o remetente não consegue forjar; o texto da mensagem nunca diz quem é. A sala só
 * admite o anfitrião e dependentes inscritos, então qualquer remetente que não seja `hostIdentity` é um dependente (não
 * é preciso ler de novo a lista auditada de inscritos). Recarregar a página do psicólogo perde as mãos até cada
 * dependente levantar de novo; sair da sala também apaga a mão.
 *
 * `aoLevantar` recebe o apelido de quem levantou (para o aviso falado) e deve ser estável.
 */
export default function useMaosLevantadas(
    room: Room,
    hostIdentity: string,
    ativo: boolean,
    aoLevantar: (apelido: string) => void,
) {
    // identidade → instante em que levantou (para listar na ordem em que pediram)
    const [maos, setMaos] = useState<ReadonlyMap<string, number>>(() => new Map())

    useEffect(() => {
        if (!ativo) return

        function aoReceber(conteudo: Uint8Array, remetente?: RemoteParticipant, _tipo?: unknown, topico?: string) {
            if (topico !== TOPICO_MAO || !remetente || remetente.identity === hostIdentity) return
            const levantada = decodificarMao(conteudo)
            if (levantada === null) return
            const identidade = remetente.identity
            const instante = Date.now()
            setMaos((atual) => {
                if (levantada === atual.has(identidade)) return atual
                const novo = new Map(atual)
                if (levantada) novo.set(identidade, instante)
                else novo.delete(identidade)
                return novo
            })
            if (levantada) aoLevantar(remetente.name || 'Alguém')
        }

        function aoSair(participante: RemoteParticipant) {
            setMaos((atual) => {
                if (!atual.has(participante.identity)) return atual
                const novo = new Map(atual)
                novo.delete(participante.identity)
                return novo
            })
        }

        room.on(RoomEvent.DataReceived, aoReceber)
        room.on(RoomEvent.ParticipantDisconnected, aoSair)
        return () => {
            room.off(RoomEvent.DataReceived, aoReceber)
            room.off(RoomEvent.ParticipantDisconnected, aoSair)
        }
    }, [room, hostIdentity, ativo, aoLevantar])

    /** O psicólogo liberou a fala ou removeu a pessoa: a mão baixa */
    const baixar = useCallback((identidade: string) => {
        setMaos((atual) => {
            if (!atual.has(identidade)) return atual
            const novo = new Map(atual)
            novo.delete(identidade)
            return novo
        })
    }, [])

    return { maos, baixar }
}
