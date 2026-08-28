import React, { useState } from 'react'

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

    return (
        <div className="min-h-screen bg-white text-gray-900 font-sans">
            {/* Topo */}
            <header className="border-b border-indigo-100 px-6 py-4 flex items-center justify-between">
                <span className="font-bold tracking-wider text-black text-xl uppercase">
                    PLAD
                </span>
                <span className="text-sm text-gray-500">Painel do administrador</span>
            </header>

            <main className="max-w-3xl mx-auto px-4 py-8">
                {/* Stat cards */}
                <div className="grid grid-cols-2 gap-3 mb-8">
                    <div className="border border-indigo-200 rounded-lg px-4 py-3">
                        <p className="text-xs text-gray-500">Psicólogos pendentes</p>
                        <p className="text-2xl font-bold text-indigo-600">{pendingPsychCount}</p>
                    </div>
                    <div className="border border-indigo-200 rounded-lg px-4 py-3">
                        <p className="text-xs text-gray-500">Triagens pendentes</p>
                        <p className="text-2xl font-bold text-indigo-600">{pendingTriageCount}</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 mb-6 border-b border-gray-200">
                    <button
                        onClick={() => setTab('psychologists')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                            tab === 'psychologists'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
                    >
                        Aprovação de psicólogos
                    </button>
                    <button
                        onClick={() => setTab('triages')}
                        className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                            tab === 'triages'
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                        }`}
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
                                    className="border border-indigo-200 rounded-lg px-4 py-3 flex items-center justify-between gap-4"
                                >
                                    <div>
                                        <p className="text-sm font-semibold text-black">{psychologist.name}</p>
                                        <p className="text-xs text-gray-500">
                                            {psychologist.graduate} · {psychologist.credentialType} {psychologist.crmCrpNumber}
                                        </p>
                                    </div>

                                    {status === 'PENDING' ? (
                                        <div className="flex gap-2 shrink-0">
                                            <button
                                                onClick={() => handlePsychDecision(psychologist.id, 'APPROVED')}
                                                className="px-3 py-1.5 rounded-md text-xs font-medium text-white bg-indigo-500 hover:bg-indigo-600 transition-colors"
                                            >
                                                Aprovar
                                            </button>
                                            <button
                                                onClick={() => handlePsychDecision(psychologist.id, 'REJECTED')}
                                                className="px-3 py-1.5 rounded-md text-xs font-medium text-gray-700 border border-gray-300 hover:bg-gray-50 transition-colors"
                                            >
                                                Rejeitar
                                            </button>
                                        </div>
                                    ) : (
                                        <span
                                            className={`text-xs font-semibold shrink-0 ${
                                                status === 'APPROVED' ? 'text-indigo-600' : 'text-gray-400'
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
                                <div key={triage.id} className="border border-indigo-200 rounded-lg px-4 py-3">
                                    <button
                                        onClick={() => setExpandedTriage(isExpanded ? null : triage.id)}
                                        className="w-full flex items-center justify-between gap-4 text-left"
                                    >
                                        <p className="text-sm font-semibold text-black">{triage.patientName}</p>
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
                                                        key={option.value}
                                                        onClick={() => handleTriageRisk(triage.id, option.value)}
                                                        className={`flex-1 py-1.5 rounded-md text-xs font-medium text-white transition ${option.color} ${
                                                            risk === option.value ? 'ring-2 ring-offset-1 ring-indigo-500' : 'opacity-80 hover:opacity-100'
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
            </main>
        </div>
    )
}