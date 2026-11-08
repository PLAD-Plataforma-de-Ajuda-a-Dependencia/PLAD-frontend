import instaIcon from '../assets/insta.png'
import youtubeIcon from '../assets/youtube.png'
import linkedinIcon from '../assets/linkedin.png'
import xIcon from '../assets/x.png'

// Ainda não há páginas nem endereços para estes itens: ficam como texto, sem parecer link
const ITENS = ['Plad', 'Sobre', 'Ética e Compliance', 'Fale Conosco', 'Informações Legais']
// Estes têm página (públicas, em src/pages): são links de verdade, com alvo de toque de pelo menos 44 px
const DOCUMENTOS = [
    { para: '/termos', rotulo: 'Termos de Uso' },
    { para: '/privacidade', rotulo: 'Privacidade' },
    { para: '/como-protegemos', rotulo: 'Como protegemos seus dados' },
]
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
                    {DOCUMENTOS.map(({ para, rotulo }) => (
                        <li key={para}>
                            {/* Em outra aba: o rodapé também aparece na sala da reunião, e sair dela por um link desconectaria a chamada */}
                            <a
                                href={para}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex min-h-11 items-center underline hover:text-white focus-visible:outline-white"
                            >
                                {rotulo}
                                <span className="sr-only"> (abre em outra aba)</span>
                            </a>
                        </li>
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
