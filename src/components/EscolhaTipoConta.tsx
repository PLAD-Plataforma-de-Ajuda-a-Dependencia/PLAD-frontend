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
        // Mesma estrutura visual da Triagem.tsx (topo, coluna central e rodapé)
        <div className="min-h-screen flex flex-col bg-white text-gray-900 font-roboto">
            {/* Topo - Nome da aplicação */}
            <header className="text-center pt-8 pb-4">
                <span className="font-outfit font-semibold text-xl text-black">PLAD</span>
            </header>

            <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
                <main className="w-full max-w-3xl mx-auto flex-1 flex flex-col px-4 pt-6">
                    <h1 id="titulo-perfil" className="font-outfit text-2xl sm:text-3xl font-semibold text-black text-center mb-8 leading-snug">
                        Com quais destes perfis você mais se identifica?
                    </h1>

                    {/* Radios nativos com o mesmo name: setas do teclado e leitor de tela funcionam sem código extra */}
                    <div role="radiogroup" aria-labelledby="titulo-perfil" className="w-full max-w-lg mx-auto space-y-4">
                        {OPCOES.map((opcao) => {
                            const ativo = selecionado === opcao.tipo
                            return (
                                <label
                                    key={opcao.tipo}
                                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 cursor-pointer transition has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-plad has-[:focus-visible]:ring-offset-2 ${
                                        ativo
                                            ? 'bg-plad border-plad text-white'
                                            : 'bg-white border-[#dce6ff] text-black hover:border-plad/50'
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
                                    {/* Os recortes do Figma são reduzidos à metade para caber na coluna das perguntas */}
                                    <span className="w-14 h-14 shrink-0 flex items-center justify-center">
                                        <span
                                            aria-hidden="true"
                                            className={`${opcao.caixaIcone} shrink-0 scale-50 ${ativo ? 'bg-white' : 'bg-plad'}`}
                                            style={{
                                                maskImage: `url(${perfisImg})`,
                                                maskSize: opcao.mascaraSize,
                                                maskPosition: opcao.mascaraPosition,
                                                maskRepeat: 'no-repeat',
                                            }}
                                        />
                                    </span>
                                    <span className="flex flex-col">
                                        <span className="font-outfit text-base font-semibold">{opcao.titulo}</span>
                                        <span className="text-xs">{opcao.descricao}</span>
                                    </span>
                                </label>
                            )
                        })}
                    </div>
                </main>

                {/* Rodapé com o botão de avançar, igual ao da Triagem */}
                <footer className="w-full bg-white shadow-[0_-8px_16px_-6px_rgba(0,0,0,0.15)] pt-5 pb-6 px-4">
                    <div className="w-full max-w-sm mx-auto">
                        <button
                            type="submit"
                            disabled={!selecionado}
                            className="w-full py-3.5 px-6 bg-plad hover:bg-plad-hover active:bg-plad-active text-white font-medium rounded-lg transition-colors text-base disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            Próximo
                        </button>
                    </div>
                </footer>
            </form>
        </div>
    )
}
