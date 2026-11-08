/**
 * Tradução dos erros da API. O backend manda `{ code, message, timestamp, errors, trace }` com `message` em inglês:
 * a tela mostra o texto daqui, escolhido pelo `code`, e nunca o `message` do servidor.
 */

/** Espelha a tabela de códigos do CLAUDE.md do backend (plad.exception.ErrorCode) */
export type ErrorCode =
    | 'VALIDATION_ERROR'
    | 'INVALID_REGISTRATION'
    | 'INVALID_PASSWORD_CHANGE'
    | 'INVALID_TRIAGE'
    | 'INVALID_MEETING'
    | 'MEETING_NOT_FOUND'
    | 'MEETING_CONFLICT'
    | 'MEETING_FULL'
    | 'MEETING_CAPACITY_TOO_LOW'
    | 'MEETING_NOT_OPEN'
    | 'MEETING_PARTICIPANT_NOT_FOUND'
    | 'CONSENT_REQUIRED'
    | 'UNAUTHORIZED'
    | 'INVALID_CREDENTIALS'
    | 'INVALID_REFRESH_TOKEN'
    | 'FORBIDDEN'
    | 'TRIAGE_NOT_FOUND'
    | 'EMAIL_IN_USE'
    | 'TRIAGE_ALREADY_EXISTS'
    | 'DATA_CONFLICT'
    | 'RATE_LIMITED'
    | 'SERVICE_UNAVAILABLE'
    | 'ROOM_UNAVAILABLE'
    | 'INTERNAL_ERROR'

/**
 * Único mapa code → mensagem em pt-BR. RATE_LIMITED, SERVICE_UNAVAILABLE, ROOM_UNAVAILABLE e INTERNAL_ERROR ganham o tempo de espera
 * ou o código de suporte em `montarMensagem`. Telas que precisam de um texto mais específico (senha atual errada,
 * por exemplo) olham o `code` do ApiError.
 */
export const MENSAGENS_ERRO: Record<ErrorCode, string> = {
    VALIDATION_ERROR: 'Confira os campos informados.',
    INVALID_REGISTRATION:
        'Não foi possível concluir o cadastro. Confira os dados profissionais: só aceitamos registro no CRP, e o número pode já estar cadastrado.',
    INVALID_PASSWORD_CHANGE: 'A nova senha precisa ser diferente da atual.',
    INVALID_TRIAGE: 'Não foi possível registrar as respostas. Confira-as e tente novamente.',
    INVALID_MEETING: 'Confira os dados da reunião.',
    MEETING_NOT_FOUND: 'Essa reunião não existe mais.',
    MEETING_CONFLICT:
        'Isso não é possível agora: o horário cruza outra reunião sua, ou a reunião já começou, terminou ou foi cancelada.',
    MEETING_FULL: 'Essa reunião não tem mais vagas.',
    MEETING_CAPACITY_TOO_LOW:
        'Já há mais pessoas inscritas do que essa capacidade. Aumente o número de vagas ou deixe como está.',
    MEETING_NOT_OPEN: 'A sala dessa reunião não está aberta agora.',
    MEETING_PARTICIPANT_NOT_FOUND: 'Essa pessoa não está conectada à sala agora.',
    CONSENT_REQUIRED:
        'Os Termos de Uso e a Política de Privacidade mudaram. Recarregue a página e aceite as versões em vigor.',
    UNAUTHORIZED: 'Sua sessão expirou. Entre novamente para continuar.',
    INVALID_CREDENTIALS: 'E-mail ou senha incorretos.',
    INVALID_REFRESH_TOKEN: 'Sua sessão expirou. Entre novamente para continuar.',
    FORBIDDEN: 'Você não tem permissão para fazer isso.',
    TRIAGE_NOT_FOUND: 'Você ainda não enviou a triagem.',
    EMAIL_IN_USE: 'Este e-mail já está cadastrado.',
    TRIAGE_ALREADY_EXISTS: 'Você já enviou a triagem. Atualize as respostas em vez de enviar de novo.',
    DATA_CONFLICT: 'Esses dados entram em conflito com um cadastro que já existe.',
    RATE_LIMITED: 'Muitas tentativas.',
    SERVICE_UNAVAILABLE: 'O serviço está indisponível no momento.',
    ROOM_UNAVAILABLE: 'A sala de vídeo não respondeu agora. Nada foi alterado.',
    INTERNAL_ERROR: 'Erro interno.',
}

export function isErrorCode(code: unknown): code is ErrorCode {
    return typeof code === 'string' && Object.hasOwn(MENSAGENS_ERRO, code)
}

