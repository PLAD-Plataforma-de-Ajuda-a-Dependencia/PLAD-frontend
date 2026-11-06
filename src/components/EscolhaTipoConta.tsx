import { useState, type FormEvent } from 'react'
import type { TipoDeCadastro } from '../api/auth'
import perfisImg from '../assets/perfis.png'
import Botao from './Botao'
import LayoutPagina from './LayoutPagina'

// Tela de escolha de perfil (Figma "/triagem1", frame Desktop 1:3)

interface OpcaoPerfil {
    tipo: TipoDeCadastro
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
    onEscolher: (tipo: TipoDeCadastro) => void
}

export default function EscolhaTipoConta({ onEscolher }: EscolhaTipoContaProps) {
    const [selecionado, setSelecionado] = useState<TipoDeCadastro | null>(null)

    const handleSubmit = (e: FormEvent) => {
        e.preventDefault()
        if (selecionado) onEscolher(selecionado)
    }

    return (
        <LayoutPagina
            titulo="Escolha o seu perfil"
            largura="larga"
            acoes={
                <Botao type="submit" form="escolha-perfil" bloco disabled={!selecionado}>
                    Próximo
                </Botao>
            }
        >
            <form id="escolha-perfil" onSubmit={handleSubmit} className="pt-6">
                <h1 id="titulo-perfil" className="mb-8 text-center font-outfit text-2xl font-semibold leading-snug text-black sm:text-3xl">
                    Com quais destes perfis você mais se identifica?
                </h1>

                {/* Radios nativos com o mesmo name: setas do teclado e leitor de tela funcionam sem código extra */}
                <div role="radiogroup" aria-labelledby="titulo-perfil" className="mx-auto w-full max-w-lg space-y-4">
                    {OPCOES.map((opcao) => {
                        const ativo = selecionado === opcao.tipo
                        return (
                            <label
                                key={opcao.tipo}
                                className={`flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-xl border-2 px-4 py-3 transition has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-plad ${
                                    ativo
                                        ? 'border-plad bg-plad text-white'
                                        : 'border-borda-suave bg-white text-black hover:border-plad/50'
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
                                <span className="flex size-14 shrink-0 items-center justify-center">
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
                                    <span className="text-sm">{opcao.descricao}</span>
                                </span>
                            </label>
                        )
                    })}
                </div>
            </form>
        </LayoutPagina>
    )
}
