import { lazy, Suspense } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/home'
import CriarConta from './pages/criarConta'
import Login from './pages/Login'
import AdminPsico from './pages/adminPsico'
import Triagem from './pages/Triagem'
import Triagens from './pages/triagens'
import Calendario from './pages/Calendario'
import MinhaConta from './pages/minhaConta'
import MinhasReunioes from './pages/minhasReunioes'
import NaoEncontrada from './pages/naoEncontrada'
import BannerConexao from './components/BannerConexao'
import Carregando from './components/Carregando'
import RotaProtegida from './components/RotaProtegida'
import ToastProvider from './components/ToastProvider'
import SessaoProvider from './session/SessaoProvider'

// A sala ao vivo traz o SDK do LiveKit (centenas de KB): só é baixada quando alguém abre /reuniao/:id
const Reuniao = lazy(() => import('./pages/reuniao'))

export default function App() {
    return (
        <BrowserRouter>
            <ToastProvider>
                <SessaoProvider>
                    <BannerConexao />
                    <Routes>
                        <Route path="/" element={<Home />} />
                        {/* O cadastro de psicólogo é a segunda etapa de /criar-conta (?etapa=2), sem rota própria */}
                        <Route path="/criar-conta" element={<CriarConta />} />
                        <Route path="/login" element={<Login />} />
                        {/* Qualquer papel logado */}
                        <Route element={<RotaProtegida />}>
                            <Route path="/minha-conta" element={<MinhaConta />} />
                        </Route>
                        {/* Psicólogo e admin não abrem a triagem */}
                        <Route element={<RotaProtegida papeis={['dependente']} />}>
                            <Route path="/Triagem" element={<Triagem />} />
                            <Route path="/minhas-reunioes" element={<MinhasReunioes />} />
                        </Route>
                        <Route element={<RotaProtegida papeis={['dependente', 'psicologo']} />}>
                            <Route path="/Calendario" element={<Calendario />} />
                            {/* A sala ao vivo: o anfitrião e o dependente inscrito (o POST /join responde 403 aos outros) */}
                            <Route
                                path="/reuniao/:id"
                                element={
                                    <Suspense fallback={<Carregando tela mensagem="Abrindo a reunião…" />}>
                                        <Reuniao />
                                    </Suspense>
                                }
                            />
                        </Route>
                        {/* Gestão: só o admin (as rotas /admin/* do backend respondem 403 aos outros) */}
                        <Route element={<RotaProtegida papeis={['admin']} />}>
                            <Route path="/adminPsico" element={<AdminPsico />} />
                        </Route>
                        {/* Triagens recebidas: só o psicólogo lê com o nome real (GET /triages responde 403 aos outros) */}
                        <Route element={<RotaProtegida papeis={['psicologo']} />}>
                            <Route path="/triagens" element={<Triagens />} />
                        </Route>
                        <Route path="*" element={<NaoEncontrada />} />
                    </Routes>
                </SessaoProvider>
            </ToastProvider>
        </BrowserRouter>
    )
}
