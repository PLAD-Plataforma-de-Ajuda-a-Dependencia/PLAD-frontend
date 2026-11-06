import { apiRequest } from './client'

// Espelham os records de plad.dto e os enums de plad.entity do backend (JSON em snake_case).

/** Mesmo limite de TriageService.MAX_FREE_TEXT_LENGTH */
export const FREE_TEXT_MAX_LENGTH = 1000

/** plad.entity.QuestionType */
export type QuestionType = 'single_choice' | 'multi_choice' | 'free_text'

/** plad.dto.OptionDTO */
export interface OptionDTO {
    code: string
    label: string
}

/** plad.dto.QuestionResponseDTO */
export interface QuestionResponseDTO {
    id: number
    code: string // estável entre ambientes, ao contrário do id
    question_text: string
    question_type: QuestionType
    options: OptionDTO[] // vazio em free_text
    display_order: number
    required: boolean // hoje false em todas: toda pergunta é opcional
}

/** plad.dto.AnswerRequestDTO: vale question_id ou question_code (se vierem os dois, têm de ser da mesma pergunta) */
export interface AnswerRequestDTO {
    question_id?: number
    question_code?: string
    values: string[] // códigos das opções ou [texto] em free_text; nunca vazio
}

/** plad.dto.TriageRequestDTO */
export interface TriageRequestDTO {
    answers: AnswerRequestDTO[]
}

/** plad.dto.AnswerResponseDTO */
export interface AnswerResponseDTO {
    question_id: number
    question_code: string
    question_text: string
    values: string[]
}

/** plad.dto.TriageResponseDTO */
export interface TriageResponseDTO {
    id: number
    created_at: string // Instant em ISO-8601
    answers: AnswerResponseDTO[]
}

/** GET /triage/questions → perguntas ordenadas por display_order */
export function getQuestions() {
    return apiRequest<QuestionResponseDTO[]>('GET', '/triage/questions')
}

/**
 * POST /triage → 201 com a triagem | 204 sem corpo (nenhuma pergunta respondida: nada é guardado e o dependente
 * ainda pode enviar depois, daí o null) | 400 INVALID_TRIAGE | 403 | 409 TRIAGE_ALREADY_EXISTS
 */
export function submitTriage(data: TriageRequestDTO) {
    return apiRequest<TriageResponseDTO | null>('POST', '/triage', data)
}

/** PUT /triage → 200 respostas substituídas | 400 INVALID_TRIAGE (inclui nenhuma resposta) | 403 | 404 TRIAGE_NOT_FOUND */
export function resubmitTriage(data: TriageRequestDTO) {
    return apiRequest<TriageResponseDTO>('PUT', '/triage', data)
}
