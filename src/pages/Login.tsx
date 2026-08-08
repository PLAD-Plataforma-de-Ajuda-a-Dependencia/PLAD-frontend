import React, { useState } from 'react'

export default function Login() {
    const [formData, setFormData] = useState({
        email: '',
        username: '',
        password: '',
    })

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target
        setFormData((prev) => ({ ...prev, [name]: value }))
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault()
        console.log('Dados:', formData)
    }

    return (
        <div className="min-h-screen flex flex-col justify-between bg-white px-4 py-8 text-gray-900 font-sans">
            {/* Topo - Nome da aplicação */}
            <header className="text-center pt-2">
        <span className="font-bold tracking-wider text-black text-3xl uppercase">
          PLAD
        </span>
            </header>

            {/* Form de Cadastro */}
            <main className="w-full max-w-sm mx-auto flex-1 flex flex-col justify-center items-center">
                <h1 className="text-3xl font-extrabold text-black text-center mb-2 tracking-tight">
                    Criar a sua conta
                </h1>
                <p className="text-gray-600 text-center text-sm mb-8">
                    Crie uma conta para salvar suas configurações e comece a usar o PLAD.
                </p>

                <form onSubmit={handleSubmit} className="w-full space-y-3.5">
                    <div>
                        <input
                            type="email"
                            name="email"
                            placeholder="Endereço de E-mail"
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full px-3.5 py-2.5 border border-indigo-300 rounded-md text-sm text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                        />
                    </div>

                    <div>
                        <input
                            type="text"
                            name="username"
                            placeholder="Nome de usuário"
                            value={formData.username}
                            onChange={handleChange}
                            className="w-full px-3.5 py-2.5 border border-indigo-300 rounded-md text-sm text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                        />
                    </div>

                    <div>
                        <input
                            type="password"
                            name="password"
                            placeholder="Senha"
                            value={formData.password}
                            onChange={handleChange}
                            className="w-full px-3.5 py-2.5 border border-indigo-300 rounded-md text-sm text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                        />
                    </div>

                    {/* Avisos */}
                    <div className="pt-6 text-center text-xs space-y-1">
                        <p className="font-semibold text-black">
                            Deve ter pelo menos 18 anos.
                        </p>
                        <p className="text-gray-500">
                            Seu endereço de e-mail é mantido em sigilo.
                        </p>
                    </div>
                </form>
            </main>

            {/* Botão de Próximo centralizado no rodapé */}
            <footer className="w-full max-w-xs mx-auto pb-4">
                <button
                    onClick={handleSubmit}
                    type="submit"
                    className="w-full py-3 px-6 bg-indigo-500 hover:bg-indigo-600 text-white font-medium rounded-lg transition-colors text-sm"
                >
                    Próximo
                </button>
            </footer>
        </div>
    )
}