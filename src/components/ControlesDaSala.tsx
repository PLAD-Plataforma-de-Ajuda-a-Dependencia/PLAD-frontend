import { useEffect, useId, useRef, useState } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import {
    ChevronUp,
    EllipsisVertical,
    Hand,
    MessageSquare,
    Mic,
    MicOff,
    MonitorOff,
    MonitorUp,
    Phone,
    Users,
    Video,
    VideoOff,
} from 'lucide-react'
import { useLocalParticipant, useMediaDeviceSelect } from '@livekit/components-react'

import { useToast } from './ToastContext'

export type AbaDoPainel = 'chat' | 'inscritos'

interface ControlesDaSalaProps {
    ehAnfitriao: boolean
    /** Anfitrião, ou dependente a quem o psicólogo liberou a fala: só eles veem microfone e câmera */
    podePublicar: boolean
    maoLevantada: boolean
    onAlternarMao: () => void
    painelAberto: boolean
    abaDoPainel: AbaDoPainel
    onAlternarPainel: (aba: AbaDoPainel) => void
    /** Quantas mãos estão levantadas (só o anfitrião vê o número) */
    maosPendentes: number
    /** "Encerrar" só vale depois do início da reunião (o backend responde 409 antes) */
    podeEncerrar: boolean
    onEncerrar: () => void
    onSair: () => void
}

const BOTAO =
    'inline-flex h-11 min-w-14 items-center justify-center gap-2 rounded-full px-4 text-white transition-colors focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-50'
const BOTAO_NORMAL = `${BOTAO} bg-sala-botao hover:bg-white/20`
// Ligado (mão levantada, painel aberto): fundo claro; o estado também está em `aria-pressed`, não só na cor
const BOTAO_LIGADO = `${BOTAO} bg-white !text-black hover:bg-gray-200`
const ITEM_DE_MENU =
    'flex min-h-11 w-full items-center gap-2 rounded-botao px-3 text-left text-sm text-white hover:bg-white/10 focus-visible:outline-white disabled:cursor-not-allowed disabled:opacity-50 aria-checked:bg-white/10 aria-checked:font-semibold'

/**
 * A barra de controles, como no frame: dispositivo + microfone, (câmera), chat, mão, "⋮" e o desligar vermelho. Sair
 * NÃO encerra a reunião: encerrar para todos é um item do "⋮" do anfitrião, com confirmação. "CC" do frame ficou de fora
 * (não há transcrição no backend nem na LiveKit). Vem dentro de um `RoomContext`.
 */
