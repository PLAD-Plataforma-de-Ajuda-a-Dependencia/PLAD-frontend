import { useState, type ChangeEvent, type FormEvent } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { ApiError, getErrorMessage } from '../api/client'
import Botao from '../components/Botao'
import Campo from '../components/Campo'
import CampoSenha from '../components/CampoSenha'
import LayoutPagina from '../components/LayoutPagina'
import { useToast } from '../components/ToastContext'
import { classeBotao } from '../components/estilos'
import useContagem from '../components/useContagem'
import { destinoPorPapel, useSessao } from '../session/SessaoContext'

interface EstadoLogin {
    email?: string
    aviso?: 'sessao-expirada'
    de?: string
}

// O state do router pode ser qualquer coisa (ex.: navegação manual), então é conferido em vez de convertido com `as`.
// Vem das telas de cadastro (e-mail da conta criada), da sessão vencida (aviso) e da rota protegida (`de`, onde a
// pessoa estava)
function lerEstado(state: unknown): EstadoLogin {
    if (typeof state !== 'object' || state === null) return {}
    const estado: EstadoLogin = {}
    if ('email' in state && typeof state.email === 'string') estado.email = state.email
    if ('aviso' in state && state.aviso === 'sessao-expirada') estado.aviso = 'sessao-expirada'
    // Só caminhos do próprio app: nunca um endereço de fora
    if ('de' in state && typeof state.de === 'string' && state.de.startsWith('/') && !state.de.startsWith('//')) {
        if (!state.de.toLowerCase().startsWith('/login')) estado.de = state.de
    }
    return estado
}

export default function Login() {
    const location = useLocation()
    const { status, me, entrar } = useSessao()
    const { avisar } = useToast()
    const estado = lerEstado(location.state)

    const [formData, setFormData] = useState({ email: estado.email ?? '', password: '' })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    // 429: o botão espera o tempo que o servidor mandou, com a contagem à vista
    const [limite, setLimite] = useState(false)
    const { restante, iniciar } = useContagem()

    // Quem já está logado (voltou pelo navegador, por exemplo) não precisa ver o formulário de novo.
    // Também é por aqui que o login termina: `entrar` muda o status e esta tela leva a pessoa ao destino
    if (status === 'autenticado' && me) {
        return <Navigate to={estado.de ?? destinoPorPapel(me)} replace />
    }

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData((prev) => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        if (loading || restante > 0) return
        setLoading(true)
        setError(null)
        setLimite(false)
        try {
            // O texto do erro (senha errada, 429 com o tempo de espera...) já vem em pt-BR do ApiError
            await entrar(formData.email.trim(), formData.password)
        } catch (err) {
            if (err instanceof ApiError && err.status === 429 && err.retryAfterSeconds) {
                // O botão mostra a contagem; o texto não repete o tempo (ele ficaria parado enquanto a contagem anda)
                setError('Muitas tentativas. Aguarde um instante antes de tentar de novo.')
                setLimite(true)
                iniciar(err.retryAfterSeconds)
            } else {
                setError(getErrorMessage(err, 'Não foi possível entrar.'))
            }
        } finally {
            setLoading(false)
        }
    }

    const mostrarErro = error !== null && (!limite || restante > 0)

    return (
        <LayoutPagina
            titulo="Entrar"
            centralizar
            acoes={
                <>
                    {mostrarErro && (
                        <p role="alert" className="text-center text-sm text-erro">
                            {error}
                        </p>
                    )}
                    <Botao type="submit" form="login-form" bloco carregando={loading} disabled={restante > 0}>
                        {loading ? 'Entrando…' : restante > 0 ? `Tentar de novo em ${restante} s` : 'Entrar'}
                    </Botao>
                </>
            }
        >
            <h1 className="mb-3 text-center font-outfit text-3xl font-semibold text-black sm:text-4xl">Entrar na sua conta</h1>
            <p className="mb-10 text-center text-base text-black">Insira seus dados de acesso para entrar no PLAD.</p>

            {estado.email && (
                <p role="status" className="mb-4 rounded-md bg-plad-fundo px-3.5 py-2.5 text-center text-sm text-plad-rodape">
                    Conta criada! Entre com seu e-mail e senha.
                </p>
            )}
            {estado.aviso === 'sessao-expirada' && (
                <p role="status" className="mb-4 rounded-md bg-plad-fundo px-3.5 py-2.5 text-center text-sm text-plad-rodape">
                    Sua sessão terminou. Entre de novo para continuar de onde parou.
                </p>
            )}

            {/* Só placeholders dentro dos campos, como no Figma; o rótulo existe para o leitor de tela (rotuloOculto) */}
            <form id="login-form" onSubmit={handleSubmit} className="w-full space-y-5">
                <Campo rotulo="Endereço de E-mail" rotuloOculto>
                    {(controle) => (
                        <input
                            {...controle}
                            type="email"
                            name="email"
                            placeholder="Endereço de E-mail"
                            autoComplete="email"
                            required
                            value={formData.email}
                            onChange={handleChange}
                        />
                    )}
                </Campo>

                <CampoSenha
                    rotulo="Senha"
                    rotuloOculto
                    name="password"
                    autoComplete="current-password"
                    required
                    value={formData.password}
                    onChange={handleChange}
                />

                {/* "Criar conta" à esquerda e "Esqueceu a senha?" à direita, os dois no mesmo estilo de link. A recuperação
                    de senha ainda não existe no backend: o link fica, e avisa em vez de não fazer nada */}
                <div className="flex items-center justify-between">
                    <Link to="/criar-conta" className={`${classeBotao('texto')} -ml-3`}>
                        Criar conta
                    </Link>
                    <Botao variante="texto" className="-mr-3" onClick={() => avisar('A recuperação de senha chega em breve.', 'info')}>
                        Esqueceu a senha?
                    </Botao>
                </div>
            </form>
        </LayoutPagina>
    )
}
