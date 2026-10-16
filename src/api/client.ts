import { clearToken, getToken, isTokenExpired } from './token'

/**
 * Client HTTP único: toda chamada à API passa por apiRequest.
 *
 * O JSON trafega em snake_case nos dois sentidos, sem conversão: os tipos em
 * src/api espelham os DTOs do backend campo a campo.
 */

// Lida na primeira chamada (e não no import): se faltar VITE_API_URL, só as telas
// que usam a API falham, e não o app inteiro, Home incluída
let apiUrl: string | undefined

function getApiUrl(): string {
    if (apiUrl === undefined) {
        const url = import.meta.env.VITE_API_URL
        if (!url) {
            throw new Error('VITE_API_URL não está definida. Copie .env.example para .env e reinicie o npm run dev.')
        }
        apiUrl = url.replace(/\/+$/, '')
    }
    return apiUrl
}

/** Mensagem de erro para exibir na tela, com texto de reserva para erros que não são Error */
export function getErrorMessage(err: unknown, fallback: string): string {
    return err instanceof Error ? err.message : fallback
}

/** Espelha pladBack.DTO.ErrorResponseDTO */
export interface ErrorResponseDTO {
    message: string
    timestamp: string // Instant em ISO-8601
}

export class ApiError extends Error {
    // 0 = nenhuma resposta do servidor (fora do ar ou bloqueado por CORS)
    readonly status: number

    constructor(status: number, message: string) {
        super(message)
        this.name = 'ApiError'
        this.status = status
    }
}

type Method = 'GET' | 'POST' | 'PUT'

// No SecurityConfig do backend só POST /auth/login e POST /auth/register são públicos;
// o prefixo /auth/ é mais largo, então uma futura rota /auth/* protegida precisa de ajuste aqui
function isPublicPath(path: string) {
    return path.startsWith('/auth/')
}

function redirectToLogin() {
    clearToken()
    if (window.location.pathname.toLowerCase() !== '/login') {
        window.location.replace('/login')
    }
}

function isErrorResponse(data: unknown): data is ErrorResponseDTO {
    return typeof data === 'object' && data !== null && typeof (data as ErrorResponseDTO).message === 'string'
}

export async function apiRequest<T>(method: Method, path: string, body?: unknown): Promise<T> {
    const token = getToken()

    // Token ausente ou vencido em rota protegida volta como 401 sem corpo,
    // então a sessão é conferida antes para evitar uma ida desnecessária ao servidor
    if (!isPublicPath(path) && (!token || isTokenExpired(token))) {
        redirectToLogin()
        throw new ApiError(401, 'Sua sessão expirou. Faça login para continuar.')
    }

    // Content-Type só com corpo: em GET ele não é um header "simples" de CORS e forçaria um preflight
    const headers: Record<string, string> = {}
    if (body !== undefined) {
        headers['Content-Type'] = 'application/json'
    }
    if (token) {
        headers.Authorization = `Bearer ${token}`
    }

    let response: Response
    try {
        response = await fetch(`${getApiUrl()}${path}`, {
            method,
            headers,
            body: body === undefined ? undefined : JSON.stringify(body),
        })
    } catch {
        throw new ApiError(0, 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.')
    }

    // Algumas respostas chegam sem corpo, como o 401 padrão do Spring Security
    const text = await response.text()
    let data: unknown = null
    if (text) {
        try {
            data = JSON.parse(text)
        } catch {
            // corpo que não é JSON: segue como resposta sem corpo
        }
    }

    if (!response.ok) {
        // Em /auth/** o 401 significa senha errada e precisa continuar na tela de login
        if (response.status === 401 && !isPublicPath(path)) {
            redirectToLogin()
        }
        throw new ApiError(
            response.status,
            isErrorResponse(data) ? data.message : `Não foi possível concluir a ação (HTTP ${response.status}).`,
        )
    }

    return data as T
}
