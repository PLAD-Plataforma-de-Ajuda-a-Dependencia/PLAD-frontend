import type { ReactNode } from 'react'
import AjudaAgora from './AjudaAgora'
import useTitulo from './useTitulo'

type Largura = 'estreita' | 'media' | 'larga'

interface LayoutPaginaProps {
    /** Título da aba (aparece como "<título> · PLAD") */
    titulo?: string
    /** Botões fixos no rodapé (enviar, avançar); ficam sempre à vista, mesmo em tela baixa */
    acoes?: ReactNode
    largura?: Largura
    /** Centraliza o conteúdo na vertical (login, cadastro) */
    centralizar?: boolean
    children: ReactNode
}

// Medidas do Figma (frames Desktop 1440): campos de 440 px (+ 16 px de cada lado) e botão/coluna de opções de 375 px
const LARGURA: Record<Largura, string> = {
    estreita: 'max-w-sm',
    media: 'max-w-[472px]',
    larga: 'max-w-3xl',
}

/**
 * Casca das telas de formulário e de fluxo (login, cadastro, triagem, minha conta): marca no topo, o conteúdo e,
 * se houver, os botões fixos no rodapé. Traz o link "Pular para o conteúdo" para quem navega pelo teclado.
 */
export default function LayoutPagina({ titulo, acoes, largura = 'media', centralizar = false, children }: LayoutPaginaProps) {
    useTitulo(titulo)

    return (
        <div className="flex min-h-screen flex-col bg-white font-roboto text-gray-900">
            <a
                href="#conteudo"
                className="sr-only rounded-botao bg-white px-4 py-2 font-medium text-plad shadow focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50"
            >
                Pular para o conteúdo
            </a>
            {/* "Precisa de ajuda agora?" em toda tela de fluxo, logada ou não: no alto, longe do rodapé fixo de ações */}
            <AjudaAgora posicao="fixed right-3 top-3 z-40" />
            <header className="pb-4 pt-8 text-center">
                <span className="font-roboto text-xl font-bold text-black">PLAD</span>
            </header>

            <main
                id="conteudo"
                tabIndex={-1}
                className={`mx-auto flex w-full flex-1 flex-col px-4 pb-8 focus:outline-none ${LARGURA[largura]} ${centralizar ? 'justify-center' : ''}`}
            >
                {children}
            </main>

            {acoes && (
                <footer className="sticky bottom-0 w-full bg-white px-4 pb-6 pt-5 shadow-rodape">
                    <div className="mx-auto w-full max-w-[375px] space-y-3">{acoes}</div>
                </footer>
            )}
        </div>
    )
}
