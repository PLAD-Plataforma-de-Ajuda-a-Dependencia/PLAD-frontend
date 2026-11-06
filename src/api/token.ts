// Único lugar que guarda o access token (JWT de 15 min): só em memória, nunca em localStorage/sessionStorage.
// Recarregar a página apaga a variável; a sessão volta pelo cookie de refresh (POST /auth/refresh).
let accessToken: string | null = null

// Versões antigas do front guardavam o JWT aqui; apaga o que ficou nos navegadores
try {
    localStorage.removeItem('plad.token')
} catch {
    // storage indisponível (modo restrito do navegador): não há o que limpar
}

export function setToken(token: string) {
    accessToken = token
}

export function getToken(): string | null {
    return accessToken
}

export function clearToken() {
    accessToken = null
}
