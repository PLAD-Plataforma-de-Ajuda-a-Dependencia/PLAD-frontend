import { useCallback, useEffect, useState } from 'react'

/** Contagem regressiva em segundos (o tempo de espera de um 429): `restante` chega a 0 sozinho */
export default function useContagem() {
    const [restante, setRestante] = useState(0)

    const iniciar = useCallback((segundos: number) => setRestante(Math.max(0, Math.ceil(segundos))), [])

    useEffect(() => {
        if (restante <= 0) return
        const temporizador = window.setTimeout(() => setRestante((atual) => atual - 1), 1000)
        return () => window.clearTimeout(temporizador)
    }, [restante])

    return { restante, iniciar }
}
