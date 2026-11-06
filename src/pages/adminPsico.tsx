import { useState } from 'react'
import LayoutPainel from '../components/LayoutPainel'

type CrmCrpType = 'CRM' | 'CRP'
type RiskLevel = 'GREEN' | 'YELLOW' | 'RED'
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

interface PendingTriage {
    id: number
    patientName: string
    answers: TriageAnswer[]
}

// Dados mockados só para exibição no front — virão da API depois
const mockPsychologists: PendingPsychologist[] = [
    { id: 1, name: 'Ana Beatriz Souza', graduate: 'PUC-SP', credentialType: 'CRP', crmCrpNumber: '06/123456' },
    { id: 2, name: 'Carlos Eduardo Lima', graduate: 'USP', credentialType: 'CRP', crmCrpNumber: '06/987654' },
]

const mockTriages: PendingTriage[] = [
    {
        id: 1,
        patientName: 'João Pedro Alves',
        answers: [
            { id: 1, questionText: 'Você tem tido pensamentos de se machucar?', valueResult: 'Às vezes' },
            { id: 2, questionText: 'Como está seu sono nas últimas 2 semanas?', valueResult: 'Ruim' },
        ],
    },
    {
        id: 2,
        patientName: 'Marina Costa',
        answers: [
            { id: 1, questionText: 'Você tem tido pensamentos de se machucar?', valueResult: 'Não' },
            { id: 2, questionText: 'Como está seu sono nas últimas 2 semanas?', valueResult: 'Bom' },
        ],
    },
]

const riskOptions: { value: RiskLevel; label: string; color: string }[] = [
    { value: 'GREEN', label: 'Leve', color: 'bg-green-500' },
    { value: 'YELLOW', label: 'Moderado', color: 'bg-yellow-400' },
    { value: 'RED', label: 'Grave', color: 'bg-red-500' },
]

// Mesmo selo e cartão dos contadores do Calendário
function CardResumo({ titulo, valor }: { titulo: string; valor: number }) {
    return (
        <div className="bg-white rounded-2xl border border-gray-200 p-8 shadow-sm">
            <span className="inline-block bg-[#5271ff] text-white font-outfit text-sm font-medium px-3 py-0.5 rounded-md">
                {titulo}
            </span>
            <p className="font-outfit text-4xl font-bold text-black mt-4">{valor}</p>
        </div>
    )
}

