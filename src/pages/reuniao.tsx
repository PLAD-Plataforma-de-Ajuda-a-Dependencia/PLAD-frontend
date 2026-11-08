import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { Link, useParams } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { DisconnectReason } from 'livekit-client'
import type { Room } from 'livekit-client'
import { CalendarDays, DoorOpen, Heart } from 'lucide-react'

import { ApiError } from '../api/client'
import { aberturaDaSala, getMeeting, listParticipants, podeEntrar } from '../api/meetings'
import type { MeetingParticipantDTO, MeetingResponseDTO } from '../api/meetings'
import Botao from '../components/Botao'
import Carregando from '../components/Carregando'
import EstadoErro from '../components/EstadoErro'
import EstadoVazio from '../components/EstadoVazio'
import PreEntradaSala from '../components/PreEntradaSala'
import Rodape from '../components/Rodape'
import SalaAoVivo from '../components/SalaAoVivo'
import { useToast } from '../components/ToastContext'
import { abrirSala, ligarMidia } from '../components/conectarSala'
import type { OpcoesDeMidia, SalaConectada } from '../components/conectarSala'
import { classeBotao } from '../components/estilos'
import useAgora from '../components/useAgora'
import useContagem from '../components/useContagem'
import useTitulo from '../components/useTitulo'
import { useSessao } from '../session/SessaoContext'

/**
 * A sala ao vivo (RF005/RF006), frame /reuniao-2 do Figma, contrato nas decisões 28 a 31 do backend. Esta página só
 * orquestra: lê a reunião, mostra a pré-entrada e, no clique em "Entrar", pede o token (`abrirSala`), conecta e o
 * descarta. A sala em si é `SalaAoVivo`.
 *
 * Regras que a página cumpre (CLAUDE.md, "Live room"):
 *  - o token (2 minutos) é pedido a CADA entrada e nunca é guardado; abrir esta página não pede token nenhum;
 *  - quem é o psicólogo é `identity === host_identity`; o nome real de um dependente nunca vai à LiveKit;
 *  - quem foi removido leva 403 no /join: texto calmo e nenhuma nova tentativa;
 *  - a lista de inscritos (leitura AUDITADA) é lida uma vez, no clique em "Entrar" do psicólogo (nunca em efeito, para o
 *    StrictMode não duplicar a auditoria) e não é lida de novo ao reconectar.
 */

type Fase =
    | 'carregando'
    | 'naoExiste'
    | 'erroDeLeitura'
    | 'lobby' // reunião lida; mostra a pré-entrada ou o motivo de ainda não dar para entrar
    | 'conectando'
    | 'naSala'
    | 'reconectando'
    | 'falhaDeConexao'
    | 'saiu'
    | 'encerrada'
    | 'removido'
    | 'outroLugar'

const TENTATIVAS_DE_RECONEXAO = 5
const ESPERA_MAXIMA_MS = 20_000

const dormir = (ms: number) => new Promise<void>((resolver) => setTimeout(resolver, ms))

function Cartao({ children }: { children: ReactNode }) {
    return (
        <div className="mx-auto w-full max-w-xl rounded-cartao bg-white p-6 text-gray-900 shadow-xl">{children}</div>
    )
}

