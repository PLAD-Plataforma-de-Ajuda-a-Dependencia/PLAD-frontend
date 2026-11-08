import { useEffect, useReducer, useState } from 'react'
import { Hand, Info, MicOff, Mic, UserX } from 'lucide-react'
import { RoomEvent } from 'livekit-client'
import { useRoomContext } from '@livekit/components-react'

import { ApiError } from '../api/client'
import { formatarEspera } from '../api/erros'
import type { MeetingParticipantDTO } from '../api/meetings'
import { permitirFala, removerParticipante, repetirSeSalaIndisponivel } from '../api/sala'
import Botao from './Botao'
import ModalConfirmacao from './ModalConfirmacao'
import { useToast } from './ToastContext'

interface PainelDoAnfitriaoProps {
    reuniaoId: number
    /** A lista de inscritos, lida UMA vez ao entrar (leitura auditada); `null` se a leitura falhou */
    inscritos: MeetingParticipantDTO[] | null
    /** Por que a leitura falhou, em pt-BR */
    erroDaLista: string | null
    lendoALista: boolean
    /** Ler de novo é uma nova leitura auditada: só a pedido */
    onLerDeNovo: () => void
    /** Mãos levantadas: identidade → instante em que levantou */
    maos: ReadonlyMap<string, number>
    onBaixarMao: (identidade: string) => void
    /** A pessoa foi removida: sai da lista da tela (sem ler a lista de novo, que seria outra leitura auditada) */
    onRemovido: (identidade: string) => void
}

/** Re-renderiza o painel quando alguém entra, sai ou muda de permissão (a LiveKit é a fonte de verdade do "liberado") */
function useAtualizarComASala() {
    const room = useRoomContext()
    const [, atualizar] = useReducer((n: number) => n + 1, 0)
    useEffect(() => {
        room.on(RoomEvent.ParticipantConnected, atualizar)
        room.on(RoomEvent.ParticipantDisconnected, atualizar)
        room.on(RoomEvent.ParticipantPermissionsChanged, atualizar)
        return () => {
            room.off(RoomEvent.ParticipantConnected, atualizar)
            room.off(RoomEvent.ParticipantDisconnected, atualizar)
            room.off(RoomEvent.ParticipantPermissionsChanged, atualizar)
        }
    }, [room])
    return room
}

const CLASSE_ACAO =
    'inline-flex min-h-11 items-center gap-1.5 rounded-botao border border-white/40 px-3 text-sm font-medium text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50'

/**
 * O painel do psicólogo: quem está inscrito (apelido e NOME REAL: esta é a única tela da sala com o nome real de um
 * dependente, e ele fica só no estado do componente pai, nunca em storage, URL ou LiveKit), quem está conectado, quem
 * levantou a mão, e as ações de liberar ou cortar a fala e remover. Quem está "conectado" e "liberado" vem da própria
 * sala (`room.remoteParticipants`), não de memória daqui: sobrevive a recarregar a página. As ações usam a identidade
 * que o backend devolveu na lista, nunca o nome.
 */
