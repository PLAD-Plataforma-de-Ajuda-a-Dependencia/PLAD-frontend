import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ClipboardCheck, ClipboardList, House, Video, type LucideIcon } from 'lucide-react'
// CalendarDays e Users voltam quando as páginas Calendário e Comunidade existirem
import type { UserType } from '../api/auth'
import { useSessao } from '../session/SessaoContext'
import MenuConta from './MenuConta'
import Rodape from './Rodape'
import useTitulo from './useTitulo'

/**
 * Casca das páginas com navegação (Calendário, Triagens e Gestão), como no Figma: a página inteira é lilás (`plad-fundo`), a
 * sidebar fica direto sobre ela (sem coluna branca) e o conteúdo vai num painel branco arredondado, com o rodapé
 * embaixo. No celular (abaixo de `md`) a sidebar vira a barra fixa na parte de baixo, com alvos de pelo menos 44 px.
 * A página entrega o seu `<main id="conteudo" className="min-w-0 ...">` como `children`; o painel branco é daqui.
 * O MenuConta (a conta, o apelido e o "sair") só existe aqui.
 */

interface ItemBarra {
    // Sem `to`, o item é mostrado como "em breve": a página ainda não existe
    to?: string
    label: string
    icone: LucideIcon
    // Painel é um ícone cheio no Figma; os outros são só contorno
    cheio?: boolean
}

const PAINEL: ItemBarra = { to: '/Calendario', label: 'Painel', icone: House, cheio: true }
const REUNIAO_DO_DEPENDENTE: ItemBarra = { to: '/minhas-reunioes', label: 'Reunião', icone: Video }
// Triagens recebidas: do psicólogo (lê com o nome real). A Gestão é do admin: as rotas /admin/* respondem 403 aos outros
const TRIAGENS: ItemBarra = { to: '/triagens', label: 'Triagens', icone: ClipboardCheck }
const GESTAO: ItemBarra = { to: '/adminPsico', label: 'Gestão', icone: ClipboardList }

// Cada papel vê só o que consegue abrir. O Calendário mostra os contadores de sobriedade do dependente, então o admin só
// tem a Gestão. O psicólogo não tem "Reunião" porque não há página para ele: um item desabilitado não ajuda ninguém
const ITENS_POR_PAPEL: Record<UserType, ItemBarra[]> = {
    dependente: [PAINEL, REUNIAO_DO_DEPENDENTE],
    psicologo: [PAINEL, TRIAGENS],
    admin: [GESTAO],
}

export default function LayoutPainel({ titulo, children }: { titulo?: string; children: ReactNode }) {
    const { me } = useSessao()
    const { pathname } = useLocation()
    const itens = me ? ITENS_POR_PAPEL[me.type_user] : []
    useTitulo(titulo)

    const ativo = (item: ItemBarra) => item.to !== undefined && pathname.toLowerCase() === item.to.toLowerCase()

    return (
        <div className="flex min-h-screen w-full flex-col bg-plad-fundo font-roboto text-slate-900">
            <a
                href="#conteudo"
                className="sr-only rounded-botao bg-white px-4 py-2 font-medium text-plad shadow focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50"
            >
                Pular para o conteúdo
            </a>

            <div className="flex flex-1">
                {/* Sidebar (a partir de md), direto sobre o lilás: a coluna acompanha a página inteira e o conteúdo dela
                    fica preso à altura da janela (sticky), para os três pontos do MenuConta estarem sempre à vista */}
                <aside className="hidden w-24 shrink-0 md:block">
                    <div className="sticky top-0 flex h-screen max-h-full flex-col py-8">
                        <span className="mb-10 pl-3.5 font-roboto text-xl font-bold text-black">PLAD</span>

                        <nav aria-label="Navegação principal" className="flex flex-1 flex-col items-center gap-6">
                            {itens.map((item) => (
                                <ItemNav key={item.label} item={item} ativo={ativo(item)} />
                            ))}
                        </nav>

                        <div className="flex flex-col items-center">
                            <MenuConta variante="lateral" />
                        </div>
                    </div>
                </aside>

                {/* O painel branco arredondado: 40 px de folga em cima, 60 à direita e 20 embaixo no computador */}
                <div className="min-w-0 flex-1 p-2 sm:p-3 md:pb-5 md:pl-0 md:pr-[60px] md:pt-10">
                    <div className="rounded-painel bg-white shadow-painel">{children}</div>
                </div>
            </div>

            {/* Na parte de baixo ficam a barra do celular e, por baixo dela, o fim do rodapé */}
            <Rodape className="pb-24 md:pb-12" />

            {/* Barra de navegação do celular (abaixo de md) */}
            <nav
                aria-label="Navegação principal"
                className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-stretch border-t border-gray-200 bg-white md:hidden"
            >
                {itens.map((item) => (
                    <ItemNav key={item.label} item={item} ativo={ativo(item)} naBarra />
                ))}
                <MenuConta variante="barra" />
            </nav>
        </div>
    )
}

function ItemNav({ item, ativo, naBarra = false }: { item: ItemBarra; ativo: boolean; naBarra?: boolean }) {
    const Icone = item.icone
    const base = `flex min-h-11 min-w-11 flex-col items-center justify-center gap-1 px-2 text-xs font-medium ${naBarra ? 'flex-1' : ''}`
    const icone = (
        <Icone size={naBarra ? 22 : 28} fill={item.cheio ? 'currentColor' : 'none'} aria-hidden="true" />
    )

    if (!item.to) {
        return (
            <span aria-disabled="true" className={`${base} cursor-not-allowed text-gray-600`}>
                {icone}
                {item.label}
                <span className="-mt-0.5 text-xs">em breve</span>
            </span>
        )
    }

    return (
        <Link
            to={item.to}
            aria-current={ativo ? 'page' : undefined}
            className={`${base} transition ${ativo ? 'text-plad-active' : 'text-black hover:text-gray-600'}`}
        >
            {/* O ícone ativo usa o azul da marca; o rótulo, o azul mais escuro, que passa no contraste sobre o lilás */}
            <span className={ativo ? 'text-plad' : ''}>{icone}</span>
            {item.label}
        </Link>
    )
}
