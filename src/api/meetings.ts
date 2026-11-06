import { apiRequest } from './client'

// Rotas /meetings do backend (MeetingController, RF012). Todas exigem o access token; quem é o dono vem sempre do token.
// Criar, editar, cancelar e encerrar são só do psicólogo (403 para os outros); ler o calendário é de qualquer papel.

/** meetings.status: agendada, cancelada pelo anfitrião ou encerrada por ele */
export type MeetingStatus = 'scheduled' | 'cancelled' | 'ended'

/** plad.dto.MeetingRequestDTO: o mesmo corpo vale para criar (POST) e editar (PUT) */
export interface MeetingRequestDTO {
    title: string // obrigatório, até 120 caracteres
    description: string | null // opcional, até 2000 caracteres
    starts_at: string // Instant em ISO-8601; ao criar, pelo menos 60 minutos a partir de agora
    ends_at: string // Instant em ISO-8601; de 15 a 180 minutos depois do início
    capacity: number // de 2 a 30
}

/** plad.dto.MeetingResponseDTO. Nunca traz e-mail */
export interface MeetingResponseDTO {
    id: number
    title: string
    description: string | null
    starts_at: string // Instant em ISO-8601 (UTC)
    ends_at: string
    capacity: number
    status: MeetingStatus
    host: string // nome do psicólogo que criou a reunião
    owned_by_me: boolean // true quando quem chama é o anfitrião (só ele edita, cancela e encerra)
}

/**
 * GET /meetings?from=&to= → 200: reuniões que COMEÇAM em [from, to), por início, canceladas e encerradas incluídas
 * | 400 (janela com mais de 62 dias, ou `to` não depois de `from`)
 */
export function listMeetings(from: string, to: string) {
    return apiRequest<MeetingResponseDTO[]>('GET', `/meetings?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
}

/** GET /meetings/{id} → 200 | 404 MEETING_NOT_FOUND */
export function getMeeting(id: number) {
    return apiRequest<MeetingResponseDTO>('GET', `/meetings/${id}`)
}

/**
 * POST /meetings → 201 (psicólogo) | 400 VALIDATION_ERROR ou INVALID_MEETING (os dois com `errors` por campo)
 * | 403 (não é psicólogo) | 409 MEETING_CONFLICT (cruza outra reunião agendada sua)
 */
export function createMeeting(data: MeetingRequestDTO) {
    return apiRequest<MeetingResponseDTO>('POST', '/meetings', data)
}

/**
 * PUT /meetings/{id} → 200 | 400 | 403 (não é o anfitrião) | 404 | 409 MEETING_CONFLICT
 * (já começou, já foi cancelada ou encerrada, ou cruza outra reunião sua)
 */
export function updateMeeting(id: number, data: MeetingRequestDTO) {
    return apiRequest<MeetingResponseDTO>('PUT', `/meetings/${id}`, data)
}

/** POST /meetings/{id}/cancel → 200 | 403 | 404 | 409 MEETING_CONFLICT (não está agendada, ou já terminou) */
export function cancelMeeting(id: number) {
    return apiRequest<MeetingResponseDTO>('POST', `/meetings/${id}/cancel`)
}

/** POST /meetings/{id}/end → 200 | 403 | 404 | 409 MEETING_CONFLICT (não está agendada, ou ainda não começou) */
export function endMeeting(id: number) {
    return apiRequest<MeetingResponseDTO>('POST', `/meetings/${id}/end`)
}
