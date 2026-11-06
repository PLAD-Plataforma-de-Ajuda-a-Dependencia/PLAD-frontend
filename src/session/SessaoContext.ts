import { createContext, useContext } from 'react'
import type { MeResponseDTO } from '../api/me'

/**
 * desconhecido = ainda não tentamos recuperar a sessão pelo cookie de refresh (acontece na primeira rota protegida);
 * carregando = tentando; anonimo = sem sessão; autenticado = `me` preenchido;
 * indisponivel = não deu para saber (sem conexão, backend fora do ar, limite de tentativas): não é o mesmo que
 * "sem sessão", então a tela avisa e oferece tentar de novo em vez de mandar a pessoa para o login.
 */
export type StatusSessao = 'desconhecido' | 'carregando' | 'anonimo' | 'autenticado' | 'indisponivel'

/** Por que a sessão não pôde ser verificada (texto já em pt-BR, com o tempo de espera quando houver) */
export interface FalhaSessao {
    mensagem: string
}

export interface Sessao {
    status: StatusSessao
    /** Dados do GET /me (type_user, nickname, has_triage, consent_pending...), só em memória */
    me: MeResponseDTO | null
    /** Preenchida só em `indisponivel` */
    falha: FalhaSessao | null
    /** A sessão acabou no meio do uso (refresh recusado): o login explica o que houve e devolve a pessoa à tela */
    sessaoExpirada: boolean
    /** Tenta recuperar a sessão pelo cookie de refresh; sem efeito se já foi tentado */
    garantirSessao: () => Promise<void>
    /** Repete a verificação depois de um `indisponivel` */
    tentarNovamente: () => Promise<void>
    /** POST /auth/login + GET /me; guarda o token em memória e devolve quem entrou */
    entrar: (email: string, senha: string) => Promise<MeResponseDTO>
    /** POST /auth/logout, limpa token e estado e navega para `destino` (por padrão o login) */
    sair: (destino?: string) => Promise<void>
    /** GET /me de novo, para quando a API pode ter mudado algo (ex.: 409 dizendo que a triagem já existe) */
    recarregarMe: () => Promise<MeResponseDTO>
    /** Atualiza campos do `me` sem ir à API (apelido novo, has_triage depois do envio, consent_pending depois do aceite) */
    atualizarMe: (parcial: Partial<MeResponseDTO>) => void
}

export const SessaoContext = createContext<Sessao | null>(null)

export function useSessao(): Sessao {
    const sessao = useContext(SessaoContext)
    if (!sessao) {
        throw new Error('useSessao precisa estar dentro de <SessaoProvider>.')
    }
    return sessao
}

/**
 * Primeira tela de cada papel (sem triagem, o dependente começa por ela):
 * dependente sem triagem → /Triagem; dependente com triagem → /Calendario; psicólogo → /Calendario; admin → /adminPsico.
 */
export function destinoPorPapel(me: MeResponseDTO): string {
    switch (me.type_user) {
        case 'admin':
            return '/adminPsico'
        case 'psicologo':
            return '/Calendario'
        case 'dependente':
            return me.has_triage ? '/Calendario' : '/Triagem'
    }
}
