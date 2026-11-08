// Resposta paginada do backend e o jeito de pedir uma página. Vale para toda rota que devolve PageResponseDTO.

/** plad.dto.PageResponseDTO<T>: uma página de resultados. O backend manda sempre todas as chaves */
export interface PageResponseDTO<T> {
    items: T[]
    page: number // começa em 0
    size: number // o tamanho pedido, não o de itens que vieram
    total_elements: number
    total_pages: number
}

/** Limites de `size` do backend (@Min(1) @Max(100)); fora deles a rota responde 400 */
export const TAMANHO_MAXIMO_PAGINA = 100

/**
 * Monta a query string ("?page=0&size=10") ignorando o que for undefined, null ou vazio.
 * Devolve "" quando não sobra nada, então pode ser colada direto no caminho.
 */
export function montarQuery(parametros: Record<string, string | number | null | undefined>): string {
    const query = new URLSearchParams()
    for (const [chave, valor] of Object.entries(parametros)) {
        if (valor === undefined || valor === null || valor === '') continue
        query.set(chave, String(valor))
    }
    const texto = query.toString()
    return texto === '' ? '' : `?${texto}`
}
