import { startTransition, useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { login, logout } from '../api/auth'
import { ApiError, registrarAoExpirarSessao, renovarSessao } from '../api/client'
import { getMe } from '../api/me'
import type { MeResponseDTO } from '../api/me'
import { clearToken, setToken } from '../api/token'
import { SessaoContext, type FalhaSessao, type Sessao, type StatusSessao } from './SessaoContext'

type Recuperacao = { tipo: 'ok'; me: MeResponseDTO } | { tipo: 'anonimo' } | { tipo: 'indisponivel'; falha: FalhaSessao }

// A recuperação da sessão é uma promessa de módulo, e não de componente: o StrictMode monta duas vezes em
// desenvolvimento, e dois refreshes seguidos com o mesmo cookie contam como roubo para o backend (ele revoga
// todas as sessões do usuário)
let recuperacaoEmVoo: Promise<Recuperacao> | null = null

function recuperarSessao(): Promise<Recuperacao> {
    recuperacaoEmVoo ??= (async (): Promise<Recuperacao> => {
        try {
            await renovarSessao()
            return { tipo: 'ok', me: await getMe() }
        } catch (err) {
            clearToken()
            // Sem cookie ou cookie recusado (401/403): não há sessão. Qualquer outra falha (rede, 429, 5xx) não
            // diz nada sobre a sessão, e mandar a pessoa para o login em silêncio pareceria que ela caiu
            if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
                return { tipo: 'anonimo' }
            }
            return {
                tipo: 'indisponivel',
                falha: {
                    mensagem: err instanceof Error ? err.message : 'Não foi possível verificar a sua sessão agora.',
                },
            }
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
    const [falha, setFalha] = useState<FalhaSessao | null>(null)
    const [sessaoExpirada, setSessaoExpirada] = useState(false)
    // Espelho síncrono do status, para garantirSessao decidir sem esperar o próximo render
    const statusRef = useRef<StatusSessao>('desconhecido')

    const mudarStatus = useCallback((novo: StatusSessao) => {
        statusRef.current = novo
        setStatus(novo)
    }, [])

    const encerrarLocalmente = useCallback(() => {
        clearToken()
        setMe(null)
        setFalha(null)
        mudarStatus('anonimo')
    }, [mudarStatus])

    // Sessão perdida no meio do uso (refresh recusado): limpa o estado e leva ao login, com o aviso e a tela de
    // onde a pessoa estava, sem recarregar a página
    useEffect(
        () =>
            registrarAoExpirarSessao(() => {
                const de = window.location.pathname + window.location.search
                encerrarLocalmente()
                // A rota protegida também redireciona ao ver "sem sessão"; o flag faz as duas levarem o mesmo aviso
                setSessaoExpirada(true)
                navigate('/login', { replace: true, state: { aviso: 'sessao-expirada', de } })
            }),
        [encerrarLocalmente, navigate],
    )

    const garantirSessao = useCallback(async () => {
        if (statusRef.current !== 'desconhecido') return
        mudarStatus('carregando')
        setFalha(null)
        const recuperado = await recuperarSessao()
        if (recuperado.tipo === 'ok') {
            setMe(recuperado.me)
            mudarStatus('autenticado')
        } else if (recuperado.tipo === 'anonimo') {
            setMe(null)
            mudarStatus('anonimo')
        } else {
            setMe(null)
            setFalha(recuperado.falha)
            mudarStatus('indisponivel')
        }
    }, [mudarStatus])

    const tentarNovamente = useCallback(async () => {
        if (statusRef.current !== 'indisponivel') return
        mudarStatus('desconhecido')
        await garantirSessao()
    }, [garantirSessao, mudarStatus])

    const entrar = useCallback(
        async (email: string, senha: string) => {
            const { token } = await login({ email, password: senha })
            setToken(token)
            try {
                const dados = await getMe()
                setMe(dados)
                setFalha(null)
                setSessaoExpirada(false)
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
        () => ({ status, me, falha, sessaoExpirada, garantirSessao, tentarNovamente, entrar, sair, recarregarMe, atualizarMe }),
        [status, me, falha, sessaoExpirada, garantirSessao, tentarNovamente, entrar, sair, recarregarMe, atualizarMe],
    )

    return <SessaoContext.Provider value={valor}>{children}</SessaoContext.Provider>
}
