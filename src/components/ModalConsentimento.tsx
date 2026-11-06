import { useEffect, useRef, useState } from 'react'
import { Check } from 'lucide-react'
import { getErrorMessage } from '../api/client'
import { ACEITE_VIGENTE, DOCUMENTOS } from '../api/consentimento'
import { acceptConsents } from '../api/me'
import { useSessao } from '../session/SessaoContext'

/**
 * Pop-up de consentimento (Figma /login-2, nó 1:29), mostrado enquanto GET /me diz `consent_pending`: os Termos de
 * Uso e a Política de Privacidade em vigor ainda não foram aceitos, ou mudaram de versão. O fundo (a página logada)
 * fica desfocado e inerte (a RotaProtegida o põe em `inert`); o aceite é POST /me/consents.
 * O backend não bloqueia ninguém por isso: o bloqueio é só desta tela. Quem não quiser aceitar tem "Recusar e sair".
 */
export default function ModalConsentimento() {
    const { me, atualizarMe, sair } = useSessao()
    const [aceitou, setAceitou] = useState(false)
    const [enviando, setEnviando] = useState(false)
    const [erro, setErro] = useState<string | null>(null)
    const checkbox = useRef<HTMLInputElement>(null)
    const aberto = Boolean(me?.consent_pending)

    useEffect(() => {
        if (aberto) checkbox.current?.focus()
    }, [aberto])

    if (!aberto) {
        return null
    }

    const proximo = async () => {
        setEnviando(true)
        setErro(null)
        try {
            await acceptConsents(ACEITE_VIGENTE)
            atualizarMe({ consent_pending: false })
        } catch (err) {
            setErro(getErrorMessage(err, 'Não foi possível registrar o aceite.'))
        } finally {
            setEnviando(false)
        }
    }

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-white/30 backdrop-blur-md font-roboto">
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="titulo-consentimento"
                className="mx-auto flex min-h-full w-full max-w-[590px] flex-col items-center justify-center gap-4 px-4 py-6"
            >
                <span className="text-xl font-semibold text-gray-500">PLAD</span>

                <div className="flex h-[min(750px,58vh)] min-h-[340px] w-full flex-col rounded-[18px] border-[3px] border-plad bg-white px-8 pb-8 pt-10 shadow-xl">
                    <h2 id="titulo-consentimento" className="text-center text-2xl font-semibold text-black">
                        TERMOS E CONDIÇÕES
                    </h2>

                    {/* Os textos ainda não existem: cada documento aparece com o TODO visível */}
                    <div
                        tabIndex={0}
                        aria-label="Texto dos termos e da política"
                        className="mt-6 flex-1 space-y-5 overflow-y-auto pr-2 text-sm text-gray-700 focus-visible:outline-2 focus-visible:outline-plad"
                    >
                        {Object.values(DOCUMENTOS).map(({ titulo, href }) => (
                            <section key={titulo}>
                                <h3 className="font-semibold text-black">{titulo}</h3>
                                {href ? (
                                    <a
                                        href={href}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="text-plad underline hover:text-plad-hover"
                                    >
                                        Ler {titulo}
                                    </a>
                                ) : (
                                    <p className="mt-1">
                                        <span className="font-semibold text-red-600">[TODO]</span> O texto de {titulo} ainda
                                        não existe.
                                    </p>
                                )}
                            </section>
                        ))}
                    </div>

                    <label className="mt-6 flex cursor-pointer items-center gap-3.5">
                        <span className="relative flex h-[34px] w-[35px] shrink-0">
                            <input
                                ref={checkbox}
                                type="checkbox"
                                checked={aceitou}
                                onChange={(e) => setAceitou(e.target.checked)}
                                className="peer h-full w-full cursor-pointer appearance-none rounded-[9px] border-[3px] border-plad bg-white checked:bg-plad focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plad"
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
                    <p role="alert" className="text-center text-sm text-red-600">
                        {erro}
                    </p>
                )}

                <button
                    type="button"
                    onClick={proximo}
                    disabled={!aceitou || enviando}
                    className="w-full max-w-sm rounded-lg bg-plad px-6 py-3.5 text-base font-medium text-white transition-colors hover:bg-plad-hover active:bg-plad-active disabled:cursor-not-allowed disabled:bg-plad/40"
                >
                    {enviando ? 'Registrando…' : 'Próximo'}
                </button>
                <button type="button" onClick={() => void sair()} className="text-sm text-plad hover:underline">
                    Recusar e sair
                </button>
            </div>
        </div>
    )
}
