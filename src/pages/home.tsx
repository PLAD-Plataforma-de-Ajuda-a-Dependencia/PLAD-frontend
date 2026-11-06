import { Link } from 'react-router-dom'
import Rodape from '../components/Rodape'
import useTitulo from '../components/useTitulo'

// Import das imagens
import inicioImg from '../assets/inicio.png'
import sobreImg from '../assets/sobre.png'
import coracaoIcon from '../assets/coracao.png'
import livrinhoIcon from '../assets/livrinho.png'
import anonimoIcon from '../assets/anonimo.png'

// Os links do menu são alvos de toque de pelo menos 44 px (min-h-11), mesmo com o texto pequeno
const LINK_MENU = 'inline-flex min-h-11 min-w-11 items-center justify-center transition hover:text-black'

export default function Home() {
    useTitulo()

    return (
        <div className="min-h-screen w-full bg-plad-fundo font-roboto text-slate-900">
            {/* Navbar + Hero: fundo lilás com os brilhos em gradiente do Figma (roxo no topo esquerdo, azul no canto inferior direito) */}
            <div
                style={{
                    backgroundImage:
                        'radial-gradient(ellipse 30% 45% at 12% 0%, rgba(150,142,205,0.55), transparent), radial-gradient(ellipse 40% 55% at 100% 100%, rgba(112,132,255,0.85), transparent)',
                }}
            >
                {/* Navbar / Header */}
                <header className="mx-auto flex max-w-[1114px] items-center justify-between px-4 pb-6 pt-8 sm:px-8 sm:pt-14">
                    <span className="font-outfit text-2xl font-bold text-black">PLAD</span>
                    {/* Os três links ficam agrupados e "entrar" separado à direita, como no Figma */}
                    <nav
                        aria-label="Principal"
                        className="flex items-center gap-x-3 text-sm font-medium text-gray-900 sm:gap-x-6 md:gap-x-[70px] lg:text-[17px]"
                    >
                        <a href="#sobre" className={LINK_MENU}>
                            sobre
                        </a>
                        <a href="#servicos" className={LINK_MENU}>
                            serviços
                        </a>
                        <a href="#contato" className={LINK_MENU}>
                            contato
                        </a>
                        <Link to="/login" className={`${LINK_MENU} font-semibold lg:ml-52`}>
                            entrar
                        </Link>
                    </nav>
                </header>

                {/* Hero Section */}
                <section className="mx-auto grid max-w-[1114px] grid-cols-1 items-center gap-12 px-4 py-12 sm:px-8 lg:grid-cols-2 lg:py-24">
                    <div className="space-y-7">
                        <h1 className="font-outfit text-5xl font-bold leading-[1.2] text-black sm:text-6xl lg:text-[76px]">
                            Acolhimento <br className="hidden sm:block" /> Digital Para <br className="hidden sm:block" /> Você
                        </h1>
                        <p className="max-w-[440px] text-base leading-relaxed text-gray-900">
                            Nossa plataforma conecta você a psicólogos online, com atendimento gratuito, acolhedor e livre de
                            julgamentos.
                        </p>
                        <div className="pt-2">
                            <Link
                                to="/criar-conta"
                                className="inline-flex min-h-11 items-center rounded-full bg-gradient-to-r from-plad to-plad-hover px-12 py-3.5 text-base font-semibold uppercase tracking-wide text-white shadow-md transition-colors hover:from-plad-hover hover:to-plad-active"
                            >
                                TRIAGEM
                            </Link>
                        </div>
                    </div>

                    <div className="flex justify-center lg:justify-end">
                        <img
                            src={inicioImg}
                            alt="Uma pessoa sentada conversa por vídeo com uma psicóloga"
                            className="w-full max-w-md object-contain lg:max-w-[460px]"
                        />
                    </div>
                </section>
            </div>

            {/* Section: Sobre a PLAD */}
            <section id="sobre" className="bg-gradient-to-b from-plad-claro to-plad-lilas px-4 py-16 text-white sm:px-8 lg:py-24">
                <div className="mx-auto grid max-w-[1114px] grid-cols-1 items-center gap-12 lg:grid-cols-2 lg:gap-16">
                    <div className="order-2 flex justify-center lg:order-1 lg:justify-start">
                        <img src={sobreImg} alt="Pessoas conversando em um grupo de apoio" className="w-full max-w-xl object-contain lg:max-w-[530px]" />
                    </div>

                    <div className="order-1 space-y-6 lg:order-2">
                        <h2 className="font-outfit text-4xl font-bold leading-tight text-black sm:text-5xl lg:text-[68px]">Sobre a PLAD</h2>
                        <div className="space-y-5 text-base leading-relaxed text-black">
                            <p>
                                Somos uma plataforma de acolhimento digital criada para oferecer apoio psicológico seguro, anônimo e
                                gratuito a pessoas que enfrentam a dependência química e seus familiares.
                            </p>
                            <p>
                                Acreditamos que ninguém deve enfrentar essa jornada sozinho - por isso, conectamos usuários a psicólogos
                                voluntários e parceiros, em um espaço online humanizado e livre de julgamentos.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* Section: Nossos Serviços */}
            <section id="servicos" className="mx-auto max-w-[1114px] px-4 pb-20 pt-16 text-center sm:px-8 lg:pb-28 lg:pt-24">
                <h2 className="mb-6 font-outfit text-4xl font-bold leading-tight text-black sm:text-5xl lg:text-[68px]">
                    Nossos Serviços
                </h2>
                <p className="mx-auto mb-16 max-w-[1100px] text-base leading-relaxed text-gray-900">
                    Nosso objetivo é tornar o cuidado psicológico mais acessível. Por isso, reunimos em um único ambiente digital
                    diferentes formas de acolhimento: atendimento com psicólogos, relatos anônimos e conteúdos educativos sobre
                    dependência química e saúde mental.
                </p>

                {/* Cards de Serviços: o ícone é decorativo (o título do cartão já diz o que é) */}
                <div className="grid grid-cols-1 gap-10 text-center md:grid-cols-3 lg:gap-[70px]">
                    <div className="flex flex-col items-center rounded-2xl bg-white p-8 shadow-lg shadow-black/25 sm:p-10">
                        <div className="mb-8 flex size-20 items-center justify-center">
                            <img src={anonimoIcon} alt="" className="max-h-full object-contain" />
                        </div>
                        <h3 className="mb-4 font-outfit text-lg font-bold text-black">Espaços de Relatos Anônimos</h3>
                        <p className="text-sm leading-relaxed text-texto-suave">
                            Um ambiente acolhedor onde você pode dividir experiências, inspirar outras pessoas e perceber que não está
                            sozinho nessa jornada.
                        </p>
                    </div>

                    <div className="flex flex-col items-center rounded-2xl bg-white p-8 shadow-lg shadow-black/25 sm:p-10">
                        <div className="mb-8 flex size-20 items-center justify-center">
                            <img src={coracaoIcon} alt="" className="max-h-full object-contain" />
                        </div>
                        <h3 className="mb-4 font-outfit text-lg font-bold text-black">
                            Converse Com Psicólogos de Forma Anônima e Segura
                        </h3>
                        <p className="text-sm leading-relaxed text-texto-suave">
                            Atendimento online, gratuitos e confidenciais com profissionais especializados em saúde mental e
                            dependência química.
                        </p>
                    </div>

                    <div className="flex flex-col items-center rounded-2xl bg-white p-8 shadow-lg shadow-black/25 sm:p-10">
                        <div className="mb-8 flex size-20 items-center justify-center">
                            <img src={livrinhoIcon} alt="" className="max-h-full object-contain" />
                        </div>
                        <h3 className="mb-4 font-outfit text-lg font-bold text-black">Informação que acolhe e orienta</h3>
                        <p className="text-sm leading-relaxed text-texto-suave">
                            Artigos, dicas e materiais confiáveis sobre saúde mental, prevenção e tratamento da dependência - tudo em
                            linguagem simples e acessível.
                        </p>
                    </div>
                </div>
            </section>

            <Rodape />
        </div>
    )
}
