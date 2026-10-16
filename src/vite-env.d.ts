// Variáveis de ambiente lidas pelo front (modelo em .env.example)
interface ImportMetaEnv {
    readonly VITE_API_URL?: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
