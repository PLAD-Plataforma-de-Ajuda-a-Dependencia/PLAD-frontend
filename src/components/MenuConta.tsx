import { useEffect, useId, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { LifeBuoy, LogOut, Menu, MoreHorizontal, RefreshCw, Settings } from 'lucide-react'
import { ApiError } from '../api/client'
import { formatarEspera } from '../api/erros'
import { rerollNickname } from '../api/me'
import avatarPlaceholder from '../assets/avatar-placeholder.svg'
import { useSessao } from '../session/SessaoContext'

/**
 * Menu da conta, no pé da barra lateral do LayoutPainel (a única tela com ele, ao lado do avatar provisório).
 * Os três pontos expandem o painel do Figma (frame /reuniao-3): fundo lilás com uma borda branca à direita, botão
 * no topo, avatar com uma linha branca atravessando o centro, o nome, "configurações", "suporte" e "sair" em vermelho.
 *
 * No nome do dependente (o apelido anônimo), ao passar o mouse aparece um traço embaixo e o ícone de troca: clicar
 * sorteia outro apelido (POST /me/nickname/reroll, até 5 por dia). Psicólogo vê o próprio nome; admin, o e-mail.
 * O painel cobre a área da página acima do rodapé: o ancestral `relative` é o do LayoutPainel.
 */
export default function MenuConta() {
    const { me, sair, atualizarMe } = useSessao()
    const [aberto, setAberto] = useState(false)
    const [sorteando, setSorteando] = useState(false)
    const [erro, setErro] = useState<string | null>(null)
    const gatilho = useRef<HTMLButtonElement>(null)
    const botaoFechar = useRef<HTMLButtonElement>(null)
    const painel = useRef<HTMLDivElement>(null)
    const painelId = useId()

    const fechar = () => {
        setAberto(false)
        setErro(null)
        gatilho.current?.focus()
    }

    // Abrir leva o foco ao botão do topo do painel
    useEffect(() => {
        if (aberto) botaoFechar.current?.focus()
    }, [aberto])

    // Fecha com Esc e com clique fora do painel
    useEffect(() => {
        if (!aberto) return
        const aoTeclar = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                setAberto(false)
                setErro(null)
                gatilho.current?.focus()
            }
        }
        const aoClicar = (e: MouseEvent) => {
            if (painel.current && !painel.current.contains(e.target as Node)) {
                setAberto(false)
                setErro(null)
            }
        }
        document.addEventListener('keydown', aoTeclar)
        document.addEventListener('mousedown', aoClicar)
        return () => {
            document.removeEventListener('keydown', aoTeclar)
            document.removeEventListener('mousedown', aoClicar)
        }
    }, [aberto])

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

    // Texto em Roboto Bold 15px, como no Figma; o ícone fica logo à direita da palavra
    const itemClass =
        'flex items-center gap-2 self-start text-[15px] font-bold leading-[27.5px] focus-visible:outline-2 focus-visible:outline-plad rounded-sm'

    return (
        <>
            <button
                ref={gatilho}
                type="button"
                onClick={() => setAberto(true)}
                aria-label="Abrir o menu da conta"
                aria-expanded={aberto}
                aria-controls={painelId}
                className="text-gray-400 hover:text-gray-600 transition mb-4"
            >
                <MoreHorizontal size={20} />
            </button>
            <div className="w-8 h-8 rounded-full bg-[#8397ff]" />

            {aberto && (
                <div
                    ref={painel}
                    id={painelId}
                    role="region"
                    aria-label="Menu da conta"
                    className="absolute inset-y-0 left-0 z-40 flex w-[328px] max-w-[85vw] flex-col items-start border-r-[3px] border-white bg-plad-fundo pl-[27px] pr-6 pt-[37px] pb-9 font-roboto text-black"
                >
                    {/* A linha branca que atravessa o avatar, de ponta a ponta do painel */}
                    <span aria-hidden="true" className="absolute inset-x-0 top-[134px] h-[3px] bg-white" />

                    <button
                        ref={botaoFechar}
                        type="button"
                        onClick={fechar}
                        aria-label="Fechar o menu da conta"
                        className="flex h-[26px] w-[33px] items-center justify-center rounded-[4px] bg-[#6d85ff] text-white hover:bg-plad focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-plad transition-colors"
                    >
                        <Menu size={18} aria-hidden="true" />
                    </button>

                    <img
                        src={avatarPlaceholder}
                        alt=""
                        width={85}
                        height={85}
                        className="relative mt-[29px] size-[85px]"
                    />

                    {ehDependente ? (
                        <button
                            type="button"
                            onClick={sortear}
                            disabled={sorteando}
                            aria-label={`Seu apelido é ${nome}. Sortear outro apelido`}
                            className="group mt-[7px] flex max-w-full items-center gap-2 text-left text-[15px] font-medium leading-[27.5px] focus-visible:outline-2 focus-visible:outline-plad rounded-sm disabled:cursor-wait"
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
                    ) : (
                        <p className="mt-[7px] max-w-full break-words text-[15px] font-medium leading-[27.5px]">{nome}</p>
                    )}
                    {erro && (
                        <p role="alert" className="mt-1 text-xs text-red-600">
                            {erro}
                        </p>
                    )}

                    <Link to="/minha-conta" onClick={() => setAberto(false)} className={`${itemClass} mt-[52px]`}>
                        configurações
                        <Settings size={16} aria-hidden="true" />
                    </Link>
                    {/* Ainda não existe página nem endpoint de suporte: o item fica no lugar do Figma, desabilitado */}
                    <span aria-disabled="true" className={`${itemClass} mt-[6px] cursor-not-allowed text-black/40`}>
                        suporte
                        <LifeBuoy size={16} aria-hidden="true" />
                        <span className="rounded bg-white px-1.5 text-[11px] font-medium leading-5 text-gray-500">
                            em breve
                        </span>
                    </span>

                    <button type="button" onClick={() => void sair()} className={`${itemClass} mt-auto text-[#f73d3d]`}>
                        sair
                        <LogOut size={16} aria-hidden="true" />
                    </button>
                </div>
            )}
        </>
    )
}
