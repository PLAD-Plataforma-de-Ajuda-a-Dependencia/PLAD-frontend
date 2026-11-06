import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react'
import { Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { register } from '../api/auth'
import { ApiError, errosPorCampo, getErrorMessage } from '../api/client'
import { ACEITE_VIGENTE } from '../api/consentimento'
import type { CadastroEtapa1, Sex, TipoDeCadastro } from '../api/auth'
import Botao from '../components/Botao'
import Campo from '../components/Campo'
import CampoSenha from '../components/CampoSenha'
import EscolhaTipoConta from '../components/EscolhaTipoConta'
import LayoutPagina from '../components/LayoutPagina'
import LinkDocumento from '../components/LinkDocumento'
import useContagem from '../components/useContagem'
import { destinoPorPapel, useSessao } from '../session/SessaoContext'
import PsicologoSolicita from './psicologoSolicita'

const GENEROS: { value: Sex; label: string }[] = [
    { value: 'masculino', label: 'Masculino' },
    { value: 'feminino', label: 'Feminino' },
    { value: 'nao_binario', label: 'Não binário' },
    { value: 'transexual', label: 'Transexual' },
    { value: 'outro', label: 'Outro' },
]

const TIPOS_CONTA: readonly string[] = ['dependente', 'psicologo'] satisfies TipoDeCadastro[]

// O tipo vem do query param ?tipo=, escolhido na tela de perfil
function isTipoConta(value: string | null): value is TipoDeCadastro {
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
    const { status, me } = useSessao()
    const [searchParams, setSearchParams] = useSearchParams()
    const [formData, setFormData] = useState<CadastroForm>({
        email: '',
        realName: '',
        password: '',
        birthDate: '',
        gender: '',
    })
    const [aceitou, setAceitou] = useState(false)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    // Erros de campo (VALIDATION_ERROR) por nome snake_case do campo, já em pt-BR
    const [errosCampo, setErrosCampo] = useState<Record<string, string>>({})
    // Etapa 1 do psicólogo, guardada só em memória: no state do router a senha ficaria no histórico do navegador
    const [etapa1Psicologo, setEtapa1Psicologo] = useState<CadastroEtapa1 | null>(null)
    const [limite, setLimite] = useState(false)
    // A data de nascimento só vira campo de data (com o seletor) quando recebe foco: vazia, mostra o placeholder
    const [dataFocada, setDataFocada] = useState(false)
    const { restante, iniciar } = useContagem()
    const formulario = useRef<HTMLFormElement>(null)

    // Depois de um erro de campo, o foco vai para o primeiro campo com problema
    useEffect(() => {
        if (Object.keys(errosCampo).length > 0) {
            formulario.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
        }
    }, [errosCampo, searchParams])

    // Quem já está logado não cria outra conta
    if (status === 'autenticado' && me) {
        return <Navigate to={destinoPorPapel(me)} replace />
    }

    // Sem tipo (ou com valor inválido) a primeira etapa é a escolha de perfil
    const tipo = searchParams.get('tipo')
    if (!isTipoConta(tipo)) {
        return <EscolhaTipoConta onEscolher={(escolhido) => setSearchParams({ tipo: escolhido })} />
    }

    // A etapa 2 do psicólogo tem entrada própria no histórico (?etapa=2): o botão Voltar do navegador leva de volta
    // à etapa 1, com o que foi digitado. Depois de recarregar a página a etapa 1 se perdeu, então ela recomeça
    if (searchParams.get('etapa') === '2' && etapa1Psicologo) {
        return (
            <PsicologoSolicita
                etapa1={etapa1Psicologo}
                onVoltar={(erros) => {
                    // Erro num campo da etapa 1: volta para ela pelo histórico, com o que foi digitado
                    // (formData continua aqui) e a mensagem junto do campo
                    setErrosCampo(erros)
                    navigate(-1)
                }}
            />
        )
    }

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target
        setFormData((prev) => ({ ...prev, [name]: value }))
    }

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault()
        if (loading || restante > 0) return
        setErrosCampo({})
        setLimite(false)
        // O select de gênero é `required`; o guard também estreita o tipo de '' | Sex para Sex
        if (!isSex(formData.gender)) {
            setError('Selecione o gênero.')
            return
        }
        if (!aceitou) {
            setError('Aceite os Termos de Uso e a Política de Privacidade para criar a conta.')
            return
        }
        const dados: CadastroEtapa1 = {
            real_name: formData.realName.trim(),
            email: formData.email.trim(),
            password: formData.password,
            birth_date: formData.birthDate,
            gender: formData.gender,
            type_user: tipo,
            ...ACEITE_VIGENTE,
        }

        if (dados.type_user === 'psicologo') {
            setError(null)
            setEtapa1Psicologo(dados)
            setSearchParams({ tipo, etapa: '2' })
            return
        }

        setLoading(true)
        setError(null)
        try {
            await register(dados)
            navigate('/login', { replace: true, state: { email: dados.email } })
        } catch (err) {
            const doBack = errosPorCampo(err)
            setErrosCampo(doBack)
            if (err instanceof ApiError && err.status === 429 && err.retryAfterSeconds) {
                // O botão mostra a contagem; o texto não repete o tempo (ele ficaria parado enquanto a contagem anda)
                setError('Muitas tentativas. Aguarde um instante antes de tentar de novo.')
                setLimite(true)
                iniciar(err.retryAfterSeconds)
            } else {
                // "Confira os campos" só aparece quando não há mensagem junto de um campo: senão repetiria o que já está lá
                setError(Object.keys(doBack).length > 0 ? null : getErrorMessage(err, 'Não foi possível criar a conta.'))
            }
        } finally {
            setLoading(false)
        }
    }

    const mostrarErro = error !== null && (!limite || restante > 0)
    const rotuloEnviar = tipo === 'dependente' ? 'Criar conta' : 'Próximo'

    return (
        <LayoutPagina
            titulo="Criar conta"
            centralizar
            acoes={
                <>
                    {mostrarErro && (
                        <p role="alert" className="text-center text-sm text-erro">
                            {error}
                        </p>
                    )}
                    <Botao type="submit" form="criar-conta-form" bloco carregando={loading} disabled={restante > 0}>
                        {loading ? 'Criando conta…' : restante > 0 ? `Tentar de novo em ${restante} s` : rotuloEnviar}
                    </Botao>
                </>
            }
        >
            <h1 className="mb-3 text-center font-outfit text-3xl font-semibold text-black sm:text-4xl">Criar a sua conta</h1>
            <p className="mb-10 text-center text-base text-black">
                Crie uma conta para salvar suas configurações e comece a usar o PLAD.
            </p>

            {/* Só placeholders dentro dos campos, como no Figma; o rótulo existe para o leitor de tela (rotuloOculto) */}
            <form ref={formulario} id="criar-conta-form" onSubmit={handleSubmit} className="w-full space-y-5">
                <Campo rotulo="Endereço de E-mail" rotuloOculto erro={errosCampo.email}>
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

                <Campo rotulo="Nome completo" rotuloOculto erro={errosCampo.real_name}>
                    {(controle) => (
                        <input
                            {...controle}
                            type="text"
                            name="realName"
                            placeholder="Nome completo"
                            autoComplete="name"
                            required
                            value={formData.realName}
                            onChange={handleChange}
                        />
                    )}
                </Campo>

                <CampoSenha
                    rotulo="Senha (mínimo de 8 caracteres)"
                    rotuloOculto
                    name="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    value={formData.password}
                    onChange={handleChange}
                    erro={errosCampo.password}
                />

                <Campo rotulo="Data de nascimento" rotuloOculto erro={errosCampo.birth_date}>
                    {(controle) => (
                        <input
                            {...controle}
                            type={dataFocada || formData.birthDate ? 'date' : 'text'}
                            name="birthDate"
                            placeholder="Data de nascimento"
                            autoComplete="bday"
                            required
                            value={formData.birthDate}
                            onChange={handleChange}
                            onFocus={() => setDataFocada(true)}
                            onBlur={() => setDataFocada(false)}
                        />
                    )}
                </Campo>

                <Campo rotulo="Gênero" rotuloOculto erro={errosCampo.gender}>
                    {(controle) => (
                        <select
                            {...controle}
                            className={`${controle.className} ${formData.gender === '' ? 'text-texto-suave' : ''}`}
                            name="gender"
                            required
                            value={formData.gender}
                            onChange={handleChange}
                        >
                            <option value="" disabled>
                                Gênero
                            </option>
                            {GENEROS.map((genero) => (
                                <option key={genero.value} value={genero.value} className="text-gray-900">
                                    {genero.label}
                                </option>
                            ))}
                        </select>
                    )}
                </Campo>

                {/* Aceite dos documentos (LGPD art. 11); as versões enviadas estão em api/consentimento.ts */}
                <label className="flex min-h-11 cursor-pointer items-start gap-3 py-2 text-sm text-gray-700">
                    <input
                        type="checkbox"
                        name="aceite"
                        required
                        checked={aceitou}
                        onChange={(e) => setAceitou(e.target.checked)}
                        className="mt-0.5 size-6 shrink-0 accent-plad"
                    />
                    <span>
                        Li e aceito os <LinkDocumento documento="termos" /> e a <LinkDocumento documento="privacidade" />
                    </span>
                </label>

                {/* Avisos, e logo abaixo o caminho de volta para a escolha de perfil */}
                <div className="space-y-1 pt-4 text-center text-sm">
                    <p className="font-outfit font-medium text-black">Deve ter pelo menos 18 anos.</p>
                    <p className="text-texto-suave">Seu endereço de e-mail é mantido em sigilo.</p>
                </div>
                <Botao variante="texto" bloco onClick={() => setSearchParams({})} disabled={loading}>
                    Voltar para a escolha de perfil
                </Botao>
            </form>
        </LayoutPagina>
    )
}