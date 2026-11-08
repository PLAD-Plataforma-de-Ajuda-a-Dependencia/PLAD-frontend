import { apiRequest } from './client'
import { montarQuery } from './pagina'
import type { PageResponseDTO } from './pagina'
import type { AnswerResponseDTO } from './triage'

// Rotas /triages do backend (TriageReadController): a triagem como o PSICÓLOGO a lê. Só ele (403 para dependente e admin).
// O psicólogo é o único papel que vê o NOME REAL do dependente (decisão 15 do backend): mostrar só na tela de triagens e
// nunca guardar fora do estado dela (nada de context, storage ou URL).
//
// CADA TRIAGEM DEVOLVIDA É AUDITADA (TRIAGE_VIEWED), na lista e no detalhe, e o dependente vê a leitura no log de acessos dele.
// Por isso só chamar quando a pessoa pedir (clique), nunca ao abrir a tela nem em efeito de carregamento.

/** plad.dto.DependentIdentityDTO */
export interface DependentIdentityDTO {
    nickname: string
    real_name: string
}

/** plad.dto.TriageReadResponseDTO. Nunca traz e-mail */
export interface TriageReadResponseDTO {
    id: number
    dependent_id: number
    dependent: DependentIdentityDTO
    created_at: string // Instant em ISO-8601 (UTC): o envio inicial
    answers: AnswerResponseDTO[]
}

/**
 * GET /triages?page=&size= → 200: mais recente primeiro; size de 1 a 100 (padrão 20), page a partir de 0
 * | 400 (page ou size fora do limite) | 403 (não é psicólogo). Grava uma entrada de auditoria por triagem da página.
 */
export function listTriages(page: number, size: number) {
    return apiRequest<PageResponseDTO<TriageReadResponseDTO>>('GET', `/triages${montarQuery({ page, size })}`)
}

/**
 * GET /triages/{id} → 200 | 403 | 404 TRIAGE_NOT_FOUND. Grava uma entrada de auditoria a cada leitura.
 * A tela de triagens NÃO a usa: a lista já traz as respostas, e chamá-la depois gravaria uma segunda entrada para a mesma
 * triagem sem revelar nada novo (ver ListaDeTriagens). Serve a quem precisar abrir uma triagem sem listar.
 */
export function getTriage(id: number) {
    return apiRequest<TriageReadResponseDTO>('GET', `/triages/${id}`)
}
