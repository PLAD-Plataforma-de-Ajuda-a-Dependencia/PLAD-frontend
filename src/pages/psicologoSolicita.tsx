import React, { useState } from 'react'

type CrmCrpType = 'CRM' | 'CRP'

interface PsychologistFormData {
    graduate: string
    credentialType: CrmCrpType
    crmCrpNumber: string
}

export default function PsychologistRegister() {
    const [formData, setFormData] = useState<PsychologistFormData>({
        graduate: '',
        credentialType: 'CRP',
        crmCrpNumber: '',
    })

    const handleChange = (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
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

            {/* Form de Cadastro do Psicólogo */}
            <main className="w-full max-w-sm mx-auto flex-1 flex flex-col justify-center items-center">
                <h1 className="text-3xl font-extrabold text-black text-center mb-2 tracking-tight">
                    Dados profissionais
                </h1>
                <p className="text-gray-600 text-center text-sm mb-8">
                    Complete seu cadastro como psicólogo para começar a atender no PLAD.
                </p>

                <form onSubmit={handleSubmit} className="w-full space-y-3.5">
                    <div>
                        <input
                            type="text"
                            name="graduate"
                            placeholder="Formação acadêmica"
                            value={formData.graduate}
                            onChange={handleChange}
                            className="w-full px-3.5 py-2.5 border border-indigo-300 rounded-md text-sm text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                        />
                    </div>

                    <div>
                        <select
                            name="credentialType"
                            value={formData.credentialType}
                            onChange={handleChange}
                            className="w-full px-3.5 py-2.5 border border-indigo-300 rounded-md text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition bg-white"
                        >
                            <option value="CRP">CRP</option>
                            <option value="CRM">CRM</option>
                        </select>
                    </div>

                    <div>
                        <input
                            type="text"
                            name="crmCrpNumber"
                            placeholder="Número do registro (ex: 06/123456)"
                            value={formData.crmCrpNumber}
                            onChange={handleChange}
                            className="w-full px-3.5 py-2.5 border border-indigo-300 rounded-md text-sm text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition"
                        />
                    </div>

                    {/* Avisos */}
                    <div className="pt-6 text-center text-xs space-y-1">
                        <p className="font-semibold text-black">
                            Seu registro será validado pela nossa equipe.
                        </p>
                        <p className="text-gray-500">
                            Certifique-se de que o número informado está correto.
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
                    Concluir cadastro
                </button>
            </footer>
        </div>
    )
}