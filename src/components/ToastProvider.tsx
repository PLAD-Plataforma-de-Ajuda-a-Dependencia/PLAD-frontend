import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { CircleAlert, CircleCheck, Info, X } from 'lucide-react'
import { ToastContext, type TipoToast, type ToastApi } from './ToastContext'

interface Toast {
    id: number
    mensagem: string
    tipo: TipoToast
}

const ESTILO: Record<TipoToast, string> = {
    sucesso: 'border-sucesso/30 bg-sucesso-fundo text-sucesso',
    info: 'border-plad/30 bg-plad-fundo text-plad-rodape',
    erro: 'border-erro/30 bg-erro-fundo text-erro',
}

const ICONE: Record<TipoToast, ReactNode> = {
    sucesso: <CircleCheck size={20} aria-hidden="true" />,
    info: <Info size={20} aria-hidden="true" />,
    erro: <CircleAlert size={20} aria-hidden="true" />,
}

// Erro fica mais tempo na tela: dá tempo de ler com calma
const DURACAO_MS: Record<TipoToast, number> = { sucesso: 5000, info: 5000, erro: 9000 }

export default function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])
    const proximoId = useRef(0)
    const temporizadores = useRef(new Map<number, number>())

    const fechar = useCallback((id: number) => {
        window.clearTimeout(temporizadores.current.get(id))
        temporizadores.current.delete(id)
        setToasts((atuais) => atuais.filter((t) => t.id !== id))
    }, [])

    const avisar = useCallback(
        (mensagem: string, tipo: TipoToast = 'sucesso') => {
            const id = ++proximoId.current
            setToasts((atuais) => [...atuais.slice(-2), { id, mensagem, tipo }])
            temporizadores.current.set(
                id,
                window.setTimeout(() => fechar(id), DURACAO_MS[tipo]),
            )
        },
        [fechar],
    )

    useEffect(() => {
        const ativos = temporizadores.current
        return () => ativos.forEach((temporizador) => window.clearTimeout(temporizador))
    }, [])

    const api = useMemo<ToastApi>(() => ({ avisar }), [avisar])

    return (
        <ToastContext.Provider value={api}>
            {children}
            {/* A região existe sempre: leitores de tela só anunciam o que entra numa região viva já montada */}
            <div
                role="status"
                aria-live="polite"
                className="pointer-events-none fixed inset-x-0 bottom-20 z-[60] flex flex-col items-center gap-2 px-4 md:bottom-6"
            >
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-botao border py-3 pl-4 pr-1 shadow-lg ${ESTILO[toast.tipo]}`}
                    >
                        <span className="mt-0.5 shrink-0">{ICONE[toast.tipo]}</span>
                        <p className="flex-1 py-0.5 text-sm font-medium">{toast.mensagem}</p>
                        <button
                            type="button"
                            onClick={() => fechar(toast.id)}
                            aria-label="Fechar aviso"
                            className="flex size-11 shrink-0 items-center justify-center rounded-botao hover:bg-black/5"
                        >
                            <X size={18} aria-hidden="true" />
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    )
}
