import { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import type { UserType } from '../api/auth'
import { destinoPorPapel, useSessao } from '../session/SessaoContext'
import ModalConsentimento from './ModalConsentimento'

/**
 * Só deixa passar quem tem sessão e, se `papeis` for informado, um dos papéis listados.
 * Sem sessão vai para o login; com a sessão de outro papel vai para a primeira tela do próprio papel.
 * Na primeira rota protegida tenta recuperar a sessão pelo cookie de refresh (o access token vive só em memória).
 * Com o aceite dos termos pendente, o pop-up ModalConsentimento cobre a página, que fica inerte por baixo.
 * É apenas UX: quem garante o acesso é o backend.
 */
export default function RotaProtegida({ papeis }: { papeis?: UserType[] }) {
    const { status, me, garantirSessao } = useSessao()

    useEffect(() => {
        if (status === 'desconhecido') {
            void garantirSessao()
        }
    }, [status, garantirSessao])

    if (status === 'desconhecido' || status === 'carregando') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-white font-roboto">
                <p role="status" className="text-sm text-gray-500">
                    Carregando…
                </p>
            </div>
        )
    }

    if (status === 'anonimo' || !me) {
        return <Navigate to="/login" replace />
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
