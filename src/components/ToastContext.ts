import { createContext, useContext } from 'react'

export type TipoToast = 'sucesso' | 'info' | 'erro'

export interface ToastApi {
    /** Mostra um aviso curto na parte de baixo da tela (anunciado por leitores de tela) */
    avisar: (mensagem: string, tipo?: TipoToast) => void
}

export const ToastContext = createContext<ToastApi | null>(null)

export function useToast(): ToastApi {
    const api = useContext(ToastContext)
    if (!api) {
        throw new Error('useToast precisa estar dentro de <ToastProvider>.')
    }
    return api
}