export default function ControlesDaSala({
    ehAnfitriao,
    podePublicar,
    maoLevantada,
    onAlternarMao,
    painelAberto,
    abaDoPainel,
    onAlternarPainel,
    maosPendentes,
    podeEncerrar,
    onEncerrar,
    onSair,
}: ControlesDaSalaProps) {
    const { localParticipant, isMicrophoneEnabled, isCameraEnabled, isScreenShareEnabled } = useLocalParticipant()
    const { avisar } = useToast()

    async function alternar(qual: 'microfone' | 'camera' | 'tela') {
        try {
            if (qual === 'microfone') await localParticipant.setMicrophoneEnabled(!isMicrophoneEnabled)
            else if (qual === 'camera') await localParticipant.setCameraEnabled(!isCameraEnabled)
            else await localParticipant.setScreenShareEnabled(!isScreenShareEnabled)
        } catch (erro) {
            // Cancelar a janela de "o que compartilhar" não é erro
            if (qual === 'tela' && erro instanceof Error && erro.name === 'NotAllowedError') return
            avisar(
                qual === 'microfone'
                    ? 'Não foi possível usar o microfone. Confira a permissão do navegador.'
                    : qual === 'camera'
                      ? 'Não foi possível usar a câmera. Confira a permissão do navegador.'
                      : 'Não foi possível compartilhar a tela.',
                'erro',
            )
        }
    }

    const chatAberto = painelAberto && abaDoPainel === 'chat'
    const inscritosAberto = painelAberto && abaDoPainel === 'inscritos'

    return (
        <div
            role="toolbar"
            aria-label="Controles da reunião"
            className="mx-auto flex w-full max-w-[645px] flex-wrap items-center justify-center gap-3 rounded-cartao bg-sala-barra px-4 py-3"
        >
            {podePublicar && (
                <>
                    <div className="flex items-center rounded-full bg-sala-botao">
                        <Menu
                            rotulo="Escolher o microfone"
                            classeDoBotao="inline-flex h-11 w-10 items-center justify-center rounded-l-full text-white hover:bg-white/20 focus-visible:outline-white"
                            icone={<ChevronUp size={18} aria-hidden="true" />}
                        >
                            {(fechar) => (
                                <>
                                    <ListaDeDispositivos tipo="audioinput" titulo="Microfone" fechar={fechar} />
                                    {ehAnfitriao && <ListaDeDispositivos tipo="videoinput" titulo="Câmera" fechar={fechar} />}
                                </>
                            )}
                        </Menu>
                        <button
                            type="button"
                            onClick={() => alternar('microfone')}
                            aria-label={isMicrophoneEnabled ? 'Desligar o microfone' : 'Ligar o microfone'}
                            title={isMicrophoneEnabled ? 'Desligar o microfone' : 'Ligar o microfone'}
                            className="inline-flex size-11 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/25 focus-visible:outline-white"
                        >
                            {isMicrophoneEnabled ? <Mic size={20} aria-hidden="true" /> : <MicOff size={20} aria-hidden="true" />}
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={() => alternar('camera')}
                        aria-label={isCameraEnabled ? 'Desligar a câmera' : 'Ligar a câmera'}
                        title={isCameraEnabled ? 'Desligar a câmera' : 'Ligar a câmera'}
                        className={BOTAO_NORMAL}
                    >
                        {isCameraEnabled ? <Video size={20} aria-hidden="true" /> : <VideoOff size={20} aria-hidden="true" />}
                    </button>
                </>
            )}

            <button
                type="button"
                onClick={() => onAlternarPainel('chat')}
                aria-pressed={chatAberto}
                aria-label="Chat"
                title="Chat"
                className={chatAberto ? BOTAO_LIGADO : BOTAO_NORMAL}
            >
                <MessageSquare size={20} aria-hidden="true" />
            </button>

            {ehAnfitriao ? (
                <button
                    type="button"
                    onClick={() => onAlternarPainel('inscritos')}
                    aria-pressed={inscritosAberto}
                    aria-label={maosPendentes > 0 ? `Inscritos, ${maosPendentes} com a mão levantada` : 'Inscritos'}
                    title="Inscritos"
                    className={inscritosAberto ? BOTAO_LIGADO : BOTAO_NORMAL}
                >
                    <Users size={20} aria-hidden="true" />
                    {maosPendentes > 0 && (
                        <span aria-hidden="true" className="inline-flex items-center gap-1 text-sm font-semibold">
                            <Hand size={14} />
                            {maosPendentes}
                        </span>
                    )}
                </button>
            ) : (
                <button
                    type="button"
                    onClick={onAlternarMao}
                    aria-pressed={maoLevantada}
                    aria-label="Levantar a mão"
                    title={maoLevantada ? 'Baixar a mão' : 'Levantar a mão'}
                    className={maoLevantada ? BOTAO_LIGADO : BOTAO_NORMAL}
                >
                    <Hand size={20} aria-hidden="true" />
                </button>
            )}

            {ehAnfitriao && (
                <Menu
                    rotulo="Mais opções"
                    classeDoBotao="inline-flex h-11 w-10 items-center justify-center rounded-full bg-sala-botao text-white hover:bg-white/20 focus-visible:outline-white"
                    icone={<EllipsisVertical size={20} aria-hidden="true" />}
                >
                    {(fechar) => (
                        <>
                            <button
                                type="button"
                                role="menuitem"
                                className={ITEM_DE_MENU}
                                onClick={() => {
                                    fechar()
                                    void alternar('tela')
                                }}
                            >
                                {isScreenShareEnabled ? (
                                    <MonitorOff size={18} aria-hidden="true" />
                                ) : (
                                    <MonitorUp size={18} aria-hidden="true" />
                                )}
                                {isScreenShareEnabled ? 'Parar de compartilhar a tela' : 'Compartilhar a tela'}
                            </button>
                            <button
                                type="button"
                                role="menuitem"
                                className={ITEM_DE_MENU}
                                disabled={!podeEncerrar}
                                onClick={() => {
                                    fechar()
                                    onEncerrar()
                                }}
                            >
                                <Phone size={18} className="rotate-[135deg]" aria-hidden="true" />
                                <span>
                                    Encerrar a reunião para todos
                                    {!podeEncerrar && <span className="block text-xs text-gray-300">Disponível a partir do início</span>}
                                </span>
                            </button>
                        </>
                    )}
                </Menu>
            )}

            {/* O vermelho do frame, escurecido para o contraste AA (como o "sair" do menu da conta) */}
            <button
                type="button"
                onClick={onSair}
                aria-label="Sair da reunião"
                title="Sair da reunião"
                className={`${BOTAO} bg-erro hover:bg-erro-hover`}
            >
                <Phone size={20} className="rotate-[135deg]" aria-hidden="true" />
            </button>
        </div>
    )
}

