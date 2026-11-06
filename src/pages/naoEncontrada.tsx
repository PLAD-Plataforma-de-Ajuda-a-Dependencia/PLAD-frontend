import { Link } from 'react-router-dom'
import { Compass } from 'lucide-react'
import Botao from '../components/Botao'
import EstadoVazio from '../components/EstadoVazio'
import LayoutPagina from '../components/LayoutPagina'
import { classeBotao } from '../components/estilos'
import { destinoPorPapel, useSessao } from '../session/SessaoContext'

/** Página 404: qualquer endereço sem rota. Quem tem sessão volta para a própria tela; quem não tem, para o início */
export default function NaoEncontrada() {
    const { me } = useSessao()

    return (
        <LayoutPagina titulo="Página não encontrada" centralizar>
            <EstadoVazio
                icone={<Compass size={28} />}
                titulo="Não encontramos esta página"
                descricao="O endereço pode ter mudado ou a página ainda não existe. Você não fez nada de errado."
                acao={
                    <div className="flex flex-col items-center gap-1">
                        <Link to={me ? destinoPorPapel(me) : '/'} className={classeBotao('primario')}>
                            {me ? 'Voltar para a minha área' : 'Ir para o início'}
                        </Link>
                        {!me && (
                            <Link to="/login" className={classeBotao('texto')}>
                                Entrar na minha conta
                            </Link>
                        )}
                        {/* Voltar de verdade, para onde a pessoa estava */}
                        <Botao variante="texto" onClick={() => window.history.back()}>
                            Voltar à página anterior
                        </Botao>
                    </div>
                }
            />
        </LayoutPagina>
    )
}
