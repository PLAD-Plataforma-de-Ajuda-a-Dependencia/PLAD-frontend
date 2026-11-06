import { useState } from 'react'
import { ClipboardList, UserCheck } from 'lucide-react'
import type { CrmCrpType } from '../api/auth'
import Botao from '../components/Botao'
import Card from '../components/Card'
import EstadoVazio from '../components/EstadoVazio'
import FaixaDemonstrativa from '../components/FaixaDemonstrativa'
import LayoutPainel from '../components/LayoutPainel'
import { useToast } from '../components/ToastContext'

/**
 * Gestão (admin e psicólogo). Ainda não está ligada à API: nasce vazia e, com "Carregar dados demonstrativos", mostra
 * exemplos fictícios para conhecer a tela. O F1 e o F4 a refazem com os endpoints reais.
 * A triagem só guarda e devolve o que a pessoa respondeu: não há classificação nem encaminhamento por risco
 * (decisão 1 de docs/decisoes-para-revisao.md do backend). E o admin só vê o apelido do dependente, nunca o nome
 * real (decisão 15), por isso as triagens aqui são identificadas pelo apelido.
 */

type DecisionStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

interface PendingPsychologist {
    id: number
    name: string
    graduate: string
    credentialType: CrmCrpType
    crmCrpNumber: string
}

interface TriageAnswer {
    id: number
    questionText: string
    valueResult: string
}

interface ReceivedTriage {
    id: number
    nickname: string
    answers: TriageAnswer[]
}

// Dados fictícios, só para a opção "Carregar dados demonstrativos"
const psicologosDemonstrativos: PendingPsychologist[] = [
    { id: 1, name: 'Ana Beatriz Souza', graduate: 'PUC-SP', credentialType: 'CRP', crmCrpNumber: '06/123456' },
    { id: 2, name: 'Carlos Eduardo Lima', graduate: 'USP', credentialType: 'CRP', crmCrpNumber: '06/987654' },
]

const triagensDemonstrativas: ReceivedTriage[] = [
    {
        id: 1,
        nickname: 'Morcego Sereno',
        answers: [
            { id: 1, questionText: 'Qual é a sua faixa etária?', valueResult: '25 a 39 anos' },
            { id: 2, questionText: 'Pensando em começar agora, qual formato te deixaria mais confortável?', valueResult: 'Atendimento individual' },
        ],
    },
    {
        id: 2,
        nickname: 'Coruja Serena',
        answers: [
            { id: 1, questionText: 'Qual é a sua faixa etária?', valueResult: '40 a 59 anos' },
            { id: 2, questionText: 'Pensando em começar agora, qual formato te deixaria mais confortável?', valueResult: 'Atendimento em grupo' },
        ],
    },
]