export default function Reuniao() {
    const { id } = useParams()
    const reuniaoId = Number(id)
    const idValido = Number.isInteger(reuniaoId) && reuniaoId > 0
    const { me } = useSessao()
    const { avisar } = useToast()
    const { restante: esperaRestante, iniciar: iniciarEspera } = useContagem()

    const [fase, setFase] = useState<Fase>(idValido ? 'carregando' : 'naoExiste')
    const [reuniao, setReuniao] = useState<MeetingResponseDTO | null>(null)
    const [mensagemDeErro, setMensagemDeErro] = useState('')
    const [tentativaDeLeitura, setTentativaDeLeitura] = useState(0)
    const [erroDeEntrada, setErroDeEntrada] = useState<string | null>(null)
    const [sala, setSala] = useState<SalaConectada | null>(null)

    // Só o anfitrião: a lista auditada de inscritos, lida uma vez ao entrar. Fica aqui (e não na sala) para sobreviver a uma
    // reconexão sem outra leitura; some com a página
    const [inscritos, setInscritos] = useState<MeetingParticipantDTO[] | null>(null)
    const [erroDaLista, setErroDaLista] = useState<string | null>(null)
    const [lendoALista, setLendoALista] = useState(false)

    const vivoRef = useRef(true)
    const salaRef = useRef<SalaConectada | null>(null)
    const reconectandoRef = useRef(false)
    const opcoesRef = useRef<OpcoesDeMidia>({ camera: false, microfone: false })
    const aoDesconectarRef = useRef<(room: Room, motivo?: DisconnectReason) => void>(() => {})

    const limitesDoRelogio = useMemo(
        () => (reuniao ? [aberturaDaSala(reuniao), Date.parse(reuniao.ends_at)] : []),
        [reuniao],
    )
    const agora = useAgora(limitesDoRelogio)
    useTitulo(reuniao ? reuniao.title : 'Reunião')

    const voltarPara = me?.type_user === 'psicologo' ? '/Calendario' : '/minhas-reunioes'

    // A página está viva (StrictMode monta, desmonta e monta de novo em desenvolvimento)
    useEffect(() => {
        vivoRef.current = true
        return () => {
            vivoRef.current = false
        }
    }, [])

    // Sair da página (ou trocar de sala) desconecta; é a única coisa que o token deixou de ser: uma conexão
    useEffect(() => {
        if (!sala) return
        const room = sala.room
        return () => {
            void room.disconnect()
        }
    }, [sala])

    useEffect(() => {
        if (!idValido) return
        let obsoleta = false
        getMeeting(reuniaoId)
            .then((m) => {
                if (obsoleta) return
                setReuniao(m)
                setFase((atual) => (atual === 'carregando' ? 'lobby' : atual))
            })
            .catch((erro: unknown) => {
                if (obsoleta) return
                if (erro instanceof ApiError && erro.status === 404) {
                    setFase('naoExiste')
                    return
                }
                setMensagemDeErro(erro instanceof ApiError ? erro.message : 'Algo deu errado. Tente novamente em instantes.')
                setFase('erroDeLeitura')
            })
        return () => {
            obsoleta = true
        }
    }, [idValido, reuniaoId, tentativaDeLeitura])

    async function atualizarReuniao() {
        try {
            const m = await getMeeting(reuniaoId)
            if (vivoRef.current) setReuniao(m)
        } catch {
            // fica com o que já tinha
        }
    }

    function encerrarSessao(destino: 'saiu' | 'encerrada' | 'removido' | 'outroLugar') {
        salaRef.current = null
        reconectandoRef.current = false
        setSala(null)
        setFase(destino)
    }

    async function lerInscritos() {
        setLendoALista(true)
        setErroDaLista(null)
        try {
            const lista = await listParticipants(reuniaoId)
            if (vivoRef.current) setInscritos(lista)
        } catch (erro) {
            if (vivoRef.current) {
                setErroDaLista(erro instanceof ApiError ? erro.message : 'Não foi possível ler a lista de inscritos.')
            }
        } finally {
            if (vivoRef.current) setLendoALista(false)
        }
    }

    function tratarFalhaDeEntrada(erro: unknown) {
        setFase('lobby')
        if (erro instanceof ApiError) {
            if (erro.status === 403) {
                // Quem foi removido (ou nunca esteve inscrito): sem laço de nova tentativa
                setFase('removido')
                return
            }
            if (erro.status === 404) {
                setFase('naoExiste')
                return
            }
            if (erro.code === 'MEETING_NOT_OPEN') {
                // O relógio do servidor manda: relê a reunião para a tela mostrar o estado verdadeiro
                void atualizarReuniao()
                const abertura = reuniao ? format(aberturaDaSala(reuniao), 'HH:mm') : null
                setErroDeEntrada(
                    abertura
                        ? `A sala ainda não está aberta: ela abre às ${abertura}. Se o horário já passou, confira o relógio do seu computador.`
                        : erro.message,
                )
                return
            }
            if (erro.retryAfterSeconds) iniciarEspera(erro.retryAfterSeconds)
            setErroDeEntrada(erro.message)
            return
        }
        setErroDeEntrada('Não foi possível conectar à sala de vídeo. Confira a sua conexão e tente de novo.')
    }

    async function entrar(opcoes: OpcoesDeMidia) {
        setErroDeEntrada(null)
        setFase('conectando')
        opcoesRef.current = opcoes
        let nova: SalaConectada
        try {
            nova = await abrirSala(reuniaoId, (room, motivo) => aoDesconectarRef.current(room, motivo))
        } catch (erro) {
            if (vivoRef.current) tratarFalhaDeEntrada(erro)
            return
        }
        if (!vivoRef.current) {
            void nova.room.disconnect()
            return
        }
        salaRef.current = nova
        setSala(nova)
        setFase('naSala')
        if (nova.identity === nova.hostIdentity) {
            const falhas = await ligarMidia(nova.room, opcoes)
            if (falhas.length > 0) {
                avisar(`Não foi possível ligar ${falhas.join(' e ')}. Você pode tentar de novo nos botões da sala.`, 'info')
            }
            await lerInscritos()
        }
    }

    // Queda longa: o SDK já tentou voltar sozinho. Aqui pedimos OUTRO token (o antigo vale 2 minutos e só conta na primeira
    // conexão), com espera crescente e respeitando o Retry-After, e desistimos depois de algumas tentativas
    async function reconectar() {
        if (reconectandoRef.current) return
        reconectandoRef.current = true
        setFase('reconectando')
        let espera = 2000
        for (let tentativa = 1; tentativa <= TENTATIVAS_DE_RECONEXAO; tentativa++) {
            await dormir(espera)
            if (!vivoRef.current || !reconectandoRef.current) return
            try {
                const nova = await abrirSala(reuniaoId, (room, motivo) => aoDesconectarRef.current(room, motivo))
                if (!vivoRef.current || !reconectandoRef.current) {
                    void nova.room.disconnect()
                    return
                }
                salaRef.current = nova
                setSala(nova)
                reconectandoRef.current = false
                setFase('naSala')
                if (nova.identity === nova.hostIdentity) {
                    await ligarMidia(nova.room, opcoesRef.current)
                } else {
                    // O token novo nasce sem permissão de falar: quem estava liberado precisa pedir de novo
                    avisar('Você voltou para a sala. Se estava falando, peça de novo ao psicólogo.', 'info')
                }
                return
            } catch (erro) {
                if (erro instanceof ApiError) {
                    if (erro.status === 403) {
                        encerrarSessao('removido')
                        return
                    }
                    if (erro.status === 404) {
                        reconectandoRef.current = false
                        setFase('naoExiste')
                        return
                    }
                    if (erro.code === 'MEETING_NOT_OPEN') {
                        void atualizarReuniao()
                        encerrarSessao('encerrada')
                        return
                    }
                    if (erro.retryAfterSeconds) espera = Math.max(espera, erro.retryAfterSeconds * 1000)
                }
                espera = Math.min(espera * 2, ESPERA_MAXIMA_MS)
            }
        }
        reconectandoRef.current = false
        if (vivoRef.current) setFase('falhaDeConexao')
    }

    function aoDesconectar(room: Room, motivo?: DisconnectReason) {
        // Evento de uma sala que já foi deixada ou trocada: ignora
        if (salaRef.current?.room !== room) return
        switch (motivo) {
            case DisconnectReason.CLIENT_INITIATED:
                return
            case DisconnectReason.PARTICIPANT_REMOVED:
                encerrarSessao('removido')
                return
            case DisconnectReason.ROOM_DELETED:
                // Encerrada (ou cancelada, dentro da janela) pelo anfitrião: a sala foi fechada para todos
                encerrarSessao('encerrada')
                void atualizarReuniao()
                return
            case DisconnectReason.DUPLICATE_IDENTITY:
                encerrarSessao('outroLugar')
                return
            default:
                void reconectar()
        }
    }

    // O SDK guarda o callback que recebeu em `abrirSala`; esta ref o mantém apontando para a versão mais nova da função
    useEffect(() => {
        aoDesconectarRef.current = aoDesconectar
    })

    function recomecar() {
        setErroDeEntrada(null)
        setFase('lobby')
    }

    // ---------------------------------------------------------------------------------------------------------------
    // O que mostrar

    const ehAnfitriao = reuniao?.owned_by_me === true

    function conteudo(): ReactNode {
        if (fase === 'carregando') {
            return (
                <Cartao>
                    <Carregando mensagem="Abrindo a reunião…" />
                </Cartao>
            )
        }

        if (fase === 'naoExiste') {
            return (
                <Cartao>
                    <EstadoVazio
                        icone={<CalendarDays size={26} />}
                        titulo="Não encontramos essa reunião"
                        descricao="O endereço pode estar errado, ou a reunião não existe mais. Veja as reuniões marcadas no calendário."
                        acao={
                            <Link to={voltarPara} className={classeBotao()}>
                                Voltar
                            </Link>
                        }
                    />
                </Cartao>
            )
        }

        if (fase === 'erroDeLeitura') {
            return (
                <Cartao>
                    <EstadoErro
                        mensagem={mensagemDeErro}
                        onTentarNovamente={() => {
                            setFase('carregando')
                            setTentativaDeLeitura((n) => n + 1)
                        }}
                        acao={
                            <Link to={voltarPara} className={classeBotao('secundario')}>
                                Voltar
                            </Link>
                        }
                    />
                </Cartao>
            )
        }

        if (fase === 'conectando') {
            return (
                <Cartao>
                    <Carregando mensagem="Entrando na sala…" />
                </Cartao>
            )
        }

        if (fase === 'naSala' && sala && reuniao) {
            return (
                <SalaAoVivo
                    room={sala.room}
                    reuniao={reuniao}
                    identity={sala.identity}
                    hostIdentity={sala.hostIdentity}
                    inscritos={inscritos}
                    erroDaLista={erroDaLista}
                    lendoALista={lendoALista}
                    onLerDeNovo={() => void lerInscritos()}
                    onRemovido={(identidade) => setInscritos((lista) => lista && lista.filter((p) => p.identity !== identidade))}
                    onSair={() => encerrarSessao('saiu')}
                    onEncerrada={() => {
                        encerrarSessao('encerrada')
                        void atualizarReuniao()
                    }}
                />
            )
        }

        if (fase === 'reconectando') {
            return (
                <Cartao>
                    <Carregando mensagem="A conexão caiu. Estamos reconectando você à sala…" />
                    <div className="flex justify-center pb-2">
                        <Botao variante="secundario" onClick={() => encerrarSessao('saiu')}>
                            Sair da reunião
                        </Botao>
                    </div>
                </Cartao>
            )
        }

        if (fase === 'falhaDeConexao') {
            return (
                <Cartao>
                    <EstadoErro
                        titulo="Não conseguimos reconectar"
                        mensagem="Não foi possível voltar para a sala. Confira a sua conexão e tente de novo."
                        onTentarNovamente={() => void reconectar()}
                        acao={
                            <Botao variante="secundario" onClick={() => encerrarSessao('saiu')}>
                                Sair da reunião
                            </Botao>
                        }
                    />
                </Cartao>
            )
        }

        if (fase === 'removido') {
            return (
                <Cartao>
                    <EstadoVazio
                        icone={<Heart size={26} />}
                        titulo="Você não está mais nesta reunião"
                        descricao="A sua participação nesta reunião foi encerrada pelo psicólogo responsável. Você pode voltar e ver as outras reuniões marcadas."
                        acao={
                            <Link to={voltarPara} className={classeBotao()}>
                                Voltar
                            </Link>
                        }
                    />
                </Cartao>
            )
        }

        if (fase === 'outroLugar') {
            return (
                <Cartao>
                    <EstadoVazio
                        icone={<DoorOpen size={26} />}
                        titulo="Você entrou nesta reunião em outro lugar"
                        descricao="A sala aceita você em uma janela por vez, e esta foi encerrada. Se quiser continuar por aqui, é só entrar de novo."
                        acao={
                            <div className="flex flex-wrap justify-center gap-2">
                                <Botao onClick={recomecar}>Entrar de novo aqui</Botao>
                                <Link to={voltarPara} className={classeBotao('secundario')}>
                                    Voltar
                                </Link>
                            </div>
                        }
                    />
                </Cartao>
            )
        }

        if (fase === 'saiu') {
            return (
                <Cartao>
                    <EstadoVazio
                        icone={<DoorOpen size={26} />}
                        titulo="Você saiu da reunião"
                        descricao={
                            ehAnfitriao
                                ? 'A reunião continua aberta para quem está na sala. Para encerrá-la para todos, volte e use "Encerrar a reunião".'
                                : 'Você pode voltar enquanto a reunião estiver acontecendo.'
                        }
                        acao={
                            <div className="flex flex-wrap justify-center gap-2">
                                {reuniao && podeEntrar(reuniao, agora) && <Botao onClick={recomecar}>Voltar para a sala</Botao>}
                                <Link to={voltarPara} className={classeBotao('secundario')}>
                                    Ir para as reuniões
                                </Link>
                            </div>
                        }
                    />
                </Cartao>
            )
        }

        if (fase === 'encerrada') {
            const cancelada = reuniao?.status === 'cancelled'
            return (
                <Cartao>
                    <EstadoVazio
                        icone={<Heart size={26} />}
                        titulo={cancelada ? 'Esta reunião foi cancelada' : 'A reunião terminou'}
                        descricao={
                            cancelada
                                ? 'O psicólogo cancelou esta reunião. Veja no calendário os próximos encontros.'
                                : 'Obrigado por estar aqui. Cuidar de si é um passo de cada vez, e você pode voltar ao calendário para ver os próximos encontros.'
                        }
                        acao={
                            <Link to={voltarPara} className={classeBotao()}>
                                Ir para as reuniões
                            </Link>
                        }
                    />
                </Cartao>
            )
        }

        // fase === 'lobby': a reunião foi lida e ainda não entramos
        if (!reuniao) return null

        if (!reuniao.owned_by_me && !reuniao.registered_by_me) {
            return (
                <Cartao>
                    <EstadoVazio
                        icone={<CalendarDays size={26} />}
                        titulo="Você não está inscrito nesta reunião"
                        descricao="Só quem organiza a reunião e quem se inscreveu entra na sala. Veja no calendário se ainda há vaga."
                        acao={
                            <Link to="/Calendario" className={classeBotao()}>
                                Abrir o calendário
                            </Link>
                        }
                    />
                </Cartao>
            )
        }

        if (reuniao.status === 'cancelled') {
            return (
                <Cartao>
                    <EstadoVazio
                        icone={<CalendarDays size={26} />}
                        titulo="Esta reunião foi cancelada"
                        descricao="O psicólogo cancelou este encontro. Veja no calendário os próximos."
                        acao={
                            <Link to={voltarPara} className={classeBotao()}>
                                Ir para as reuniões
                            </Link>
                        }
                    />
                </Cartao>
            )
        }

        if (reuniao.status === 'ended' || agora >= Date.parse(reuniao.ends_at)) {
            return (
                <Cartao>
                    <EstadoVazio
                        icone={<Heart size={26} />}
                        titulo="Esta reunião já terminou"
                        descricao="Obrigado por fazer parte. Veja no calendário os próximos encontros."
                        acao={
                            <Link to={voltarPara} className={classeBotao()}>
                                Ir para as reuniões
                            </Link>
                        }
                    />
                </Cartao>
            )
        }

        if (!podeEntrar(reuniao, agora)) {
            const abertura = aberturaDaSala(reuniao)
            return (
                <Cartao>
                    <EstadoVazio
                        icone={<DoorOpen size={26} />}
                        titulo="A sala ainda não abriu"
                        descricao={`${reuniao.title} começa às ${format(parseISO(reuniao.starts_at), 'HH:mm')}. A sala abre às ${format(abertura, 'HH:mm', { locale: ptBR })}, 10 minutos antes. Pode deixar esta página aberta: a entrada se libera sozinha.`}
                        acao={
                            <Link to={voltarPara} className={classeBotao('secundario')}>
                                Voltar
                            </Link>
                        }
                    />
                </Cartao>
            )
        }

        return (
            <PreEntradaSala
                reuniao={reuniao}
                ehAnfitriao={ehAnfitriao}
                entrando={false}
                erro={erroDeEntrada}
                esperaRestante={esperaRestante}
                onEntrar={(opcoes) => void entrar(opcoes)}
                voltarPara={voltarPara}
            />
        )
    }

    const naSala = fase === 'naSala' && sala !== null && reuniao !== null

    return (
        <div className="flex min-h-screen flex-col bg-sala-fundo font-roboto text-white">
            <a
                href="#conteudo"
                className="sr-only rounded-botao bg-white px-4 py-2 font-medium text-plad shadow focus:not-sr-only focus:absolute focus:left-2 focus:top-2 focus:z-50"
            >
                Pular para o conteúdo
            </a>
            <main id="conteudo" tabIndex={-1} className="flex min-w-0 flex-1 flex-col focus:outline-none">
                {naSala ? (
                    conteudo()
                ) : (
                    <div className="flex flex-1 items-center justify-center px-4 py-10">{conteudo()}</div>
                )}
            </main>
            <Rodape />
        </div>
    )
}
