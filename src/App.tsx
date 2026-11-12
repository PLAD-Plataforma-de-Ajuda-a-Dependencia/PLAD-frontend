import { lazy, Suspense, type ReactNode } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/home'
import CriarConta from './pages/criarConta'
import Login from './pages/Login'
import Triagem from './pages/Triagem'
import ComoProtegemos from './pages/comoProtegemos'
import ConsentimentoSaude from './pages/consentimentoSaude'
import MinhaConta from './pages/minhaConta'
import MinhasReunioes from './pages/minhasReunioes'
import NaoEncontrada from './pages/naoEncontrada'
import Privacidade from './pages/privacidade'
import Termos from './pages/termos'
import BannerConexao from './components/BannerConexao'
import Carregando from './components/Carregando'
import RotaProtegida from './components/RotaProtegida'
import ToastProvider from './components/ToastProvider'
import SessaoProvider from './session/SessaoProvider'

// Carregadas sob demanda, cada uma no seu pedaço do bundle: o principal fica abaixo dos 500 kB do aviso do Vite.
// A sala ao vivo traz o SDK do LiveKit (centenas de KB): só é baixada quando alguém abre /reuniao/:id. O calendário,
// a Gestão e as Triagens só servem a quem está logado no papel certo, então quem abre a home ou o login não as baixa.
const Reuniao = lazy(() => import('./pages/reuniao'))
const Calendario = lazy(() => import('./pages/Calendario'))
const AdminPsico = lazy(() => import('./pages/adminPsico'))
const Triagens = lazy(() => import('./pages/triagens'))

// O que aparece enquanto o pedaço da página chega (o mesmo `Carregando` de tela cheia das outras esperas)
function SobDemanda({ mensagem, children }: { mensagem: string; children: ReactNode }) {
    return <Suspense fallback={<Carregando tela mensagem={mensagem} />}>{children}</Suspense>
}

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
                        {/* Documentos públicos (sem login): abrem em outra aba a partir do cadastro e do pop-up de consentimento */}
                        <Route path="/termos" element={<Termos />} />
                        <Route path="/privacidade" element={<Privacidade />} />
                        <Route path="/como-protegemos" element={<ComoProtegemos />} />
                        {/* Qualquer papel logado */}
                        <Route element={<RotaProtegida />}>
                            <Route path="/minha-conta" element={<MinhaConta />} />
                        </Route>
                        {/* Psicólogo e admin não abrem a triagem */}
                        <Route element={<RotaProtegida papeis={['dependente']} />}>
                            <Route path="/Triagem" element={<Triagem />} />
                            {/* O consentimento para tratar dado de saúde: a triagem e a inscrição em reunião mandam para cá */}
                            <Route path="/consentimento-saude" element={<ConsentimentoSaude />} />
                            <Route path="/minhas-reunioes" element={<MinhasReunioes />} />
                        </Route>
                        <Route element={<RotaProtegida papeis={['dependente', 'psicologo']} />}>
                            <Route
                                path="/Calendario"
                                element={
                                    <SobDemanda mensagem="Carregando o calendário…">
                                        <Calendario />
                                    </SobDemanda>
                                }
                            />
                            {/* A sala ao vivo: o anfitrião e o dependente inscrito (o POST /join responde 403 aos outros) */}
                            <Route
                                path="/reuniao/:id"
                                element={
                                    <SobDemanda mensagem="Abrindo a reunião…">
                                        <Reuniao />
                                    </SobDemanda>
                                }
                            />
                        </Route>
                        {/* Gestão: só o admin (as rotas /admin/* do backend respondem 403 aos outros) */}
                        <Route element={<RotaProtegida papeis={['admin']} />}>
                            <Route
                                path="/adminPsico"
                                element={
                                    <SobDemanda mensagem="Carregando a gestão…">
                                        <AdminPsico />
                                    </SobDemanda>
                                }
                            />
                        </Route>
                        {/* Triagens recebidas: só o psicólogo lê com o nome real (GET /triages responde 403 aos outros) */}
                        <Route element={<RotaProtegida papeis={['psicologo']} />}>
                            <Route
                                path="/triagens"
                                element={
                                    <SobDemanda mensagem="Carregando as triagens…">
                                        <Triagens />
                                    </SobDemanda>
                                }
                            />
                        </Route>
                        <Route path="*" element={<NaoEncontrada />} />
                    </Routes>
                </SessaoProvider>
            </ToastProvider>
        </BrowserRouter>
    )
}
