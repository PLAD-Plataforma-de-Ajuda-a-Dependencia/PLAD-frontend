import { useId, useRef, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import useArmadilhaFoco from './useArmadilhaFoco'

const LARGURAS = {
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
} as const

interface ModalProps {
    aberto: boolean
    titulo: ReactNode
    /** Texto curto logo abaixo do título (vira o `aria-describedby` do diálogo) */
    descricao?: ReactNode
    onFechar: () => void
    /** Durante um envio: Esc, clique fora e o X não fecham */
    bloqueado?: boolean
    /** Fica fixo embaixo: os botões (e o que precisa estar sempre à vista, como a caixa de aceite do termo) */
    rodape?: ReactNode
    largura?: keyof typeof LARGURAS
    /** X no canto do cabeçalho */
    botaoFechar?: boolean
    /**
     * O corpo vira uma região focável e recebe o foco inicial: um texto longo começa a ser lido do topo (e não do
     * primeiro link, lá embaixo) e quem usa o teclado rola com as setas
     */
    corpoFocavel?: boolean
    /** z-[60] fica acima do pop-up de consentimento (z-50); só o "Precisa de ajuda agora?" usa */
    camada?: 'z-50' | 'z-[60]'
    children?: ReactNode
}

/**
 * O modal base de toda a interface: cabeçalho fixo, corpo que rola e rodapé fixo, até 90% da altura da tela. O
 * contêiner é `rounded-cartao` com `overflow-hidden` e só o corpo rola, então os cantos continuam arredondados e a barra
 * de rolagem nunca corta o botão de baixo. Foco preso dentro (useArmadilhaFoco), devolvido a quem abriu; Esc e clique
 * fora fecham (menos com `bloqueado`). No celular ele sobe da parte de baixo da tela.
 * Formulário: o `<form id>` vai no corpo e o botão de enviar no rodapé, com `form={id}` (como no LayoutPagina).
 */
export default function Modal({
    aberto,
    titulo,
    descricao,
    onFechar,
    bloqueado = false,
    rodape,
    largura = 'md',
    botaoFechar = false,
    corpoFocavel = false,
    camada = 'z-50',
    children,
}: ModalProps) {
    const painel = useRef<HTMLDivElement>(null)
    const idTitulo = useId()
    const idDescricao = useId()

    useArmadilhaFoco(painel, aberto, () => {
        if (!bloqueado) onFechar()
    })

    if (!aberto) {
        return null
    }

    return createPortal(
        <div
            className={`fixed inset-0 ${camada} flex items-end justify-center bg-black/40 p-4 sm:items-center`}
            onMouseDown={(e) => {
                if (e.target === e.currentTarget && !bloqueado) onFechar()
            }}
        >
            <div
                ref={painel}
                role="dialog"
                aria-modal="true"
                aria-labelledby={idTitulo}
                aria-describedby={descricao ? idDescricao : undefined}
                tabIndex={-1}
                className={`flex max-h-[90dvh] w-full ${LARGURAS[largura]} flex-col overflow-hidden rounded-cartao bg-white font-roboto text-gray-900 shadow-xl`}
            >
                <div className="flex shrink-0 items-start justify-between gap-4 border-b border-borda-cartao px-6 py-4">
                    <div className="min-w-0">
                        <h2 id={idTitulo} className="font-outfit text-xl font-semibold text-black">
                            {titulo}
                        </h2>
                        {descricao && (
                            <p id={idDescricao} className="mt-1 text-sm text-texto-suave">
                                {descricao}
                            </p>
                        )}
                    </div>
                    {botaoFechar && (
                        <button
                            type="button"
                            onClick={onFechar}
                            disabled={bloqueado}
                            aria-label="Fechar"
                            className="-mr-2 -mt-1 flex size-11 shrink-0 items-center justify-center rounded-full text-gray-700 hover:bg-opcao"
                        >
                            <X size={20} aria-hidden="true" />
                        </button>
                    )}
                </div>

                {children && (
                    <div
                        tabIndex={corpoFocavel ? 0 : undefined}
                        role={corpoFocavel ? 'region' : undefined}
                        aria-labelledby={corpoFocavel ? idTitulo : undefined}
                        className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5 focus-visible:outline-offset-[-2px]"
                    >
                        {children}
                    </div>
                )}

                {rodape && <div className="shrink-0 border-t border-borda-cartao px-6 py-4">{rodape}</div>}
            </div>
        </div>,
        document.body,
    )
}
