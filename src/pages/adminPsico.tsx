import { useCallback, useId, useState, type FormEvent, type KeyboardEvent } from 'react'
import { BadgeCheck, ClipboardList, Clock, Info, ScrollText, UserCheck, type LucideIcon } from 'lucide-react'
import { listAdminPsychologists, listAdminTriages } from '../api/admin'
import type { AdminPsychologistResponseDTO } from '../api/admin'
import { ACOES_DE_AUDITORIA, listAudit } from '../api/auditoria'
import type { AuditAction, AuditLogResponseDTO, FiltroDeAuditoria } from '../api/auditoria'
import type { PageResponseDTO } from '../api/pagina'
import AvisoDeAcesso from '../components/AvisoDeAcesso'
import Botao from '../components/Botao'
import Campo from '../components/Campo'
import Carregando from '../components/Carregando'
import EstadoErro from '../components/EstadoErro'
import EstadoVazio from '../components/EstadoVazio'
import LayoutPainel from '../components/LayoutPainel'
import ListaDeTriagens from '../components/ListaDeTriagens'
import Paginacao from '../components/Paginacao'
import { formatarData, formatarDataHora } from '../components/formatar'
import useListaPaginada from '../components/useListaPaginada'

/**
 * Gestão (só admin), ligada à API: triagens recebidas, psicólogos cadastrados e o registro de acessos (auditoria).
 * Visual proposto sem frame do Figma: segue o painel do Calendário (tokens, Card, estados) e as regras de acessibilidade.
 *
 * Regras que a tela cumpre:
 *  - não há classificação nem encaminhamento por risco (decisão 1 do backend);
 *  - o dependente aparece só pelo apelido, nunca pelo nome real (decisão 15);
 *  - psicólogo aparece com nome e número do conselho, nunca o e-mail (decisão 32); não há botão de aprovar: o backend
 *    ainda não tem como validar;
 *  - ler triagem é auditado, então a aba de triagens só carrega no clique. Cada aba é montada na primeira visita e depois
 *    só escondida, para trocar de aba não repetir uma leitura (nem a auditoria dela).
 */

type AbaId = 'triagens' | 'psicologos' | 'auditoria'

const ABAS: { id: AbaId; rotulo: string; icone: LucideIcon }[] = [
    { id: 'triagens', rotulo: 'Triagens', icone: ClipboardList },
    { id: 'psicologos', rotulo: 'Psicólogos', icone: UserCheck },
    { id: 'auditoria', rotulo: 'Auditoria', icone: ScrollText },
]

const TAMANHO_DA_LISTA = 20

// O que cada ação do audit_log quer dizer, para quem administra (o dependente lê outro texto, em Minha conta)
const ROTULO_DA_ACAO: Record<AuditAction, string> = {
    TRIAGE_SUBMITTED: 'Triagem enviada',
    TRIAGE_RESUBMITTED: 'Triagem reenviada',
    TRIAGE_VIEWED: 'Triagem consultada',
    NICKNAME_REROLLED: 'Apelido trocado',
    MEETING_PARTICIPANTS_VIEWED: 'Lista de inscritos de uma reunião consultada',
}

const ROTULO_DO_PAPEL: Record<string, string> = { dependente: 'dependente', psicologo: 'psicólogo', admin: 'administrador' }
const ROTULO_DO_REGISTRO: Record<string, string> = { TRIAGE: 'Triagem', MEETING: 'Reunião' }

