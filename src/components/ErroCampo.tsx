/** Mensagem de erro de um campo (VALIDATION_ERROR), logo abaixo dele; não renderiza nada sem mensagem */
export default function ErroCampo({ id, mensagem }: { id?: string; mensagem?: string }) {
    if (!mensagem) {
        return null
    }
    return (
        <p id={id} role="alert" className="mt-1 text-xs text-red-600">
            {mensagem}
        </p>
    )
}
