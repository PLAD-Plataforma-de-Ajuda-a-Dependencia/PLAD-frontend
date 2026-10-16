import { Navigate, Outlet } from 'react-router-dom'
import { getToken, isTokenExpired } from '../api/token'

/**
 * Só deixa passar quem tem um JWT não vencido; senão manda para o login.
 * É apenas UX: quem garante o acesso é o backend. O JWT não traz o tipo de usuário,
 * então esta checagem não distingue dependente, psicólogo ou admin.
 */
export default function RotaProtegida() {
    const token = getToken()
    if (!token || isTokenExpired(token)) {
        return <Navigate to="/login" replace />
    }
    return <Outlet />
}