export default function AdminPsico() {
    const idBase = useId()
    const [ativa, setAtiva] = useState<AbaId>('triagens')
    const [visitadas, setVisitadas] = useState<ReadonlySet<AbaId>>(() => new Set<AbaId>(['triagens']))

    const escolher = (id: AbaId) => {
        setAtiva(id)
        setVisitadas((atual) => new Set(atual).add(id))
    }

    // Abas com o padrão do WAI-ARIA: setas, Home e End movem entre elas
    const aoTeclar = (e: KeyboardEvent<HTMLDivElement>) => {
        const indice = ABAS.findIndex((aba) => aba.id === ativa)
        let novo: number
        if (e.key === 'ArrowRight') novo = (indice + 1) % ABAS.length
        else if (e.key === 'ArrowLeft') novo = (indice - 1 + ABAS.length) % ABAS.length
        else if (e.key === 'Home') novo = 0
        else if (e.key === 'End') novo = ABAS.length - 1
        else return
        e.preventDefault()
        escolher(ABAS[novo].id)
        document.getElementById(`${idBase}-aba-${ABAS[novo].id}`)?.focus()
    }

    return (
        // A barra lateral (com o menu da conta) e o rodapé vêm do LayoutPainel
        <LayoutPainel titulo="Gestão">
            <main id="conteudo" tabIndex={-1} className="min-w-0 flex-1 px-4 py-6 focus:outline-none md:px-10 md:py-10">
                <h1 className="font-outfit text-2xl font-bold text-black">Gestão</h1>
                <p className="mb-6 mt-1 text-sm text-texto-suave">
                    Triagens recebidas, psicólogos cadastrados e o registro de quem acessou os dados.
                </p>

                <div
                    role="tablist"
                    aria-label="Seções da gestão"
                    onKeyDown={aoTeclar}
                    className="mb-6 flex border-b border-borda-cartao"
                >
                    {ABAS.map((aba) => {
                        const Icone = aba.icone
                        const selecionada = ativa === aba.id
                        return (
                            <button
                                key={aba.id}
                                type="button"
                                role="tab"
                                id={`${idBase}-aba-${aba.id}`}
                                aria-selected={selecionada}
                                aria-controls={`${idBase}-painel-${aba.id}`}
                                tabIndex={selecionada ? 0 : -1}
                                onClick={() => escolher(aba.id)}
                                className={`-mb-px flex min-h-11 flex-1 items-center justify-center gap-1.5 border-b-2 px-2 py-2 font-outfit text-sm font-medium transition-colors sm:flex-none sm:gap-2 sm:px-6 sm:text-base ${
                                    selecionada
                                        ? 'border-plad text-plad-active'
                                        : 'border-transparent text-texto-suave hover:text-black'
                                }`}
                            >
                                <Icone size={18} aria-hidden="true" />
                                {aba.rotulo}
                            </button>
                        )
                    })}
                </div>

                {ABAS.map(
                    (aba) =>
                        visitadas.has(aba.id) && (
                            <section
                                key={aba.id}
                                role="tabpanel"
                                id={`${idBase}-painel-${aba.id}`}
                                aria-labelledby={`${idBase}-aba-${aba.id}`}
                                hidden={ativa !== aba.id}
                            >
                                {aba.id === 'triagens' && <PainelTriagens />}
                                {aba.id === 'psicologos' && <PainelPsicologos />}
                                {aba.id === 'auditoria' && <PainelAuditoria />}
                            </section>
                        ),
                )}
            </main>
        </LayoutPainel>
    )
}

function PainelTriagens() {
    return (
        <div className="space-y-5">
            <AvisoDeAcesso>
                Cada triagem que a lista trouxer fica registrada na auditoria, com o papel de administrador. Abrir uma
                triagem já listada não registra de novo. O dependente aparece só pelo apelido: o nome real é visto apenas
                pelo psicólogo.
            </AvisoDeAcesso>
            <ListaDeTriagens carregarPagina={listAdminTriages} />
        </div>
    )
}

// ---------------------------------------------------------------------------------------------------------------------
// Psicólogos

const buscarPsicologos = (pagina: number) => listAdminPsychologists(pagina, TAMANHO_DA_LISTA)

function SeloDeValidacao({ validado }: { validado: boolean }) {
    // Ícone e texto, não só a cor: "não validado" é um estado a acompanhar, não um erro (por isso o âmbar, não o vermelho)
    return validado ? (
        <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full bg-sucesso-fundo px-3 py-1 text-sm font-medium text-sucesso">
            <BadgeCheck size={16} aria-hidden="true" />
            Validado
        </span>
    ) : (
        <span className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-full border border-aviso-borda bg-aviso-fundo px-3 py-1 text-sm font-medium text-aviso">
            <Clock size={16} aria-hidden="true" />
            Não validado
        </span>
    )
}

