import { useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { register } from '../api/auth'
import { getErrorMessage } from '../api/client'
import type { CadastroEtapa1, CrmCrpType } from '../api/auth'

interface PsychologistFormData {
    graduate: string
    credentialType: CrmCrpType
    crmCrpNumber: string
}

interface PsychologistRegisterProps {
    // Dados da etapa 1, passados em memória por /criar-conta
    etapa1: CadastroEtapa1
}

export default function PsychologistRegister({ etapa1 }: PsychologistRegisterProps) {
    const navigate = useNavigate()

    const [formData, setFormData] = useState<PsychologistFormData>({
        graduate: '',
        credentialType: 'CRP',
        crmCrpNumber: '',
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleChange = (
        e: ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        const { name, value } = e.target
        setFormData((prev) => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        // O backend só recusa número nulo, então string em branco é barrada aqui
        const crmCrpNumber = formData.crmCrpNumber.trim()
        if (!crmCrpNumber) {
            setError('Informe o número do registro.')
            return
        }

        setLoading(true)
        setError(null)
        try {
            await register({
                ...etapa1,
                credential_type: formData.credentialType,
                crm_crp_number: crmCrpNumber,
                graduate: formData.graduate.trim() || undefined,
            })
            navigate('/login', { replace: true, state: { email: etapa1.email } })
        } catch (err) {
            setError(getErrorMessage(err, 'Não foi possível concluir o cadastro.'))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex flex-col bg-white text-gray-900 font-roboto">
            {/* Topo - Nome da aplicação */}
            <header className="text-center pt-8 pb-4">
                <span className="font-outfit font-semibold text-xl text-black">PLAD</span>
            </header>

            {/* Form de Cadastro do Psicólogo */}
            <main className="w-full max-w-md mx-auto flex-1 flex flex-col justify-center items-center px-4 pb-8">
                <h1 className="font-outfit text-3xl sm:text-4xl font-semibold text-black text-center mb-3">
                    Dados profissionais
                </h1>
                <p className="text-black text-center text-sm mb-10">
                    Complete seu cadastro como psicólogo para começar a atender no PLAD.
                </p>

                <form id="psicologo-form" onSubmit={handleSubmit} className="w-full space-y-3.5">
                    <div>
                        <input
                            type="text"
                            name="graduate"
                            placeholder="Formação acadêmica"
                            value={formData.graduate}
                            onChange={handleChange}
                            className="w-full px-4 py-3.5 border border-plad/60 rounded-sm text-sm text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-plad transition bg-white"
                        />
                    </div>

                    <div>
                        <select
                            name="credentialType"
                            value={formData.credentialType}
                            onChange={handleChange}
                            className="w-full px-4 py-3.5 border border-plad/60 rounded-sm text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-plad transition bg-white"
                        >
                            <option value="CRP">CRP</option>
                            <option value="CRM">CRM</option>
                        </select>
                    </div>

                    <div>
                        <input
                            type="text"
                            name="crmCrpNumber"
                            placeholder="Número do registro (ex: 06/123456)"
                            required
                            value={formData.crmCrpNumber}
                            onChange={handleChange}
                            className="w-full px-4 py-3.5 border border-plad/60 rounded-sm text-sm text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-plad transition bg-white"
                        />
                    </div>

                    {/* Avisos */}
                    <div className="pt-6 text-center text-xs space-y-1">
                        <p className="font-outfit font-medium text-black">
                            Seu registro será validado pela nossa equipe.
                        </p>
                        <p className="text-gray-500">
                            Certifique-se de que o número informado está correto.
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
                        form="psicologo-form"
                        disabled={loading}
                        className="w-full py-3.5 px-6 bg-plad hover:bg-plad-hover text-white font-medium rounded-lg transition-colors text-base disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Enviando…' : 'Concluir cadastro'}
                    </button>
                </div>
            </footer>
        </div>
    )
}
