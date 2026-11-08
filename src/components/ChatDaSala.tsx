import { useEffect, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { format } from 'date-fns'
import { Send } from 'lucide-react'
import type { useChat } from '@livekit/components-react'

import Botao from './Botao'
import { MAXIMO_DO_CHAT } from './salaProtocolo'

export type MensagemDeChat = ReturnType<typeof useChat>['chatMessages'][number]

interface ChatDaSalaProps {
    mensagens: MensagemDeChat[]
    enviando: boolean
    /** Quem é o psicólogo (`identity === hostIdentity`): as mensagens dele levam o selo "Psicólogo" */
    hostIdentity: string
    /** Devolve `true` se enviou; se falhou, o texto digitado fica na caixa para tentar de novo */
    onEnviar: (texto: string) => Promise<boolean>
}

/**
 * O chat da sala: mensagens de dados da LiveKit, para todos (o token libera `canPublishData` desde a entrada, então quem
 * ainda não pode falar escreve). Ninguém guarda histórico: ao recarregar a página, as mensagens somem. O que se envia é
 * só o texto digitado: nenhum nome (e nunca o nome real de um dependente) entra na mensagem; o remetente vem da própria
 * LiveKit (apelido do dependente, nome do psicólogo, definidos no token).
 */
export default function ChatDaSala({ mensagens, enviando, hostIdentity, onEnviar }: ChatDaSalaProps) {
    const [texto, setTexto] = useState('')
    const fimRef = useRef<HTMLLIElement>(null)

    useEffect(() => {
        fimRef.current?.scrollIntoView({ block: 'nearest' })
    }, [mensagens.length])

    async function enviar(e: FormEvent) {
        e.preventDefault()
        const limpo = texto.trim()
        if (!limpo || enviando) return
        if (await onEnviar(limpo)) setTexto('')
    }

    return (
        <div className="flex h-full min-h-72 flex-col gap-3">
            {/* role="log" é uma região ao vivo educada: o leitor de tela lê as mensagens novas */}
            <ul role="log" aria-label="Mensagens do chat" className="max-h-96 flex-1 space-y-3 overflow-y-auto pr-1 text-sm lg:max-h-[28rem]">
                {mensagens.length === 0 && <li className="text-gray-300">Ninguém escreveu ainda. Diga um olá.</li>}
                {mensagens.map((m, i) => (
                    <li key={`${m.timestamp}-${i}`}>
                        <p className="flex flex-wrap items-baseline gap-x-2">
                            <span className="font-semibold text-white">{m.from?.isLocal ? 'Você' : m.from?.name || 'Alguém'}</span>
                            {m.from?.identity === hostIdentity && (
                                <span className="rounded bg-plad px-1.5 text-xs font-medium text-white">Psicólogo</span>
                            )}
                            <span className="text-xs text-gray-300">{format(m.timestamp, 'HH:mm')}</span>
                        </p>
                        {/* Texto puro: o React escapa, nada de HTML vindo de outra pessoa */}
                        <p className="whitespace-pre-wrap break-words text-gray-100">{m.message}</p>
                    </li>
                ))}
                <li ref={fimRef} aria-hidden="true" />
            </ul>

            <form onSubmit={enviar} className="flex gap-2">
                <label htmlFor="mensagem-da-sala" className="sr-only">
                    Mensagem para a sala
                </label>
                <input
                    id="mensagem-da-sala"
                    type="text"
                    value={texto}
                    onChange={(e) => setTexto(e.target.value)}
                    maxLength={MAXIMO_DO_CHAT}
                    autoComplete="off"
                    placeholder="Escreva uma mensagem"
                    className="min-h-11 min-w-0 flex-1 rounded-campo border border-white/30 bg-sala-botao px-3 text-sm text-white placeholder:text-gray-300"
                />
                <Botao type="submit" carregando={enviando} disabled={texto.trim() === ''} aria-label="Enviar mensagem">
                    <Send size={18} aria-hidden="true" />
                    <span className="hidden sm:inline">Enviar</span>
                </Botao>
            </form>
        </div>
    )
}
