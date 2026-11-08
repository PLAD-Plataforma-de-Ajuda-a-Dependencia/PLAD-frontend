import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { classeBotao } from './estilos'
import LayoutPagina from './LayoutPagina'

interface PaginaDeDocumentoProps {
    titulo: string
    /** Versão do texto em vigor (a mesma que o backend grava no aceite), quando o documento é versionado */
    versao?: string
    /** O texto desta versão ainda não foi entregue pelo time: no lugar dele aparece um aviso visível */
    textoPendente?: boolean
    /** Uma linha logo abaixo do título */
    resumo?: string
    children?: ReactNode
}

/**
 * Casca das páginas públicas de documentos (/termos, /privacidade e /como-protegemos): sem login, abrem em outra aba a
 * partir do cadastro e do pop-up de consentimento. Os `h2`, listas e parágrafos recebem o estilo daqui.
 * Enquanto o texto de um documento não chega (`textoPendente`), a página diz isso com clareza, em vez de ficar vazia
 * ou de mostrar um texto inventado.
 */
export default function PaginaDeDocumento({ titulo, versao, textoPendente = false, resumo, children }: PaginaDeDocumentoProps) {
    return (
        <LayoutPagina titulo={titulo} largura="larga">
            <article className="mt-4 space-y-4 text-sm leading-relaxed text-gray-800 [&_h2]:mt-8 [&_h2]:font-outfit [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:text-black [&_li]:pl-1 [&_ul]:list-disc [&_ul]:space-y-1.5 [&_ul]:pl-5">
                <header className="space-y-1">
                    <h1 className="font-outfit text-3xl font-semibold text-black">{titulo}</h1>
                    {versao && <p className="text-texto-suave">Versão {versao}</p>}
                    {resumo && <p className="text-base text-gray-800">{resumo}</p>}
                </header>

                {textoPendente ? (
                    <div role="note" className="rounded-campo border border-aviso-borda bg-aviso-fundo p-4 text-aviso">
                        <p className="font-semibold">Texto em preparação</p>
                        <p className="mt-1">
                            O texto desta versão ainda vai ser entregue pelo time e aparecerá aqui. Enquanto isso, o resumo "Como
                            protegemos seus dados" descreve, em linguagem simples, o que o sistema faz hoje.
                        </p>
                    </div>
                ) : (
                    children
                )}

                <p className="pt-6">
                    <Link to="/" className={classeBotao('texto')}>
                        Ir para o início
                    </Link>
                </p>
            </article>
        </LayoutPagina>
    )
}
