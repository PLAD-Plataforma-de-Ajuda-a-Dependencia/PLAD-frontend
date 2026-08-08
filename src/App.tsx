import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Home from './pages/home'
import CriarConta from './pages/criarConta'
import Login from './pages/Login'

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/criar-conta" element={<CriarConta />} />
                <Route path="/login" element={<Login />} />
            </Routes>
        </BrowserRouter>
    )
}