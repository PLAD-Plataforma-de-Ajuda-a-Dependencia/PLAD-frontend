import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '../api/client'
import { ACEITE_DE_PARTICIPACAO_VIGENTE } from '../api/consentimento'
import { mensagemDeInscricao, registerForMeeting } from '../api/meetings'
import type { MeetingResponseDTO } from '../api/meetings'
import { useSessao } from '../session/SessaoContext'
import { useToast } from './ToastContext'

interface OpcoesInscricao {
    /** A tela a que o consentimento de saúde devolve a pessoa depois do aceite (`state.de`) */
    origem: string
    /** A inscrição deu certo: a reunião como a API a devolveu, para a tela trocar a que mostra */
    aoInscrever: (reuniao: MeetingResponseDTO) => void
    /** A inscrição falhou (lotou, começou, foi cancelada): a tela pode estar velha e lê essa reunião de novo */
    aoFalhar?: (id: number) => void
}

/**
 * O caminho de uma inscrição em reunião (dependente), o mesmo no popup do Calendário e no detalhe da reunião.
 * "Inscrever-se" (`pedir`) ainda não inscreve: primeiro vem o consentimento para tratar dado de saúde, em tela própria
 * (o backend recusa a inscrição sem ele), e depois o termo de participação, que se aceita a cada inscrição. Só `aceitar`
 * (o botão do termo) manda o POST, com a versão do termo. Um 400 CONSENT_REQUIRED relê o `me`: se falta o consentimento
 * de saúde, a pessoa vai para ele; se foi o termo que mudou de versão, a mensagem diz.
 * A tela renderiza `<TermoDeParticipacao reuniao={termoAberto} …>` enquanto `termoAberto` não for nulo.
 */
export default function useInscricao({ origem, aoInscrever, aoFalhar }: OpcoesInscricao) {
    const { me, recarregarMe } = useSessao()
    const navigate = useNavigate()
    const { avisar } = useToast()
    const [termoAberto, setTermoAberto] = useState<MeetingResponseDTO | null>(null)
    // Id da reunião cuja inscrição está sendo enviada (o botão fica ocupado)
    const [emCurso, setEmCurso] = useState<number | null>(null)

    function irParaConsentimentoDeSaude() {
        navigate('/consentimento-saude', { state: { de: origem } })
    }

    function pedir(reuniao: MeetingResponseDTO) {
        if (emCurso !== null) return
        if (me?.health_consent_pending) {
            irParaConsentimentoDeSaude()
            return
        }
        setTermoAberto(reuniao)
    }

    async function aceitar() {
        if (!termoAberto || emCurso !== null) return
        const reuniao = termoAberto
        setEmCurso(reuniao.id)
        try {
            const atualizada = await registerForMeeting(reuniao.id, ACEITE_DE_PARTICIPACAO_VIGENTE)
            setTermoAberto(null)
            avisar('Inscrição feita.', 'sucesso')
            aoInscrever(atualizada)
        } catch (erro) {
            setTermoAberto(null)
            if (erro instanceof ApiError && erro.code === 'CONSENT_REQUIRED') {
                // Falta o consentimento de saúde (o `me` estava velho) ou o termo mudou de versão: o `me` diz qual dos dois
                const atual = await recarregarMe().catch(() => null)
                if (atual?.health_consent_pending) irParaConsentimentoDeSaude()
                else avisar(mensagemDeInscricao(erro), 'erro')
            } else {
                avisar(mensagemDeInscricao(erro), 'erro')
                aoFalhar?.(reuniao.id)
            }
        } finally {
            setEmCurso(null)
        }
    }

    return {
        pedir,
        emCurso,
        termoAberto,
        aceitar,
        fecharTermo: () => setTermoAberto(null),
    }
}
