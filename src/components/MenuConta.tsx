import { useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { LifeBuoy, LogOut, MoreHorizontal, RefreshCw, Settings, X } from 'lucide-react'
import { ApiError } from '../api/client'
import { formatarEspera } from '../api/erros'
import { rerollNickname } from '../api/me'
import avatarPlaceholder from '../assets/avatar-placeholder.svg'
import { useSessao } from '../session/SessaoContext'
import { useToast } from './ToastContext'
import useArmadilhaFoco from './useArmadilhaFoco'

/**
 * Menu da conta, aberto pelos três pontos da barra lateral (ou pelo item "Conta" da barra do celular), ao lado do
 * avatar provisório. O painel é o do Figma (frame 1:166): fundo lilás com uma borda branca à direita, X para fechar,
 * avatar com uma linha branca atravessando o centro, o nome, "configurações", "suporte" e "sair" em vermelho, cada um com o ícone à esquerda. O botão de fechar é um X no canto de cima.
 * Ele é uma gaveta por cima da página, aberta num portal (z-50, acima de qualquer conteúdo), com o foco preso nela,
 * Esc e clique no fundo para fechar.
 *
 * No nome do dependente (o apelido anônimo), ao passar o mouse aparece um traço embaixo e o ícone de troca: clicar
 * sorteia outro apelido (POST /me/nickname/reroll, até 5 por dia). Psicólogo vê o próprio nome; admin, o e-mail.
 */
export default function MenuConta({ variante = 'lateral' }: { variante?: 'lateral' | 'barra' }) {
    const { me, sair, atualizarMe } = useSessao()
    const { avisar } = useToast()
    const [aberto, setAberto] = useState(false)
    const [sorteando, setSorteando] = useState(false)
    const [erro, setErro] = useState<string | null>(null)
    const painel = useRef<HTMLDivElement>(null)
    const painelId = useId()

    const fechar = () => {
        setAberto(false)
        setErro(null)
    }

    useArmadilhaFoco(painel, aberto, fechar)

    if (!me) {
        return null
    }

    const ehDependente = me.type_user === 'dependente'
    const nome = ehDependente ? (me.nickname ?? '') : me.type_user === 'psicologo' ? (me.real_name ?? me.email) : me.email

    const sortear = async () => {
        if (sorteando) return
        setSorteando(true)
        setErro(null)
        try {
            const { nickname } = await rerollNickname()
            atualizarMe({ nickname })
            avisar(`Seu novo apelido é ${nickname}.`)
        } catch (err) {
            if (err instanceof ApiError && err.status === 429) {
                setErro(
                    err.retryAfterSeconds
                        ? `Você já trocou de apelido 5 vezes hoje. Tente de novo em ${formatarEspera(err.retryAfterSeconds)}.`
                        : 'Você já trocou de apelido 5 vezes hoje. Tente de novo mais tarde.',
                )
            } else {
                setErro(err instanceof Error ? err.message : 'Não foi possível sortear outro apelido.')
            }
        } finally {
            setSorteando(false)
        }
    }

    const aoSair = async () => {
        await sair()
        avisar('Você saiu da conta.', 'info')
    }

    // Texto em Roboto Bold 15px, como no Figma; o ícone fica logo à direita da palavra
    const itemClass = 'flex min-h-11 items-center gap-2 self-start rounded-sm text-[15px] font-bold'

    return (
        <>
            {variante === 'lateral' ? (
                <>
                    <button
                        type="button"
                        onClick={() => setAberto(true)}
                        aria-label="Abrir o menu da conta"
                        aria-expanded={aberto}
                        aria-controls={painelId}
                        className="flex size-11 items-center justify-center text-gray-600 transition hover:text-gray-900"
                    >
                        <MoreHorizontal size={20} aria-hidden="true" />
                    </button>
                    <div aria-hidden="true" className="size-8 rounded-full bg-avatar" />
                </>
            ) : (
                <button
                    type="button"
                    onClick={() => setAberto(true)}
                    aria-label="Abrir o menu da conta"
                    aria-expanded={aberto}
                    aria-controls={painelId}
                    className="flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 px-2 text-xs font-medium text-gray-600"
                >
                    <span aria-hidden="true" className="size-5 rounded-full bg-avatar" />
                    Conta
                </button>
            )}

            {aberto &&
                createPortal(
                    <>
                        <div aria-hidden="true" className="fixed inset-0 z-40 bg-black/20" onClick={fechar} />
                        <div
                            ref={painel}
                            id={painelId}
                            role="dialog"
                            aria-modal="true"
                            aria-label="Menu da conta"
                            tabIndex={-1}
                            className="fixed inset-y-0 left-0 z-50 flex w-[328px] max-w-[85vw] flex-col items-start overflow-y-auto border-r-[3px] border-white bg-plad-fundo pl-[27px] pr-6 pt-[37px] pb-9 font-roboto text-black"
                        >
                            {/* A linha branca que atravessa o avatar, de ponta a ponta do painel */}
                            <span aria-hidden="true" className="absolute inset-x-0 top-[134px] h-[3px] bg-white" />

                            <button
                                type="button"
                                onClick={fechar}
                                aria-label="Fechar o menu da conta"
                                className="absolute right-2 top-2 z-10 flex size-11 items-center justify-center rounded-full text-gray-700 transition-colors hover:bg-white/70 hover:text-black"
                            >
                                <X size={22} aria-hidden="true" />
                            </button>

                            <img
                                src={avatarPlaceholder}
                                alt=""
                                width={85}
                                height={85}
                                className="relative mt-[44px] size-[85px]"
                            />

                            {ehDependente ? (
                                <>
                                    <button
                                        type="button"
                                        onClick={sortear}
                                        disabled={sorteando}
                                        aria-label={`Seu apelido é ${nome}. Sortear outro apelido`}
                                        className="group mt-2 flex min-h-11 max-w-full items-center gap-2 text-left text-[15px] font-medium disabled:cursor-wait"
                                    >
                                        {/* O traço embaixo do nome só aparece com o mouse (ou o foco) em cima */}
                                        <span className="break-words border-b-2 border-transparent leading-[22px] transition-colors group-hover:border-plad group-focus-visible:border-plad">
                                            {nome}
                                        </span>
                                        <RefreshCw
                                            size={15}
                                            aria-hidden="true"
                                            className={`shrink-0 text-plad transition-opacity opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 pointer-coarse:opacity-100 ${
                                                sorteando ? 'animate-spin opacity-100' : ''
                                            }`}
                                        />
                                    </button>
                                    <p className="text-xs text-gray-700">Ninguém além dos psicólogos vê o seu nome real.</p>
                                </>
                            ) : (
                                <p className="mt-[7px] max-w-full break-words text-[15px] font-medium leading-[27.5px]">{nome}</p>
                            )}
                            {erro && (
                                <p role="alert" className="mt-1 text-sm text-erro">
                                    {erro}
                                </p>
                            )}

                            <Link to="/minha-conta" onClick={fechar} className={`${itemClass} mt-10`}>
                                <Settings size={18} aria-hidden="true" />
                                configurações
                            </Link>
                            {/* Ainda não existe página nem endpoint de suporte: o item fica no lugar do Figma, desabilitado */}
                            <span aria-disabled="true" className={`${itemClass} mt-1 cursor-not-allowed text-gray-600`}>
                                <LifeBuoy size={18} aria-hidden="true" />
                                suporte
                                <span className="rounded bg-white px-1.5 text-xs font-medium leading-5 text-gray-600">em breve</span>
                            </span>

                            <button type="button" onClick={() => void aoSair()} className={`${itemClass} mt-auto text-erro`}>
                                <LogOut size={18} aria-hidden="true" />
                                sair
                            </button>
                        </div>
                    </>,
                    document.body,
                )}
        </>
    )
}
