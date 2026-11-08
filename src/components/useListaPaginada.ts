import { useEffect, useState } from 'react'
import { getErrorMessage } from '../api/client'
import type { PageResponseDTO } from '../api/pagina'

/** O que a tela mostra de uma lista paginada: ainda não pedida, carregando, pronta ou com erro (já em pt-BR) */
export type Carga<T> =
    | { estado: 'inicial' }
    | { estado: 'carregando' }
    | { estado: 'pronto'; dados: PageResponseDTO<T> }
    | { estado: 'erro'; mensagem: string }

interface OpcoesDaLista {
    /** Texto de reserva se o erro não vier da API */
    erroPadrao: string
    /**
     * A lista só carrega depois de `iniciar()`. Serve às leituras que o backend audita (triagens): ninguém lê dado de
     * saúde só por abrir a tela. Sem isso, carrega assim que a tela monta.
     */
    aguardarPedido?: boolean
}

/**
 * Uma lista paginada da API: guarda a página atual, busca quando ela (ou `buscar`) muda e descarta a resposta de um pedido
 * já superado. `buscar` precisa ter identidade estável (uma função do módulo ou um useCallback): quando ela muda, a lista
 * é buscada de novo, que é como um filtro novo recarrega.
 */
export default function useListaPaginada<T>(buscar: (pagina: number) => Promise<PageResponseDTO<T>>, opcoes: OpcoesDaLista) {
    const { erroPadrao, aguardarPedido = false } = opcoes
    const [pedido, setPedido] = useState(!aguardarPedido)
    const [pagina, setPagina] = useState(0)
    const [tentativa, setTentativa] = useState(0)
    const [carga, setCarga] = useState<Carga<T>>(aguardarPedido ? { estado: 'inicial' } : { estado: 'carregando' })

    useEffect(() => {
        if (!pedido) return
        let ignorar = false
        buscar(pagina)
            .then((dados) => {
                if (!ignorar) setCarga({ estado: 'pronto', dados })
            })
            .catch((err: unknown) => {
                if (!ignorar) setCarga({ estado: 'erro', mensagem: getErrorMessage(err, erroPadrao) })
            })
        return () => {
            ignorar = true
        }
    }, [pedido, buscar, pagina, tentativa, erroPadrao])

    return {
        carga,
        pagina,
        /** Primeiro pedido de uma lista com `aguardarPedido` */
        iniciar: () => {
            setCarga({ estado: 'carregando' })
            setPedido(true)
        },
        irPara: (nova: number) => {
            setCarga({ estado: 'carregando' })
            setPagina(nova)
        },
        recarregar: () => {
            setCarga({ estado: 'carregando' })
            setTentativa((n) => n + 1)
        },
    }
}
