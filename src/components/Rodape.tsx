import instaIcon from '../assets/insta.png'
import youtubeIcon from '../assets/youtube.png'
import linkedinIcon from '../assets/linkedin.png'
import xIcon from '../assets/x.png'

// Ainda não há páginas nem endereços para estes itens: ficam como texto, sem parecer link
const ITENS = ['Plad', 'Sobre', 'Ética e Compliance', 'Fale Conosco', 'Informações Legais', 'Privacidade']
const REDES = [instaIcon, youtubeIcon, linkedinIcon, xIcon]

/** Rodapé único (Home e páginas com barra lateral). O `id="contato"` é o destino do link "contato" da Home */
export default function Rodape({ className = '' }: { className?: string }) {
    return (
        <footer id="contato" className={`bg-plad-rodape px-6 py-12 text-white sm:px-8 ${className}`.trim()}>
            <div className="mx-auto flex max-w-[1114px] flex-col items-center justify-between gap-6 text-sm text-gray-200 md:flex-row">
                <ul className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
                    {ITENS.map((item) => (
                        <li key={item}>{item}</li>
                    ))}
                </ul>
                {/* Decorativo: sem endereço, não é link */}
                <ul className="flex items-center gap-5" aria-hidden="true">
                    {REDES.map((icone) => (
                        <li key={icone}>
                            <img src={icone} alt="" className="size-5 object-contain" />
                        </li>
                    ))}
                </ul>
            </div>
            <div className="mx-auto mt-8 max-w-[1114px] text-center text-xs text-gray-300 md:text-left">
                © Plataforma de Ajuda a Dependência
            </div>
        </footer>
    )
}
