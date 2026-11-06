import type { ReactNode } from 'react'

interface EstadoVazioProps {
    titulo: string
    /** O que fazer a seguir: um estado vazio sempre aponta um próximo passo */
    descricao?: string
    icone?: ReactNode
    acao?: ReactNode
    className?: string
}

/** Quando ainda não há nada para mostrar (nenhuma reunião, nenhuma triagem...) */
export default function EstadoVazio({ titulo, descricao, icone, acao, className = '' }: EstadoVazioProps) {
    return (
        <div className={`flex flex-col items-center gap-3 px-4 py-10 text-center ${className}`.trim()}>
            {icone && (
                <span className="flex size-14 items-center justify-center rounded-full bg-plad-fundo text-plad" aria-hidden="true">
                    {icone}
                </span>
            )}
            <h2 className="font-outfit text-lg font-semibold text-black">{titulo}</h2>
            {descricao && <p className="max-w-sm text-sm text-texto-suave">{descricao}</p>}
            {acao && <div className="mt-2">{acao}</div>}
        </div>
    )
}
