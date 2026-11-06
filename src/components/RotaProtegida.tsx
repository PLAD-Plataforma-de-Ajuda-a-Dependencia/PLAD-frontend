import { useEffect } from 'react'
import { Link, Navigate, Outlet, useLocation } from 'react-router-dom'
import type { UserType } from '../api/auth'
import { destinoPorPapel, useSessao } from '../session/SessaoContext'
import Carregando from './Carregando'
import EstadoErro from './EstadoErro'
import ModalConsentimento from './ModalConsentimento'
import { classeBotao } from './estilos'

/**
 * Só deixa passar quem tem sessão e, se `papeis` for informado, um dos papéis listados.
 * Sem sessão vai para o login (que devolve a pessoa a esta tela depois de entrar); com a sessão de outro papel vai
 * para a primeira tela do próprio papel.
 * Na primeira rota protegida tenta recuperar a sessão pelo cookie de refresh (o access token vive só em memória).
 * Se não der para saber (sem conexão, servidor fora do ar, limite de tentativas), avisa e oferece tentar de novo em
 * vez de mandar para o login em silêncio.
 * Com o aceite dos termos pendente, o pop-up ModalConsentimento cobre a página, que fica inerte por baixo.
 * É apenas UX: quem garante o acesso é o backend.
 */
export default function RotaProtegida({ papeis }: { papeis?: UserType[] }) {
    const { status, me, falha, sessaoExpirada, garantirSessao, tentarNovamente } = useSessao()
    const location = useLocation()

    useEffect(() => {
        if (status === 'desconhecido') {
            void garantirSessao()
        }
    }, [status, garantirSessao])

    if (status === 'desconhecido' || status === 'carregando') {
        return <Carregando tela mensagem="Verificando a sua sessão…" />
    }

    if (status === 'indisponivel') {
        return (
            <EstadoErro
                tela
                titulo="Não conseguimos abrir agora"
                mensagem={falha?.mensagem ?? 'Não foi possível verificar a sua sessão.'}
                onTentarNovamente={() => void tentarNovamente()}
                acao={
                    <Link to="/" className={classeBotao('texto')}>
                        Ir para o início
                    </Link>
                }
            />
        )
    }

    if (status === 'anonimo' || !me) {
        return (
            <Navigate
                to="/login"
                replace
                state={{ de: location.pathname + location.search, aviso: sessaoExpirada ? 'sessao-expirada' : undefined }}
            />
        )
    }

    if (papeis && !papeis.includes(me.type_user)) {
        return <Navigate to={destinoPorPapel(me)} replace />
    }

    return (
        <>
            <div inert={me.consent_pending}>
                <Outlet />
            </div>
            <ModalConsentimento />
        </>
    )
}
