/**
 * Versões em vigor dos Termos de Uso e da Política de Privacidade (LGPD art. 11), num lugar só.
 * Espelham `consent.terms-version` e `consent.privacy-version` do application.properties do backend (hoje 1.0).
 * Se o backend subir uma versão e esta constante não acompanhar, o cadastro e POST /me/consents respondem
 * 400 CONSENT_REQUIRED; é o sinal de que este arquivo ficou para trás.
 */
export const VERSOES_CONSENTIMENTO = {
    termos: '1.0',
    privacidade: '1.0',
} as const

/** Corpo de POST /me/consents e os campos accepted_* do cadastro, na versão em vigor */
export const ACEITE_VIGENTE = {
    accepted_terms_version: VERSOES_CONSENTIMENTO.termos,
    accepted_privacy_version: VERSOES_CONSENTIMENTO.privacidade,
} as const

// TODO: os textos dos Termos de Uso e da Política de Privacidade ainda não existem. Quando houver uma página
// (ou PDF) para cada um, troque `href` pelo endereço; o componente LinkDocumento tira o aviso sozinho.
export const DOCUMENTOS = {
    termos: { titulo: 'Termos de Uso', href: null as string | null },
    privacidade: { titulo: 'Política de Privacidade', href: null as string | null },
} as const
