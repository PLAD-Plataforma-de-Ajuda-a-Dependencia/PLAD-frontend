import { useId, type ReactNode } from 'react'

/** O que o controle (input, select, textarea) recebe do <Campo>: o vínculo com o rótulo, o erro e a ajuda */
export interface PropsControle {
    id: string
    'aria-invalid': boolean
    'aria-describedby': string | undefined
    className: string
}

interface CampoProps {
    rotulo: string
    /** O rótulo continua no HTML (leitor de tela), mas só aparece o placeholder do controle, como no Figma */
    rotuloOculto?: boolean
    /** Mensagem de erro, logo abaixo do campo e anunciada por leitores de tela */
    erro?: string
    ajuda?: string
    className?: string
    children: (controle: PropsControle) => ReactNode
}

// Mesmo visual do Figma: borda de 1 px na cor da marca (#4B64F9), cantos arredondados e 51 px de altura; o erro troca a
// borda e não apaga o que foi digitado
const CLASSE_CONTROLE =
    'w-full min-h-[51px] rounded-campo border border-plad bg-white px-4 py-3 text-base text-gray-900 placeholder:text-texto-suave focus:outline-2 focus:outline-plad aria-invalid:border-2 aria-invalid:border-erro'

/**
 * Campo de formulário: rótulo, controle e erro. O controle vem como função para servir input, select e textarea sem
 * perder o tipo das propriedades de cada um:
 *
 *   <Campo rotulo="E-mail" erro={erros.email}>{(c) => <input {...c} type="email" name="email" />}</Campo>
 *
 * Com `rotuloOculto`, o texto do rótulo deve ser repetido no `placeholder` do controle.
 */
export default function Campo({ rotulo, rotuloOculto = false, erro, ajuda, className = '', children }: CampoProps) {
    const id = useId()
    const idErro = `${id}-erro`
    const idAjuda = `${id}-ajuda`
    const descricao = [erro ? idErro : null, ajuda ? idAjuda : null].filter(Boolean).join(' ') || undefined

    return (
        <div className={className}>
            <label htmlFor={id} className={rotuloOculto ? 'sr-only' : 'mb-1 block text-sm font-medium text-gray-700'}>
                {rotulo}
            </label>
            {children({ id, 'aria-invalid': Boolean(erro), 'aria-describedby': descricao, className: CLASSE_CONTROLE })}
            {ajuda && (
                <p id={idAjuda} className="mt-1 text-sm text-texto-suave">
                    {ajuda}
                </p>
            )}
            {erro && (
                <p id={idErro} role="alert" className="mt-1 text-sm text-erro">
                    {erro}
                </p>
            )}
        </div>
    )
}