// Erros que o Spring mapeia sozinho (JSON malformado, rota inexistente, 405...) chegam com o nome do status
// como code; sem texto próprio, vale o do status
function mensagemPorStatus(status: number): string {
    if (status === 0) return 'Não foi possível conectar ao servidor. Verifique sua conexão e tente novamente.'
    if (status === 400) return 'Não foi possível entender a solicitação. Confira os dados e tente novamente.'
    if (status === 401) return MENSAGENS_ERRO.UNAUTHORIZED
    if (status === 403) return MENSAGENS_ERRO.FORBIDDEN
    if (status === 404) return 'Não encontramos o que você procurou.'
    if (status === 429) return MENSAGENS_ERRO.RATE_LIMITED
    if (status >= 500) return 'Algo deu errado do nosso lado. Tente novamente em instantes.'
    return `Não foi possível concluir a ação (HTTP ${status}).`
}

/** "30 segundos", "2 minutos", "5 horas" (sempre arredondando para cima, para a pessoa não tentar cedo demais) */
export function formatarEspera(segundos: number): string {
    if (segundos < 60) {
        const s = Math.max(1, Math.ceil(segundos))
        return s === 1 ? '1 segundo' : `${s} segundos`
    }
    if (segundos < 3600) {
        const min = Math.ceil(segundos / 60)
        return min === 1 ? '1 minuto' : `${min} minutos`
    }
    const horas = Math.ceil(segundos / 3600)
    return horas === 1 ? '1 hora' : `${horas} horas`
}

interface DadosDoErro {
    status: number
    code?: string
    retryAfterSeconds?: number
    trace?: string | null
}

/** Mensagem pt-BR de um erro da API, com o tempo de espera (429, 503) ou o código de suporte (500) quando houver */
export function montarMensagem({ status, code, retryAfterSeconds, trace }: DadosDoErro): string {
    if (!isErrorCode(code)) {
        return mensagemPorStatus(status)
    }
    const base = MENSAGENS_ERRO[code]
    if (code === 'RATE_LIMITED') {
        return retryAfterSeconds
            ? `${base} Tente novamente em ${formatarEspera(retryAfterSeconds)}.`
            : `${base} Aguarde um pouco e tente novamente.`
    }
    if (code === 'SERVICE_UNAVAILABLE' || code === 'ROOM_UNAVAILABLE') {
        return retryAfterSeconds ? `${base} Tente novamente em ${formatarEspera(retryAfterSeconds)}.` : base
    }
    if (code === 'INTERNAL_ERROR') {
        return trace ? `${base} Informe o código ${trace} ao suporte.` : `${base} Tente novamente em instantes.`
    }
    return base
}

/** Mensagens de campo do Bean Validation (em inglês) → pt-BR. Sem padrão conhecido: texto genérico, nunca o cru */
const PADROES_CAMPO: { padrao: RegExp; texto: (m: RegExpMatchArray) => string }[] = [
    { padrao: /must not be (blank|empty|null)/i, texto: () => 'Campo obrigatório.' },
    { padrao: /well-formed email/i, texto: () => 'Informe um e-mail válido.' },
    { padrao: /must be at least (\d+) years old/i, texto: (m) => `É preciso ter pelo menos ${m[1]} anos.` },
    { padrao: /plausible birth date/i, texto: () => 'Informe uma data de nascimento válida.' },
    {
        padrao: /password must be at most (\d+) bytes/i,
        texto: (m) => `A senha pode ter no máximo ${m[1]} bytes (acentos e símbolos contam mais de um).`,
    },
    {
        padrao: /size must be between (\d+) and (\d+)/i,
        texto: (m) => {
            const min = Number(m[1])
            const max = Number(m[2])
            // sem teto declarado o Bean Validation devolve Integer.MAX_VALUE
            if (max > 100_000) return `Use pelo menos ${min} caracteres.`
            if (min === 0) return `Use no máximo ${max} caracteres.`
            return `Use entre ${min} e ${max} caracteres.`
        },
    },
    { padrao: /must be (a )?(past|in the past)/i, texto: () => 'Informe uma data que já passou.' },
    // Limites das reuniões (INVALID_MEETING, MeetingRules do backend)
    {
        padrao: /must be at least (\d+) minutes from now/i,
        texto: (m) => `O início precisa ser pelo menos ${m[1]} minutos depois de agora.`,
    },
    { padrao: /must be after starts_at/i, texto: () => 'O fim precisa ser depois do início.' },
    {
        padrao: /must last at least (\d+) minutes/i,
        texto: (m) => `A reunião precisa durar pelo menos ${m[1]} minutos.`,
    },
    {
        padrao: /must last at most (\d+) minutes/i,
        texto: (m) => `A reunião pode durar no máximo ${m[1]} minutos (${Number(m[1]) / 60} horas).`,
    },
    {
        padrao: /^must be between (\d+) and (\d+)$/i,
        texto: (m) => `Informe de ${m[1]} a ${m[2]} pessoas.`,
    },
]

export function traduzirErroDeCampo(message: string): string {
    for (const { padrao, texto } of PADROES_CAMPO) {
        const encontrado = message.match(padrao)
        if (encontrado) return texto(encontrado)
    }
    return 'Valor inválido.'
}
