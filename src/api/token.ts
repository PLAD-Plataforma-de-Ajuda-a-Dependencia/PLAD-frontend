// Único lugar que lê e grava o JWT; trocar o storage é só mexer aqui
const TOKEN_KEY = 'plad.token'

export function saveToken(token: string) {
    localStorage.setItem(TOKEN_KEY, token)
}

export function getToken(): string | null {
    return localStorage.getItem(TOKEN_KEY)
}

export function clearToken() {
    localStorage.removeItem(TOKEN_KEY)
}

/**
 * Lê o `exp` do payload do JWT para não chamar a API com a sessão vencida.
 * Não valida a assinatura (isso é papel do backend): serve só para a UX.
 * Um token que não dá para decodificar conta como expirado.
 */
export function isTokenExpired(token: string): boolean {
    try {
        const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
        const { exp } = JSON.parse(atob(payload))
        return typeof exp !== 'number' || exp * 1000 <= Date.now()
    } catch {
        return true
    }
}
