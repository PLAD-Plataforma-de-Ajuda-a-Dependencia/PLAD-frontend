import React, { useState } from 'react'

/**
 * Página de Triagem — PLAD
 *
 * Página única que muda de conteúdo conforme o usuário avança nas perguntas
 * (mesmo padrão do print do Figma: contador "Pergunta X de N", botão
 * "Anterior", pergunta em destaque, opções em formato de pílula e botão
 * "Próximo" fixo no rodapé).
 *
 * Modelagem alinhada ao backend:
 * - QuestionTriage: { id, questionText }
 * - ResultQuestionTriage: { triageId, questionId, valueResult }
 *
 * As perguntas abaixo usam o texto real enviado (documento de triagem).
 * O "id" de cada pergunta deve corresponder ao id de QuestionTriage no banco;
 * ajuste os valores quando as perguntas forem cadastradas de fato.
 */

type QuestionType = 'single' | 'text'

interface Question {
    id: number
    text: string
    type: QuestionType
    options?: string[]
    optional?: boolean
}

const QUESTIONS: Question[] = [
    {
        id: 1,
        type: 'single',
        text: 'Qual é a sua faixa etária?',
        options: ['Menos de 18 anos', '18 a 24 anos', '25 a 39 anos', '40 a 59 anos', '60 anos ou mais'],
    },
    {
        id: 2,
        type: 'single',
        text: 'O que te trouxe até aqui hoje?',
        options: [
            'Quero diminuir ou parar de usar uma substância',
            'Estou preocupado(a) com a quantidade ou frequência do meu uso',
            'Tive uma recaída recentemente',
            'Não estou me sentindo bem, física ou emocionalmente, por causa do uso',
            'O uso tem afetado minha vida pessoal, familiar, profissional ou acadêmica',
            'Quero conversar com alguém sem me sentir julgado(a)',
            'Outro motivo',
        ],
    },
    {
        id: 3,
        type: 'single',
        text: 'Nos últimos 30 dias, com que frequência você usou a substância que mais te preocupa?',
        options: [
            'Nenhuma vez',
            'Uma ou duas vezes',
            'Algumas vezes no mês',
            'Algumas vezes por semana',
            'Quase todos os dias ou todos os dias',
        ],
    },
    {
        id: 4,
        type: 'single',
        text: 'Você sente que, quando quer parar ou diminuir, é difícil controlar essa vontade?',
        options: ['Sim, é bem difícil', 'Às vezes', 'Não, consigo controlar quando quero', 'Prefiro não responder agora'],
    },
    {
        id: 5,
        type: 'single',
        text: 'Existe alguém — família, amigos ou algum profissional — com quem você possa contar nesse momento?',
        options: [
            'Sim, e sinto que me apoiam',
            'Tenho alguém, mas não sei se me apoiaria nisso',
            'No momento não tenho com quem contar',
            'Prefiro não dizer',
        ],
    },
    {
        id: 6,
        type: 'single',
        text: 'Você já procurou algum tipo de tratamento ou apoio antes?',
        options: [
            'Nunca',
            'Sim, grupo de apoio',
            'Sim, psicólogo(a) ou outro profissional',
            'Sim, CAPS ou CAPS AD',
            'Sim, internação ou clínica especializada',
            'Outro',
        ],
    },
    {
        id: 7,
        type: 'single',
        text: 'Você já teve alguma experiência com atendimento em grupo (roda de conversa, grupo terapêutico etc.)?',
        options: ['Sim, foi uma boa experiência', 'Sim, mas não me senti à vontade', 'Não, nunca participei', 'Não sei bem o que é'],
    },
    {
        id: 8,
        type: 'single',
        text: 'Pensando em começar agora, qual formato te deixaria mais confortável?',
        options: ['Atendimento individual', 'Atendimento em grupo', 'Tenho interesse nos dois', 'Ainda não sei — gostaria de uma indicação profissional'],
    },
    {
        id: 9,
        type: 'single',
        text: 'Qual desses estilos de acompanhamento parece mais com o que você procura?',
        options: ['Conversas mais livres, no meu ritmo', 'Encontros mais estruturados, com atividades e metas definidas', 'Não sei — prefiro que a equipe me oriente'],
    },
    {
        id: 13,
        type: 'text',
        optional: true,
        text: 'Tem algo que você gostaria que a equipe soubesse antes de começar, para você se sentir mais respeitado(a) e à vontade?',
    },
]

// Resultado de cada pergunta, no formato que vira um ResultQuestionTriage
interface Answer {
    questionId: number
    valueResult: string | null
}

interface TriagemProps {
    triageId?: number
    onComplete?: (answers: Answer[]) => void
}

