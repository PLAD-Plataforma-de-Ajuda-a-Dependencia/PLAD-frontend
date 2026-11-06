import { useEffect } from 'react'

/** Título da aba por tela ("Entrar · PLAD"): quem usa leitor de tela ou várias abas sabe onde está */
export default function useTitulo(titulo?: string) {
    useEffect(() => {
        document.title = titulo ? `${titulo} · PLAD` : 'PLAD'
    }, [titulo])
}
