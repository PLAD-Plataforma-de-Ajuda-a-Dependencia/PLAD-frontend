import { apiRequest } from './client'
import type { CrmCrpType, LoginResponseDTO, Sex, UserType } from './auth'
import type { AnswerResponseDTO } from './triage'

// Rotas /me do backend (MeController). Todas exigem o access token; o usuário vem sempre do token, nunca do corpo.

/**
 * plad.dto.MeResponseDTO. O backend manda sempre todas as chaves: as que não se aplicam ao tipo da conta vêm null
 * (has_triage e nickname só no dependente; real_name, credential_type, crm_crp_number e is_validated só no psicólogo).
 */
export interface MeResponseDTO {
    id: number
    email: string
    type_user: UserType
    created_at: string // Instant em ISO-8601
    has_triage: boolean | null
    nickname: string | null
    real_name: string | null
    credential_type: CrmCrpType | null
    crm_crp_number: string | null
    is_validated: boolean | null
    // true enquanto os Termos e a Política em vigor não foram aceitos (POST /me/consents); vale para todos os tipos
    consent_pending: boolean
}

/** plad.dto.NicknameResponseDTO */
export interface NicknameResponseDTO {
    nickname: string
}

/** plad.dto.ConsentRequestDTO */
export interface ConsentRequestDTO {
    accepted_terms_version: string
    accepted_privacy_version: string
}

/** plad.dto.ChangePasswordRequestDTO */
export interface ChangePasswordRequestDTO {
    current_password: string // até 72 bytes
    new_password: string // mínimo 8 caracteres, até 72 bytes e diferente da atual
}

/** plad.dto.DeleteAccountRequestDTO */
export interface DeleteAccountRequestDTO {
    password: string
}

/** plad.dto.MeExportAccountDTO */
export interface MeExportAccountDTO {
    id: number
    email: string
    type_user: UserType
    birth_date: string // "yyyy-MM-dd"
    gender: Sex
    created_at: string
}

/** plad.dto.MeExportNicknameDTO */
export interface MeExportNicknameDTO {
    nickname: string
    assigned_at: string
    replaced_at: string | null
}

/** plad.dto.MeExportMeetingRegistrationDTO: uma reunião em que o dependente se inscreveu */
export interface MeExportMeetingRegistrationDTO {
    meeting_id: number
    title: string
    starts_at: string
    registered_at: string
}

/** plad.dto.MeExportDependentDTO */
export interface MeExportDependentDTO {
    nickname: string
    created_at: string
    nickname_history: MeExportNicknameDTO[]
    meeting_registrations: MeExportMeetingRegistrationDTO[]
}

/** plad.dto.MeExportPsychologistDTO */
export interface MeExportPsychologistDTO {
    real_name: string
    credential_type: CrmCrpType
    crm_crp_number: string
    graduate: string | null
    is_validated: boolean
    validated_at: string | null
}

/** plad.dto.MeExportConsentDTO */
export interface MeExportConsentDTO {
    document: string
    version: string
    accepted_at: string
    ip: string
}

/** plad.dto.MeExportTriageDTO: `values` são os códigos das opções (ou o texto, em free_text) */
export interface MeExportTriageDTO {
    id: number
    created_at: string
    updated_at: string
    answers: AnswerResponseDTO[]
}

/** plad.dto.MeExportResponseDTO. Os blocos que não se aplicam ao tipo da conta vêm null */
export interface MeExportResponseDTO {
    exported_at: string
    account: MeExportAccountDTO
    dependent: MeExportDependentDTO | null
    psychologist: MeExportPsychologistDTO | null
    consents: MeExportConsentDTO[]
    triage: MeExportTriageDTO | null
}

/** GET /me → 200 | 401 */
export function getMe() {
    return apiRequest<MeResponseDTO>('GET', '/me')
}

/** POST /me/nickname/reroll → 200 | 403 (não é dependente) | 429 RATE_LIMITED (5 por dia) */
export function rerollNickname() {
    return apiRequest<NicknameResponseDTO>('POST', '/me/nickname/reroll')
}

/** POST /me/consents → 204 | 400 CONSENT_REQUIRED (versão diferente da em vigor) */
export function acceptConsents(data: ConsentRequestDTO) {
    return apiRequest<void>('POST', '/me/consents', data)
}

/**
 * PUT /me/password → 200 com um access token novo (e o cookie de refresh novo) | 400 VALIDATION_ERROR ou
 * INVALID_PASSWORD_CHANGE | 401 INVALID_CREDENTIALS (senha atual errada) | 429. Todas as outras sessões caem
 */
export function changePassword(data: ChangePasswordRequestDTO) {
    return apiRequest<LoginResponseDTO>('PUT', '/me/password', data)
}

/** GET /me/export → 200: tudo o que a plataforma guarda sobre o usuário (LGPD art. 18) */
export function exportMyData() {
    return apiRequest<MeExportResponseDTO>('GET', '/me/export')
}

/** DELETE /me → 204 | 401 INVALID_CREDENTIALS (senha errada) | 403 (admin não se exclui) | 429. Não tem volta */
export function deleteMyAccount(data: DeleteAccountRequestDTO) {
    return apiRequest<void>('DELETE', '/me', data)
}
