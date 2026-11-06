import { useSyncExternalStore } from 'react'
import { WifiOff } from 'lucide-react'
import { assinarConexao, lerSemConexao } from '../api/conexao'

/** Aviso global de "sem conexão", no topo de qualquer tela; some sozinho quando o servidor volta a responder */
export default function BannerConexao() {
    const semConexao = useSyncExternalStore(assinarConexao, lerSemConexao)

    return (
        <div role="status" aria-live="polite">
            {semConexao && (
                <div className="fixed inset-x-0 top-0 z-[70] flex items-center justify-center gap-2 border-b border-aviso-borda bg-aviso-fundo px-4 py-2.5 text-center text-sm font-medium text-aviso">
                    <WifiOff size={18} aria-hidden="true" className="shrink-0" />
                    <span>Sem conexão com o servidor. Confira a sua internet e tente de novo.</span>
                </div>
            )}
        </div>
    )
}
