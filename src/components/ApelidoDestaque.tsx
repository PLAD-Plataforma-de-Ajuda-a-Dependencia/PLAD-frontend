import { useState } from 'react'
import { X } from 'lucide-react'
import avatarPlaceholder from '../assets/avatar-placeholder.svg'
import { useSessao } from '../session/SessaoContext'

// Quem já fechou o aviso, por id de usuário. Só em memória (some ao recarregar a página), como o resto dos dados da sessão
let fechadoPor: number | null = null

/**
 * O apelido do dependente em destaque, com o reforço de que o nome real só chega ao psicólogo (RF007). Só o
 * dependente tem apelido; para os outros papéis não aparece nada. O X fecha o aviso; trocar de apelido fica no menu
 * da conta.
 */
export default function ApelidoDestaque() {
    const { me } = useSessao()
    const [, atualizar] = useState(0)
    if (me?.type_user !== 'dependente' || !me.nickname || fechadoPor === me.id) {
        return null
    }

    const fechar = () => {
        fechadoPor = me.id
        atualizar((n) => n + 1)
    }

    return (
        <section
            aria-label="Seu apelido"
            className="relative mb-8 flex items-center gap-4 rounded-cartao border border-plad/20 bg-plad-fundo p-4 pr-14 md:p-5 md:pr-16"
        >
            <img src={avatarPlaceholder} alt="" className="size-14 shrink-0" />
            <div className="min-w-0">
                <p className="text-sm text-plad-rodape">Você entra no PLAD como</p>
                <p className="break-words font-outfit text-2xl font-semibold text-black">{me.nickname}</p>
                <p className="mt-1 text-sm text-gray-700">
                    Este é o seu apelido. Ninguém além dos psicólogos vê o seu nome real.
                </p>
            </div>
            <button
                type="button"
                onClick={fechar}
                aria-label="Fechar aviso"
                className="absolute right-1 top-1 flex size-11 items-center justify-center rounded-botao text-gray-700 transition hover:bg-black/5 hover:text-black"
            >
                <X size={20} aria-hidden="true" />
            </button>
        </section>
    )
}
