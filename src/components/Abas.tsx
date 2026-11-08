import type { KeyboardEvent } from 'react'
import type { LucideIcon } from 'lucide-react'

export interface AbaDef<T extends string> {
    id: T
    rotulo: string
    icone?: LucideIcon
}

interface AbasProps<T extends string> {
    /** `aria-label` da lista de abas */
    rotulo: string
    abas: readonly AbaDef<T>[]
    ativa: T
    onEscolher: (id: T) => void
    /** Prefixo dos ids (use `useId()`): a aba é `${idBase}-aba-${id}` e o painel que ela controla, `${idBase}-painel-${id}` */
    idBase: string
    /** `escuro` para a sala ao vivo (texto branco sobre fundo escuro); `claro` é o padrão */
    tema?: 'claro' | 'escuro'
    className?: string
}

/**
 * Lista de abas com o padrão do WAI-ARIA: setas, Home e End movem entre elas e só a aba ativa entra na ordem do Tab.
 * Só desenha a lista: quem usa renderiza os painéis (`role="tabpanel"`, `id` e `aria-labelledby` pela convenção acima),
 * assim cada tela decide se monta tudo de uma vez ou só na primeira visita (a Gestão não pode repetir leitura auditada).
 */
export default function Abas<T extends string>({
    rotulo,
    abas,
    ativa,
    onEscolher,
    idBase,
    tema = 'claro',
    className = '',
}: AbasProps<T>) {
    const aoTeclar = (e: KeyboardEvent<HTMLDivElement>) => {
        const indice = abas.findIndex((aba) => aba.id === ativa)
        let novo: number
        if (e.key === 'ArrowRight') novo = (indice + 1) % abas.length
        else if (e.key === 'ArrowLeft') novo = (indice - 1 + abas.length) % abas.length
        else if (e.key === 'Home') novo = 0
        else if (e.key === 'End') novo = abas.length - 1
        else return
        e.preventDefault()
        onEscolher(abas[novo].id)
        document.getElementById(`${idBase}-aba-${abas[novo].id}`)?.focus()
    }

    const escuro = tema === 'escuro'

    return (
        <div
            role="tablist"
            aria-label={rotulo}
            onKeyDown={aoTeclar}
            className={`flex border-b ${escuro ? 'border-white/20' : 'border-borda-cartao'} ${className}`.trim()}
        >
            {abas.map((aba) => {
                const Icone = aba.icone
                const selecionada = ativa === aba.id
                const cores = escuro
                    ? selecionada
                        ? 'border-white text-white'
                        : 'border-transparent text-gray-300 hover:text-white'
                    : selecionada
                      ? 'border-plad text-plad-active'
                      : 'border-transparent text-texto-suave hover:text-black'
                return (
                    <button
                        key={aba.id}
                        type="button"
                        role="tab"
                        id={`${idBase}-aba-${aba.id}`}
                        aria-selected={selecionada}
                        aria-controls={`${idBase}-painel-${aba.id}`}
                        tabIndex={selecionada ? 0 : -1}
                        onClick={() => onEscolher(aba.id)}
                        className={`-mb-px flex min-h-11 flex-1 items-center justify-center gap-1.5 border-b-2 px-2 py-2 font-outfit text-sm font-medium transition-colors sm:flex-none sm:gap-2 sm:px-6 sm:text-base ${cores}`}
                    >
                        {Icone && <Icone size={18} aria-hidden="true" />}
                        {aba.rotulo}
                    </button>
                )
            })}
        </div>
    )
}
