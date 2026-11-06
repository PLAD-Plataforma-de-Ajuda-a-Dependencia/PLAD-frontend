import Botao from './Botao'

/** Aviso fixo enquanto os dados demonstrativos (fictícios) estão na tela, com o botão de removê-los */
export default function FaixaDemonstrativa({ onRemover }: { onRemover: () => void }) {
    return (
        <div
            role="status"
            className="mb-6 flex flex-wrap items-center justify-between gap-x-4 rounded-botao border border-aviso-borda bg-aviso-fundo px-4 py-1 text-sm text-aviso"
        >
            <span className="py-2">Você está vendo dados demonstrativos (fictícios), só para conhecer a tela.</span>
            <Botao variante="texto" onClick={onRemover}>
                Remover dados demonstrativos
            </Botao>
        </div>
    )
}
