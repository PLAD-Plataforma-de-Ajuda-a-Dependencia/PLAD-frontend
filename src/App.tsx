import { BrowserRouter, Routes, Route, Link, useLocation } from 'react-router-dom'
import Login from './pages/Login'

// Componente para a Home rápida
function Home() {
  return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-4">
        <h1 className="text-2xl font-bold mb-4">Página Inicial</h1>
        <Link
            to="/login"
            className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
        >
          Ir para Login
        </Link>
      </div>
  )
}

// Navbar simples que só aparece quando NÃO estamos no login
function Navigation() {
  const location = useLocation()
  if (location.pathname === '/login') return null

  return (
      <nav className="p-4 bg-gray-100 flex justify-center gap-4 border-b">
        <Link to="/" className="text-gray-700 hover:text-black font-medium">
          Home
        </Link>
        <Link to="/login" className="text-indigo-600 font-semibold hover:underline">
          Ver Tela de Login
        </Link>
      </nav>
  )
}

export default function App() {
  return (
      <BrowserRouter>
        <Navigation />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
        </Routes>
      </BrowserRouter>
  )
}