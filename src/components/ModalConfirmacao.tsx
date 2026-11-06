import { useId, useRef, type FormEvent, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import Botao from './Botao'
import useArmadilhaFoco from './useArmadilhaFoco'

interface ModalConfirmacaoProps {
    aberto: boolean
    titulo: string
    descricao?: string
    rotuloConfirmar: string
    rotuloCancelar?: string
    /** Ação destrutiva: o botão de confirmar fica vermelho */
    perigo?: boolean
    carregando?: boolean
    /** Por exemplo, enquanto a senha pedida no modal não foi digitada */
    confirmarDesabilitado?: boolean
    onConfirmar: () => void
    onCancelar: () => void
    /** Conteúdo extra entre o texto e os botões (um campo de senha, por exemplo) */
    children?: ReactNode
}

/**
 * Confirmação antes de uma ação sem volta ou que troca dados. Foco preso no modal, Esc e clique fora cancelam
 * (menos durante o envio) e o Enter confirma, porque o conteúdo é um formulário.
 */
export default function ModalConfirmacao({
    aberto,
    titulo,
    descricao,
    rotuloConfirmar,
    rotuloCancelar = 'Cancelar',
    perigo = false,
    carregando = false,
    confirmarDesabilitado = false,
    onConfirmar,
    onCancelar,
    children,
}: ModalConfirmacaoProps) {
    const painel = useRef<HTMLDivElement>(null)
    const idTitulo = useId()
    const idDescricao = useId()

    useArmadilhaFoco(painel, aberto, () => {
        if (!carregando) onCancelar()
    })

    if (!aberto) {
        return null
    }

    const enviar = (e: FormEvent) => {
        e.preventDefault()
        if (!carregando && !confirmarDesabilitado) onConfirmar()
    }

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget && !carregando) onCancelar()
            }}
        >
            <div
                ref={painel}
                role="dialog"
                aria-modal="true"
                aria-labelledby={idTitulo}
                aria-describedby={descricao ? idDescricao : undefined}
                tabIndex={-1}
                className="w-full max-w-md rounded-cartao bg-white p-6 shadow-xl"
            >
                <form onSubmit={enviar} className="space-y-4">
                    <h2 id={idTitulo} className="font-outfit text-xl font-semibold text-black">
                        {titulo}
                    </h2>
                    {descricao && (
                        <p id={idDescricao} className="text-sm text-gray-700">
                            {descricao}
                        </p>
                    )}
                    {children}
                    <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
                        <Botao variante="secundario" onClick={onCancelar} disabled={carregando}>
                            {rotuloCancelar}
                        </Botao>
                        <Botao
                            type="submit"
                            variante={perigo ? 'perigo' : 'primario'}
                            carregando={carregando}
                            disabled={confirmarDesabilitado}
                        >
                            {rotuloConfirmar}
                        </Botao>
                    </div>
                </form>
            </div>
        </div>,
        document.body,
    )
}
