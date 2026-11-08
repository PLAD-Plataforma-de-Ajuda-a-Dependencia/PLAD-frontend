import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Info, Mic } from 'lucide-react'

import type { MeetingResponseDTO } from '../api/meetings'
import Botao from './Botao'
import type { OpcoesDeMidia } from './conectarSala'
import { classeBotao } from './estilos'
import { formatarRegistro } from './formatar'

type EstadoDaMidia = 'pedindo' | 'ok' | 'bloqueada' | 'ausente'

interface PreEntradaSalaProps {
    reuniao: MeetingResponseDTO
    ehAnfitriao: boolean
    /** Entre o clique em "Entrar" e a sala conectada */
    entrando: boolean
    /** O que deu errado na última tentativa, já em pt-BR */
    erro: string | null
    /** Segundos até poder tentar de novo (503 com Retry-After); 0 quando já pode */
    esperaRestante: number
    onEntrar: (opcoes: OpcoesDeMidia) => void
    /** Para onde "Voltar" leva (o calendário do psicólogo, "Minhas reuniões" do dependente) */
    voltarPara: string
}

/**
 * Antes de conectar. O psicólogo testa câmera e microfone (a prévia é local: nada sai do computador, e as faixas são
 * paradas antes da conexão); o dependente lê que entra ouvindo. O "Entrar" é o único gesto que pede o token da sala
 * (POST /join): abrir esta tela não pede nada, não gasta o token de 2 minutos e não grava nada na auditoria.
 */
export default function PreEntradaSala({
    reuniao,
    ehAnfitriao,
    entrando,
    erro,
    esperaRestante,
    onEntrar,
    voltarPara,
}: PreEntradaSalaProps) {
    const [midia, setMidia] = useState<EstadoDaMidia>(ehAnfitriao ? 'pedindo' : 'ausente')
    const [temCamera, setTemCamera] = useState(false)
    const [camera, setCamera] = useState(true)
    const [microfone, setMicrofone] = useState(true)
    const aoMudarMidia = useCallback((estado: EstadoDaMidia, comCamera: boolean) => {
        setMidia(estado)
        setTemCamera(comCamera)
    }, [])
    // O que vai ser ligado ao entrar: só o que existe e foi liberado pelo navegador
    const cameraLigada = camera && midia === 'ok' && temCamera
    const microfoneLigado = microfone && midia === 'ok'

    const inicio = parseISO(reuniao.starts_at)
    const bloqueado = entrando || esperaRestante > 0

    return (
        <div className="mx-auto w-full max-w-xl space-y-5 rounded-cartao bg-white p-6 text-gray-900 shadow-xl">
            <div className="space-y-1">
                <h1 className="font-outfit text-2xl font-semibold text-black">{reuniao.title}</h1>
                <p className="text-sm text-texto-suave">
                    {format(inicio, "EEEE, d 'de' MMMM", { locale: ptBR })} · {format(inicio, 'HH:mm')} -{' '}
                    {format(parseISO(reuniao.ends_at), 'HH:mm')} · com {reuniao.host.name}
                </p>
                {/* Quem vai participar confere quem conduz; o psicólogo não precisa ler o próprio registro. O sistema não confere
                    o número: ele é o que o anfitrião informou no cadastro */}
                {!ehAnfitriao && (
                    <p className="text-sm text-texto-suave">Registro profissional: {formatarRegistro(reuniao.host)}</p>
                )}
            </div>

            {ehAnfitriao ? (
                <>
                    <PreviaDeMidia aoMudar={aoMudarMidia} />
                    <fieldset className="space-y-2" disabled={midia !== 'ok'}>
                        <legend className="mb-1 text-sm font-medium text-black">Ao entrar</legend>
                        <label className="flex min-h-11 items-center gap-3 text-sm">
                            <input
                                type="checkbox"
                                checked={cameraLigada}
                                disabled={!temCamera}
                                onChange={(e) => setCamera(e.target.checked)}
                                className="size-5 accent-plad"
                            />
                            Entrar com a câmera ligada
                        </label>
                        <label className="flex min-h-11 items-center gap-3 text-sm">
                            <input
                                type="checkbox"
                                checked={microfoneLigado}
                                onChange={(e) => setMicrofone(e.target.checked)}
                                className="size-5 accent-plad"
                            />
                            Entrar com o microfone ligado
                        </label>
                    </fieldset>
                    <p className="flex gap-2 rounded-campo border border-aviso-borda bg-aviso-fundo p-3 text-sm text-aviso">
                        <Info size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                        <span>
                            Ao entrar, a lista de inscritos é lida uma vez e esse acesso fica registrado: cada pessoa da lista
                            pode ver, em "Quem viu meus dados", que um psicólogo a consultou.
                        </span>
                    </p>
                </>
            ) : (
                <p className="flex gap-2 rounded-campo bg-plad-fundo p-4 text-sm text-black">
                    <Mic size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
                    <span>
                        Você entra ouvindo; levante a mão para falar. Quando o psicólogo liberar, os botões de microfone e câmera
                        aparecem para você.
                    </span>
                </p>
            )}

            {erro && (
                <p role="alert" className="rounded-campo border border-aviso-borda bg-aviso-fundo p-3 text-sm text-aviso">
                    {erro}
                </p>
            )}

            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                <Link to={voltarPara} className={classeBotao('secundario')}>
                    Voltar
                </Link>
                <Botao
                    onClick={() => onEntrar({ camera: cameraLigada, microfone: microfoneLigado })}
                    carregando={entrando}
                    disabled={bloqueado}
                >
                    {esperaRestante > 0 ? `Tentar de novo em ${esperaRestante} s` : 'Entrar na sala'}
                </Botao>
            </div>
        </div>
    )
}

