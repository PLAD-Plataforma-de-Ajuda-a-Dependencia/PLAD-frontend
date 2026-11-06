// Classes dos botões, compartilhadas por <Botao> e pelos <Link> que parecem botão (um <Link> não pode ser <button>)
export type VarianteBotao = 'primario' | 'secundario' | 'texto' | 'perigo' | 'perigo-contorno'

// min-h-11 = 44 px, o alvo de toque mínimo
const BASE =
    'inline-flex min-h-11 items-center justify-center gap-2 rounded-botao py-2.5 text-base font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-60 aria-busy:cursor-wait'

const VARIANTES: Record<VarianteBotao, string> = {
    primario: 'px-6 bg-plad text-white hover:bg-plad-hover active:bg-plad-active',
    secundario: 'px-6 border border-plad text-plad hover:bg-plad-fundo',
    texto: 'px-3 text-sm text-plad hover:underline',
    perigo: 'px-6 bg-erro text-white hover:bg-erro-hover',
    'perigo-contorno': 'px-6 border border-erro text-erro hover:bg-erro-fundo',
}

export function classeBotao(variante: VarianteBotao = 'primario', bloco = false): string {
    return `${BASE} ${VARIANTES[variante]}${bloco ? ' w-full' : ''}`
}
