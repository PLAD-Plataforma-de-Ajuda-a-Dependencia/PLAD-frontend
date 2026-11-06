import type { ButtonHTMLAttributes } from 'react'
import { LoaderCircle } from 'lucide-react'
import { classeBotao, type VarianteBotao } from './estilos'

interface BotaoProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variante?: VarianteBotao
    /** Durante o envio: desabilitado, com o ícone girando e `aria-busy` */
    carregando?: boolean
    /** Ocupa a largura toda */
    bloco?: boolean
}

export default function Botao({
    variante = 'primario',
    carregando = false,
    bloco = false,
    type = 'button',
    disabled,
    className = '',
    children,
    ...resto
}: BotaoProps) {
    return (
        <button
            type={type}
            disabled={disabled || carregando}
            aria-busy={carregando || undefined}
            className={`${classeBotao(variante, bloco)} ${className}`.trim()}
            {...resto}
        >
            {carregando && <LoaderCircle size={18} aria-hidden="true" className="animate-spin" />}
            {children}
        </button>
    )
}
