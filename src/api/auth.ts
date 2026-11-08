import { apiRequest } from './client'

// Espelham os records de plad.dto e os enums de plad.entity do backend (../PLAD-backend).
// O JSON é snake_case (spring.jackson.property-naming-strategy=SNAKE_CASE).

/** plad.entity.Sex */
export type Sex = 'masculino' | 'feminino' | 'nao_binario' | 'transexual' | 'outro'

/** plad.entity.UserType */
export type UserType = 'dependente' | 'psicologo' | 'admin'

/** Tipos que se cadastram pela API: o admin nunca (400 INVALID_REGISTRATION), a primeira conta nasce na inicialização do backend */
export type TipoDeCadastro = Exclude<UserType, 'admin'>

/**
 * plad.entity.CrmCrpType. Vale para o que a API DEVOLVE: contas criadas antes da recusa do CRM ainda o têm, e a lista do admin,
 * `GET /me`, o export e o `host` das reuniões continuam mostrando-o. Para o que se ENVIA no cadastro, ver `CredencialDeCadastro`.
 */
export type CrmCrpType = 'CRM' | 'CRP'

/** O que o cadastro de psicólogo aceita: só CRP. CRM dá 400 INVALID_REGISTRATION (decisão 33 do backend) */
export type CredencialDeCadastro = Extract<CrmCrpType, 'CRP'>

/** plad.dto.LoginRequestDTO */
export interface LoginRequestDTO {
    email: string
    password: string
}

/** plad.dto.LoginResponseDTO: o access token (JWT de 15 min) vai no corpo e o refresh token no cookie HttpOnly */
export interface LoginResponseDTO {
    token: string
}

/** plad.dto.RegisterRequestDTO */
export interface RegisterRequestDTO {
    real_name: string
    email: string
    password: string // @Size(min = 8) e no máximo 72 bytes em UTF-8
    birth_date: string // LocalDate, "yyyy-MM-dd"; só maiores de 18 anos
    gender: Sex
    type_user: TipoDeCadastro
    // credential_type e crm_crp_number são exigidos pelo AuthService quando type_user = 'psicologo'; o tipo só pode ser CRP
    credential_type?: CredencialDeCadastro
    crm_crp_number?: string
    graduate?: string
    // Versões em vigor dos documentos (ver consentimento.ts); diferentes das do backend, o cadastro dá 400 CONSENT_REQUIRED
    accepted_terms_version: string
    accepted_privacy_version: string
}

/** Dados da primeira etapa do cadastro; o psicólogo completa o restante na segunda etapa */
export type CadastroEtapa1 = Omit<RegisterRequestDTO, 'credential_type' | 'crm_crp_number' | 'graduate'>

/** plad.dto.UserResponseDTO */
export interface UserResponseDTO {
    id: number
    real_name: string
    email: string
}

/** POST /auth/login → 200 | 400 | 401 INVALID_CREDENTIALS | 429 RATE_LIMITED. Quem chama guarda o token (SessaoProvider) */
export function login(data: LoginRequestDTO) {
    return apiRequest<LoginResponseDTO>('POST', '/auth/login', data)
}

/** POST /auth/register → 201 | 400 VALIDATION_ERROR, INVALID_REGISTRATION ou CONSENT_REQUIRED | 409 EMAIL_IN_USE */
export function register(data: RegisterRequestDTO) {
    return apiRequest<UserResponseDTO>('POST', '/auth/register', data)
}

/** POST /auth/logout → 204, idempotente: revoga o refresh token do cookie e limpa o cookie */
export function logout() {
    return apiRequest<void>('POST', '/auth/logout')
}
