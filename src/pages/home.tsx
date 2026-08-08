import { Link } from 'react-router-dom'

// Import das imagens
import inicioImg from '../assets/inicio.png'
import sobreImg from '../assets/sobre.png'
import coracaoIcon from '../assets/coracao.png'
import livrinhoIcon from '../assets/livrinho.png'
import anonimoIcon from '../assets/anonimo.png'
import instaIcon from '../assets/insta.png'
import youtubeIcon from '../assets/youtube.png'
import xIcon from '../assets/x.png'
import linkedinIcon from '../assets/linkedin.png'

export default function Home() {
    return (
        <div className="w-full bg-[#f4f5fd] text-slate-900 font-sans min-h-screen">
            {/* Navbar / Header */}
            <header className="max-w-7xl mx-auto px-8 py-8 flex items-center justify-between">
        <span className="font-extrabold text-2xl tracking-wider text-black uppercase">
          PLAD
        </span>
                <nav className="flex items-center space-x-12 text-base text-gray-800 font-medium">
                    <a href="#sobre" className="hover:text-black transition">
                        sobre
                    </a>
                    <a href="#servicos" className="hover:text-black transition">
                        serviços
                    </a>
                    <a href="#contato" className="hover:text-black transition">
                        contato
                    </a>
                    <Link
                        to="/login"
                        className="hover:text-black transition font-semibold"
                    >
                        entrar
                    </Link>
                </nav>
            </header>

            {/* Hero Section */}
            <section className="max-w-7xl mx-auto px-8 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-8">
                    <h1 className="text-5xl lg:text-6xl font-black text-black leading-[1.15] tracking-tight">
                        Acolhimento <br /> Digital Para <br /> Você
                    </h1>
                    <p className="text-gray-600 text-base lg:text-lg leading-relaxed max-w-lg">
                        Nossa plataforma conecta você a psicólogos online, com atendimento
                        gratuito, acolhedor e livre de julgamentos.
                    </p>
                    <div className="pt-2">
                        <button className="bg-[#5271ff] hover:bg-[#405de6] text-white font-bold text-sm uppercase tracking-wider py-4 px-10 rounded-2xl shadow-lg transition-colors">
                            TRIAGEM
                        </button>
                    </div>
                </div>

                <div className="flex justify-center lg:justify-end">
                    <img
                        src={inicioImg}
                        alt="Acolhimento Digital PLAD"
                        className="w-full max-w-xl lg:max-w-2xl object-contain"
                    />
                </div>
            </section>

            {/* Section: Sobre a PLAD */}
            <section id="sobre" className="bg-[#8397ff] text-white py-20 px-8">
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                    <div className="flex justify-center order-2 lg:order-1">
                        <img
                            src={sobreImg}
                            alt="Sobre a PLAD"
                            className="w-full max-w-xl lg:max-w-2xl object-contain"
                        />
                    </div>

                    <div className="space-y-6 order-1 lg:order-2">
                        <h2 className="text-4xl lg:text-5xl font-black text-black">
                            Sobre a PLAD
                        </h2>
                        <div className="space-y-5 text-sm lg:text-base text-gray-900 leading-relaxed">
                            <p>
                                Somos uma plataforma de acolhimento digital criada para oferecer
                                apoio psicológico seguro, anônimo e gratuito a pessoas que
                                enfrentam a dependência química e seus familiares.
                            </p>
                            <p>
                                Acreditamos que ninguém deve enfrentar essa jornada sozinho - por
                                isso, conectamos usuários a psicólogos voluntários e parceiros, em
                                um espaço online humanizado e livre de julgamentos.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Section: Nossos Serviços */}
            <section id="servicos" className="py-24 px-8 max-w-7xl mx-auto text-center">
                <h2 className="text-4xl lg:text-5xl font-black text-black mb-6">
                    Nossos Serviços
                </h2>
                <p className="text-gray-600 text-sm lg:text-base max-w-3xl mx-auto mb-20 leading-relaxed">
                    Nosso objetivo é tornar o cuidado psicológico mais acessível. Por isso,
                    reunimos em um único ambiente digital diferentes formas de acolhimento:
                    atendimento com psicólogos, relatos anônimos e conteúdos educativos
                    sobre dependência química e saúde mental.
                </p>

                {/* Cards de Serviços */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10 text-center">
                    {/* Card 1 */}
                    <div className="bg-white rounded-3xl p-10 shadow-xl shadow-indigo-100 flex flex-col items-center border border-gray-100">
                        <div className="w-20 h-20 mb-8 flex items-center justify-center">
                            <img
                                src={anonimoIcon}
                                alt="Espaços de Relatos Anônimos"
                                className="max-h-full object-contain"
                            />
                        </div>
                        <h3 className="font-bold text-black text-base mb-4">
                            Espaços de Relatos Anônimos
                        </h3>
                        <p className="text-gray-500 text-sm leading-relaxed">
                            Um ambiente acolhedor onde você pode dividir experiências,
                            inspirar outras pessoas e perceber que não está sozinho nessa
                            jornada.
                        </p>
                    </div>

                    {/* Card 2 */}
                    <div className="bg-white rounded-3xl p-10 shadow-xl shadow-indigo-100 flex flex-col items-center border border-gray-100">
                        <div className="w-20 h-20 mb-8 flex items-center justify-center">
                            <img
                                src={coracaoIcon}
                                alt="Converse Com Psicólogos"
                                className="max-h-full object-contain"
                            />
                        </div>
                        <h3 className="font-bold text-black text-base mb-4">
                            Converse Com Psicólogos de Forma Anônima e Segura
                        </h3>
                        <p className="text-gray-500 text-sm leading-relaxed">
                            Atendimento online, gratuitos e confidenciais com profissionais
                            especializados em saúde mental e dependência química.
                        </p>
                    </div>

                    {/* Card 3 */}
                    <div className="bg-white rounded-3xl p-10 shadow-xl shadow-indigo-100 flex flex-col items-center border border-gray-100">
                        <div className="w-20 h-20 mb-8 flex items-center justify-center">
                            <img
                                src={livrinhoIcon}
                                alt="Informação que acolhe"
                                className="max-h-full object-contain"
                            />
                        </div>
                        <h3 className="font-bold text-black text-base mb-4">
                            Informação que acolhe e orienta
                        </h3>
                        <p className="text-gray-500 text-sm leading-relaxed">
                            Artigos, dicas e materiais confiáveis sobre saúde mental,
                            prevenção e tratamento da dependência - tudo em linguagem simples
                            e acessível.
                        </p>
                    </div>
                </div>
            </section>

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
                            <img src={instaIcon} alt="Instagram" className="w-5 h-5 object-contain filter invert" />
                        </a>
                        <a href="#youtube" aria-label="YouTube" className="hover:opacity-80 transition-opacity">
                            <img src={youtubeIcon} alt="YouTube" className="w-5 h-5 object-contain filter invert" />
                        </a>
                        <a href="#linkedin" aria-label="LinkedIn" className="hover:opacity-80 transition-opacity">
                            <img src={linkedinIcon} alt="LinkedIn" className="w-5 h-5 object-contain filter invert" />
                        </a>
                        <a href="#x" aria-label="X" className="hover:opacity-80 transition-opacity">
                            <img src={xIcon} alt="X" className="w-5 h-5 object-contain filter invert" />
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