export default function AdminDashboard() {
    const [tab, setTab] = useState<'psychologists' | 'triages'>('psychologists')
    const [psychDecisions, setPsychDecisions] = useState<Record<number, DecisionStatus>>({})
    const [triageRisks, setTriageRisks] = useState<Record<number, RiskLevel>>({})
    const [expandedTriage, setExpandedTriage] = useState<number | null>(null)

    const pendingPsychCount = mockPsychologists.length - Object.keys(psychDecisions).length
    const pendingTriageCount = mockTriages.length - Object.keys(triageRisks).length

    const handlePsychDecision = (id: number, status: DecisionStatus) => {
        setPsychDecisions((prev) => ({ ...prev, [id]: status }))
    }

    const handleTriageRisk = (id: number, risk: RiskLevel) => {
        setTriageRisks((prev) => ({ ...prev, [id]: risk }))
        setExpandedTriage(null)
    }

    const tabClass = (ativa: boolean) =>
        `px-4 py-2 rounded-lg font-outfit text-sm font-medium transition-colors ${
            ativa ? 'bg-[#5271ff] text-white' : 'text-gray-500 hover:bg-gray-50 hover:text-gray-700'
        }`

    return (
        // A barra lateral (com o menu da conta) e o rodapé vêm do LayoutPainel
        <LayoutPainel>
            <main className="flex-1 px-10 py-10">
                <h1 className="font-outfit text-2xl font-bold text-black">Gestão</h1>
                <p className="text-gray-500 text-sm mt-1 mb-8">Aprovações de psicólogos e revisão de triagens</p>

                {/* Contadores */}
                <section className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12">
                    <CardResumo titulo="Psicólogos pendentes" valor={pendingPsychCount} />
                    <CardResumo titulo="Triagens pendentes" valor={pendingTriageCount} />
                </section>

                <div className="bg-white rounded-3xl shadow-xl shadow-indigo-100 border border-gray-100 p-8">
                    {/* Abas */}
                    <div className="flex flex-wrap gap-2 mb-6">
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
                            Revisão de triagens
                        </button>
                    </div>

                    {/* Aba: Psicólogos */}
                    {tab === 'psychologists' && (
                        <div className="space-y-3">
                            {mockPsychologists.map((psychologist) => {
                                const status = psychDecisions[psychologist.id] ?? 'PENDING'
                                return (
                                    <div
                                        key={psychologist.id}
                                        className="border border-gray-200 rounded-2xl px-5 py-4 flex items-center justify-between gap-4"
                                    >
                                        <div>
                                            <p className="font-outfit text-sm font-semibold text-black">{psychologist.name}</p>
                                            <p className="text-xs text-gray-500">
                                                {psychologist.graduate} · {psychologist.credentialType} {psychologist.crmCrpNumber}
                                            </p>
                                        </div>

                                        {status === 'PENDING' ? (
                                            <div className="flex gap-2 shrink-0">
                                                <button
                                                    type="button"
                                                    onClick={() => handlePsychDecision(psychologist.id, 'APPROVED')}
                                                    className="px-4 py-1.5 rounded-lg text-xs font-medium text-white bg-[#5271ff] hover:bg-plad-hover transition-colors"
                                                >
                                                    Aprovar
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handlePsychDecision(psychologist.id, 'REJECTED')}
                                                    className="px-4 py-1.5 rounded-lg text-xs font-medium text-gray-700 border border-gray-200 hover:bg-gray-50 transition-colors"
                                                >
                                                    Rejeitar
                                                </button>
                                            </div>
                                        ) : (
                                            <span
                                                className={`text-xs font-semibold shrink-0 ${
                                                    status === 'APPROVED' ? 'text-[#5271ff]' : 'text-gray-400'
                                                }`}
                                            >
                                                {status === 'APPROVED' ? 'Aprovado' : 'Rejeitado'}
                                            </span>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}

                    {/* Aba: Triagens */}
                    {tab === 'triages' && (
                        <div className="space-y-3">
                            {mockTriages.map((triage) => {
                                const risk = triageRisks[triage.id]
                                const isExpanded = expandedTriage === triage.id
                                const riskInfo = riskOptions.find((r) => r.value === risk)

                                return (
                                    <div key={triage.id} className="border border-gray-200 rounded-2xl px-5 py-4">
                                        <button
                                            type="button"
                                            aria-expanded={isExpanded}
                                            onClick={() => setExpandedTriage(isExpanded ? null : triage.id)}
                                            className="w-full flex items-center justify-between gap-4 text-left"
                                        >
                                            <p className="font-outfit text-sm font-semibold text-black">{triage.patientName}</p>
                                            {riskInfo ? (
                                                <span className={`text-xs font-medium text-white px-2 py-1 rounded-md ${riskInfo.color}`}>
                                                    {riskInfo.label}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-gray-400">Não avaliado</span>
                                            )}
                                        </button>

                                        {isExpanded && (
                                            <div className="mt-3 pt-3 border-t border-gray-100 space-y-3">
                                                <div className="space-y-2">
                                                    {triage.answers.map((answer) => (
                                                        <div key={answer.id}>
                                                            <p className="text-xs text-gray-500">{answer.questionText}</p>
                                                            <p className="text-sm text-gray-800">{answer.valueResult}</p>
                                                        </div>
                                                    ))}
                                                </div>

                                                <div className="flex gap-2">
                                                    {riskOptions.map((option) => (
                                                        <button
                                                            type="button"
                                                            key={option.value}
                                                            onClick={() => handleTriageRisk(triage.id, option.value)}
                                                            className={`flex-1 py-1.5 rounded-lg text-xs font-medium text-white transition ${option.color} ${
                                                                risk === option.value ? 'ring-2 ring-offset-1 ring-[#5271ff]' : 'opacity-80 hover:opacity-100'
                                                            }`}
                                                        >
                                                            {option.label}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            </main>
        </LayoutPainel>
    )
}
