import { registrarFalhaDeRede, registrarRespostaDaApi } from './conexao'
import { clearToken, getToken, setToken } from './token'
import { montarMensagem, traduzirErroDeCampo } from './erros'

/**
 * Client HTTP único: toda chamada à API passa por apiRequest.
 *
 * O JSON trafega em snake_case nos dois sentidos, sem conversão: os tipos em
 * src/api espelham os DTOs do backend campo a campo.
 *
 * Sessão: o access token (15 min) fica só em memória (token.ts) e o refresh token vai num cookie HttpOnly
 * que o JavaScript não enxerga. Quando uma rota protegida responde 401 UNAUTHORIZED, o client renova a sessão
 * (uma única chamada em voo, mesmo com várias requisições ao mesmo tempo) e repete a requisição uma vez.
 */

// Lida na primeira chamada (e não no import): se faltar VITE_API_URL, só as telas
// que usam a API falham, e não o app inteiro, Home incluída
let apiUrl: string | undefined

function getApiUrl(): string {
    if (apiUrl === undefined) {
        const url = import.meta.env.VITE_API_URL
        if (!url) {
            throw new Error('VITE_API_URL não está definida. Crie o .env com VITE_API_URL e reinicie o npm run dev.')
        }
        apiUrl = url.replace(/\/+$/, '')
    }
    return apiUrl
}

/** Mensagem de erro para exibir na tela, com texto de reserva para erros que não são Error */
export function getErrorMessage(err: unknown, fallback: string): string {
    return err instanceof Error ? err.message : fallback
}

/** Espelha pladBack.dto.FieldErrorDTO: `field` em snake_case (ex.: `birth_date`, `answers[0].values`) */
export interface FieldErrorDTO {
    field: string
    message: string
}

/** Espelha pladBack.dto.ErrorResponseDTO */
export interface ErrorResponseDTO {
    code: string
    message: string // em inglês: a tela mostra o texto de erros.ts, escolhido pelo code
    timestamp: string // Instant em ISO-8601
    errors: FieldErrorDTO[] // preenchido só em VALIDATION_ERROR
    trace: string | null // id da requisição, só em INTERNAL_ERROR
}

interface DetalhesDoErro {
    code?: string
    errors?: FieldErrorDTO[]
    trace?: string | null
    retryAfterSeconds?: number
}

export class ApiError extends Error {
    // 0 = nenhuma resposta do servidor (fora do ar ou bloqueado por CORS)
    readonly status: number
    // Identificador estável do erro (ErrorResponseDTO.code); undefined quando a resposta não veio no formato da API
    readonly code: string | undefined
    readonly errors: FieldErrorDTO[]
    readonly trace: string | null
    // Segundos de espera do cabeçalho Retry-After (429 e 503)
    readonly retryAfterSeconds: number | undefined

    // `message` já é a mensagem em pt-BR para a tela
    constructor(status: number, detalhes: DetalhesDoErro = {}) {
        super(
            montarMensagem({
                status,
                code: detalhes.code,
                retryAfterSeconds: detalhes.retryAfterSeconds,
                trace: detalhes.trace,
            }),
        )
        this.name = 'ApiError'
        this.status = status
        this.code = detalhes.code
        this.errors = detalhes.errors ?? []
        this.trace = detalhes.trace ?? null
        this.retryAfterSeconds = detalhes.retryAfterSeconds
    }
}

/** Erros de campo de um VALIDATION_ERROR, por nome do campo e já em pt-BR; vazio para qualquer outro erro */
export function errosPorCampo(err: unknown): Record<string, string> {
    const campos: Record<string, string> = {}
    if (err instanceof ApiError) {
        for (const erro of err.errors) {
            campos[erro.field] ??= traduzirErroDeCampo(erro.message)
        }
    }
    return campos
}

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE'

// Espelha SecurityConfig.CREDENTIALED_PATHS: são as únicas rotas cuja resposta o backend libera para credenciais.
// Em qualquer outra, `credentials: 'include'` faria o navegador descartar a resposta por causa do CORS
const CAMINHOS_COM_COOKIE: readonly string[] = ['/auth/login', '/auth/refresh', '/auth/logout', '/me/password']

// Espelha as rotas públicas do SecurityConfig: não levam bearer e um 401 nelas não significa sessão vencida
// (no login é senha errada; no refresh é o fim da sessão)
const CAMINHOS_SEM_BEARER: readonly string[] = ['/auth/login', '/auth/register', '/auth/refresh', '/auth/logout']

function irParaLoginRecarregando() {
    if (window.location.pathname.toLowerCase() !== '/login') {
        window.location.replace('/login')
    }
}

let aoExpirarSessao = irParaLoginRecarregando

