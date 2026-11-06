import { useState } from 'react'
import { Check } from 'lucide-react'
import { getErrorMessage } from '../api/client'
import { ACEITE_VIGENTE, DOCUMENTOS } from '../api/consentimento'
import { acceptConsents } from '../api/me'
import { useSessao } from '../session/SessaoContext'
import Botao from './Botao'
import ModalConfirmacao from './ModalConfirmacao'
import { useToast } from './ToastContext'

/**
 * Pop-up de consentimento (Figma /login-2, nó 1:29), mostrado enquanto GET /me diz `consent_pending`: os Termos de
 * Uso e a Política de Privacidade em vigor ainda não foram aceitos, ou mudaram de versão. O fundo (a página logada)
 * fica desfocado e inerte (a RotaProtegida o põe em `inert`); o aceite é POST /me/consents.
 * O backend não bloqueia ninguém por isso: o bloqueio é só desta tela. Quem não quiser aceitar tem "Recusar e sair",
 * que antes pede uma confirmação.
 */
export default function ModalConsentimento() {
    const { me, atualizarMe, sair } = useSessao()
    const { avisar } = useToast()
    const [aceitou, setAceitou] = useState(false)
    const [enviando, setEnviando] = useState(false)
    const [erro, setErro] = useState<string | null>(null)
    const [confirmandoSaida, setConfirmandoSaida] = useState(false)
    const aberto = Boolean(me?.consent_pending)

    if (!aberto) {
        return null
    }

    const proximo = async () => {
        setEnviando(true)
        setErro(null)
        try {
            await acceptConsents(ACEITE_VIGENTE)
            atualizarMe({ consent_pending: false })
            avisar('Aceite registrado. Obrigado!')
        } catch (err) {
            setErro(getErrorMessage(err, 'Não foi possível registrar o aceite.'))
        } finally {
            setEnviando(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-white/30 font-roboto backdrop-blur-md">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="titulo-consentimento"
                className="mx-auto flex min-h-full w-full max-w-[590px] flex-col items-center justify-center gap-4 px-4 py-6"
            >
                <span className="text-xl font-semibold text-texto-suave">PLAD</span>

                <div className="flex h-[min(750px,58vh)] min-h-[340px] w-full flex-col rounded-[18px] border-[3px] border-plad bg-white px-6 pb-8 pt-10 shadow-xl sm:px-8">
                    <h2 id="titulo-consentimento" className="text-center text-2xl font-semibold text-black">
                        TERMOS E CONDIÇÕES
                    </h2>

                    {/* Os textos ainda não existem: cada documento diz isso com calma, sem esconder */}
                    <div
                        tabIndex={0}
                        aria-label="Texto dos termos e da política"
                        className="mt-6 flex-1 space-y-5 overflow-y-auto pr-2 text-sm text-gray-700"
                    >
                        {Object.values(DOCUMENTOS).map(({ titulo, href }) => (
                            <section key={titulo}>
                                <h3 className="font-semibold text-black">{titulo}</h3>
                                {href ? (
                                    <a href={href} target="_blank" rel="noreferrer" className="text-plad underline hover:text-plad-hover">
                                        Ler {titulo}
                                    </a>
                                ) : (
                                    <p className="mt-1">O texto de {titulo} está em preparação e ainda não pode ser lido aqui.</p>
                                )}
                            </section>
                        ))}
                    </div>

                    <label className="mt-6 flex min-h-11 cursor-pointer items-center gap-3.5">
                        <span className="relative flex h-[34px] w-[35px] shrink-0">
                            <input
                                type="checkbox"
                                checked={aceitou}
                                onChange={(e) => setAceitou(e.target.checked)}
                                autoFocus
                                className="peer h-full w-full cursor-pointer appearance-none rounded-[9px] border-[3px] border-plad bg-white checked:bg-plad"
                            />
                            <Check
                                aria-hidden="true"
                                size={22}
                                strokeWidth={3}
                                className="pointer-events-none absolute inset-0 m-auto hidden text-white peer-checked:block"
                            />
                        </span>
                        <span className="text-base font-semibold text-black">Aceito os termos e condições</span>
                    </label>
                </div>

                {erro && (
                    <p role="alert" className="text-center text-sm text-erro">
                        {erro}
                    </p>
                )}

                <Botao bloco carregando={enviando} disabled={!aceitou} onClick={proximo} className="max-w-sm">
                    {enviando ? 'Registrando…' : 'Próximo'}
                </Botao>
                <Botao variante="texto" onClick={() => setConfirmandoSaida(true)}>
                    Recusar e sair
                </Botao>
            </div>

            <ModalConfirmacao
                aberto={confirmandoSaida}
                titulo="Sair sem aceitar?"
                descricao="Sem o aceite você não consegue usar o PLAD. Nada será apagado, e você pode voltar e aceitar quando quiser."
                rotuloConfirmar="Sair"
                rotuloCancelar="Voltar"
                onConfirmar={() => void sair()}
                onCancelar={() => setConfirmandoSaida(false)}
            />
        </div>
    )
}
