import { apiRequest } from './client'
import { montarQuery } from './pagina'
import type { PageResponseDTO } from './pagina'
import type { CrmCrpType } from './auth'
import type { AnswerResponseDTO } from './triage'

// Rotas /admin do backend (só ROLE_ADMIN: 403 para os outros). A auditoria do admin está em auditoria.ts.
// Aqui o dependente aparece SEMPRE só pelo apelido (decisão 15 do backend): o nome real é do psicólogo.

/** plad.dto.DependentNicknameDTO */
export interface DependentNicknameDTO {
    nickname: string
}

/** plad.dto.AdminTriageReadResponseDTO. Sem nome real e sem e-mail */
export interface AdminTriageReadResponseDTO {
    id: number
    dependent_id: number
    dependent: DependentNicknameDTO
    created_at: string // Instant em ISO-8601 (UTC): o envio inicial
    answers: AnswerResponseDTO[]
}

/** plad.dto.AdminPsychologistResponseDTO. Sem e-mail e sem nada de dependente (decisão 32 do backend) */
export interface AdminPsychologistResponseDTO {
    id: number
    real_name: string
    credential_type: CrmCrpType
    crm_crp_number: string
    is_validated: boolean // hoje sempre false: nada no backend valida o número ainda (RF011)
    created_at: string // Instant em ISO-8601 (UTC): o cadastro
}

/**
 * GET /admin/triages?page=&size= → 200: mais recente primeiro; size de 1 a 100 (padrão 20), page a partir de 0
 * | 400 | 403. CADA TRIAGEM DEVOLVIDA É AUDITADA (TRIAGE_VIEWED, papel admin): quem chama decide quando pedir a página.
 */
export function listAdminTriages(page: number, size: number) {
    return apiRequest<PageResponseDTO<AdminTriageReadResponseDTO>>('GET', `/admin/triages${montarQuery({ page, size })}`)
}

/**
 * GET /admin/triages/{id} → 200 | 403 | 404 TRIAGE_NOT_FOUND. Grava uma entrada de auditoria a cada leitura.
 * A Gestão NÃO a usa: a lista já traz as respostas, e chamá-la depois gravaria uma segunda entrada para a mesma triagem sem
 * revelar nada novo (ver ListaDeTriagens). Serve a quem precisar abrir uma triagem sem listar.
 */
export function getAdminTriage(id: number) {
    return apiRequest<AdminTriageReadResponseDTO>('GET', `/admin/triages/${id}`)
}

/**
 * GET /admin/psychologists?page=&size= → 200: cadastro mais recente primeiro; size de 1 a 100 (padrão 20) | 400 | 403.
 * Não grava auditoria (nome e número do conselho não são dado de saúde).
 */
export function listAdminPsychologists(page: number, size: number) {
    return apiRequest<PageResponseDTO<AdminPsychologistResponseDTO>>('GET', `/admin/psychologists${montarQuery({ page, size })}`)
}
