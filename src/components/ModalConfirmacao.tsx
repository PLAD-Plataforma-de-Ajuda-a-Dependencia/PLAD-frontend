import { useId, type FormEvent, type ReactNode } from 'react'
import Botao from './Botao'
import Modal from './Modal'

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
    /** Conteúdo extra entre o texto e os botões (um campo de senha, por exemplo); é o corpo que rola */
    children?: ReactNode
}

/**
 * Confirmação antes de uma ação sem volta ou que troca dados, sobre o `Modal` base: o título e o texto no cabeçalho, o
 * conteúdo extra no corpo e os botões no rodapé fixo. Esc e clique fora cancelam (menos durante o envio); com conteúdo
 * extra, o Enter num campo confirma, porque o corpo é um formulário.
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
    const idFormulario = useId()

    const confirmar = () => {
        if (!carregando && !confirmarDesabilitado) onConfirmar()
    }

    const enviar = (e: FormEvent) => {
        e.preventDefault()
        confirmar()
    }

    return (
        <Modal
            aberto={aberto}
            titulo={titulo}
            descricao={descricao}
            onFechar={onCancelar}
            bloqueado={carregando}
            rodape={
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <Botao variante="secundario" onClick={onCancelar} disabled={carregando}>
                        {rotuloCancelar}
                    </Botao>
                    {/* Com conteúdo extra, o botão envia o formulário do corpo (o Enter num campo também); sem ele, só confirma */}
                    <Botao
                        type={children ? 'submit' : 'button'}
                        form={children ? idFormulario : undefined}
                        onClick={children ? undefined : confirmar}
                        variante={perigo ? 'perigo' : 'primario'}
                        carregando={carregando}
                        disabled={confirmarDesabilitado}
                    >
                        {rotuloConfirmar}
                    </Botao>
                </div>
            }
        >
            {children && (
                <form id={idFormulario} onSubmit={enviar} className="space-y-4">
                    {children}
                </form>
            )}
        </Modal>
    )
}
