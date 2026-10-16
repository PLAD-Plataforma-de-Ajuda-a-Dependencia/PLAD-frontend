import { useState, type ChangeEvent, type FormEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { login } from '../api/auth'
import { ApiError, getErrorMessage } from '../api/client'
import { saveToken } from '../api/token'

// O state do router pode ser qualquer coisa (ex.: navegação manual), então é conferido em vez de convertido com `as`
// Enviado pelas telas de cadastro depois que a conta é criada
function getRegisteredEmail(state: unknown): string | undefined {
    if (typeof state === 'object' && state !== null && 'email' in state && typeof state.email === 'string') {
        return state.email
    }
    return undefined
}

export default function Login() {
    const navigate = useNavigate()
    const location = useLocation()
    const registeredEmail = getRegisteredEmail(location.state)

    const [formData, setFormData] = useState({
        email: registeredEmail ?? '',
        password: '',
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData((prev) => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        setLoading(true)
        setError(null)
        try {
            const { token } = await login({ email: formData.email, password: formData.password })
            saveToken(token)
            navigate('/Triagem', { replace: true })
        } catch (err) {
            if (err instanceof ApiError && err.status === 429) {
                setError('Muitas tentativas. Aguarde um minuto e tente novamente.')
            } else {
                setError(getErrorMessage(err, 'Não foi possível entrar.'))
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex flex-col justify-between bg-white px-4 py-8 text-gray-900 font-sans">
            {/* Topo - Nome da aplicação */}
            <header className="text-center pt-2">
        <span className="font-bold tracking-wider text-black text-3xl uppercase">
          PLAD
        </span>
            </header>

            {/* Form de Entrar */}
            <main className="w-full max-w-sm mx-auto flex-1 flex flex-col justify-center items-center">
                <h1 className="text-3xl font-extrabold text-black text-center mb-2 tracking-tight">
                    Entrar na sua conta
                </h1>
                <p className="text-gray-600 text-center text-sm mb-8">
                    Insira seus dados de acesso para entrar no PLAD.
                </p>

                {registeredEmail && (
                    <p className="w-full mb-4 px-3.5 py-2.5 rounded-md bg-indigo-50 text-indigo-700 text-sm text-center">
                        Conta criada! Entre com seu e-mail e senha.
                    </p>
                )}

                <form id="login-form" onSubmit={handleSubmit} className="w-full space-y-3.5">
                    <div>
                        <input
                            type="email"
                            name="email"
                            placeholder="Endereço de E-mail"
                            required
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full px-3.5 py-2.5 border border-indigo-300 rounded-md text-sm text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition bg-white"
                        />
                    </div>

                    <div>
                        <input
                            type="password"
                            name="password"
                            placeholder="Senha"
                            required
                            value={formData.password}
                            onChange={handleChange}
                            className="w-full px-3.5 py-2.5 border border-indigo-300 rounded-md text-sm text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition bg-white"
                        />
                    </div>

                    {/* Link para Esqueceu a Senha */}
                    <div className="pt-2 text-right">
                        <a href="#esqueceu-senha" className="text-xs text-indigo-600 hover:underline font-medium">
                            Esqueceu a senha?
                        </a>
                    </div>
                </form>
            </main>

            {/* Botão de Entrar centralizado no rodapé (ligado ao form pelo atributo `form`) */}
            <footer className="w-full max-w-xs mx-auto pb-4">
                {error && (
                    <p role="alert" className="mb-3 text-sm text-red-600 text-center">
                        {error}
                    </p>
                )}
                <button
                    type="submit"
                    form="login-form"
                    disabled={loading}
                    className="w-full py-3 px-6 bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white font-medium rounded-lg transition-colors text-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {loading ? 'Entrando…' : 'Entrar'}
                </button>
            </footer>
        </div>
    )
}