async function abrirMidia(): Promise<MediaStream> {
    try {
        return await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
    } catch (erro) {
        // Sem câmera, o microfone ainda serve
        if (erro instanceof DOMException && erro.name === 'NotFoundError') {
            return await navigator.mediaDevices.getUserMedia({ audio: true })
        }
        throw erro
    }
}

/**
 * Prévia da câmera e nível do microfone, só neste computador. Para as faixas ao sair da tela, que é antes de o LiveKit pedir
 * os dispositivos de novo. O nível é escrito direto no elemento (sem estado), para não renderizar 60 vezes por segundo.
 */
function PreviaDeMidia({ aoMudar }: { aoMudar: (estado: EstadoDaMidia, temCamera: boolean) => void }) {
    const videoRef = useRef<HTMLVideoElement>(null)
    const nivelRef = useRef<HTMLDivElement>(null)
    const [estado, setEstado] = useState<EstadoDaMidia>('pedindo')
    const [semCamera, setSemCamera] = useState(false)

    useEffect(() => {
        let parado = false
        let fluxo: MediaStream | null = null
        let contexto: AudioContext | null = null
        let quadro = 0

        function definir(novo: EstadoDaMidia, temCamera = false) {
            if (parado) return
            setEstado(novo)
            setSemCamera(novo === 'ok' && !temCamera)
            aoMudar(novo, temCamera)
        }

        if (!navigator.mediaDevices?.getUserMedia) {
            // Fora de HTTPS (e de localhost) o navegador não oferece câmera nem microfone
            queueMicrotask(() => definir('ausente'))
            return () => {
                parado = true
            }
        }

        abrirMidia()
            .then((aberto) => {
                if (parado) {
                    aberto.getTracks().forEach((faixa) => faixa.stop())
                    return
                }
                fluxo = aberto
                if (videoRef.current) videoRef.current.srcObject = aberto
                if (aberto.getAudioTracks().length > 0) {
                    contexto = new AudioContext()
                    const analisador = contexto.createAnalyser()
                    analisador.fftSize = 256
                    contexto.createMediaStreamSource(aberto).connect(analisador)
                    const amostras = new Uint8Array(analisador.fftSize)
                    const medir = () => {
                        analisador.getByteTimeDomainData(amostras)
                        let pico = 0
                        for (const valor of amostras) pico = Math.max(pico, Math.abs(valor - 128))
                        if (nivelRef.current) nivelRef.current.style.transform = `scaleX(${Math.min(1, pico / 64)})`
                        quadro = requestAnimationFrame(medir)
                    }
                    medir()
                }
                definir('ok', aberto.getVideoTracks().length > 0)
            })
            .catch((erro: unknown) => {
                const negada = erro instanceof DOMException && (erro.name === 'NotAllowedError' || erro.name === 'SecurityError')
                definir(negada ? 'bloqueada' : 'ausente')
            })

        return () => {
            parado = true
            cancelAnimationFrame(quadro)
            fluxo?.getTracks().forEach((faixa) => faixa.stop())
            void contexto?.close()
        }
        // `aoMudar` é o setState da tela: estável
    }, [aoMudar])

    return (
        <div className="space-y-3">
            <div className="relative aspect-video w-full overflow-hidden rounded-cartao border-[6px] border-plad bg-plad-fundo">
                {/* Prévia sem som: o que sai do microfone é só medido, nunca tocado */}
                <video ref={videoRef} autoPlay muted playsInline className="size-full -scale-x-100 object-cover" />
                {(estado !== 'ok' || semCamera) && (
                    <p role="status" className="absolute inset-0 flex items-center justify-center p-4 text-center text-sm text-black">
                        {estado === 'ok' && 'Não encontramos uma câmera neste computador. Você entra só com o áudio, e o microfone está funcionando.'}
                        {estado === 'pedindo' &&
                            'O navegador vai pedir acesso à câmera e ao microfone. Escolha "Permitir" para testar.'}
                        {estado === 'bloqueada' &&
                            'O navegador bloqueou a câmera ou o microfone. Libere no cadeado, ao lado do endereço, e recarregue a página; ou entre assim mesmo e ligue depois.'}
                        {estado === 'ausente' &&
                            'Não encontramos câmera ou microfone neste computador. Você pode entrar e usar o chat.'}
                    </p>
                )}
            </div>
            {estado === 'ok' && (
                <div>
                    <p className="mb-1 text-sm font-medium text-black">Nível do microfone</p>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-opcao" aria-hidden="true">
                        <div ref={nivelRef} className="h-full origin-left scale-x-0 bg-plad transition-transform duration-75" />
                    </div>
                    <p className="mt-1 text-xs text-texto-suave">Fale algo: a barra deve se mexer.</p>
                </div>
            )}
        </div>
    )
}
