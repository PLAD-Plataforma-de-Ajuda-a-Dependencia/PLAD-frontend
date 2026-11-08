// Mensagens de dados da sala ao vivo e limites do chat. O backend não tem nada disto (decisão 30): a mão levantada é só
// uma mensagem do front do dependente para o front do psicólogo, que guarda o estado na memória dele.

/** Tópico da mão levantada: `publishData` do dependente, endereçado só ao anfitrião (`host_identity`) */
export const TOPICO_MAO = 'plad.mao'

/** Tamanho máximo de uma mensagem do chat, em caracteres */
export const MAXIMO_DO_CHAT = 500

const codificador = new TextEncoder()
const decodificador = new TextDecoder()

/** O corpo da mão levantada: só `{levantada: boolean}`. Nunca leva nome, apelido nem identidade (a LiveKit informa quem enviou) */
export function codificarMao(levantada: boolean) {
    return codificador.encode(JSON.stringify({ levantada }))
}

/** `true`/`false` se o conteúdo é uma mão válida; `null` para qualquer outra coisa, que é ignorada */
export function decodificarMao(conteudo: Uint8Array): boolean | null {
    if (conteudo.byteLength > 64) return null
    try {
        const dado: unknown = JSON.parse(decodificador.decode(conteudo))
        if (typeof dado === 'object' && dado !== null && !Array.isArray(dado)) {
            const { levantada } = dado as { levantada?: unknown }
            if (Object.keys(dado).length === 1 && typeof levantada === 'boolean') return levantada
        }
    } catch {
        // não é JSON: ignorada
    }
    return null
}
