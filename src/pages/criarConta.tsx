import { useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { register } from '../api/auth'
import { getErrorMessage } from '../api/client'
import type { CadastroEtapa1, Sex, UserType } from '../api/auth'
import EscolhaTipoConta from '../components/EscolhaTipoConta'
import PsicologoSolicita from './psicologoSolicita'

const GENEROS: { value: Sex; label: string }[] = [
    { value: 'masculino', label: 'Masculino' },
    { value: 'feminino', label: 'Feminino' },
    { value: 'nao_binario', label: 'Não binário' },
    { value: 'transexual', label: 'Transexual' },
    { value: 'outro', label: 'Outro' },
]

const TIPOS_CONTA: readonly string[] = ['dependente', 'psicologo'] satisfies UserType[]

// O tipo vem do query param ?tipo=, escolhido na tela de perfil
function isTipoConta(value: string | null): value is UserType {
    return value !== null && TIPOS_CONTA.includes(value)
}

function isSex(value: string): value is Sex {
    return GENEROS.some((genero) => genero.value === value)
}

interface CadastroForm {
    email: string
    realName: string
    password: string
    birthDate: string
    gender: Sex | ''
}

export default function CriarConta() {
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()
    const [formData, setFormData] = useState<CadastroForm>({
        email: '',
        realName: '',
        password: '',
        birthDate: '',
        gender: '',
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    // Etapa 1 do psicólogo, guardada só em memória: no state do router a senha ficaria no histórico do navegador
    const [etapa1Psicologo, setEtapa1Psicologo] = useState<CadastroEtapa1 | null>(null)

    // Sem tipo (ou com valor inválido) a primeira etapa é a escolha de perfil
    const tipo = searchParams.get('tipo')
    if (!isTipoConta(tipo)) {
        return <EscolhaTipoConta onEscolher={(escolhido) => setSearchParams({ tipo: escolhido })} />
    }

    if (etapa1Psicologo) {
        return <PsicologoSolicita etapa1={etapa1Psicologo} />
    }

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData((prev) => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        // O select de gênero é `required`; o guard também estreita o tipo de '' | Sex para Sex
        if (!isSex(formData.gender)) {
            setError('Selecione o gênero.')
            return
        }
        const dados: CadastroEtapa1 = {
            real_name: formData.realName.trim(),
            email: formData.email.trim(),
            password: formData.password,
            birth_date: formData.birthDate,
            gender: formData.gender,
            type_user: tipo,
        }

        if (dados.type_user === 'psicologo') {
            setEtapa1Psicologo(dados)
            return
        }

        setLoading(true)
        setError(null)
        try {
            await register(dados)
            navigate('/login', { replace: true, state: { email: dados.email } })
        } catch (err) {
            setError(getErrorMessage(err, 'Não foi possível criar a conta.'))
        } finally {
            setLoading(false)
        }
    }

    const inputClass =
        'w-full px-4 py-3.5 border border-plad/60 rounded-sm text-sm text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-plad transition bg-white'

    return (
        <div className="min-h-screen flex flex-col bg-white text-gray-900 font-roboto">
            {/* Topo - Nome da aplicação */}
            <header className="text-center pt-8 pb-4">
                <span className="font-outfit font-semibold text-xl text-black">PLAD</span>
            </header>

            {/* Form de Cadastro */}
            <main className="w-full max-w-md mx-auto flex-1 flex flex-col justify-center items-center px-4 pb-8">
                <h1 className="font-outfit text-3xl sm:text-4xl font-semibold text-black text-center mb-3">
                    Criar a sua conta
                </h1>
                <p className="text-black text-center text-sm mb-10">
                    Crie uma conta para salvar suas configurações e comece a usar o PLAD.
                </p>

                <form id="criar-conta-form" onSubmit={handleSubmit} className="w-full space-y-3.5">
                    <div>
                        <input
                            type="email"
                            name="email"
                            placeholder="Endereço de E-mail"
                            required
                            value={formData.email}
                            onChange={handleChange}
                            className={inputClass}
                        />
                    </div>

                    <div>
                        <input
                            type="text"
                            name="realName"
                            placeholder="Nome completo"
                            required
                            value={formData.realName}
                            onChange={handleChange}
                            className={inputClass}
                        />
                    </div>

                    <div>
                        <input
                            type="password"
                            name="password"
                            placeholder="Senha (mínimo de 8 caracteres)"
                            required
                            minLength={8}
                            value={formData.password}
                            onChange={handleChange}
                            className={inputClass}
                        />
                    </div>

                    <div>
                        <label htmlFor="birthDate" className="block text-xs text-gray-600 mb-1">
                            Data de nascimento
                        </label>
                        <input
                            id="birthDate"
                            type="date"
                            name="birthDate"
                            required
                            value={formData.birthDate}
                            onChange={handleChange}
                            className={inputClass}
                        />
                    </div>

                    <div>
                        <select name="gender" required value={formData.gender} onChange={handleChange} className={inputClass}>
                            <option value="" disabled>
                                Gênero
                            </option>
                            {GENEROS.map((genero) => (
                                <option key={genero.value} value={genero.value}>
                                    {genero.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Avisos */}
                    <div className="pt-6 text-center text-xs space-y-1">
                        <p className="font-outfit font-medium text-black">
                            Deve ter pelo menos 18 anos.
                        </p>
                        <p className="text-gray-500">
                            Seu endereço de e-mail é mantido em sigilo.
                        </p>
                    </div>
                </form>
            </main>

            {/* Botão centralizado no rodapé (ligado ao form pelo atributo `form`) */}
            <footer className="w-full bg-white shadow-[0_-8px_16px_-6px_rgba(0,0,0,0.15)] pt-5 pb-6 px-4">
                <div className="w-full max-w-sm mx-auto">
                    {error && (
                        <p role="alert" className="mb-3 text-sm text-red-600 text-center">
                            {error}
                        </p>
                    )}
                    <button
                        type="submit"
                        form="criar-conta-form"
                        disabled={loading}
                        className="w-full py-3.5 px-6 bg-plad hover:bg-plad-hover text-white font-medium rounded-lg transition-colors text-base disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Criando conta…' : tipo === 'dependente' ? 'Criar conta' : 'Próximo'}
                    </button>
                    <button
                        type="button"
                        onClick={() => setSearchParams({})}
                        disabled={loading}
                        className="w-full mt-3 text-sm text-plad hover:underline disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        Voltar para a escolha de perfil
                    </button>
                </div>
            </footer>
        </div>
    )
}
