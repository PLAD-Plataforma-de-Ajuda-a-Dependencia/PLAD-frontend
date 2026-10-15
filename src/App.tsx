import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/home'
import CriarConta from './pages/criarConta'
import Login from './pages/Login'
import PsicologoSolicita from './pages/psicologoSolicita'
import AdminPsico from './pages/adminPsico'
import Triagem from './pages/Triagem'
import Calendario from './pages/Calendario'

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/criar-conta" element={<CriarConta />} />
                <Route path="/login" element={<Login />} />
                <Route path="/psicologoSolicita" element={<PsicologoSolicita />} />
                <Route path="/adminPsico" element={<AdminPsico />} />
                <Route path="/Triagem" element={<Triagem />} />
                <Route path="/Calendario" element={<Calendario />} />
            </Routes>
        </BrowserRouter>
    )
}