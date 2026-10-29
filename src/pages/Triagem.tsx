import { useEffect, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ApiError, getErrorMessage } from '../api/client'
import { FREE_TEXT_MAX_LENGTH, getQuestions, resubmitTriage, submitTriage } from '../api/triage'
import type { QuestionResponseDTO, TriageRequestDTO } from '../api/triage'

/**
 * Página de Triagem — PLAD
 *
 * Página única que muda de conteúdo conforme o usuário avança nas perguntas
 * (mesmo padrão do print do Figma: contador "Pergunta X de N", botão
 * "Anterior", pergunta em destaque, opções em formato de pílula e botão
 * "Próximo" fixo no rodapé).
 *
 * As perguntas vêm de GET /triage/questions e as respostas vão para
 * POST /triage com os `code`s das opções. Pergunta pulada não é enviada.
 */

// Valores respondidos por id de pergunta: códigos das opções ou [texto]
type Answers = Record<number, string[]>

function buildRequest(questions: QuestionResponseDTO[], answers: Answers): TriageRequestDTO {
    return {
        answers: questions
            .map((q) => {
                const values = answers[q.id] ?? []
                return {
                    question_id: q.id,
                    values: q.question_type === 'free_text' ? values.map((v) => v.trim()).filter((v) => v !== '') : values,
                }
            })
            .filter((answer) => answer.values.length > 0),
    }
}

// Topo e rodapé comuns a todos os estados da página
function TriagemLayout({ children, footer }: { children: ReactNode; footer?: ReactNode }) {
    return (
        <div className="min-h-screen flex flex-col bg-white text-gray-900 font-sans">
            {/* Topo - Nome da aplicação */}
            <header className="text-center pt-8 pb-4">
                <span className="font-bold tracking-wider text-black text-3xl uppercase">PLAD</span>
            </header>

            <main className="w-full max-w-sm mx-auto flex-1 flex flex-col px-4">{children}</main>

            {/* Botões fixos no rodapé */}
            {footer && <footer className="w-full max-w-xs mx-auto pb-6 pt-4 px-4">{footer}</footer>}
        </div>
    )
}

const primaryButtonClass =
    'w-full py-3 px-6 bg-indigo-500 hover:bg-indigo-600 active:bg-indigo-700 text-white font-medium rounded-lg transition-colors text-sm disabled:opacity-60 disabled:cursor-not-allowed'

