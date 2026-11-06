import { LoaderCircle } from 'lucide-react'

interface CarregandoProps {
    mensagem?: string
    /** Ocupa a tela toda (uma rota inteira esperando); sem isso, só um bloco dentro da página */
    tela?: boolean
}

/** Estado de carregamento: ícone girando e texto, anunciado como status */
export default function Carregando({ mensagem = 'Carregando…', tela = false }: CarregandoProps) {
    return (
        <div
            role="status"
            className={`flex flex-col items-center justify-center gap-3 text-texto-suave ${tela ? 'min-h-screen bg-white' : 'py-12'}`}
        >
            <LoaderCircle size={28} aria-hidden="true" className="animate-spin text-plad" />
            <p className="text-sm">{mensagem}</p>
        </div>
    )
}
