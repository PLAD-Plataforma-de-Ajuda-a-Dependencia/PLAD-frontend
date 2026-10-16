import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Home from './pages/home'
import CriarConta from './pages/criarConta'
import Login from './pages/Login'
import AdminPsico from './pages/adminPsico'
import Triagem from './pages/Triagem'
import Calendario from './pages/Calendario'
import RotaProtegida from './components/RotaProtegida'

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Home />} />
                {/* O cadastro de psicólogo é a segunda etapa de /criar-conta, sem rota própria */}
                <Route path="/criar-conta" element={<CriarConta />} />
                <Route path="/login" element={<Login />} />
                <Route element={<RotaProtegida />}>
                    <Route path="/adminPsico" element={<AdminPsico />} />
                    <Route path="/Triagem" element={<Triagem />} />
                    <Route path="/Calendario" element={<Calendario />} />
                </Route>
                <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
        </BrowserRouter>
    )
}
