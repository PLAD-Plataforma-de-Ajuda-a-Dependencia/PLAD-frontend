import { ApiError, apiRequest } from './client'

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
    registered_count: number // quantos dependentes estão inscritos; todo papel vê só este número
    registered_by_me: boolean // true quando quem chama é um dependente inscrito; sempre false para psicólogo e admin
}

/**
 * plad.dto.MeetingParticipantResponseDTO: um inscrito, como o anfitrião o vê. É o único lugar da interface com o NOME REAL de
 * um dependente (decisão 26 do backend): mostrar só na lista do anfitrião e nunca guardar fora do estado da tela.
 */
export interface MeetingParticipantDTO {
    identity: string // identidade opaca desta pessoa NESTA reunião (a mesma da sala ao vivo); é o que speak e remove pedem
    nickname: string
    real_name: string
    registered_at: string // Instant em ISO-8601 (UTC)
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

/** A sala abre 10 minutos antes do início (MeetingRules.JOIN_LEAD_TIME do backend) e fecha no fim da reunião */
export const ANTECEDENCIA_DA_SALA_MS = 10 * 60 * 1000

/** Instante (ms) em que a sala abre */
export function aberturaDaSala(m: Pick<MeetingResponseDTO, 'starts_at'>): number {
    return Date.parse(m.starts_at) - ANTECEDENCIA_DA_SALA_MS
}

/**
 * "Entrar" aparece só para o anfitrião e para o dependente inscrito, com a reunião agendada, de 10 min antes do início
 * até o fim (início inclusivo, fim exclusivo, como MeetingRules#joinWindowOpen). O status NÃO vira sozinho depois do
 * fim (não há tarefa que encerre), por isso se compara com `ends_at` e não só com `status`. O relógio do servidor
 * decide de verdade: todo POST /join ainda trata o 409 MEETING_NOT_OPEN.
 */
export function podeEntrar(
    m: Pick<MeetingResponseDTO, 'status' | 'starts_at' | 'ends_at' | 'owned_by_me' | 'registered_by_me'>,
    agora: number,
): boolean {
    return (
        (m.owned_by_me || m.registered_by_me) &&
        m.status === 'scheduled' &&
        agora >= aberturaDaSala(m) &&
        agora < Date.parse(m.ends_at)
    )
}

/** Vagas que sobram (nunca negativo: o backend não deixa passar da capacidade, mas a tela pode estar desatualizada) */
export function vagasRestantes(capacidade: number, inscritos: number): number {
    return Math.max(0, capacidade - inscritos)
}

export function textoDeVagas(restantes: number): string {
    if (restantes === 0) return 'Lotada'
    return restantes === 1 ? '1 vaga restante' : `${restantes} vagas restantes`
}

/** Mensagem pt-BR para uma falha ao se inscrever ou cancelar a inscrição (o 409 de estado fala da inscrição, não do horário do anfitrião) */
export function mensagemDeInscricao(erro: unknown): string {
    if (erro instanceof ApiError) {
        return erro.code === 'MEETING_CONFLICT'
            ? 'A inscrição não pode mais ser alterada: a reunião já começou, terminou ou foi cancelada.'
            : erro.message
    }
    return 'Algo deu errado. Tente novamente em instantes.'
}

/**
 * POST /meetings/{id}/registration → 200 com a reunião atualizada (só dependente; a triagem não é exigida). Inscrever de novo
 * também dá 200, mesmo com a reunião cheia | 403 (não é dependente) | 404 | 409 MEETING_FULL (sem vaga) ou MEETING_CONFLICT
 * (não está agendada, ou já começou)
 */
export function registerForMeeting(id: number) {
    return apiRequest<MeetingResponseDTO>('POST', `/meetings/${id}/registration`)
}

/** DELETE /meetings/{id}/registration → 204, também para quem não estava inscrito | 403 | 404 | 409 MEETING_CONFLICT (já começou) */
export function cancelRegistration(id: number) {
    return apiRequest<null>('DELETE', `/meetings/${id}/registration`)
}

/**
 * GET /meetings/{id}/participants → 200 (só o psicólogo dono da reunião, em qualquer estado dela) | 403 | 404.
 * CADA CHAMADA É AUDITADA: o backend grava uma entrada por inscrito listado e o dependente a vê no log de acessos dele.
 * Por isso só chamar quando a pessoa pedir a lista, nunca ao abrir a reunião nem em efeito de carregamento.
 */
export function listParticipants(id: number) {
    return apiRequest<MeetingParticipantDTO[]>('GET', `/meetings/${id}/participants`)
}
