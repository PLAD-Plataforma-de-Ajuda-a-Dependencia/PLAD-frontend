import { useState, type FormEvent, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { format } from 'date-fns'
import { ArrowLeft, Eye } from 'lucide-react'
import { ApiError, errosPorCampo, getErrorMessage } from '../api/client'
import type { AuditAction } from '../api/auditoria'
import { changePassword, deleteMyAccount, exportMyData, getAccessLog } from '../api/me'
import { setToken } from '../api/token'
import Botao from '../components/Botao'
import Card from '../components/Card'
import CampoSenha from '../components/CampoSenha'
import Carregando from '../components/Carregando'
import EstadoErro from '../components/EstadoErro'
import EstadoVazio from '../components/EstadoVazio'
import LayoutPagina from '../components/LayoutPagina'
import ModalConfirmacao from '../components/ModalConfirmacao'
import Paginacao from '../components/Paginacao'
import { useToast } from '../components/ToastContext'
import { formatarDataHora } from '../components/formatar'
import useListaPaginada from '../components/useListaPaginada'
import { destinoPorPapel, useSessao } from '../session/SessaoContext'

/**
 * Minha conta (qualquer papel): trocar a senha (PUT /me/password), exportar os próprios dados (GET /me/export) e
 * excluir a conta (DELETE /me, com confirmação). O dependente vê também "Quem viu meus dados" (GET /me/access-log).
 * Visual provisório: segue Login e Triagem, sem frame do Figma.
 */

const SENHA_MIN = 8
const SENHA_MAX_BYTES = 72 // o limite de entrada do BCrypt, igual ao do cadastro

function Secao({ titulo, descricao, children }: { titulo: string; descricao: string; children: ReactNode }) {
    return (
        <Card as="section" className="w-full">
            <h2 className="mb-1 font-outfit text-xl font-semibold text-black">{titulo}</h2>
            <p className="mb-4 text-sm text-texto-suave">{descricao}</p>
            {children}
        </Card>
    )
}

function bytesUtf8(texto: string): number {
    return new TextEncoder().encode(texto).length
}

function TrocarSenha() {
    const { avisar } = useToast()
    const [senhaAtual, setSenhaAtual] = useState('')
    const [senhaNova, setSenhaNova] = useState('')
    const [confirmacao, setConfirmacao] = useState('')
    const [enviando, setEnviando] = useState(false)
    const [erroGeral, setErroGeral] = useState<string | null>(null)
    const [errosCampo, setErrosCampo] = useState<Record<string, string>>({})

    const enviar = async (e: FormEvent) => {
        e.preventDefault()
        if (enviando) return
        setErroGeral(null)

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
            avisar('Senha alterada. Os outros dispositivos foram desconectados.')
        } catch (err) {
            const doBack = errosPorCampo(err)
            if (err instanceof ApiError && err.code === 'INVALID_CREDENTIALS') {
                setErrosCampo({ current_password: 'Senha atual incorreta.' })
            } else if (err instanceof ApiError && err.code === 'INVALID_PASSWORD_CHANGE') {
                setErrosCampo({ new_password: err.message })
            } else if (Object.keys(doBack).length > 0) {
                setErrosCampo(doBack)
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
            <form onSubmit={enviar} className="space-y-4">
                <CampoSenha
                    rotulo="Senha atual"
                    name="current_password"
                    autoComplete="current-password"
                    required
                    value={senhaAtual}
                    onChange={(e) => setSenhaAtual(e.target.value)}
                    erro={errosCampo.current_password}
                />
                <CampoSenha
                    rotulo="Nova senha"
                    ajuda={`Pelo menos ${SENHA_MIN} caracteres.`}
                    name="new_password"
                    autoComplete="new-password"
                    required
                    value={senhaNova}
                    onChange={(e) => setSenhaNova(e.target.value)}
                    erro={errosCampo.new_password}
                />
                <CampoSenha
                    rotulo="Repita a nova senha"
                    name="confirmacao"
                    autoComplete="new-password"
                    required
                    value={confirmacao}
                    onChange={(e) => setConfirmacao(e.target.value)}
                    erro={errosCampo.confirmacao}
                />
                {erroGeral && (
                    <p role="alert" className="text-sm text-erro">
                        {erroGeral}
                    </p>
                )}
                <Botao type="submit" bloco carregando={enviando}>
                    {enviando ? 'Trocando…' : 'Trocar senha'}
                </Botao>
            </form>
        </Secao>
    )
}

function ExportarDados() {
    const { avisar } = useToast()
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
            avisar('Pronto! O arquivo com os seus dados foi baixado.')
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
                <p role="alert" className="mb-3 text-sm text-erro">
                    {erro}
                </p>
            )}
            <Botao variante="secundario" bloco carregando={baixando} onClick={baixar}>
                {baixando ? 'Preparando…' : 'Baixar meus dados'}
            </Botao>
        </Secao>
    )
}

const ACESSOS_POR_PAGINA = 10
const buscarAcessos = (pagina: number) => getAccessLog(pagina, ACESSOS_POR_PAGINA)

// O que o dependente lê para cada ação que o backend lista no log de acessos (leituras de terceiros)
const TEXTO_DO_ACESSO: Partial<Record<AuditAction, string>> = {
    TRIAGE_VIEWED: 'Sua triagem foi consultada',
    MEETING_PARTICIPANTS_VIEWED: 'A lista de inscritos de uma reunião em que você está foi consultada',
}
// Só o papel, nunca quem: o backend nem manda o nome (LGPD art. 18)
const QUEM_CONSULTOU: Record<string, string> = { psicologo: 'Por um psicólogo', admin: 'Por um administrador' }

