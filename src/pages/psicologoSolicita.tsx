import { useState, type ChangeEvent, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { register } from '../api/auth'
import { ApiError, errosPorCampo, getErrorMessage } from '../api/client'
import type { CadastroEtapa1, CrmCrpType } from '../api/auth'
import Botao from '../components/Botao'
import Campo from '../components/Campo'
import LayoutPagina from '../components/LayoutPagina'

interface PsychologistFormData {
    graduate: string
    credentialType: CrmCrpType
    crmCrpNumber: string
}

interface PsychologistRegisterProps {
    // Dados da etapa 1, passados em memória por /criar-conta
    etapa1: CadastroEtapa1
    // Chamado quando o erro é de um campo da etapa 1 (e-mail, senha, nascimento...): /criar-conta volta para ela
    // com o que foi digitado e mostra as mensagens (erros por nome de campo, já em pt-BR)
    onVoltar: (erros: Record<string, string>) => void
}

// Campos que esta etapa mostra; qualquer outro erro de campo pertence à etapa 1
const CAMPOS_DESTA_ETAPA = ['credential_type', 'crm_crp_number', 'graduate']

export default function PsychologistRegister({ etapa1, onVoltar }: PsychologistRegisterProps) {
    const navigate = useNavigate()

    const [formData, setFormData] = useState<PsychologistFormData>({
        graduate: '',
        credentialType: 'CRP',
        crmCrpNumber: '',
    })
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [errosCampo, setErrosCampo] = useState<Record<string, string>>({})

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData((prev) => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        if (loading) return
        // O backend só recusa número nulo, então string em branco é barrada aqui
        const crmCrpNumber = formData.crmCrpNumber.trim()
        if (!crmCrpNumber) {
            setErrosCampo({ crm_crp_number: 'Informe o número do registro.' })
            return
        }

        setLoading(true)
        setError(null)
        setErrosCampo({})
        try {
            await register({
                ...etapa1,
                credential_type: formData.credentialType,
                crm_crp_number: crmCrpNumber,
                graduate: formData.graduate.trim() || undefined,
            })
            navigate('/login', { replace: true, state: { email: etapa1.email } })
        } catch (err) {
            const erros = errosPorCampo(err)
            if (err instanceof ApiError && err.code === 'EMAIL_IN_USE') {
                // O e-mail é da etapa 1: sem voltar para lá não há como corrigir
                onVoltar({ email: err.message })
            } else if (Object.keys(erros).some((campo) => !CAMPOS_DESTA_ETAPA.includes(campo))) {
                onVoltar(erros)
            } else {
                setErrosCampo(erros)
                setError(Object.keys(erros).length > 0 ? null : getErrorMessage(err, 'Não foi possível concluir o cadastro.'))
            }
        } finally {
            setLoading(false)
        }
    }

    return (
        <LayoutPagina
            titulo="Dados profissionais"
            centralizar
            acoes={
                <>
                    {error && (
                        <p role="alert" className="text-center text-sm text-erro">
                            {error}
                        </p>
                    )}
                    <Botao type="submit" form="psicologo-form" bloco carregando={loading}>
                        {loading ? 'Enviando…' : 'Concluir cadastro'}
                    </Botao>
                </>
            }
        >
            <h1 className="mb-3 text-center font-outfit text-3xl font-semibold text-black sm:text-4xl">Dados profissionais</h1>
            <p className="mb-10 text-center text-base text-black">
                Complete seu cadastro como psicólogo para começar a atender no PLAD.
            </p>

            {/* Só placeholders dentro dos campos, como no Figma; o rótulo existe para o leitor de tela (rotuloOculto) */}
            <form id="psicologo-form" onSubmit={handleSubmit} className="w-full space-y-5">
                <Campo rotulo="Formação acadêmica (opcional)" rotuloOculto erro={errosCampo.graduate}>
                    {(controle) => (
                        <input
                            {...controle}
                            type="text"
                            name="graduate"
                            placeholder="Formação acadêmica (opcional)"
                            value={formData.graduate}
                            onChange={handleChange}
                        />
                    )}
                </Campo>

                <Campo rotulo="Tipo de registro" rotuloOculto erro={errosCampo.credential_type}>
                    {(controle) => (
                        <select {...controle} name="credentialType" value={formData.credentialType} onChange={handleChange}>
                            <option value="CRP">CRP</option>
                            <option value="CRM">CRM</option>
                        </select>
                    )}
                </Campo>

                <Campo rotulo="Número do registro" rotuloOculto erro={errosCampo.crm_crp_number}>
                    {(controle) => (
                        <input
                            {...controle}
                            type="text"
                            name="crmCrpNumber"
                            placeholder="Número do registro (ex.: 06/123456)"
                            required
                            value={formData.crmCrpNumber}
                            onChange={handleChange}
                        />
                    )}
                </Campo>

                {/* Avisos, e logo abaixo o caminho de volta para a etapa 1 (o mesmo que o Voltar do navegador) */}
                <div className="space-y-1 pt-4 text-center text-sm">
                    <p className="font-outfit font-medium text-black">Seu registro será validado pela nossa equipe.</p>
                    <p className="text-texto-suave">Certifique-se de que o número informado está correto.</p>
                </div>
                <Botao variante="texto" bloco onClick={() => navigate(-1)} disabled={loading}>
                    Voltar para a etapa anterior
                </Botao>
            </form>
        </LayoutPagina>
    )
}