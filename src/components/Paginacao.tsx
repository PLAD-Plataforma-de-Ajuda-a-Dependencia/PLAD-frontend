import { ChevronLeft, ChevronRight } from 'lucide-react'
import Botao from './Botao'

interface PaginacaoProps {
    /** Página atual, a partir de 0 (como o backend) */
    pagina: number
    totalPaginas: number
    totalItens: number
    onMudar: (pagina: number) => void
    /** Enquanto uma página carrega, os botões ficam parados */
    ocupada?: boolean
    /** Nome da navegação para leitor de tela, quando há mais de uma na página */
    rotulo?: string
}

/** Anterior / Próxima com "Página 2 de 5". Some quando há uma página só: não há para onde ir */
export default function Paginacao({ pagina, totalPaginas, totalItens, onMudar, ocupada = false, rotulo = 'Páginas' }: PaginacaoProps) {
    if (totalPaginas <= 1) return null

    return (
        <nav aria-label={rotulo} className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p role="status" className="text-sm text-texto-suave">
                Página {pagina + 1} de {totalPaginas} · {totalItens} no total
            </p>
            <div className="flex gap-2">
                <Botao variante="secundario" disabled={ocupada || pagina <= 0} onClick={() => onMudar(pagina - 1)}>
                    <ChevronLeft size={18} aria-hidden="true" />
                    Anterior
                </Botao>
                <Botao variante="secundario" disabled={ocupada || pagina >= totalPaginas - 1} onClick={() => onMudar(pagina + 1)}>
                    Próxima
                    <ChevronRight size={18} aria-hidden="true" />
                </Botao>
            </div>
        </nav>
    )
}
