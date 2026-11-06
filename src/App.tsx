import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/home'
import CriarConta from './pages/criarConta'
import Login from './pages/Login'
import AdminPsico from './pages/adminPsico'
import Triagem from './pages/Triagem'
import Calendario from './pages/Calendario'
import MinhaConta from './pages/minhaConta'
import RotaProtegida from './components/RotaProtegida'
import SessaoProvider from './session/SessaoProvider'

export default function App() {
    return (
        <BrowserRouter>
            <SessaoProvider>
                <Routes>
                    <Route path="/" element={<Home />} />
                    {/* O cadastro de psicólogo é a segunda etapa de /criar-conta, sem rota própria */}
                    <Route path="/criar-conta" element={<CriarConta />} />
                    <Route path="/login" element={<Login />} />
                    {/* Qualquer papel logado */}
                    <Route element={<RotaProtegida />}>
                        <Route path="/minha-conta" element={<MinhaConta />} />
                    </Route>
                    {/* Psicólogo e admin não abrem a triagem */}
                    <Route element={<RotaProtegida papeis={['dependente']} />}>
                        <Route path="/Triagem" element={<Triagem />} />
                    </Route>
                    <Route element={<RotaProtegida papeis={['dependente', 'psicologo']} />}>
                        <Route path="/Calendario" element={<Calendario />} />
                    </Route>
                    {/* Gestão: admin e psicólogo, pela barra lateral */}
                    <Route element={<RotaProtegida papeis={['admin', 'psicologo']} />}>
                        <Route path="/adminPsico" element={<AdminPsico />} />
                    </Route>
                    <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
            </SessaoProvider>
        </BrowserRouter>
    )
}
