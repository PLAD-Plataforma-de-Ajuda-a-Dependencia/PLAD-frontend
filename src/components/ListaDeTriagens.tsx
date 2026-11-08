import { useCallback, useId, useState } from 'react'
import { ChevronDown, ClipboardList } from 'lucide-react'
import type { PageResponseDTO } from '../api/pagina'
import type { AnswerResponseDTO } from '../api/triage'
import Botao from './Botao'
import Carregando from './Carregando'
import EstadoErro from './EstadoErro'
import EstadoVazio from './EstadoVazio'
import Paginacao from './Paginacao'
import RespostasDaTriagem from './RespostasDaTriagem'
import { formatarData, formatarDataHora } from './formatar'
import useListaPaginada from './useListaPaginada'

/**
 * O que a lista precisa de uma triagem. O psicólogo recebe também o nome real do dependente; o admin, só o apelido: a
 * mesma lista serve aos dois porque `real_name` é opcional aqui e só aparece quando a API o mandou.
 */
export interface TriagemExibida {
    id: number
    created_at: string
    dependent: { nickname: string; real_name?: string }
    answers: AnswerResponseDTO[]
}

interface ListaDeTriagensProps<T extends TriagemExibida> {
    carregarPagina: (pagina: number, tamanho: number) => Promise<PageResponseDTO<T>>
    tamanhoPagina?: number
}

/**
 * Triagens recebidas, com a lista paginada e as respostas de cada uma. O backend audita cada triagem devolvida pela lista
 * e o dependente vê isso no log de acessos dele, por isso:
 *  - nada carrega ao abrir a tela: a lista só vem depois do clique em "Ver triagens";
 *  - a lista já traz as respostas, então abrir uma linha só mostra o que já foi lido e registrado. Não chama
 *    `GET /triages/{id}`: isso gravaria uma segunda entrada para a mesma triagem, sem revelar nada novo;
 *  - nomes e respostas ficam só no estado deste componente (nunca em contexto, storage ou URL) e somem ao sair da tela.
 * Quem usa mostra o AvisoDeAcesso acima, para a pessoa saber do registro antes de clicar.
 */
export default function ListaDeTriagens<T extends TriagemExibida>({ carregarPagina, tamanhoPagina = 10 }: ListaDeTriagensProps<T>) {
    const idBase = useId()
    const buscar = useCallback((pagina: number) => carregarPagina(pagina, tamanhoPagina), [carregarPagina, tamanhoPagina])
    const lista = useListaPaginada(buscar, { aguardarPedido: true, erroPadrao: 'Não foi possível carregar as triagens.' })
    const [aberta, setAberta] = useState<number | null>(null)

    function alternar(id: number) {
        setAberta((atual) => (atual === id ? null : id))
    }

    function mudarPagina(pagina: number) {
        setAberta(null)
        lista.irPara(pagina)
    }

    const { carga } = lista

    if (carga.estado === 'inicial') {
        return (
            <EstadoVazio
                icone={<ClipboardList size={26} />}
                titulo="Triagens dos dependentes"
                descricao="A lista só é carregada quando você pedir, porque cada acesso fica registrado."
                acao={<Botao onClick={lista.iniciar}>Ver triagens</Botao>}
            />
        )
    }

    if (carga.estado === 'carregando') {
        return <Carregando mensagem="Carregando triagens…" />
    }

    if (carga.estado === 'erro') {
        return <EstadoErro titulo="Não conseguimos carregar as triagens" mensagem={carga.mensagem} onTentarNovamente={lista.recarregar} />
    }

    const { items, total_elements, total_pages } = carga.dados

    if (items.length === 0) {
        return (
            <EstadoVazio
                icone={<ClipboardList size={26} />}
                titulo="Nenhuma triagem recebida ainda"
                descricao="Quando um dependente enviar a triagem, ela aparece aqui."
            />
        )
    }

    return (
        <div>
            <p className="mb-3 text-sm text-texto-suave">
                {total_elements} {total_elements === 1 ? 'triagem' : 'triagens'} · mais recentes primeiro
            </p>

            <ul className="space-y-3">
                {items.map((triagem) => {
                    const estaAberta = aberta === triagem.id
                    const idBotao = `${idBase}-botao-${triagem.id}`
                    const idRegiao = `${idBase}-regiao-${triagem.id}`
                    const nomeReal = triagem.dependent.real_name
                    return (
                        <li key={triagem.id} className="rounded-cartao border border-borda-cartao bg-white">
                            <h3>
                                <button
                                    type="button"
                                    id={idBotao}
                                    aria-expanded={estaAberta}
                                    aria-controls={estaAberta ? idRegiao : undefined}
                                    onClick={() => alternar(triagem.id)}
                                    className="flex min-h-16 w-full items-center gap-3 rounded-cartao px-4 py-3 text-left transition-colors hover:bg-plad-fundo/60"
                                >
                                    <span
                                        aria-hidden="true"
                                        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-avatar font-outfit text-base font-semibold text-black"
                                    >
                                        {triagem.dependent.nickname.charAt(0).toUpperCase()}
                                    </span>
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate font-outfit text-base font-semibold text-black">
                                            <span className="sr-only">Apelido: </span>
                                            {triagem.dependent.nickname}
                                        </span>
                                        {nomeReal && (
                                            <span className="block truncate text-sm text-texto-suave">
                                                <span className="sr-only">Nome real: </span>
                                                {nomeReal}
                                            </span>
                                        )}
                                        <span className="block text-sm text-texto-suave sm:hidden">
                                            <span className="sr-only">Enviada em </span>
                                            {formatarData(triagem.created_at)}
                                        </span>
                                    </span>
                                    <span className="hidden shrink-0 text-sm text-texto-suave sm:block">
                                        <span className="sr-only">Enviada em </span>
                                        {formatarData(triagem.created_at)}
                                    </span>
                                    <ChevronDown
                                        size={20}
                                        aria-hidden="true"
                                        className={`shrink-0 text-plad transition-transform ${estaAberta ? 'rotate-180' : ''}`}
                                    />
                                </button>
                            </h3>

                            {estaAberta && (
                                <div id={idRegiao} role="region" aria-labelledby={idBotao} className="border-t border-borda-cartao px-4 py-4">
                                    <p className="mb-4 text-sm text-texto-suave">Enviada em {formatarDataHora(triagem.created_at)}</p>
                                    <RespostasDaTriagem respostas={triagem.answers} />
                                </div>
                            )}
                        </li>
                    )
                })}
            </ul>

            <Paginacao
                rotulo="Páginas de triagens"
                pagina={lista.pagina}
                totalPaginas={total_pages}
                totalItens={total_elements}
                onMudar={mudarPagina}
            />
        </div>
    )
}
