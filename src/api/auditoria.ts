import { apiRequest } from './client'
import { montarQuery } from './pagina'
import type { PageResponseDTO } from './pagina'

// Trilha de auditoria do backend (audit_log: só INSERT, só ids e rótulos de estado; nunca resposta, nome, e-mail ou texto livre).
// Lida em dois lugares: o admin lê tudo em GET /admin/audit; o dependente lê só o que terceiros leram dele, em GET /me/access-log
// (src/api/me.ts), com o papel de quem leu e nunca quem.

/** plad.entity.AuditAction */
export type AuditAction =
    | 'TRIAGE_SUBMITTED'
    | 'TRIAGE_RESUBMITTED'
    | 'TRIAGE_VIEWED'
    | 'NICKNAME_REROLLED'
    | 'MEETING_PARTICIPANTS_VIEWED'

/** Todas as ações, na ordem do backend; alimenta o filtro da tela de auditoria */
export const ACOES_DE_AUDITORIA: readonly AuditAction[] = [
    'TRIAGE_SUBMITTED',
    'TRIAGE_RESUBMITTED',
    'TRIAGE_VIEWED',
    'NICKNAME_REROLLED',
    'MEETING_PARTICIPANTS_VIEWED',
]

/** plad.dto.AuditLogResponseDTO. O backend manda sempre todas as chaves: as que não se aplicam vêm null */
export interface AuditLogResponseDTO {
    id: number
    occurred_at: string // Instant em ISO-8601 (UTC)
    actor_id: number | null // quem agiu; null em ação do sistema
    action: AuditAction
    subject_user_id: number | null // de quem é o dado
    entity: string | null // tipo do registro (ex.: TRIAGE, MEETING)
    entity_id: number | null
    details: Record<string, unknown> | null // só ids, números, indicadores e rótulos (ex.: actor_role, meeting_id)
}

/** Filtros opcionais de GET /admin/audit; sem nenhum, lista tudo */
export interface FiltroDeAuditoria {
    subject_user_id?: number
    action?: AuditAction
}

/**
 * GET /admin/audit?subject_user_id=&action=&page=&size= → 200: mais recente primeiro; size de 1 a 100 (padrão 20)
 * | 400 (ação desconhecida, page ou size fora do limite) | 403 (não é admin). Ler a auditoria não grava auditoria.
 */
export function listAudit(filtro: FiltroDeAuditoria, page: number, size: number) {
    return apiRequest<PageResponseDTO<AuditLogResponseDTO>>(
        'GET',
        `/admin/audit${montarQuery({ subject_user_id: filtro.subject_user_id, action: filtro.action, page, size })}`,
    )
}
