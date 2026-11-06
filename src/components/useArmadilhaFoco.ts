import { useEffect, useRef, type RefObject } from 'react'

const FOCAVEIS =
    'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Mantém o foco do teclado dentro de `raiz` enquanto `ativo` (modais e gavetas): leva o foco para o primeiro item,
 * faz o Tab circular, fecha com Esc e devolve o foco a quem o tinha antes.
 */
export default function useArmadilhaFoco(raiz: RefObject<HTMLElement | null>, ativo: boolean, aoFechar?: () => void) {
    // O callback muda a cada render do pai; guardá-lo aqui evita reiniciar o efeito (e roubar o foco de novo)
    const fechar = useRef(aoFechar)
    useEffect(() => {
        fechar.current = aoFechar
    })

    useEffect(() => {
        if (!ativo) return
        const anterior = document.activeElement instanceof HTMLElement ? document.activeElement : null
        const elementos = () =>
            raiz.current ? Array.from(raiz.current.querySelectorAll<HTMLElement>(FOCAVEIS)) : []

        const primeiro = elementos()[0] ?? raiz.current
        primeiro?.focus()

        const aoTeclar = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                fechar.current?.()
                return
            }
            if (e.key !== 'Tab') return
            const lista = elementos()
            if (lista.length === 0) {
                e.preventDefault()
                return
            }
            const inicio = lista[0]
            const fim = lista[lista.length - 1]
            if (e.shiftKey && document.activeElement === inicio) {
                e.preventDefault()
                fim.focus()
            } else if (!e.shiftKey && document.activeElement === fim) {
                e.preventDefault()
                inicio.focus()
            }
        }
        document.addEventListener('keydown', aoTeclar)
        return () => {
            document.removeEventListener('keydown', aoTeclar)
            anterior?.focus()
        }
    }, [raiz, ativo])
}
