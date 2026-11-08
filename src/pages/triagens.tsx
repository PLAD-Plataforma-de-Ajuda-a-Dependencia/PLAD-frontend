import { listTriages } from '../api/triagens'
import AvisoDeAcesso from '../components/AvisoDeAcesso'
import LayoutPainel from '../components/LayoutPainel'
import ListaDeTriagens from '../components/ListaDeTriagens'

/**
 * Triagens (só psicólogo): as respostas que os dependentes enviaram, com o apelido e o nome real, para acompanhar o caso.
 * É a única tela, junto da lista de inscritos de uma reunião, com o NOME REAL de um dependente (decisão 15 do backend).
 * O backend audita cada triagem devolvida pela lista e o dependente vê isso em "Quem viu meus dados" (só o papel, nunca
 * quem), por isso o aviso fica à vista antes de tudo e a lista só carrega no clique em "Ver triagens". As respostas vêm na
 * própria lista: abrir uma linha não lê nada de novo (ver ListaDeTriagens).
 * Visual proposto sem frame do Figma: segue o painel do Calendário e as regras de acessibilidade.
 */
export default function Triagens() {
    return (
        // A barra lateral (com o menu da conta) e o rodapé vêm do LayoutPainel
        <LayoutPainel titulo="Triagens">
            <main id="conteudo" tabIndex={-1} className="min-w-0 flex-1 px-4 py-6 focus:outline-none md:px-10 md:py-10">
                <h1 className="font-outfit text-2xl font-bold text-black">Triagens</h1>
                <p className="mb-6 mt-1 text-sm text-texto-suave">
                    O que os dependentes responderam ao entrar, para você acompanhar cada caso.
                </p>

                <div className="space-y-5">
                    <AvisoDeAcesso>
                        Cada acesso fica registrado. Ao carregar a lista, a plataforma anota que um psicólogo consultou cada
                        triagem que aparece nela, e o dependente pode ver isso, sem saber quem foi. Abrir uma triagem já
                        listada não registra de novo. O nome real é mostrado só a você, para o acompanhamento: trate com
                        sigilo.
                    </AvisoDeAcesso>
                    <ListaDeTriagens carregarPagina={listTriages} />
                </div>
            </main>
        </LayoutPainel>
    )
}
