import { VERSOES_CONSENTIMENTO } from '../api/consentimento'
import PaginaDeDocumento from '../components/PaginaDeDocumento'

// TODO(time): o texto da Política de Privacidade ainda não foi entregue. Quando vier, entra como filho de
// <PaginaDeDocumento> no lugar de `textoPendente`, e a versão sobe junto, no backend (consent.privacy-version) e em
// api/consentimento.ts.

/** /privacidade: a Política de Privacidade na versão em vigor. Página pública (sem login); o aceite é feito no cadastro */
export default function Privacidade() {
    return <PaginaDeDocumento titulo="Política de Privacidade" versao={VERSOES_CONSENTIMENTO.privacidade} textoPendente />
}
