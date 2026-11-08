import { useEffect, useState } from 'react'

// O maior atraso que setTimeout aceita (acima disso ele dispara na hora)
const MAIOR_ATRASO_MS = 2 ** 31 - 1

/**
 * "Agora" em milissegundos que se atualiza sozinho nos `limites` dados (instantes em ms: abertura da sala, início, fim),
 * para que um "Entrar" apareça e um "Em andamento" mude sem recarregar a página. Não é um relógio por segundo: agenda
 * UM setTimeout para o próximo limite que ainda não passou, e recalcula ao voltar para a aba (os navegadores atrasam
 * timers de abas em segundo plano). Sem limites no futuro não agenda nada.
 *
 * O efeito só grava estado dentro do callback do timer (nunca de forma síncrona): o primeiro recálculo é um timer de 0 ms,
 * que também corrige o `agora` quando os limites chegam depois (a reunião foi lida depois da montagem).
 */
export default function useAgora(limites: readonly number[]): number {
    const [agora, setAgora] = useState(() => Date.now())
    // Chave estável: quem chama pode passar um array novo a cada render sem reiniciar o timer
    const chave = limites.join(',')

    useEffect(() => {
        const marcos = chave === '' ? [] : chave.split(',').map(Number)
        let ativo = true
        let timer: number | undefined

        function atualizar() {
            if (!ativo) return
            window.clearTimeout(timer)
            const agoraReal = Date.now()
            setAgora(agoraReal)
            let proximo = Infinity
            for (const marco of marcos) {
                if (marco > agoraReal && marco < proximo) proximo = marco
            }
            if (proximo !== Infinity) {
                timer = window.setTimeout(atualizar, Math.min(proximo - agoraReal, MAIOR_ATRASO_MS))
            }
        }

        function aoMudarVisibilidade() {
            if (document.visibilityState === 'visible') atualizar()
        }

        timer = window.setTimeout(atualizar, 0)
        document.addEventListener('visibilitychange', aoMudarVisibilidade)
        return () => {
            ativo = false
            window.clearTimeout(timer)
            document.removeEventListener('visibilitychange', aoMudarVisibilidade)
        }
    }, [chave])

    return agora
}
