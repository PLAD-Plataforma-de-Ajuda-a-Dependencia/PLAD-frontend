import { startTransition, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, logout } from '../api/auth'
import { registrarAoExpirarSessao, renovarSessao } from '../api/client'
import { getMe } from '../api/me'
import type { MeResponseDTO } from '../api/me'
import { clearToken, setToken } from '../api/token'
import { SessaoContext, type Sessao, type StatusSessao } from './SessaoContext'

// A recuperação da sessão é uma promessa de módulo, e não de componente: o StrictMode monta duas vezes em
// desenvolvimento, e dois refreshes seguidos com o mesmo cookie contam como roubo para o backend (ele revoga
// todas as sessões do usuário)
let recuperacaoEmVoo: Promise<MeResponseDTO | null> | null = null

function recuperarSessao(): Promise<MeResponseDTO | null> {
    recuperacaoEmVoo ??= (async () => {
        try {
            await renovarSessao()
            return await getMe()
        } catch {
            // Sem cookie, cookie vencido, backend fora do ar: em todos os casos não há sessão para mostrar
            clearToken()
            return null
        }
    })().finally(() => {
        recuperacaoEmVoo = null
    })
    return recuperacaoEmVoo
}

export default function SessaoProvider({ children }: { children: ReactNode }) {
    const navigate = useNavigate()
    const [status, setStatus] = useState<StatusSessao>('desconhecido')
    const [me, setMe] = useState<MeResponseDTO | null>(null)
    // Espelho síncrono do status, para garantirSessao decidir sem esperar o próximo render
    const statusRef = useRef<StatusSessao>('desconhecido')

    const mudarStatus = useCallback((novo: StatusSessao) => {
        statusRef.current = novo
        setStatus(novo)
    }, [])

    const encerrarLocalmente = useCallback(() => {
        clearToken()
        setMe(null)
        mudarStatus('anonimo')
    }, [mudarStatus])

    // Sessão perdida no meio do uso (refresh recusado): limpa o estado e navega, sem recarregar a página
    useEffect(
        () =>
            registrarAoExpirarSessao(() => {
                encerrarLocalmente()
                navigate('/login', { replace: true })
            }),
        [encerrarLocalmente, navigate],
    )

    const garantirSessao = useCallback(async () => {
        if (statusRef.current !== 'desconhecido') return
        mudarStatus('carregando')
        const recuperado = await recuperarSessao()
        setMe(recuperado)
        mudarStatus(recuperado ? 'autenticado' : 'anonimo')
    }, [mudarStatus])

    const entrar = useCallback(
        async (email: string, senha: string) => {
            const { token } = await login({ email, password: senha })
            setToken(token)
            try {
                const dados = await getMe()
                setMe(dados)
                mudarStatus('autenticado')
                return dados
            } catch (err) {
                clearToken()
                throw err
            }
        },
        [mudarStatus],
    )

    const sair = useCallback(
        async (destino = '/login') => {
            try {
                await logout()
            } catch {
                // O logout é idempotente e a sessão local acaba de qualquer jeito; sem rede, o cookie
                // continua valendo até vencer ou até o próximo logout
            }
            // O React Router aplica a navegação como transição (prioridade baixa). Se o estado "sem sessão" fosse
            // urgente, a rota protegida ainda montada redirecionaria para /login antes de chegar em `destino`
            // (a home, depois de excluir a conta): os dois entram juntos na mesma transição
            startTransition(() => {
                encerrarLocalmente()
                navigate(destino, { replace: true })
            })
        },
        [encerrarLocalmente, navigate],
    )

    const recarregarMe = useCallback(async () => {
        const dados = await getMe()
        setMe(dados)
        return dados
    }, [])

    const atualizarMe = useCallback((parcial: Partial<MeResponseDTO>) => {
        setMe((atual) => (atual ? { ...atual, ...parcial } : atual))
    }, [])

    const valor = useMemo<Sessao>(
        () => ({ status, me, garantirSessao, entrar, sair, recarregarMe, atualizarMe }),
        [status, me, garantirSessao, entrar, sair, recarregarMe, atualizarMe],
    )

    return <SessaoContext.Provider value={valor}>{children}</SessaoContext.Provider>
}
