/**
 * Versões em vigor dos documentos de consentimento (LGPD art. 11), num lugar só. Espelham as propriedades do
 * application.properties do backend (hoje todas 1.0):
 *   termos        → consent.terms-version          (aceito no cadastro)
 *   privacidade   → consent.privacy-version        (aceito no cadastro)
 *   saude         → consent.health-version         (passo próprio, antes da primeira triagem)
 *   participacao  → consent.participation-version  (termo de participação, aceito a cada inscrição em reunião)
 * Se o backend subir uma versão e esta constante não acompanhar, a chamada responde 400 CONSENT_REQUIRED; é o sinal
 * de que este arquivo ficou para trás.
 */
export const VERSOES_CONSENTIMENTO = {
    termos: '1.0',
    privacidade: '1.0',
    saude: '1.0',
    participacao: '1.0',
} as const

/** Corpo de POST /me/consents e os campos accepted_* do cadastro, na versão em vigor */
export const ACEITE_VIGENTE = {
    accepted_terms_version: VERSOES_CONSENTIMENTO.termos,
    accepted_privacy_version: VERSOES_CONSENTIMENTO.privacidade,
} as const

/** Corpo de POST /me/consents/health */
export const ACEITE_DE_SAUDE_VIGENTE = {
    accepted_health_version: VERSOES_CONSENTIMENTO.saude,
} as const

/** Corpo de POST /meetings/{id}/registration: o termo de participação em vigor */
export const ACEITE_DE_PARTICIPACAO_VIGENTE = {
    accepted_participation_version: VERSOES_CONSENTIMENTO.participacao,
} as const

/**
 * Páginas públicas dos documentos. Os textos de Termos de Uso e Política de Privacidade ainda vêm do time: as páginas
 * existem e mostram um aviso visível no lugar do texto (ver `TEXTO_PENDENTE` em pages/termos.tsx e privacidade.tsx).
 */
export const DOCUMENTOS = {
    termos: { titulo: 'Termos de Uso', href: '/termos' },
    privacidade: { titulo: 'Política de Privacidade', href: '/privacidade' },
    protecao: { titulo: 'Como protegemos seus dados', href: '/como-protegemos' },
} as const