export default function Triagem({ triageId, onComplete }: TriagemProps) {
    const [currentIndex, setCurrentIndex] = useState(0)
    const [answers, setAnswers] = useState<Record<number, string | null>>({})

    const question = QUESTIONS[currentIndex]
    const total = QUESTIONS.length
    const isLast = currentIndex === total - 1
    const currentValue = answers[question.id] ?? null

    const selectOption = (option: string) => {
        setAnswers((prev) => ({ ...prev, [question.id]: option }))
    }

    const setTextValue = (value: string) => {
        setAnswers((prev) => ({ ...prev, [question.id]: value }))
    }

    const goBack = () => {
        if (currentIndex > 0) setCurrentIndex((i) => i - 1)
    }

    const goNext = () => {
        if (isLast) {
            const result: Answer[] = QUESTIONS.map((q) => ({
                questionId: q.id,
                valueResult: answers[q.id] ?? null,
            }))
            // TODO: enviar `result` (+ triageId) para o backend,
            // criando um ResultQuestionTriage por pergunta.
            console.log('Triagem finalizada', { triageId, result })
            onComplete?.(result)
            return
        }
        setCurrentIndex((i) => i + 1)
    }

    const skip = () => {
        setAnswers((prev) => ({ ...prev, [question.id]: null }))
        goNext()
    }

    return (
        <div className="min-h-screen flex flex-col bg-white text-gray-900 font-sans">
            {/* Topo - Nome da aplicação */}
            <header className="text-center pt-8 pb-4">
                <span className="font-bold tracking-wider text-black text-3xl uppercase">PLAD</span>
            </header>

            {/* Conteúdo da pergunta atual */}
            <main className="w-full max-w-sm mx-auto flex-1 flex flex-col px-4">
                <div className="flex items-center justify-between mb-6">
                    <button
                        type="button"
                        onClick={goBack}
                        disabled={currentIndex === 0}
                        className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-0 disabled:pointer-events-none transition"
                    >
                        <span aria-hidden>←</span> Anterior
                    </button>
                    <span className="text-xs text-gray-500">
                        Pergunta {String(currentIndex + 1).padStart(2, '0')} de {String(total).padStart(2, '0')}
                    </span>
                </div>

                <h1 className="text-2xl font-extrabold text-black mb-6 leading-snug">{question.text}</h1>

                {question.type === 'single' && (
                    <div className="space-y-2.5">
                        {question.options!.map((option) => {
                            const selected = currentValue === option
                            return (
                                <button
                                    key={option}
                                    type="button"
                                    onClick={() => selectOption(option)}
                                    className={`w-full flex items-center gap-3 text-left px-4 py-3 rounded-full border transition ${
                                        selected
                                            ? 'bg-indigo-50 border-indigo-500'
                                            : 'bg-gray-100 border-transparent hover:bg-gray-200'
                                    }`}
                                >
                                    <span
                                        className={`flex items-center justify-center w-4 h-4 rounded-full border shrink-0 ${
                                            selected ? 'bg-indigo-500 border-indigo-500' : 'bg-white border-gray-300'
                                        }`}
                                    >
                                        {selected && (
                                            <svg viewBox="0 0 16 16" className="w-2.5 h-2.5 fill-white">
                                                <path d="M6.2 10.6 3.6 8l-1 1 3.6 3.6 7-7-1-1z" />
                                            </svg>
                                        )}
                                    </span>
                                    <span className="text-sm text-gray-800">{option}</span>
                                </button>
                            )
                        })}
                    </div>
                )}

                {question.type === 'text' && (
                    <textarea
                        value={currentValue ?? ''}
                        onChange={(e) => setTextValue(e.target.value)}
                        placeholder="Campo opcional — escreva à vontade"
                        rows={5}
                        className="w-full px-3.5 py-2.5 border border-indigo-300 rounded-md text-sm text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition bg-white resize-none"
                    />
                )}

                {question.optional && (
                    <p className="text-xs text-gray-500 mt-3">Esta pergunta é opcional.</p>
                )}

                <button
                    type="button"
                    onClick={skip}
                    className="mt-4 text-xs text-indigo-600 hover:underline self-start font-medium"
                >
                    Pular esta pergunta
                </button>
            </main>

            {/* Botão de avançar, fixo no rodapé */}
            <footer className="w-full max-w-xs mx-auto pb-6 pt-4 px-4">
                <button
                    type="button"
                    onClick={goNext}
                    className="w-full py-3 px-6 bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white font-medium rounded-lg transition-colors text-sm"
                >
                    {isLast ? 'Concluir' : 'Próximo'}
                </button>
            </footer>
        </div>
    )
}
