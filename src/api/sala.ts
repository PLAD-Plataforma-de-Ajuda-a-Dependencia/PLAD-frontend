import { ApiError, apiRequest } from './client'

// Rotas da sala ao vivo (MeetingRoomController, RF005/RF006, decisões 28 a 31 do backend). O vídeo roda no LiveKit; a API só
// decide quem entra e quem fala. Todas exigem o access token e NENHUMA usa cookie (não estão em CAMINHOS_COM_COOKIE).

/**
 * plad.dto.MeetingJoinResponseDTO. O `token` vale 2 MINUTOS e o LiveKit só o confere na primeira conexão: peça um novo a
 * cada entrada (clique em Entrar, reconexão depois de queda longa, recarga da página) e NUNCA o guarde: nem em storage,
 * nem na URL, nem em estado ou contexto. Ele só existe na variável que vai a `room.connect` e sai de escopo.
 */
export interface MeetingJoinResponseDTO {
    server_url: string // wss://... (ws:// só em desenvolvimento)
    token: string
    identity: string // a identidade opaca de quem chama, nesta reunião
    host_identity: string // a do psicólogo anfitrião: quem tem `identity === host_identity` é o psicólogo, nunca pelo nome ou metadata
}

/**
 * POST /meetings/{id}/join → 200 (anfitrião, ou dependente inscrito, com a reunião agendada, de 10 min antes do início até
 * o fim) | 403 FORBIDDEN (qualquer outra pessoa, inclusive quem foi removido: sem nova tentativa) | 404 MEETING_NOT_FOUND
 * | 409 MEETING_NOT_OPEN (fora da janela, ou reunião cancelada/encerrada)
 */
export function entrarNaSala(id: number) {
    return apiRequest<MeetingJoinResponseDTO>('POST', `/meetings/${id}/join`)
}

/**
 * POST /meetings/{id}/participants/{identity}/speak, corpo `{allowed}` → 204 (só o anfitrião). Liberar dá a um dependente
 * microfone e câmera (nunca a tela); tirar corta na hora o que ele publica. A escuta e o chat continuam.
 * | 404 MEETING_PARTICIPANT_NOT_FOUND (a identidade não é de um inscrito, ou ele não está conectado) | 409 MEETING_NOT_OPEN
 * | 503 ROOM_UNAVAILABLE (o LiveKit não respondeu em 6 s; nada mudou; `Retry-After: 5`)
 */
export function permitirFala(id: number, identity: string, permitido: boolean) {
    return apiRequest<null>('POST', `/meetings/${id}/participants/${encodeURIComponent(identity)}/speak`, {
        allowed: permitido,
    })
}

/**
 * POST /meetings/{id}/participants/{identity}/remove → 204 (só o anfitrião). Derruba a pessoa e apaga a inscrição dela: o
 * próximo POST /join dela dá 403. | 404 MEETING_PARTICIPANT_NOT_FOUND | 409 MEETING_NOT_OPEN | 503 ROOM_UNAVAILABLE
 */
export function removerParticipante(id: number, identity: string) {
    return apiRequest<null>('POST', `/meetings/${id}/participants/${encodeURIComponent(identity)}/remove`)
}

const ESPERA_PADRAO_DA_SALA_S = 5 // o `Retry-After` do backend é 5
const TENTATIVAS_EXTRAS_DA_SALA = 2

/**
 * Executa uma ação do anfitrião (liberar fala, cortar, remover, encerrar) e, se o LiveKit não respondeu (503
 * ROOM_UNAVAILABLE: nada mudou do lado da PLAD), espera o `Retry-After` e repete sozinha, até 2 vezes. Qualquer outro erro
 * (e o 503 depois da última tentativa) sobe como está. `aoEsperar` recebe os segundos para a tela avisar.
 */
export async function repetirSeSalaIndisponivel<T>(acao: () => Promise<T>, aoEsperar: (segundos: number) => void): Promise<T> {
    for (let tentativa = 0; ; tentativa++) {
        try {
            return await acao()
        } catch (erro) {
            if (tentativa >= TENTATIVAS_EXTRAS_DA_SALA || !(erro instanceof ApiError) || erro.code !== 'ROOM_UNAVAILABLE') {
                throw erro
            }
            const segundos = erro.retryAfterSeconds ?? ESPERA_PADRAO_DA_SALA_S
            aoEsperar(segundos)
            await new Promise((resolver) => setTimeout(resolver, segundos * 1000))
        }
    }
}
