import type { ReactNode } from 'react'
import { CircleAlert } from 'lucide-react'
import Botao from './Botao'

interface EstadoErroProps {
    titulo?: string
    /** Texto já em pt-BR (ApiError.message) */
    mensagem: string
    onTentarNovamente?: () => void
    /** Outra saída além de tentar de novo (voltar ao início, por exemplo) */
    acao?: ReactNode
    /** Ocupa a tela toda */
    tela?: boolean
}

/** Erro que impede de mostrar a tela: diz o que houve em linguagem simples e oferece tentar de novo */
export default function EstadoErro({
    titulo = 'Não conseguimos carregar agora',
    mensagem,
    onTentarNovamente,
    acao,
    tela = false,
}: EstadoErroProps) {
    return (
        <div
            role="alert"
            className={`flex flex-col items-center justify-center gap-3 px-4 py-12 text-center ${tela ? 'min-h-screen bg-white font-roboto' : ''}`}
        >
            <span className="flex size-14 items-center justify-center rounded-full bg-erro-fundo text-erro" aria-hidden="true">
                <CircleAlert size={28} />
            </span>
            <h2 className="font-outfit text-xl font-semibold text-black">{titulo}</h2>
            <p className="max-w-sm text-sm text-texto-suave">{mensagem}</p>
            <div className="mt-2 flex flex-col items-center gap-1 sm:flex-row">
                {onTentarNovamente && <Botao onClick={onTentarNovamente}>Tentar de novo</Botao>}
                {acao}
            </div>
        </div>
    )
}