interface MenuProps {
    rotulo: string
    icone: ReactNode
    classeDoBotao: string
    children: (fechar: () => void) => ReactNode
}

/**
 * Menu que abre para cima (a barra fica embaixo): Esc fecha e devolve o foco ao botão, as setas andam pelos itens e clicar
 * fora fecha. Os itens são `role="menuitem"` ou `"menuitemradio"`.
 */
function Menu({ rotulo, icone, classeDoBotao, children }: MenuProps) {
    const [aberto, setAberto] = useState(false)
    const raiz = useRef<HTMLDivElement>(null)
    const botao = useRef<HTMLButtonElement>(null)
    const idMenu = useId()

    useEffect(() => {
        if (!aberto) return
        raiz.current?.querySelector<HTMLElement>('[role^="menuitem"]:not([disabled])')?.focus()
        function aoClicarFora(e: MouseEvent) {
            if (raiz.current && e.target instanceof Node && !raiz.current.contains(e.target)) setAberto(false)
        }
        document.addEventListener('mousedown', aoClicarFora)
        return () => document.removeEventListener('mousedown', aoClicarFora)
    }, [aberto])

    function aoTeclar(e: KeyboardEvent<HTMLDivElement>) {
        if (e.key === 'Escape' && aberto) {
            e.stopPropagation()
            setAberto(false)
            botao.current?.focus()
            return
        }
        if (!aberto || (e.key !== 'ArrowDown' && e.key !== 'ArrowUp')) return
        const itens = Array.from(raiz.current?.querySelectorAll<HTMLElement>('[role^="menuitem"]:not([disabled])') ?? [])
        if (itens.length === 0) return
        e.preventDefault()
        const atual = itens.indexOf(document.activeElement as HTMLElement)
        const proximo = e.key === 'ArrowDown' ? (atual + 1) % itens.length : (atual - 1 + itens.length) % itens.length
        itens[proximo].focus()
    }

    return (
        <div ref={raiz} className="relative" onKeyDown={aoTeclar}>
            <button
                ref={botao}
                type="button"
                aria-haspopup="menu"
                aria-expanded={aberto}
                aria-controls={aberto ? idMenu : undefined}
                aria-label={rotulo}
                title={rotulo}
                onClick={() => setAberto((a) => !a)}
                className={classeDoBotao}
            >
                {icone}
            </button>
            {aberto && (
                <div
                    id={idMenu}
                    role="menu"
                    aria-label={rotulo}
                    className="absolute bottom-full left-1/2 z-20 mb-2 w-64 max-w-[80vw] -translate-x-1/2 space-y-1 rounded-cartao bg-sala-barra p-2 shadow-xl ring-1 ring-white/20"
                >
                    {children(() => setAberto(false))}
                </div>
            )}
        </div>
    )
}

function ListaDeDispositivos({
    tipo,
    titulo,
    fechar,
}: {
    tipo: 'audioinput' | 'videoinput'
    titulo: string
    fechar: () => void
}) {
    const { devices, activeDeviceId, setActiveMediaDevice } = useMediaDeviceSelect({ kind: tipo })
    const { avisar } = useToast()

    return (
        <div role="group" aria-label={titulo} className="space-y-1">
            <p className="px-3 pt-1 text-xs font-semibold text-gray-300">{titulo}</p>
            {devices.length === 0 && <p className="px-3 py-2 text-sm text-gray-300">Nenhum dispositivo encontrado.</p>}
            {devices.map((d, i) => (
                <button
                    key={d.deviceId}
                    type="button"
                    role="menuitemradio"
                    aria-checked={d.deviceId === activeDeviceId}
                    className={ITEM_DE_MENU}
                    onClick={() => {
                        setActiveMediaDevice(d.deviceId).then(fechar, () =>
                            avisar('Não foi possível trocar o dispositivo.', 'erro'),
                        )
                    }}
                >
                    <span className="min-w-0 truncate">{d.label || `${titulo} ${i + 1}`}</span>
                </button>
            ))}
        </div>
    )
}
