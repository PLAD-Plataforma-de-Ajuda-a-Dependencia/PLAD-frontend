import { useCallback } from 'react'
import { useNavigate } from 'react-router-dom'

/**
 * "Voltar" para onde a pessoa estava: `navigate(-1)` quando há uma entrada anterior DENTRO do app; sem ela (o endereço
 * foi aberto direto, numa aba nova ou por um link de fora), vai para `alternativa` com `replace`, em vez de sair do site.
 * Quem sabe se há entrada anterior é o índice que o BrowserRouter grava em `history.state.idx` (0 na primeira página
 * aberta nesta aba; sobe a cada navegação com push e fica igual num replace).
 */
export default function useVoltar(alternativa: string): () => void {
    const navigate = useNavigate()
    return useCallback(() => {
        const idx = (window.history.state as { idx?: unknown } | null)?.idx
        if (typeof idx === 'number' && idx > 0) {
            navigate(-1)
        } else {
            navigate(alternativa, { replace: true })
        }
    }, [navigate, alternativa])
}
