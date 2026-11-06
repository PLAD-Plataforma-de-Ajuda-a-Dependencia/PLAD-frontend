import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { ClipboardList, LayoutDashboard, Video } from 'lucide-react'
// CalendarDays e Users voltam quando as páginas Calendário e Comunidade existirem
import type { UserType } from '../api/auth'
import { useSessao } from '../session/SessaoContext'
import MenuConta from './MenuConta'

// Mesmos ícones usados no footer da Home
import instaIcon from '../assets/insta.png'
import youtubeIcon from '../assets/youtube.png'
import xIcon from '../assets/x.png'
import linkedinIcon from '../assets/linkedin.png'

/**
 * Casca das páginas com barra lateral (Calendário e Gestão): barra à esquerda, o conteúdo da página e o rodapé.
 * A página entrega o seu `<main className="flex-1 ...">` como `children`.
 * É o único lugar com o MenuConta (os três pontos que expandem o painel da conta).
 */

interface ItemBarra {
    to: string
    label: string
    icone: ReactNode
}

const PAINEL: ItemBarra = { to: '/Calendario', label: 'Painel', icone: <LayoutDashboard size={20} /> }
// A página /reuniao ainda não existe (cai na Home), como já era
const REUNIAO: ItemBarra = { to: '/reuniao', label: 'Reunião', icone: <Video size={20} /> }
const GESTAO: ItemBarra = { to: '/adminPsico', label: 'Gestão', icone: <ClipboardList size={20} /> }

// O Calendário mostra os contadores de sobriedade do dependente, então o admin só tem a Gestão
const ITENS_POR_PAPEL: Record<UserType, ItemBarra[]> = {
    dependente: [PAINEL, REUNIAO],
    psicologo: [PAINEL, REUNIAO, GESTAO],
    admin: [GESTAO],
}

export default function LayoutPainel({ children }: { children: ReactNode }) {
    const { me } = useSessao()
    const { pathname } = useLocation()
    const itens = me ? ITENS_POR_PAPEL[me.type_user] : []

    return (
        <div className="w-full min-h-screen bg-[#f4f5fd] flex flex-col font-roboto text-slate-900">
            <div className="flex flex-1">
                {/* Sidebar: a coluna branca acompanha a página inteira e o conteúdo dela fica preso à altura da janela
                    (sticky), para os três pontos e o painel expandido do MenuConta estarem sempre à vista, mesmo
                    em páginas altas; max-h-full impede que passe por cima do rodapé */}
                <aside className="w-24 lg:w-28 bg-white shadow-sm shrink-0">
                    <div className="sticky top-0 flex h-screen max-h-full flex-col items-center py-8">
                        <span className="font-outfit font-bold text-lg text-black mb-10">PLAD</span>

                        <nav className="flex flex-col items-center gap-8 flex-1">
                            {itens.map((item) => (
                                <SidebarLink
                                    key={item.to}
                                    to={item.to}
                                    icon={item.icone}
                                    label={item.label}
                                    active={pathname.toLowerCase() === item.to.toLowerCase()}
                                />
                            ))}
                        </nav>

                        {/* Os três pontos expandem o painel da conta (que ancora neste bloco sticky); o círculo roxo é o avatar provisório */}
                        <MenuConta />
                    </div>
                </aside>

                {children}
            </div>

            {/* Footer */}
            <footer id="contato" className="bg-[#120063] text-white py-12 px-8">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-gray-300">
                    <div className="flex flex-wrap items-center justify-center gap-4 md:gap-6">
                        <span>Plad</span>
                        <span>|</span>
                        <span>Sobre</span>
                        <span>|</span>
                        <span>Ética e Compliance</span>
                        <span>|</span>
                        <span>Fale Conosco</span>
                        <span>|</span>
                        <span>Informações Legais</span>
                        <span>|</span>
                        <span>Privacidade</span>
                    </div>

                    {/* Ícones Sociais no Footer */}
                    <div className="flex items-center space-x-5">
                        <a href="#instagram" aria-label="Instagram" className="hover:opacity-80 transition-opacity">
                            <img src={instaIcon} alt="Instagram" className="w-5 h-5 object-contain" />
                        </a>
                        <a href="#youtube" aria-label="YouTube" className="hover:opacity-80 transition-opacity">
                            <img src={youtubeIcon} alt="YouTube" className="w-5 h-5 object-contain" />
                        </a>
                        <a href="#linkedin" aria-label="LinkedIn" className="hover:opacity-80 transition-opacity">
                            <img src={linkedinIcon} alt="LinkedIn" className="w-5 h-5 object-contain" />
                        </a>
                        <a href="#x" aria-label="X" className="hover:opacity-80 transition-opacity">
                            <img src={xIcon} alt="X" className="w-5 h-5 object-contain" />
                        </a>
                    </div>
                </div>
                <div className="max-w-7xl mx-auto mt-8 text-center md:text-left text-xs text-gray-400">
                    © Plataforma de Ajuda a Dependência
                </div>
            </footer>
        </div>
    )
}

function SidebarLink({
    to,
    icon,
    label,
    active = false,
}: {
    to: string
    icon: ReactNode
    label: string
    active?: boolean
}) {
    return (
        <Link
            to={to}
            aria-current={active ? 'page' : undefined}
            className={[
                'flex flex-col items-center gap-1 text-[11px] font-medium transition',
                active ? 'text-[#5271ff]' : 'text-gray-400 hover:text-gray-600',
            ].join(' ')}
        >
            {icon}
            {label}
        </Link>
    )
}
