import { DOCUMENTOS } from '../api/consentimento'

/**
 * Link para um dos documentos legais (páginas públicas /termos, /privacidade e /como-protegemos). Abre em outra aba de
 * propósito: o cadastro guarda o que foi digitado só na memória da aba, e um link na mesma aba o perderia.
 * Se o texto de uma versão ainda não chegou, é a própria página que avisa.
 */
export default function LinkDocumento({ documento }: { documento: keyof typeof DOCUMENTOS }) {
    const { titulo, href } = DOCUMENTOS[documento]

    return (
        <a href={href} target="_blank" rel="noreferrer" className="text-plad underline hover:text-plad-hover">
            {titulo}
            <span className="sr-only"> (abre em outra aba)</span>
        </a>
    )
}