function PainelPsicologos() {
    const lista = useListaPaginada(buscarPsicologos, { erroPadrao: 'Não foi possível carregar os psicólogos.' })
    const { carga } = lista

    if (carga.estado === 'carregando' || carga.estado === 'inicial') return <Carregando mensagem="Carregando psicólogos…" />
    if (carga.estado === 'erro') {
        return <EstadoErro titulo="Não conseguimos carregar os psicólogos" mensagem={carga.mensagem} onTentarNovamente={lista.recarregar} />
    }

    const { items, total_elements, total_pages } = carga.dados
    if (items.length === 0) {
        return (
            <EstadoVazio
                icone={<UserCheck size={26} />}
                titulo="Nenhum psicólogo cadastrado ainda"
                descricao="Quando alguém se cadastrar como psicólogo, aparece aqui, com o número do conselho."
            />
        )
    }

    return (
        <div>
            <p className="mb-3 text-sm text-texto-suave">
                {total_elements} {total_elements === 1 ? 'psicólogo cadastrado' : 'psicólogos cadastrados'} · cadastros mais recentes primeiro
            </p>
            {items.every((psicologo) => !psicologo.is_validated) && (
                <p className="mb-4 flex items-start gap-3 rounded-cartao bg-plad-fundo p-4 text-sm text-black">
                    <Info size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-plad-active" />
                    A conferência do número no conselho ainda não existe na plataforma. Até lá, todos aparecem como “não
                    validado”.
                </p>
            )}
            <ul className="space-y-3">
                {items.map((psicologo) => (
                    <LinhaDePsicologo key={psicologo.id} psicologo={psicologo} />
                ))}
            </ul>
            <Paginacao
                rotulo="Páginas de psicólogos"
                pagina={lista.pagina}
                totalPaginas={total_pages}
                totalItens={total_elements}
                onMudar={lista.irPara}
            />
        </div>
    )
}

function LinhaDePsicologo({ psicologo }: { psicologo: AdminPsychologistResponseDTO }) {
    return (
        <li className="flex flex-col gap-2 rounded-cartao border border-borda-cartao bg-white p-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="min-w-0">
                <p className="break-words font-outfit text-base font-semibold text-black">{psicologo.real_name}</p>
                <p className="text-sm text-texto-suave">
                    {psicologo.credential_type} {psicologo.crm_crp_number} · cadastrado em {formatarData(psicologo.created_at)}
                </p>
            </div>
            <SeloDeValidacao validado={psicologo.is_validated} />
        </li>
    )
}

// ---------------------------------------------------------------------------------------------------------------------
// Auditoria

function descreverQuemAgiu(entrada: AuditLogResponseDTO): string {
    if (entrada.actor_id === null) return 'Sistema'
    const papel = entrada.details?.actor_role
    const nomeDoPapel = typeof papel === 'string' ? ROTULO_DO_PAPEL[papel] : undefined
    return nomeDoPapel ? `Usuário nº ${entrada.actor_id} (${nomeDoPapel})` : `Usuário nº ${entrada.actor_id}`
}

function descreverRegistro(entrada: AuditLogResponseDTO): string {
    if (entrada.entity === null) return '—'
    const tipo = ROTULO_DO_REGISTRO[entrada.entity] ?? entrada.entity
    return entrada.entity_id === null ? tipo : `${tipo} nº ${entrada.entity_id}`
}