export default function AdminDashboard() {
    const { avisar } = useToast()
    const [tab, setTab] = useState<'psychologists' | 'triages'>('psychologists')
    const [demonstrativo, setDemonstrativo] = useState(false)
    const [psychDecisions, setPsychDecisions] = useState<Record<number, DecisionStatus>>({})
    const [expandedTriage, setExpandedTriage] = useState<number | null>(null)

    const psychologists = demonstrativo ? psicologosDemonstrativos : []
    const triages = demonstrativo ? triagensDemonstrativas : []
    const pendingPsychCount = psychologists.length - Object.keys(psychDecisions).length

    const handlePsychDecision = (id: number, status: DecisionStatus) => {
        setPsychDecisions((prev) => ({ ...prev, [id]: status }))
    }

    const carregarDemonstrativos = () => {
        setDemonstrativo(true)
        avisar('Dados demonstrativos carregados. São fictícios.', 'info')
    }

    const removerDemonstrativos = () => {
        setDemonstrativo(false)
        setPsychDecisions({})
        setExpandedTriage(null)
    }

    const botaoDemo = (
        <Botao variante="secundario" onClick={carregarDemonstrativos}>
            Carregar dados demonstrativos
        </Botao>
    )

    const tabClass = (ativa: boolean) =>
        `min-h-11 rounded-lg px-4 py-2 font-outfit text-sm font-medium transition-colors ${
            ativa ? 'bg-plad text-white' : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }`

    return (
        // A barra lateral (com o menu da conta) e o rodapé vêm do LayoutPainel
        <LayoutPainel titulo="Gestão">
            <main id="conteudo" tabIndex={-1} className="min-w-0 flex-1 px-4 py-6 focus:outline-none md:px-10 md:py-10">
                <h1 className="font-outfit text-2xl font-bold text-black">Gestão</h1>
                <p className="mb-6 mt-1 text-sm text-texto-suave">Aprovações de psicólogos e triagens recebidas</p>

                {demonstrativo && <FaixaDemonstrativa onRemover={removerDemonstrativos} />}

                {/* Contadores */}
                <section aria-label="Resumo" className="mb-8 grid grid-cols-1 gap-4 md:mb-12 md:grid-cols-2 md:gap-8">
                    <Card titulo="Psicólogos pendentes">
                        <p className="mt-4 font-outfit text-4xl font-bold text-black">{pendingPsychCount}</p>
                    </Card>
                    <Card titulo="Triagens recebidas">
                        <p className="mt-4 font-outfit text-4xl font-bold text-black">{triages.length}</p>
                    </Card>
                </section>

                <div className="rounded-painel border border-gray-100 bg-white p-4 shadow-painel md:p-8">
                    {/* Abas */}
                    <div className="mb-6 flex flex-wrap gap-2">
                        <button
                            type="button"
                            aria-pressed={tab === 'psychologists'}
                            onClick={() => setTab('psychologists')}
                            className={tabClass(tab === 'psychologists')}
                        >
                            Aprovação de psicólogos
                        </button>
                        <button
                            type="button"
                            aria-pressed={tab === 'triages'}
                            onClick={() => setTab('triages')}
                            className={tabClass(tab === 'triages')}
                        >
                            Triagens recebidas
                        </button>
                    </div>

                    {/* Aba: Psicólogos */}
                    {tab === 'psychologists' &&
                        (psychologists.length === 0 ? (
                            <EstadoVazio
                                icone={<UserCheck size={26} />}
                                titulo="Nenhum psicólogo aguardando aprovação"
                                descricao="Quando alguém se cadastrar como psicólogo, o pedido aparece aqui para você aprovar."
                                acao={botaoDemo}
                            />
                        ) : (
                            <ul className="space-y-3">
                                {psychologists.map((psychologist) => {
                                    const status = psychDecisions[psychologist.id] ?? 'PENDING'
                                    return (
                                        <li
                                            key={psychologist.id}
                                            className="flex flex-col gap-3 rounded-2xl border border-gray-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4"
                                        >
                                            <div className="min-w-0">
                                                <p className="font-outfit text-sm font-semibold text-black">{psychologist.name}</p>
                                                <p className="text-sm text-texto-suave">
                                                    {psychologist.graduate} · {psychologist.credentialType} {psychologist.crmCrpNumber}
                                                </p>
                                            </div>

                                            {status === 'PENDING' ? (
                                                <div className="flex shrink-0 gap-2">
                                                    <Botao className="px-4 text-sm" onClick={() => handlePsychDecision(psychologist.id, 'APPROVED')}>
                                                        Aprovar
                                                    </Botao>
                                                    <Botao
                                                        variante="secundario"
                                                        className="border-gray-300 px-4 text-sm text-gray-700 hover:bg-gray-50"
                                                        onClick={() => handlePsychDecision(psychologist.id, 'REJECTED')}
                                                    >
                                                        Rejeitar
                                                    </Botao>
                                                </div>
                                            ) : (
                                                <span
                                                    className={`shrink-0 text-sm font-semibold ${
                                                        status === 'APPROVED' ? 'text-plad' : 'text-gray-600'
                                                    }`}
                                                >
                                                    {status === 'APPROVED' ? 'Aprovado' : 'Rejeitado'}
                                                </span>
                                            )}
                                        </li>
                                    )
                                })}
                            </ul>
                        ))}

                    {/* Aba: Triagens (só leitura: o dependente aparece pelo apelido) */}
                    {tab === 'triages' &&
                        (triages.length === 0 ? (
                            <EstadoVazio
                                icone={<ClipboardList size={26} />}
                                titulo="Nenhuma triagem recebida ainda"
                                descricao="As triagens enviadas pelos dependentes aparecem aqui, identificadas só pelo apelido."
                                acao={botaoDemo}
                            />
                        ) : (
                            <ul className="space-y-3">
                                {triages.map((triage) => {
                                    const isExpanded = expandedTriage === triage.id
                                    return (
                                        <li key={triage.id} className="rounded-2xl border border-gray-200 px-5 py-2">
                                            <button
                                                type="button"
                                                aria-expanded={isExpanded}
                                                onClick={() => setExpandedTriage(isExpanded ? null : triage.id)}
                                                className="flex min-h-11 w-full items-center justify-between gap-4 text-left"
                                            >
                                                <span className="font-outfit text-sm font-semibold text-black">{triage.nickname}</span>
                                                <span className="text-sm text-plad">{isExpanded ? 'Ocultar respostas' : 'Ver respostas'}</span>
                                            </button>

                                            {isExpanded && (
                                                <div className="space-y-2 border-t border-gray-100 py-3">
                                                    {triage.answers.map((answer) => (
                                                        <div key={answer.id}>
                                                            <p className="text-sm text-texto-suave">{answer.questionText}</p>
                                                            <p className="text-sm text-gray-800">{answer.valueResult}</p>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </li>
                                    )
                                })}
                            </ul>
                        ))}
                </div>
            </main>
        </LayoutPainel>
    )
}
