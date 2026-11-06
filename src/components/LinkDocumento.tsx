import { DOCUMENTOS } from '../api/consentimento'

/**
 * Link para um dos documentos legais. Enquanto o texto não existe (`href` nulo em consentimento.ts), o título
 * aparece com o aviso "texto em preparação", para ninguém achar que o link já funciona.
 */
export default function LinkDocumento({ documento }: { documento: keyof typeof DOCUMENTOS }) {
    const { titulo, href } = DOCUMENTOS[documento]

    if (href) {
        return (
            <a href={href} target="_blank" rel="noreferrer" className="text-plad underline hover:text-plad-hover">
                {titulo}
            </a>
        )
    }

    return (
        <span className="text-plad underline decoration-dotted">
            {titulo} <span className="text-texto-suave no-underline">(texto em preparação)</span>
        </span>
    )
}
