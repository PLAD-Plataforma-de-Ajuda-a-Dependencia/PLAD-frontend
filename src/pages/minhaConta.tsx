import { useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { ApiError, errosPorCampo, getErrorMessage } from '../api/client'
import { changePassword, deleteMyAccount, exportMyData } from '../api/me'
import { setToken } from '../api/token'
import ErroCampo from '../components/ErroCampo'
import { destinoPorPapel, useSessao } from '../session/SessaoContext'

/**
 * Minha conta (qualquer papel): trocar a senha (PUT /me/password), exportar os próprios dados (GET /me/export) e
 * excluir a conta (DELETE /me, em dois passos). Visual provisório: segue Login e Triagem, sem frame do Figma.
 */

const SENHA_MIN = 8
const SENHA_MAX_BYTES = 72 // o limite de entrada do BCrypt, igual ao do cadastro

const inputClass =
    'w-full px-4 py-3.5 border border-plad/60 rounded-sm text-sm text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-plad transition bg-white'
const primaryButtonClass =
    'w-full py-3.5 px-6 bg-plad hover:bg-plad-hover active:bg-plad-active text-white font-medium rounded-lg transition-colors text-base disabled:opacity-60 disabled:cursor-not-allowed'
const secondaryButtonClass =
    'w-full py-3.5 px-6 border border-plad text-plad hover:bg-plad-fundo font-medium rounded-lg transition-colors text-base disabled:opacity-60 disabled:cursor-not-allowed'

function Secao({ titulo, descricao, children }: { titulo: string; descricao: string; children: ReactNode }) {
    return (
        <section className="w-full border border-plad/30 rounded-xl p-5">
            <h2 className="font-outfit text-xl font-semibold text-black mb-1">{titulo}</h2>
            <p className="text-sm text-gray-600 mb-4">{descricao}</p>
            {children}
        </section>
    )
}

function bytesUtf8(texto: string): number {
    return new TextEncoder().encode(texto).length
}

function TrocarSenha() {
    const [senhaAtual, setSenhaAtual] = useState('')
    const [senhaNova, setSenhaNova] = useState('')
    const [confirmacao, setConfirmacao] = useState('')
    const [enviando, setEnviando] = useState(false)
    const [erroGeral, setErroGeral] = useState<string | null>(null)
    const [errosCampo, setErrosCampo] = useState<Record<string, string>>({})
    const [sucesso, setSucesso] = useState(false)

    const enviar = async (e: FormEvent) => {
        e.preventDefault()
        setErroGeral(null)
        setSucesso(false)

        // As regras do back conferidas antes da ida ao servidor (a senha atual errada só o back sabe)
        const locais: Record<string, string> = {}
        if (senhaNova.length < SENHA_MIN) locais.new_password = `Use pelo menos ${SENHA_MIN} caracteres.`
        else if (bytesUtf8(senhaNova) > SENHA_MAX_BYTES) {
            locais.new_password = `A senha pode ter no máximo ${SENHA_MAX_BYTES} bytes (acentos e símbolos contam mais de um).`
        } else if (senhaNova !== confirmacao) locais.confirmacao = 'A confirmação é diferente da nova senha.'
        setErrosCampo(locais)
        if (Object.keys(locais).length > 0) return

        setEnviando(true)
        try {
            // A resposta traz o access token da sessão nova; as outras sessões (e o token antigo) deixaram de valer
            const { token } = await changePassword({ current_password: senhaAtual, new_password: senhaNova })
            setToken(token)
            setSenhaAtual('')
            setSenhaNova('')
            setConfirmacao('')
            setSucesso(true)
        } catch (err) {
            const doBack = errosPorCampo(err)
            if (err instanceof ApiError && err.code === 'INVALID_CREDENTIALS') {
                setErrosCampo({ current_password: 'Senha atual incorreta.' })
            } else if (err instanceof ApiError && err.code === 'INVALID_PASSWORD_CHANGE') {
                setErrosCampo({ new_password: err.message })
            } else if (Object.keys(doBack).length > 0) {
                setErrosCampo(doBack)
                setErroGeral(getErrorMessage(err, 'Confira os campos informados.'))
            } else {
                setErroGeral(getErrorMessage(err, 'Não foi possível trocar a senha.'))
            }
        } finally {
            setEnviando(false)
        }
    }

    return (
        <Secao
            titulo="Trocar senha"
            descricao="Ao trocar a senha, você continua conectado aqui e é desconectado dos outros dispositivos."
        >
            <form onSubmit={enviar} className="space-y-3.5">
                <div>
                    <input
                        type="password"
                        name="current_password"
                        placeholder="Senha atual"
                        autoComplete="current-password"
                        required
                        value={senhaAtual}
                        onChange={(e) => setSenhaAtual(e.target.value)}
                        aria-invalid={Boolean(errosCampo.current_password)}
                        className={inputClass}
                    />
                    <ErroCampo mensagem={errosCampo.current_password} />
                </div>
                <div>
                    <input
                        type="password"
                        name="new_password"
                        placeholder={`Nova senha (mínimo de ${SENHA_MIN} caracteres)`}
                        autoComplete="new-password"
                        required
                        value={senhaNova}
                        onChange={(e) => setSenhaNova(e.target.value)}
                        aria-invalid={Boolean(errosCampo.new_password)}
                        className={inputClass}
                    />
                    <ErroCampo mensagem={errosCampo.new_password} />
                </div>
                <div>
                    <input
                        type="password"
                        name="confirmacao"
                        placeholder="Repita a nova senha"
                        autoComplete="new-password"
                        required
                        value={confirmacao}
                        onChange={(e) => setConfirmacao(e.target.value)}
                        aria-invalid={Boolean(errosCampo.confirmacao)}
                        className={inputClass}
                    />
                    <ErroCampo mensagem={errosCampo.confirmacao} />
                </div>
                {erroGeral && (
                    <p role="alert" className="text-sm text-red-600">
                        {erroGeral}
                    </p>
                )}
                {sucesso && (
                    <p role="status" className="px-3.5 py-2.5 rounded-md bg-plad-fundo text-plad text-sm">
                        Senha alterada. Os outros dispositivos foram desconectados.
                    </p>
                )}
                <button type="submit" disabled={enviando} className={primaryButtonClass}>
                    {enviando ? 'Trocando…' : 'Trocar senha'}
                </button>
            </form>
        </Secao>
    )
}

function ExportarDados() {
    const [baixando, setBaixando] = useState(false)
    const [erro, setErro] = useState<string | null>(null)

    const baixar = async () => {
        setBaixando(true)
        setErro(null)
        try {
            const dados = await exportMyData()
            const arquivo = new Blob([JSON.stringify(dados, null, 2)], { type: 'application/json' })
            const url = URL.createObjectURL(arquivo)
            const link = document.createElement('a')
            link.href = url
            link.download = `plad-meus-dados-${format(new Date(), 'yyyy-MM-dd')}.json`
            link.click()
            URL.revokeObjectURL(url)
        } catch (err) {
            setErro(getErrorMessage(err, 'Não foi possível exportar os dados.'))
        } finally {
            setBaixando(false)
        }
    }

    return (
        <Secao
            titulo="Exportar meus dados"
            descricao="Baixe uma cópia, em JSON, de tudo o que o PLAD guarda sobre você: conta, aceites e, se houver, a triagem."
        >
            {erro && (
                <p role="alert" className="mb-3 text-sm text-red-600">
                    {erro}
                </p>
            )}
            <button type="button" onClick={baixar} disabled={baixando} className={secondaryButtonClass}>
                {baixando ? 'Preparando…' : 'Baixar meus dados'}
            </button>
        </Secao>
    )
}

function ExcluirConta() {
    const { sair } = useSessao()
    // Dois passos: o primeiro botão só abre o aviso e o pedido de senha; a exclusão é o segundo
    const [confirmando, setConfirmando] = useState(false)
    const [senha, setSenha] = useState('')
    const [excluindo, setExcluindo] = useState(false)
    const [erro, setErro] = useState<string | null>(null)

    const cancelar = () => {
        setConfirmando(false)
        setSenha('')
        setErro(null)
    }

    const excluir = async (e: FormEvent) => {
        e.preventDefault()
        setExcluindo(true)
        setErro(null)
        try {
            await deleteMyAccount({ password: senha })
            // A conta e as sessões acabaram; o logout só limpa o cookie de refresh que ficou no navegador
            await sair('/')
        } catch (err) {
            if (err instanceof ApiError && err.code === 'INVALID_CREDENTIALS') {
                setErro('Senha incorreta. Nada foi excluído.')
            } else {
                setErro(getErrorMessage(err, 'Não foi possível excluir a conta.'))
            }
            setExcluindo(false)
        }
    }

    return (
        <Secao
            titulo="Excluir minha conta"
            descricao="Apaga a sua conta e tudo o que está ligado a ela: dados do perfil, triagem, aceites e apelidos."
        >
            {!confirmando ? (
                <button
                    type="button"
                    onClick={() => setConfirmando(true)}
                    className="w-full py-3.5 px-6 border border-red-600 text-red-600 hover:bg-red-50 font-medium rounded-lg transition-colors text-base"
                >
                    Excluir minha conta
                </button>
            ) : (
                <form onSubmit={excluir} className="space-y-3.5">
                    <p role="alert" className="px-3.5 py-2.5 rounded-md bg-red-50 text-red-700 text-sm">
                        Isso não tem volta. Para confirmar, digite a sua senha e clique em &ldquo;Confirmar exclusão&rdquo;.
                    </p>
                    <input
                        type="password"
                        name="password"
                        placeholder="Sua senha"
                        autoComplete="current-password"
                        required
                        autoFocus
                        value={senha}
                        onChange={(e) => setSenha(e.target.value)}
                        className={inputClass}
                    />
                    {erro && (
                        <p role="alert" className="text-sm text-red-600">
                            {erro}
                        </p>
                    )}
                    <button
                        type="submit"
                        disabled={excluindo || senha === ''}
                        className="w-full py-3.5 px-6 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors text-base disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        {excluindo ? 'Excluindo…' : 'Confirmar exclusão'}
                    </button>
                    <button
                        type="button"
                        onClick={cancelar}
                        disabled={excluindo}
                        className="w-full text-sm text-plad hover:underline disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                        Cancelar
                    </button>
                </form>
            )}
        </Secao>
    )
}

export default function MinhaConta() {
    const { me } = useSessao()
    if (!me) {
        return null
    }

    return (
        <div className="min-h-screen flex flex-col bg-white text-gray-900 font-roboto">
            {/* Topo - Nome da aplicação */}
            <header className="text-center pt-8 pb-4">
                <span className="font-outfit font-semibold text-xl text-black">PLAD</span>
            </header>

            <main className="w-full max-w-md mx-auto flex-1 flex flex-col items-center gap-5 px-4 pb-12">
                <Link to={destinoPorPapel(me)} className="self-start text-xs text-plad hover:underline font-medium">
                    ← Voltar
                </Link>
                <h1 className="font-outfit text-3xl sm:text-4xl font-semibold text-black text-center">Minha conta</h1>
                <p className="text-black text-center text-sm mb-3">{me.email}</p>

                <TrocarSenha />
                <ExportarDados />
                {/* O back responde 403 à exclusão de um admin; a seção nem aparece */}
                {me.type_user !== 'admin' && <ExcluirConta />}
            </main>
        </div>
    )
}
