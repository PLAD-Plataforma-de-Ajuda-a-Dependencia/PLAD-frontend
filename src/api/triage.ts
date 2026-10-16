import { apiRequest } from './client'

// Espelham os records de pladBack.DTO e os enums de pladBack.entity do backend (JSON em snake_case).

/** Mesmo limite de TriageService.MAX_FREE_TEXT_LENGTH */
export const FREE_TEXT_MAX_LENGTH = 1000

/** pladBack.entity.QuestionType */
export type QuestionType = 'single_choice' | 'multi_choice' | 'free_text'

/** pladBack.DTO.OptionDTO */
export interface OptionDTO {
    code: string
    label: string
}

/** pladBack.DTO.QuestionResponseDTO */
export interface QuestionResponseDTO {
    id: number
    question_text: string
    question_type: QuestionType
    options: OptionDTO[] // vazio em free_text
    display_order: number
}

/** pladBack.DTO.AnswerRequestDTO */
export interface AnswerRequestDTO {
    question_id: number
    values: string[] // códigos das opções ou [texto] em free_text; nunca vazio
}

/** pladBack.DTO.TriageRequestDTO */
export interface TriageRequestDTO {
    answers: AnswerRequestDTO[]
}

/** pladBack.DTO.AnswerResponseDTO */
export interface AnswerResponseDTO {
    question_id: number
    question_text: string
    values: string[]
}

/** pladBack.DTO.TriageResponseDTO */
export interface TriageResponseDTO {
    id: number
    created_at: string // Instant em ISO-8601
    answers: AnswerResponseDTO[]
}

/** GET /triage/questions → perguntas ordenadas por display_order */
export function getQuestions() {
    return apiRequest<QuestionResponseDTO[]>('GET', '/triage/questions')
}

/** POST /triage → 201 | 400 | 403 usuário não é dependente | 409 triagem já enviada */
export function submitTriage(data: TriageRequestDTO) {
    return apiRequest<TriageResponseDTO>('POST', '/triage', data)
}

/** PUT /triage → 200 respostas substituídas | 400 | 403 | 404 nenhuma triagem enviada */
export function resubmitTriage(data: TriageRequestDTO) {
    return apiRequest<TriageResponseDTO>('PUT', '/triage', data)
}
