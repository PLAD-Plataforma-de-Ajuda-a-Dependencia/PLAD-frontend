// Estado de "sem conexão" da aplicação, para o aviso global (BannerConexao). Duas fontes: o navegador (eventos
// online/offline) e as chamadas à API (uma falha de rede liga o aviso; qualquer resposta do servidor o desliga).
type Ouvinte = () => void

let semConexao = typeof navigator !== 'undefined' ? !navigator.onLine : false
const ouvintes = new Set<Ouvinte>()

function definir(valor: boolean) {
    if (semConexao === valor) return
    semConexao = valor
    ouvintes.forEach((ouvinte) => ouvinte())
}

/** A API não respondeu (fora do ar, rede caída ou bloqueada) */
export function registrarFalhaDeRede() {
    definir(true)
}

/** O servidor respondeu, com sucesso ou com erro: há conexão */
export function registrarRespostaDaApi() {
    definir(false)
}

export function assinarConexao(ouvinte: Ouvinte) {
    ouvintes.add(ouvinte)
    return () => {
        ouvintes.delete(ouvinte)
    }
}

export function lerSemConexao() {
    return semConexao
}

if (typeof window !== 'undefined') {
    window.addEventListener('offline', () => definir(true))
    window.addEventListener('online', () => definir(false))
}
