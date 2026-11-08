import { VERSOES_CONSENTIMENTO } from '../api/consentimento'
import PaginaDeDocumento from '../components/PaginaDeDocumento'

// TODO(time): o texto dos Termos de Uso ainda não foi entregue. Quando vier, entra como filho de <PaginaDeDocumento> no
// lugar de `textoPendente`, e a versão sobe junto, no backend (consent.terms-version) e em api/consentimento.ts.

/** /termos: os Termos de Uso na versão em vigor. Página pública (sem login); o aceite é feito no cadastro */
export default function Termos() {
    return <PaginaDeDocumento titulo="Termos de Uso" versao={VERSOES_CONSENTIMENTO.termos} textoPendente />
}