function PainelAuditoria() {
    const idBase = useId()
    // O que está nos campos (rascunho) é uma coisa; o filtro aplicado, outra: a lista só muda ao clicar em "Filtrar"
    const [idTexto, setIdTexto] = useState('')
    const [acao, setAcao] = useState<AuditAction | ''>('')
    const [erroId, setErroId] = useState<string | undefined>()
    const [filtro, setFiltro] = useState<FiltroDeAuditoria>({})

    const buscar = useCallback(
        (pagina: number): Promise<PageResponseDTO<AuditLogResponseDTO>> => listAudit(filtro, pagina, TAMANHO_DA_LISTA),
        [filtro],
    )
    const lista = useListaPaginada(buscar, { erroPadrao: 'Não foi possível carregar o registro de acessos.' })

    const aplicar = (e: FormEvent) => {
        e.preventDefault()
        const texto = idTexto.trim()
        if (texto !== '' && (!/^\d{1,15}$/.test(texto) || Number(texto) < 1)) {
            setErroId('Digite só números: o código do titular dos dados, como aparece na lista.')
            return
        }
        setErroId(undefined)
        setFiltro({ subject_user_id: texto === '' ? undefined : Number(texto), action: acao === '' ? undefined : acao })
        lista.irPara(0)
    }

    const limpar = () => {
        setIdTexto('')
        setAcao('')
        setErroId(undefined)
        setFiltro({})
        lista.irPara(0)
    }

    const { carga } = lista
    const comFiltro = filtro.subject_user_id !== undefined || filtro.action !== undefined

    return (
        <div>
            <p className="mb-4 text-sm text-texto-suave">
                Cada vez que uma triagem é enviada ou lida, a plataforma anota. Aqui só há números e papéis: nunca nomes,
                e-mails nem respostas.
            </p>

            <form onSubmit={aplicar} noValidate aria-label="Filtrar o registro" className="mb-6 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-start">
                <Campo rotulo="Código do titular dos dados" erro={erroId}>
                    {(c) => (
                        <input
                            {...c}
                            name="subject_user_id"
                            type="text"
                            inputMode="numeric"
                            autoComplete="off"
                            placeholder="Ex.: 12"
                            value={idTexto}
                            onChange={(e) => setIdTexto(e.target.value)}
                        />
                    )}
                </Campo>
                <Campo rotulo="Ação">
                    {(c) => (
                        <select {...c} name="action" value={acao} onChange={(e) => setAcao(e.target.value as AuditAction | '')}>
                            <option value="">Todas as ações</option>
                            {ACOES_DE_AUDITORIA.map((valor) => (
                                <option key={valor} value={valor}>
                                    {ROTULO_DA_ACAO[valor]}
                                </option>
                            ))}
                        </select>
                    )}
                </Campo>
                <div className="flex gap-2 sm:mt-6">
                    <Botao type="submit">Filtrar</Botao>
                    <Botao variante="texto" onClick={limpar} disabled={!comFiltro && idTexto === '' && acao === ''}>
                        Limpar
                    </Botao>
                </div>
            </form>

            {(carga.estado === 'carregando' || carga.estado === 'inicial') && <Carregando mensagem="Carregando o registro…" />}
            {carga.estado === 'erro' && (
                <EstadoErro titulo="Não conseguimos carregar o registro" mensagem={carga.mensagem} onTentarNovamente={lista.recarregar} />
            )}
            {carga.estado === 'pronto' && carga.dados.items.length === 0 && (
                <EstadoVazio
                    icone={<ScrollText size={26} />}
                    titulo={comFiltro ? 'Nada com esse filtro' : 'Nenhum acesso registrado ainda'}
                    descricao={
                        comFiltro
                            ? 'Tente outro código ou outra ação, ou limpe o filtro para ver tudo.'
                            : 'Quando alguém enviar ou ler uma triagem, o registro aparece aqui.'
                    }
                    acao={comFiltro ? <Botao variante="secundario" onClick={limpar}>Limpar o filtro</Botao> : undefined}
                />
            )}
            {carga.estado === 'pronto' && carga.dados.items.length > 0 && (
                <div>
                    <p id={`${idBase}-total`} className="mb-3 text-sm text-texto-suave">
                        {carga.dados.total_elements} {carga.dados.total_elements === 1 ? 'registro' : 'registros'} · mais recentes primeiro
                    </p>
                    <ul aria-describedby={`${idBase}-total`} className="space-y-3">
                        {carga.dados.items.map((entrada) => (
                            <li key={entrada.id} className="rounded-cartao border border-borda-cartao bg-white p-4">
                                <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                                    <p className="font-outfit text-base font-semibold text-black">
                                        {ROTULO_DA_ACAO[entrada.action] ?? entrada.action}
                                    </p>
                                    <time dateTime={entrada.occurred_at} className="text-sm text-texto-suave">
                                        {formatarDataHora(entrada.occurred_at)}
                                    </time>
                                </div>
                                <dl className="mt-2 grid gap-x-6 gap-y-1 text-sm sm:grid-cols-3">
                                    <div>
                                        <dt className="text-texto-suave">Quem agiu</dt>
                                        <dd className="text-black">{descreverQuemAgiu(entrada)}</dd>
                                    </div>
                                    <div>
                                        <dt className="text-texto-suave">De quem são os dados</dt>
                                        <dd className="text-black">
                                            {entrada.subject_user_id === null ? '—' : `Usuário nº ${entrada.subject_user_id}`}
                                        </dd>
                                    </div>
                                    <div>
                                        <dt className="text-texto-suave">Registro</dt>
                                        <dd className="text-black">{descreverRegistro(entrada)}</dd>
                                    </div>
                                </dl>
                            </li>
                        ))}
                    </ul>
                    <Paginacao
                        rotulo="Páginas do registro"
                        pagina={lista.pagina}
                        totalPaginas={carga.dados.total_pages}
                        totalItens={carga.dados.total_elements}
                        onMudar={lista.irPara}
                    />
                </div>
            )}
        </div>
    )
}