export default function Triagem() {
    const [questions, setQuestions] = useState<QuestionResponseDTO[] | null>(null)
    const [loadError, setLoadError] = useState<string | null>(null)
    const [currentIndex, setCurrentIndex] = useState(0)
    const [answers, setAnswers] = useState<Answers>({})
    const [sending, setSending] = useState(false)
    const [error, setError] = useState<string | null>(null)
    // O POST devolveu 409: já existe triagem, e a tela oferece substituí-la via PUT
    const [alreadySubmitted, setAlreadySubmitted] = useState(false)
    const [result, setResult] = useState<'submitted' | 'resubmitted' | null>(null)

    useEffect(() => {
        // Sem token, o client já manda para o login
        let ignore = false
        getQuestions()
            .then((data) => {
                if (!ignore) setQuestions(data)
            })
            .catch((err: unknown) => {
                if (!ignore) setLoadError(getErrorMessage(err, 'Não foi possível carregar as perguntas.'))
            })
        return () => {
            ignore = true
        }
    }, [])

    if (loadError) {
        return (
            <TriagemLayout>
                <p role="alert" className="text-sm text-red-600">{loadError}</p>
            </TriagemLayout>
        )
    }

    if (!questions) {
        return (
            <TriagemLayout>
                <p className="text-sm text-gray-500">Carregando perguntas…</p>
            </TriagemLayout>
        )
    }

    const send = async (resubmit: boolean, currentAnswers: Answers = answers) => {
        if (sending) return
        setSending(true)
        setError(null)
        try {
            const request = buildRequest(questions, currentAnswers)
            if (resubmit) {
                await resubmitTriage(request)
            } else {
                await submitTriage(request)
            }
            setResult(resubmit ? 'resubmitted' : 'submitted')
        } catch (err) {
            if (!resubmit && err instanceof ApiError && err.status === 409) {
                setAlreadySubmitted(true)
            } else {
                setError(getErrorMessage(err, 'Não foi possível enviar a triagem.'))
            }
        } finally {
            setSending(false)
        }
    }

    if (result) {
        return (
            <TriagemLayout>
                <h1 className="text-2xl font-extrabold text-black mb-4 leading-snug">
                    {result === 'submitted' ? 'Triagem enviada!' : 'Respostas atualizadas!'}
                </h1>
                <p className="text-sm text-gray-600">Obrigado por responder. Suas respostas foram registradas.</p>
                <Link to="/Calendario" className="mt-6 text-xs text-indigo-600 hover:underline self-start font-medium">
                    Prosseguir
                </Link>
            </TriagemLayout>
        )
    }

    if (alreadySubmitted) {
        return (
            <TriagemLayout
                footer={
                    <>
                        {error && (
                            <p role="alert" className="mb-3 text-sm text-red-600 text-center">
                                {error}
                            </p>
                        )}
                        <button type="button" onClick={() => send(true)} disabled={sending} className={primaryButtonClass}>
                            {sending ? 'Enviando…' : 'Substituir respostas anteriores'}
                        </button>
                    </>
                }
            >
                <h1 className="text-2xl font-extrabold text-black mb-4 leading-snug">Você já enviou sua triagem.</h1>
                <p className="text-sm text-gray-600">
                    Se quiser, substitua as respostas anteriores pelas que você acabou de preencher.
                </p>
                <Link to="/" className="mt-6 text-xs text-indigo-600 hover:underline self-start font-medium">
                    Voltar ao início
                </Link>
            </TriagemLayout>
        )
    }

    if (questions.length === 0) {
        return (
            <TriagemLayout>
                <p className="text-sm text-gray-500">Nenhuma pergunta disponível no momento.</p>
            </TriagemLayout>
        )
    }

    const question = questions[currentIndex]
    const total = questions.length
    const isLast = currentIndex === total - 1
    const isMulti = question.question_type === 'multi_choice'
    const currentValues = answers[question.id] ?? []

    const selectOption = (code: string) => {
        setAnswers((prev) => {
            if (!isMulti) return { ...prev, [question.id]: [code] }
            const values = prev[question.id] ?? []
            return {
                ...prev,
                [question.id]: values.includes(code) ? values.filter((v) => v !== code) : [...values, code],
            }
        })
    }

    const setTextValue = (value: string) => {
        setAnswers((prev) => ({ ...prev, [question.id]: [value] }))
    }

    const goBack = () => {
        if (currentIndex > 0) setCurrentIndex((i) => i - 1)
    }

    const goNext = () => {
        if (isLast) {
            send(false)
            return
        }
        setCurrentIndex((i) => i + 1)
    }

    const skip = () => {
        const next = { ...answers, [question.id]: [] }
        setAnswers(next)
        if (isLast) {
            // envia o valor já limpo, porque o state só atualiza no próximo render
            send(false, next)
            return
        }
        setCurrentIndex((i) => i + 1)
    }

    return (
        <TriagemLayout
            footer={
                <>
                    {error && (
                        <p role="alert" className="mb-3 text-sm text-red-600 text-center">
                            {error}
                        </p>
                    )}
                    <button type="button" onClick={goNext} disabled={sending} className={primaryButtonClass}>
                        {isLast ? (sending ? 'Enviando…' : 'Concluir') : 'Próximo'}
                    </button>
                </>
            }
        >
            {/* Conteúdo da pergunta atual */}
            <div className="flex items-center justify-between mb-6">
                <button
                    type="button"
                    onClick={goBack}
                    disabled={currentIndex === 0 || sending}
                    className="flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900 disabled:opacity-0 disabled:pointer-events-none transition"
                >
                    <span aria-hidden>←</span> Anterior
                </button>
                <span className="text-xs text-gray-500">
                    Pergunta {String(currentIndex + 1).padStart(2, '0')} de {String(total).padStart(2, '0')}
                </span>
            </div>

            <h1 className="text-2xl font-extrabold text-black mb-6 leading-snug">{question.question_text}</h1>

            {question.question_type !== 'free_text' && (
                <div className="space-y-2.5">
                    {question.options.map((option) => {
                        const selected = currentValues.includes(option.code)
                        return (
                            <button
                                key={option.code}
                                type="button"
                                aria-pressed={selected}
                                onClick={() => selectOption(option.code)}
                                className={`w-full flex items-center gap-3 text-left px-4 py-3 rounded-full border transition ${
                                    selected
                                        ? 'bg-indigo-50 border-indigo-500'
                                        : 'bg-gray-100 border-transparent hover:bg-gray-200'
                                }`}
                            >
                                {/* Quadrado na múltipla escolha, círculo na escolha única */}
                                <span
                                    className={`flex items-center justify-center w-4 h-4 border shrink-0 ${
                                        isMulti ? 'rounded-sm' : 'rounded-full'
                                    } ${selected ? 'bg-indigo-500 border-indigo-500' : 'bg-white border-gray-300'}`}
                                >
                                    {selected && (
                                        <svg viewBox="0 0 16 16" className="w-2.5 h-2.5 fill-white">
                                            <path d="M6.2 10.6 3.6 8l-1 1 3.6 3.6 7-7-1-1z" />
                                        </svg>
                                    )}
                                </span>
                                <span className="text-sm text-gray-800">{option.label}</span>
                            </button>
                        )
                    })}
                </div>
            )}

            {isMulti && <p className="text-xs text-gray-500 mt-3">Você pode marcar mais de uma opção.</p>}

            {question.question_type === 'free_text' && (
                <>
                    <textarea
                        value={currentValues[0] ?? ''}
                        onChange={(e) => setTextValue(e.target.value)}
                        placeholder="Campo opcional — escreva à vontade"
                        rows={5}
                        maxLength={FREE_TEXT_MAX_LENGTH}
                        className="w-full px-3.5 py-2.5 border border-indigo-300 rounded-md text-sm text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition bg-white resize-none"
                    />
                    <p className="text-xs text-gray-500 mt-3">Esta pergunta é opcional.</p>
                </>
            )}

            <button
                type="button"
                onClick={skip}
                disabled={sending}
                className="mt-4 text-xs text-indigo-600 hover:underline self-start font-medium"
            >
                Pular esta pergunta
            </button>
        </TriagemLayout>
    )
}
