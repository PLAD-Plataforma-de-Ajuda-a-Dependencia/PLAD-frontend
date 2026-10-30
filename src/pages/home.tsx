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
        <div className="w-full bg-plad-fundo text-slate-900 font-roboto min-h-screen">
            {/* Navbar + Hero: fundo lilás com os brilhos em gradiente do Figma (roxo no topo esquerdo, azul no canto inferior direito) */}
            <div
                style={{
                    backgroundImage:
                        'radial-gradient(ellipse 30% 45% at 12% 0%, rgba(150,142,205,0.55), transparent), radial-gradient(ellipse 40% 55% at 100% 100%, rgba(112,132,255,0.85), transparent)',
                }}
            >
            {/* Navbar / Header */}
            <header className="max-w-[1114px] mx-auto px-8 pt-14 pb-6 flex items-center justify-between">
                <span className="font-outfit font-bold text-2xl text-black">PLAD</span>
                {/* Os três links ficam agrupados e "entrar" separado à direita, como no Figma */}
                <nav className="flex items-center gap-x-6 md:gap-x-[70px] text-base lg:text-[17px] text-gray-900 font-medium">
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
                        className="lg:ml-52 hover:text-black transition font-semibold"
                    >
                        entrar
                    </Link>
                </nav>
            </header>

            {/* Hero Section */}
            <section className="max-w-[1114px] mx-auto px-8 py-16 lg:py-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-7">
                    <h1 className="font-outfit text-6xl lg:text-[76px] font-bold text-black leading-[1.2]">
                        Acolhimento <br /> Digital Para <br /> Você
                    </h1>
                    <p className="text-gray-900 text-base leading-relaxed max-w-[440px]">
                        Nossa plataforma conecta você a psicólogos online, com atendimento
                        gratuito, acolhedor e livre de julgamentos.
                    </p>
                    <div className="pt-2">
                        <Link
                            to="/criar-conta"
                            className="inline-block bg-gradient-to-r from-[#6f82ff] to-plad hover:from-[#5f73f0] hover:to-plad-hover text-white font-semibold text-base uppercase tracking-wide py-3.5 px-12 rounded-full shadow-md transition-colors"
                        >
                            TRIAGEM
                        </Link>
                    </div>
                </div>

                <div className="flex justify-center lg:justify-end">
                    <img
                        src={inicioImg}
                        alt="Acolhimento Digital PLAD"
                        className="w-full max-w-md lg:max-w-[460px] object-contain"
                    />
                </div>
            </section>
            </div>

            {/* Section: Sobre a PLAD */}
            <section id="sobre" className="bg-gradient-to-b from-[#6d85ff] to-[#9993ff] text-white py-20 lg:py-24 px-8">
                <div className="max-w-[1114px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
                    <div className="flex justify-center lg:justify-start order-2 lg:order-1">
                        <img
                            src={sobreImg}
                            alt="Sobre a PLAD"
                            className="w-full max-w-xl lg:max-w-[530px] object-contain"
                        />
                    </div>

                    <div className="space-y-6 order-1 lg:order-2">
                        <h2 className="font-outfit text-5xl lg:text-[68px] font-bold text-black leading-tight">
                            Sobre a PLAD
                        </h2>
                        <div className="space-y-5 text-base text-black leading-relaxed">
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
            <section id="servicos" className="pt-24 pb-28 px-8 max-w-[1114px] mx-auto text-center">
                <h2 className="font-outfit text-5xl lg:text-[68px] font-bold text-black leading-tight mb-6">
                    Nossos Serviços
                </h2>
                <p className="text-gray-900 text-base max-w-[1100px] mx-auto mb-16 leading-relaxed">
                    Nosso objetivo é tornar o cuidado psicológico mais acessível. Por isso,
                    reunimos em um único ambiente digital diferentes formas de acolhimento:
                    atendimento com psicólogos, relatos anônimos e conteúdos educativos
                    sobre dependência química e saúde mental.
                </p>

                {/* Cards de Serviços */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-[70px] text-center">
                    {/* Card 1 */}
                    <div className="bg-white rounded-2xl p-10 shadow-lg shadow-black/25 flex flex-col items-center">
                        <div className="w-20 h-20 mb-8 flex items-center justify-center">
                            <img
                                src={anonimoIcon}
                                alt="Espaços de Relatos Anônimos"
                                className="max-h-full object-contain"
                            />
                        </div>
                        <h3 className="font-outfit font-bold text-black text-lg mb-4">
                            Espaços de Relatos Anônimos
                        </h3>
                        <p className="text-gray-500 text-sm leading-relaxed">
                            Um ambiente acolhedor onde você pode dividir experiências,
                            inspirar outras pessoas e perceber que não está sozinho nessa
                            jornada.
                        </p>
                    </div>

                    {/* Card 2 */}
                    <div className="bg-white rounded-2xl p-10 shadow-lg shadow-black/25 flex flex-col items-center">
                        <div className="w-20 h-20 mb-8 flex items-center justify-center">
                            <img
                                src={coracaoIcon}
                                alt="Converse Com Psicólogos"
                                className="max-h-full object-contain"
                            />
                        </div>
                        <h3 className="font-outfit font-bold text-black text-lg mb-4">
                            Converse Com Psicólogos de Forma Anônima e Segura
                        </h3>
                        <p className="text-gray-500 text-sm leading-relaxed">
                            Atendimento online, gratuitos e confidenciais com profissionais
                            especializados em saúde mental e dependência química.
                        </p>
                    </div>

                    {/* Card 3 */}
                    <div className="bg-white rounded-2xl p-10 shadow-lg shadow-black/25 flex flex-col items-center">
                        <div className="w-20 h-20 mb-8 flex items-center justify-center">
                            <img
                                src={livrinhoIcon}
                                alt="Informação que acolhe"
                                className="max-h-full object-contain"
                            />
                        </div>
                        <h3 className="font-outfit font-bold text-black text-lg mb-4">
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
            <footer id="contato" className="bg-plad-rodape text-white py-12 px-8">
                <div className="max-w-[1114px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-sm text-gray-300">
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
                <div className="max-w-[1114px] mx-auto mt-8 text-center md:text-left text-xs text-gray-400">
                    © Plataforma de Ajuda a Dependência
                </div>
            </footer>
        </div>
    )
}