/**
 * Transparência ao titular: quando um psicólogo ou um administrador consultou os dados dele. Ler o próprio log não é
 * auditado, então carrega ao montar.
 */
function QuemViuMeusDados() {
    const lista = useListaPaginada(buscarAcessos, { erroPadrao: 'Não foi possível carregar os acessos aos seus dados.' })
    const { carga } = lista

    return (
        <Secao
            titulo="Quem viu meus dados"
            descricao="Aqui aparece quando um psicólogo ou um administrador consultou informações suas, como a triagem. Mostramos o papel de quem consultou, nunca o nome."
        >
            {(carga.estado === 'carregando' || carga.estado === 'inicial') && <Carregando mensagem="Carregando…" />}
            {carga.estado === 'erro' && (
                <EstadoErro titulo="Não conseguimos carregar agora" mensagem={carga.mensagem} onTentarNovamente={lista.recarregar} />
            )}
            {carga.estado === 'pronto' && carga.dados.items.length === 0 && (
                <EstadoVazio
                    icone={<Eye size={26} />}
                    titulo="Ninguém consultou os seus dados"
                    descricao="Se um psicólogo ou um administrador consultar, você vê aqui, com a data."
                />
            )}
            {carga.estado === 'pronto' && carga.dados.items.length > 0 && (
                <>
                    <ul className="divide-y divide-borda-cartao">
                        {carga.dados.items.map((acesso, indice) => (
                            <li key={`${acesso.occurred_at}-${indice}`} className="flex items-start gap-3 py-3">
                                <span
                                    aria-hidden="true"
                                    className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-full bg-plad-fundo text-plad"
                                >
                                    <Eye size={18} />
                                </span>
                                <div className="min-w-0 flex-1">
                                    <p className="text-base text-black">{TEXTO_DO_ACESSO[acesso.action] ?? 'Seus dados foram consultados'}</p>
                                    <p className="text-sm text-texto-suave">
                                        {(acesso.actor_role ? QUEM_CONSULTOU[acesso.actor_role] : undefined) ?? 'Por um profissional autorizado'} ·{' '}
                                        {formatarDataHora(acesso.occurred_at)}
                                    </p>
                                </div>
                            </li>
                        ))}
                    </ul>
                    <Paginacao
                        rotulo="Páginas dos acessos"
                        pagina={lista.pagina}
                        totalPaginas={carga.dados.total_pages}
                        totalItens={carga.dados.total_elements}
                        onMudar={lista.irPara}
                    />
                </>
            )}
        </Secao>
    )
}

function ExcluirConta() {
    const { sair } = useSessao()
    const { avisar } = useToast()
    // A confirmação é um modal: o botão da seção só o abre; a exclusão é o botão do modal, com a senha
    const [confirmando, setConfirmando] = useState(false)
    const [senha, setSenha] = useState('')
    const [excluindo, setExcluindo] = useState(false)
    const [erro, setErro] = useState<string | undefined>()

    const cancelar = () => {
        setConfirmando(false)
        setSenha('')
        setErro(undefined)
    }

    const excluir = async () => {
        setExcluindo(true)
        setErro(undefined)
        try {
            await deleteMyAccount({ password: senha })
            // A conta e as sessões acabaram; o logout só limpa o cookie de refresh que ficou no navegador
            await sair('/')
            avisar('Sua conta foi excluída.')
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
            <Botao variante="perigo-contorno" bloco onClick={() => setConfirmando(true)}>
                Excluir minha conta
            </Botao>

            <ModalConfirmacao
                aberto={confirmando}
                titulo="Excluir a sua conta?"
                descricao="Isso não tem volta: a conta e tudo o que está ligado a ela serão apagados. Para confirmar, digite a sua senha."
                rotuloConfirmar="Excluir minha conta"
                rotuloCancelar="Manter minha conta"
                perigo
                carregando={excluindo}
                confirmarDesabilitado={senha === ''}
                onConfirmar={() => void excluir()}
                onCancelar={cancelar}
            >
                <CampoSenha
                    rotulo="Sua senha"
                    name="password"
                    autoComplete="current-password"
                    required
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    erro={erro}
                />
            </ModalConfirmacao>
        </Secao>
    )
}

export default function MinhaConta() {
    const { me } = useSessao()
    if (!me) {
        return null
    }

    return (
        <LayoutPagina titulo="Minha conta">
            <div className="flex w-full flex-1 flex-col items-center gap-5 pb-4">
                <Link
                    to={destinoPorPapel(me)}
                    className="-ml-3 inline-flex min-h-11 items-center gap-1.5 self-start px-3 text-sm font-medium text-plad hover:underline"
                >
                    <ArrowLeft size={16} aria-hidden="true" /> Voltar
                </Link>
                <h1 className="text-center font-outfit text-3xl font-semibold text-black sm:text-4xl">Minha conta</h1>
                <p className="mb-3 break-all text-center text-sm text-black">{me.email}</p>

                <TrocarSenha />
                <ExportarDados />
                {/* Só o dependente tem log de acessos (o back responde 403 aos outros papéis) */}
                {me.type_user === 'dependente' && <QuemViuMeusDados />}
                {/* O back responde 403 à exclusão de um admin; a seção nem aparece */}
                {me.type_user !== 'admin' && <ExcluirConta />}
            </div>
        </LayoutPagina>
    )
}
