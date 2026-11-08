import { useEffect, useRef, useState } from 'react'
import { Link, Navigate, useLocation } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { getErrorMessage } from '../api/client'
import { ACEITE_DE_SAUDE_VIGENTE, VERSOES_CONSENTIMENTO } from '../api/consentimento'
import { acceptHealthConsent } from '../api/me'
import Botao from '../components/Botao'
import LayoutPagina from '../components/LayoutPagina'
import LinkDocumento from '../components/LinkDocumento'
import { useToast } from '../components/ToastContext'
import { classeBotao } from '../components/estilos'
import { destinoPorPapel, useSessao } from '../session/SessaoContext'

// TODO(time): o texto do consentimento para tratar dado de saúde (LGPD art. 11, I) ainda não foi entregue. Quando vier,
// ele entra no lugar do aviso "em preparação" abaixo e a versão sobe junto, no backend (consent.health-version) e em
// consentimento.ts.

// Só aceita um caminho interno ("/Triagem"), nunca um endereço de outro site vindo do estado da navegação
function caminhoInterno(valor: unknown): string | null {
    return typeof valor === 'string' && valor.startsWith('/') && !valor.startsWith('//') ? valor : null
}

/**
 * Consentimento para tratar dado de saúde (LGPD art. 11, I). Um passo próprio e destacado, antes da primeira triagem
 * e fora do cadastro. O backend recusa POST e PUT /triage e a inscrição em reunião (400 CONSENT_REQUIRED) enquanto ele
 * não estiver aceito: quem precisa dele (a Triagem, o Calendário) manda a pessoa para cá com `state.de`, a tela a que
 * ela volta depois de aceitar. Recusar ("Agora não") não grava nada.
 */
export default function ConsentimentoSaude() {
    const { me, atualizarMe } = useSessao()
    const { avisar } = useToast()
    const location = useLocation()
    const tituloRef = useRef<HTMLHeadingElement>(null)
    const [aceitou, setAceitou] = useState(false)
    const [enviando, setEnviando] = useState(false)
    const [erro, setErro] = useState<string | null>(null)

    useEffect(() => {
        tituloRef.current?.focus()
    }, [])

    if (!me) {
        return null // a RotaProtegida só renderiza esta rota com a sessão pronta
    }

    const destino = caminhoInterno((location.state as { de?: unknown } | null)?.de) ?? destinoPorPapel(me)

    // Quem já aceitou (ou abriu o endereço à mão) não tem o que fazer aqui
    if (me.health_consent_pending === false) {
        return <Navigate to={destino} replace />
    }

    const aceitar = async () => {
        if (enviando) return
        setEnviando(true)
        setErro(null)
        try {
            await acceptHealthConsent(ACEITE_DE_SAUDE_VIGENTE)
            avisar('Consentimento registrado. Obrigado!')
            // A guarda acima leva a pessoa de volta a `destino` assim que o `me` mudar
            atualizarMe({ health_consent_pending: false })
        } catch (err) {
            setErro(getErrorMessage(err, 'Não foi possível registrar o consentimento.'))
        } finally {
            setEnviando(false)
        }
    }

    return (
        <LayoutPagina
            titulo="Seus dados de saúde"
            largura="media"
            acoes={
                <>
                    {erro && (
                        <p role="alert" className="text-center text-sm text-erro">
                            {erro}
                        </p>
                    )}
                    <Botao bloco carregando={enviando} disabled={!aceitou} onClick={() => void aceitar()}>
                        {enviando ? 'Registrando…' : 'Aceitar e continuar'}
                    </Botao>
                    <Link to="/Calendario" replace className={classeBotao('texto', true)}>
                        Agora não
                    </Link>
                </>
            }
        >
            <div className="space-y-5 rounded-cartao border-[3px] border-plad bg-white p-6 text-left shadow-cartao">
                <div className="flex items-center gap-3">
                    <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-plad-fundo text-plad" aria-hidden="true">
                        <ShieldCheck size={26} />
                    </span>
                    <h1 ref={tituloRef} tabIndex={-1} className="font-outfit text-2xl font-semibold leading-snug text-black focus:outline-none">
                        Seus dados de saúde
                    </h1>
                </div>

                <div className="space-y-3 text-sm text-gray-800">
                    <p>
                        A triagem pergunta sobre a sua saúde e o seu uso de substâncias. São dados sensíveis, e a lei pede o seu
                        consentimento, separado do cadastro, para guardá-los (LGPD, art. 11).
                    </p>
                    <p>
                        <strong className="font-semibold text-black">Sem este consentimento você não consegue enviar a triagem nem se
                        inscrever em reuniões.</strong> Você pode dizer "agora não" e voltar quando quiser; nada é guardado até lá.
                    </p>
                    <p>
                        Para saber quem vê o quê, e como você acompanha cada leitura, veja <LinkDocumento documento="protecao" />.
                    </p>
                </div>

                {/* Placeholder visível (TODO acima): o texto jurídico ainda não existe, e a tela não finge que existe */}
                <div role="note" className="rounded-campo border border-aviso-borda bg-aviso-fundo p-4 text-sm text-aviso">
                    <p className="font-semibold">Texto do consentimento em preparação</p>
                    <p className="mt-1">
                        O texto completo desta versão ({VERSOES_CONSENTIMENTO.saude}) ainda vai ser entregue pelo time e aparecerá
                        aqui.
                    </p>
                </div>

                <label className="flex min-h-11 cursor-pointer items-start gap-3 py-1 text-sm text-gray-800">
                    <input
                        type="checkbox"
                        checked={aceitou}
                        onChange={(e) => setAceitou(e.target.checked)}
                        className="mt-0.5 size-6 shrink-0 accent-plad"
                    />
                    <span>
                        Li e autorizo a PLAD a tratar os meus dados de saúde (versão {VERSOES_CONSENTIMENTO.saude}).
                    </span>
                </label>
            </div>
        </LayoutPagina>
    )
}
