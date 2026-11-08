import type { ReactNode } from 'react'
import { ShieldCheck } from 'lucide-react'

/**
 * Aviso calmo de que ler aquilo deixa rastro (o backend audita cada leitura de dado de saúde). Não é erro: usa o lilás da
 * marca, não o vermelho. Fica visível ANTES de a pessoa pedir a leitura.
 */
export default function AvisoDeAcesso({ children }: { children: ReactNode }) {
    return (
        <div role="note" className="flex items-start gap-3 rounded-cartao border border-borda-suave bg-plad-fundo p-4 text-sm text-black">
            <ShieldCheck size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-plad-active" />
            <p>{children}</p>
        </div>
    )
}
