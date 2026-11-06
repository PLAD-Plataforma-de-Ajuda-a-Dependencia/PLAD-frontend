import type { ReactNode } from 'react'

interface CardProps {
    /** Selo azul no topo do cartão (os contadores do Calendário e da Gestão) */
    titulo?: string
    as?: 'div' | 'section'
    className?: string
    children: ReactNode
}

/** Cartão branco do Calendário, da Gestão e da Minha conta */
export default function Card({ titulo, as: Elemento = 'div', className = '', children }: CardProps) {
    return (
        <Elemento className={`rounded-cartao border border-borda-cartao bg-white p-5 shadow-cartao md:p-8 ${className}`.trim()}>
            {titulo && (
                <span className="inline-block self-start rounded-md bg-plad px-3 py-0.5 font-outfit text-sm font-medium text-white">
                    {titulo}
                </span>
            )}
            {children}
        </Elemento>
    )
}
