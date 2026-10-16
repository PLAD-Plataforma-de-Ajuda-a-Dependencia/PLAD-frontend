import { apiRequest } from './client'

// Espelham os records de pladBack.DTO e os enums de pladBack.entity do backend.
// O JSON é snake_case (spring.jackson.property-naming-strategy=SNAKE_CASE).

/** pladBack.entity.sex */
export type Sex = 'masculino' | 'feminino' | 'nao_binario' | 'transexual' | 'outro'

/** pladBack.entity.userType */
export type UserType = 'dependente' | 'psicologo'

/** pladBack.entity.CrmCrpType */
export type CrmCrpType = 'CRM' | 'CRP'

/** pladBack.DTO.LoginRequestDTO */
export interface LoginRequestDTO {
    email: string
    password: string
}

/** pladBack.DTO.LoginResponseDTO */
export interface LoginResponseDTO {
    token: string
}

/** pladBack.DTO.RegisterRequestDTO */
export interface RegisterRequestDTO {
    real_name: string
    email: string
    password: string // @Size(min = 8)
    birth_date: string // LocalDate, "yyyy-MM-dd"
    gender: Sex
    type_user: UserType
    // credential_type e crm_crp_number são exigidos pelo AuthService quando type_user = 'psicologo'
    credential_type?: CrmCrpType
    crm_crp_number?: string
    graduate?: string
}

/** Dados da primeira etapa do cadastro; o psicólogo completa o restante na segunda etapa */
export type CadastroEtapa1 = Omit<RegisterRequestDTO, 'credential_type' | 'crm_crp_number' | 'graduate'>

/** pladBack.DTO.UserResponseDTO */
export interface UserResponseDTO {
    id: number
    real_name: string
    email: string
}

/** POST /auth/login → 200 | 401 credenciais inválidas | 429 muitas tentativas */
export function login(data: LoginRequestDTO) {
    return apiRequest<LoginResponseDTO>('POST', '/auth/login', data)
}

/** POST /auth/register → 201 | 400 dados inválidos | 409 e-mail já cadastrado */
export function register(data: RegisterRequestDTO) {
    return apiRequest<UserResponseDTO>('POST', '/auth/register', data)
}
