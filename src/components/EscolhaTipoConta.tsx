import { useState, type FormEvent } from 'react'
import type { UserType } from '../api/auth'
import perfisImg from '../assets/perfis.png'

// Tela de escolha de perfil (Figma "/triagem1", frame Desktop 1:3)

interface OpcaoPerfil {
    tipo: UserType
    titulo: string
    descricao: string
    // Os ícones são recortes de um único PNG (perfis.png), convertidos para px a partir das porcentagens do Figma.
    // O PNG traz cada ícone numa cor fixa (a mão em branco, o médico em azul), então ele é usado como máscara
    // e a cor vem do estado do card.
    caixaIcone: string
    mascaraSize: string
    mascaraPosition: string
}

const OPCOES: OpcaoPerfil[] = [
    {
        tipo: 'dependente',
        titulo: 'Dependente',
        descricao: 'Sofro com dependência química e busco ajuda',
        caixaIcone: 'w-[100px] h-[109px]',
        mascaraSize: '314.3px 176.34px',
        mascaraPosition: '-214.11px 0',
    },
    {
        tipo: 'psicologo',
        titulo: 'Psicólogo',
        descricao: 'Sou especialista e busco ajudar mais pessoas',
        caixaIcone: 'w-[79px] h-[80px]',
        mascaraSize: '300.5px 169.56px',
        mascaraPosition: '-8.75px -80.26px',
    },
]

interface EscolhaTipoContaProps {
    onEscolher: (tipo: UserType) => void
}

export default function EscolhaTipoConta({ onEscolher }: EscolhaTipoContaProps) {
    const [selecionado, setSelecionado] = useState<UserType | null>(null)

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault()
        if (selecionado) onEscolher(selecionado)
    }

    return (
        <div className="min-h-screen bg-white text-black">
            {/* Topo - Nome da aplicação */}
            <header className="text-center pt-[39px]">
                <span className="font-['Roboto',sans-serif] font-semibold text-2xl leading-[27.5px]">
                    PLAD
                </span>
            </header>

            <form onSubmit={handleSubmit}>
                <main className="px-4 pb-[172px] flex flex-col items-center">
                    <h1
                        id="titulo-perfil"
                        className="mt-16 md:mt-[111px] text-center font-['Outfit',sans-serif] font-semibold text-[28px] md:text-[36px] leading-tight md:leading-[27.5px]"
                    >
                        Com quais destes perfis você mais se identifica?
                    </h1>

                    {/* Radios nativos com o mesmo name: setas do teclado e leitor de tela funcionam sem código extra */}
                    <div
                        role="radiogroup"
                        aria-labelledby="titulo-perfil"
                        className="mt-12 md:mt-[75px] w-full max-w-[525px] flex flex-col gap-12"
                    >
                        {OPCOES.map((opcao) => {
                            const ativo = selecionado === opcao.tipo
                            return (
                                <label
                                    key={opcao.tipo}
                                    className={`flex items-center min-h-[95px] w-full rounded-[20px] border-4 pl-3 pr-4 py-2 cursor-pointer transition-colors has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-[#4B64F9]/40 ${
                                        ativo
                                            ? 'bg-[#4B64F9] border-[#4B64F9] text-white'
                                            : 'bg-white border-[#DAEAFF] text-black'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="tipo"
                                        value={opcao.tipo}
                                        checked={ativo}
                                        onChange={() => setSelecionado(opcao.tipo)}
                                        className="sr-only"
                                    />
                                    {/* Slot de altura zero: no Figma o ícone (até 109px) transborda o card de 95px sem mudar a altura dele */}
                                    <span className="w-[100px] h-0 shrink-0 flex items-center justify-center">
                                        <span
                                            aria-hidden="true"
                                            className={`${opcao.caixaIcone} ${ativo ? 'bg-white' : 'bg-[#4B64F9]'}`}
                                            style={{
                                                maskImage: `url(${perfisImg})`,
                                                maskSize: opcao.mascaraSize,
                                                maskPosition: opcao.mascaraPosition,
                                                maskRepeat: 'no-repeat',
                                            }}
                                        />
                                    </span>
                                    <span className="flex flex-col">
                                        <span className="font-['Outfit',sans-serif] font-semibold text-xl md:text-2xl leading-[27.5px]">
                                            {opcao.titulo}
                                        </span>
                                        <span className="mt-0.5 font-['Roboto',sans-serif] text-base md:text-lg leading-[27.5px]">
                                            {opcao.descricao}
                                        </span>
                                    </span>
                                </label>
                            )
                        })}
                    </div>
                </main>

                {/* Barra fixa no rodapé com o botão de avançar */}
                <footer className="fixed inset-x-0 bottom-0 h-[132px] bg-white shadow-[0_-5px_32.7px_rgba(0,0,0,0.21)] flex justify-center pt-[30px] px-4">
                    <button
                        type="submit"
                        disabled={!selecionado}
                        className="h-[75px] w-full max-w-[375px] rounded-[10px] bg-[#4B64F9] text-white font-['Roboto',sans-serif] font-medium text-2xl leading-[27.5px] transition-opacity disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        Próximo
                    </button>
                </footer>
            </form>
        </div>
    )
}
