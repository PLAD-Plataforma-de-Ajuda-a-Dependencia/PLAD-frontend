import { useState } from 'react'
import { HeartHandshake } from 'lucide-react'
import Modal from './Modal'
import RecursosDeCrise from './RecursosDeCrise'
import { classeBotao } from './estilos'

interface AjudaAgoraProps {
    /** Classes de posição do botão (fixo, normalmente): cada tela escolhe onde ele não cobre nenhum controle */
    posicao?: string
    /** `escuro` na sala ao vivo, onde o fundo é quase preto */
    tema?: 'claro' | 'escuro'
}

/**
 * O botão "Precisa de ajuda agora?" e o diálogo que ele abre (CVV 188, SAMU 192 e como achar o CAPS). Fica fixo em
 * todas as telas: cada layout o monta onde ele não atrapalha (LayoutPainel, LayoutPagina, Home, a sala e o pop-up de
 * consentimento). Só informação: não chama a API, não classifica risco e não grava nada (ver RecursosDeCrise).
 * Na sala da reunião só abre o diálogo: a chamada continua conectada por baixo.
 * O diálogo é o `Modal` base na camada z-[60], acima do pop-up de consentimento (z-50), que deixa a página inerte.
 */
export default function AjudaAgora({ posicao = 'fixed bottom-4 right-4 z-40', tema = 'claro' }: AjudaAgoraProps) {
    const [aberto, setAberto] = useState(false)

    // Branco com a borda da marca (não vermelho: vermelho é só para erro de verdade); na sala, o botão escuro da barra
    const cores =
        tema === 'escuro'
            ? 'border-white/40 bg-sala-botao text-white hover:bg-sala-barra focus-visible:outline-white'
            : 'border-plad bg-white text-plad hover:bg-plad-fundo'

    return (
        <>
            <button
                type="button"
                onClick={() => setAberto(true)}
                aria-haspopup="dialog"
                aria-label="Precisa de ajuda agora?"
                className={`${posicao} inline-flex min-h-11 items-center gap-2 rounded-full border-2 px-4 text-sm font-semibold shadow-cartao transition-colors ${cores}`}
            >
                <HeartHandshake size={18} aria-hidden="true" />
                {/* O nome acessível é a pergunta inteira; no celular o texto visível encurta para não cobrir a tela */}
                <span className="sm:hidden" aria-hidden="true">
                    Ajuda
                </span>
                <span className="hidden sm:inline" aria-hidden="true">
                    Precisa de ajuda agora?
                </span>
            </button>

            <Modal
                aberto={aberto}
                titulo="Precisa de ajuda agora?"
                descricao="Você não precisa esperar pela triagem nem por uma reunião. Estes serviços atendem agora."
                onFechar={() => setAberto(false)}
                largura="lg"
                botaoFechar
                camada="z-[60]"
                rodape={
                    <button type="button" onClick={() => setAberto(false)} className={classeBotao('secundario', true)}>
                        Fechar
                    </button>
                }
            >
                <RecursosDeCrise />
            </Modal>
        </>
    )
}