export default function PainelDoAnfitriao({
    reuniaoId,
    inscritos,
    erroDaLista,
    lendoALista,
    onLerDeNovo,
    maos,
    onBaixarMao,
    onRemovido,
}: PainelDoAnfitriaoProps) {
    const room = useAtualizarComASala()
    const { avisar } = useToast()
    const [ocupado, setOcupado] = useState<string | null>(null)
    const [aRemover, setARemover] = useState<MeetingParticipantDTO | null>(null)

    const aoEsperar = (segundos: number) =>
        avisar(`A sala de vídeo não respondeu. Tentando de novo em ${formatarEspera(segundos)}.`, 'info')

    async function alterarFala(pessoa: MeetingParticipantDTO, permitir: boolean) {
        setOcupado(pessoa.identity)
        try {
            await repetirSeSalaIndisponivel(() => permitirFala(reuniaoId, pessoa.identity, permitir), aoEsperar)
            if (permitir) onBaixarMao(pessoa.identity)
            avisar(permitir ? `${pessoa.nickname} pode falar agora.` : `A fala de ${pessoa.nickname} foi encerrada.`, 'sucesso')
        } catch (erro) {
            avisar(erro instanceof ApiError ? erro.message : 'Algo deu errado. Tente novamente em instantes.', 'erro')
        } finally {
            setOcupado(null)
        }
    }

    async function confirmarRemocao() {
        if (!aRemover) return
        const pessoa = aRemover
        setOcupado(pessoa.identity)
        try {
            await repetirSeSalaIndisponivel(() => removerParticipante(reuniaoId, pessoa.identity), aoEsperar)
            onBaixarMao(pessoa.identity)
            onRemovido(pessoa.identity)
            avisar(`${pessoa.nickname} foi removido da reunião.`, 'sucesso')
        } catch (erro) {
            avisar(erro instanceof ApiError ? erro.message : 'Algo deu errado. Tente novamente em instantes.', 'erro')
        } finally {
            setOcupado(null)
            setARemover(null)
        }
    }

    const linhas = (inscritos ?? [])
        .map((p) => {
            const remoto = room.remoteParticipants.get(p.identity)
            return { pessoa: p, conectado: remoto !== undefined, liberado: remoto?.permissions?.canPublish === true, mao: maos.get(p.identity) }
        })
        .sort((a, b) => {
            if (a.mao !== undefined && b.mao !== undefined) return a.mao - b.mao
            if (a.mao !== undefined) return -1
            if (b.mao !== undefined) return 1
            if (a.conectado !== b.conectado) return a.conectado ? -1 : 1
            return a.pessoa.nickname.localeCompare(b.pessoa.nickname, 'pt-BR')
        })

    return (
        <div className="space-y-4 text-sm">
            <p className="flex gap-2 text-gray-200">
                <Info size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
                <span>
                    Esta lista foi lida ao você entrar, e esse acesso ficou registrado: cada pessoa dela pode ver que um
                    psicólogo a consultou. Os nomes ficam só nesta tela.
                </span>
            </p>

            {erroDaLista && (
                <div role="alert" className="space-y-2 rounded-campo border border-white/30 p-3">
                    <p>{erroDaLista}</p>
                    <Botao variante="secundario" onClick={onLerDeNovo} carregando={lendoALista}>
                        Ler a lista de novo (fica registrado)
                    </Botao>
                </div>
            )}

            {inscritos && inscritos.length === 0 && <p className="text-gray-300">Ninguém se inscreveu nesta reunião.</p>}

            <ul className="space-y-3">
                {linhas.map(({ pessoa, conectado, liberado, mao }) => (
                    <li key={pessoa.identity} className="space-y-2 rounded-campo bg-white/5 p-3">
                        <div>
                            <p className="font-semibold text-white">
                                <span className="sr-only">Apelido: </span>
                                {pessoa.nickname}
                            </p>
                            <p className="text-gray-300">
                                <span className="sr-only">Nome: </span>
                                {pessoa.real_name}
                            </p>
                        </div>
                        {/* Estado em texto, nunca só em cor */}
                        <p className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-gray-200">
                            <span>{conectado ? 'Conectado' : 'Fora da sala'}</span>
                            {liberado && <span>Pode falar</span>}
                            {mao !== undefined && (
                                <span className="inline-flex items-center gap-1 font-semibold text-white">
                                    <Hand size={12} aria-hidden="true" />
                                    Mão levantada
                                </span>
                            )}
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {liberado ? (
                                <button
                                    type="button"
                                    className={CLASSE_ACAO}
                                    disabled={ocupado !== null}
                                    onClick={() => alterarFala(pessoa, false)}
                                >
                                    <MicOff size={14} aria-hidden="true" />
                                    Cortar a fala
                                </button>
                            ) : (
                                <button
                                    type="button"
                                    className={CLASSE_ACAO}
                                    disabled={ocupado !== null || !conectado}
                                    onClick={() => alterarFala(pessoa, true)}
                                >
                                    <Mic size={14} aria-hidden="true" />
                                    Liberar a fala
                                </button>
                            )}
                            <button
                                type="button"
                                className={CLASSE_ACAO}
                                disabled={ocupado !== null}
                                onClick={() => setARemover(pessoa)}
                            >
                                <UserX size={14} aria-hidden="true" />
                                Remover
                            </button>
                        </div>
                    </li>
                ))}
            </ul>

            <ModalConfirmacao
                aberto={aRemover !== null}
                titulo="Remover da reunião?"
                descricao={
                    aRemover
                        ? `${aRemover.nickname} sai da sala e perde a inscrição: não consegue mais entrar nesta reunião.`
                        : undefined
                }
                rotuloConfirmar="Remover"
                rotuloCancelar="Voltar"
                carregando={ocupado !== null && aRemover !== null}
                onConfirmar={confirmarRemocao}
                onCancelar={() => setARemover(null)}
            />
        </div>
    )
}
