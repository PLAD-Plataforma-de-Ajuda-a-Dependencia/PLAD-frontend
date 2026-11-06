import { useState, type InputHTMLAttributes } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import Campo from './Campo'

interface CampoSenhaProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'id' | 'className'> {
    rotulo: string
    /** Só o placeholder aparece (o rótulo fica para o leitor de tela); o placeholder é o próprio `rotulo` */
    rotuloOculto?: boolean
    erro?: string
    ajuda?: string
}

/** Campo de senha com o botão de mostrar/esconder, para quem quer conferir o que digitou */
export default function CampoSenha({ rotulo, rotuloOculto = false, erro, ajuda, ...input }: CampoSenhaProps) {
    const [visivel, setVisivel] = useState(false)

    return (
        <Campo rotulo={rotulo} rotuloOculto={rotuloOculto} erro={erro} ajuda={ajuda}>
            {(controle) => (
                <div className="relative">
                    <input
                        placeholder={rotuloOculto ? rotulo : undefined}
                        {...input}
                        {...controle}
                        type={visivel ? 'text' : 'password'}
                        className={`${controle.className} pr-12`}
                    />
                    <button
                        type="button"
                        onClick={() => setVisivel((atual) => !atual)}
                        aria-label="Mostrar senha"
                        aria-pressed={visivel}
                        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-campo text-gray-600 hover:text-gray-900"
                    >
                        {visivel ? <EyeOff size={20} aria-hidden="true" /> : <Eye size={20} aria-hidden="true" />}
                    </button>
                </div>
            )}
        </Campo>
    )
}