/** O provider de sessão troca o redirecionamento padrão (recarregar a página) por limpar o estado e navegar */
export function registrarAoExpirarSessao(handler: () => void): () => void {
    aoExpirarSessao = handler
    return () => {
        aoExpirarSessao = irParaLoginRecarregando
    }
}

function expirarSessao() {
    clearToken()
    aoExpirarSessao()
}

function isErrorResponse(data: unknown): data is ErrorResponseDTO {
    return (
        typeof data === 'object' &&
        data !== null &&
        typeof (data as ErrorResponseDTO).code === 'string' &&
        typeof (data as ErrorResponseDTO).message === 'string'
    )
}

async function enviar(method: Method, path: string, body: unknown, token: string | null): Promise<Response> {
    // Content-Type só com corpo: em GET ele não é um header "simples" de CORS e forçaria um preflight
    const headers: Record<string, string> = {}
    if (body !== undefined) {
        headers['Content-Type'] = 'application/json'
    }
    if (token) {
        headers.Authorization = `Bearer ${token}`
    }

    try {
        const response = await fetch(`${getApiUrl()}${path}`, {
            method,
            headers,
            body: body === undefined ? undefined : JSON.stringify(body),
            credentials: CAMINHOS_COM_COOKIE.includes(path) ? 'include' : undefined,
        })
        registrarRespostaDaApi()
        return response
    } catch {
        registrarFalhaDeRede()
        throw new ApiError(0)
    }
}

// Algumas respostas chegam sem corpo (204) ou fora do formato da API (proxy, CORS do Spring em texto puro)
async function lerCorpo(response: Response): Promise<unknown> {
    const text = await response.text()
    if (!text) return null
    try {
        return JSON.parse(text)
    } catch {
        return null
    }
}

function criarErro(response: Response, data: unknown): ApiError {
    const retryAfter = Number(response.headers.get('Retry-After'))
    const naApi = isErrorResponse(data)
    return new ApiError(response.status, {
        code: naApi ? data.code : undefined,
        errors: naApi && Array.isArray(data.errors) ? data.errors : [],
        // O corpo traz o trace; o cabeçalho cobre um 5xx que não veio da API (só é legível por causa do CORS do backend)
        trace: (naApi ? data.trace : null) ?? (response.status >= 500 ? response.headers.get('X-Request-Id') : null),
        retryAfterSeconds: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
    })
}

// 401 UNAUTHORIZED = token ausente, inválido ou vencido (SecurityErrorHandler). Outros 401 são erros de negócio, como
// INVALID_CREDENTIALS na senha errada de DELETE /me: renovar a sessão e repetir não adiantaria e ainda deslogaria
function tokenRecusado(response: Response, data: unknown): boolean {
    return response.status === 401 && (!isErrorResponse(data) || data.code === 'UNAUTHORIZED')
}

let renovacaoEmVoo: Promise<string> | null = null

/**
 * Troca o cookie de refresh por um access token novo e o guarda. Há no máximo uma chamada em voo: quem chegar
 * enquanto ela não termina recebe a mesma promessa. Isso importa além da economia: o backend rotaciona o cookie a
 * cada uso e trata um segundo uso do mesmo cookie como roubo, revogando todas as sessões do usuário.
 */
export function renovarSessao(): Promise<string> {
    renovacaoEmVoo ??= (async () => {
        const renovar = async () => {
            const { token } = await apiRequest<{ token: string }>('POST', '/auth/refresh')
            setToken(token)
            return token
        }
        // Entre abas, o mesmo risco: o lock faz a segunda aba esperar a primeira e usar o cookie já rotacionado
        // (navigator.locks só existe em contexto seguro: https ou localhost)
        return 'locks' in navigator ? navigator.locks.request('plad-refresh', renovar) : renovar()
    })().finally(() => {
        renovacaoEmVoo = null
    })
    return renovacaoEmVoo
}

export async function apiRequest<T>(method: Method, path: string, body?: unknown): Promise<T> {
    const publico = CAMINHOS_SEM_BEARER.includes(path)
    const tokenUsado = publico ? null : getToken()

    let response = await enviar(method, path, body, tokenUsado)
    let data = await lerCorpo(response)

    if (!publico && tokenRecusado(response, data)) {
        let tokenNovo: string
        try {
            // Se outra requisição já renovou enquanto esta estava em voo, o token atual já serve
            const atual = getToken()
            tokenNovo = atual && atual !== tokenUsado ? atual : await renovarSessao()
        } catch (err) {
            // Cookie recusado ou ausente: acabou a sessão. Falha de rede ou 5xx no refresh não derruba nada
            if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
                expirarSessao()
            }
            throw err
        }

        response = await enviar(method, path, body, tokenNovo)
        data = await lerCorpo(response)
        if (tokenRecusado(response, data)) {
            expirarSessao()
        }
    }

    if (!response.ok) {
        throw criarErro(response, data)
    }
    return data as T
}
