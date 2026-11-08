import { Link } from 'react-router-dom'
import PaginaDeDocumento from '../components/PaginaDeDocumento'

/**
 * /como-protegemos: "Como protegemos seus dados", em linguagem simples. Página pública (sem login).
 * Descreve o que o sistema FAZ hoje (decisões 7, 9, 11, 13, 15, 16, 18 e 26 a 31 do backend) e também o que ele ainda
 * NÃO faz, sem prometer mais do que existe. Quando uma dessas regras mudar, este texto muda junto.
 * Escrito sem revisão jurídica nem clínica: está na decisão 37 do backend como texto a revisar.
 */
export default function ComoProtegemos() {
    return (
        <PaginaDeDocumento
            titulo="Como protegemos seus dados"
            resumo="Em palavras simples: o que a PLAD guarda sobre você, quem pode ver e o que você pode fazer. Este resumo conta como o sistema funciona hoje e não substitui os Termos de Uso nem a Política de Privacidade."
        >
            <h2>O que guardamos</h2>
            <ul>
                <li>O seu cadastro: nome, e-mail, data de nascimento e gênero. A senha não é guardada: guardamos só um código que não dá para desfazer.</li>
                <li>Se você é dependente: o seu apelido, a triagem (se você enviar) e as reuniões em que você se inscreveu.</li>
                <li>Se você é psicólogo: o número do seu registro no conselho (CRP), do jeito que você informou.</li>
                <li>Os seus aceites: qual documento, qual versão, quando e de que endereço de internet (IP).</li>
            </ul>

            <h2>O seu apelido</h2>
            <p>
                Dependentes recebem um apelido sorteado, como "Morcego Sereno". É ele que as outras pessoas veem. Você pode sortear
                outro, até 5 vezes por dia, no menu da sua conta.
            </p>

            <h2>Quem vê o seu nome real</h2>
            <ul>
                <li>O psicólogo que conduz uma reunião em que você se inscreveu vê o seu apelido e o seu nome real.</li>
                <li>Administradores da plataforma veem só o apelido.</li>
                <li>Os outros dependentes veem só o apelido. O seu e-mail não aparece para outros usuários.</li>
            </ul>

            <h2>Quem lê a sua triagem</h2>
            <p>
                A triagem fala da sua saúde e do seu uso de substâncias. Por isso só é guardada se você aceitar o consentimento para
                tratar dados de saúde, e você pode deixar qualquer pergunta sem resposta.
            </p>
            <ul>
                <li>O psicólogo lê a triagem de quem está inscrito em uma reunião dele que não foi cancelada. De mais ninguém.</li>
                <li>Administradores leem as triagens com o apelido, sem o nome real.</li>
                <li>Você recebe as suas respostas ao enviar e pode baixar uma cópia em "Minha conta".</li>
            </ul>

            <h2>O rastro de cada leitura</h2>
            <p>
                Cada vez que alguém lê a sua triagem, ou a lista de quem está inscrito numa reunião sua, a PLAD anota a data e o
                papel de quem leu (psicólogo ou administrador), sem o nome. Você vê tudo isso em "Minha conta", em "Quem viu meus
                dados". Esse registro não pode ser alterado nem apagado pelo sistema.
            </p>

            <h2>Nas reuniões por vídeo</h2>
            <ul>
                <li>
                    A imagem, o som e o chat passam pelo LiveKit, um serviço de videochamada de terceiros. Para transmitir a chamada, ele
                    tem acesso técnico ao que é transmitido.
                </li>
                <li>
                    Para entrar na sala, a PLAD gera uma chave de acesso que vale por 2 minutos. O serviço recebe só a sala, uma
                    identificação que não tem relação com o seu cadastro, o seu apelido e o seu papel. Ele não recebe o seu nome real,
                    o seu e-mail nem a sua triagem.
                </li>
                <li>A PLAD não grava a reunião, não faz transcrição e não guarda as mensagens do chat.</li>
                <li>
                    Dependentes entram só ouvindo; o psicólogo libera a fala e pode retirar alguém da sala. Você pode sair quando quiser.
                </li>
            </ul>

            <h2>O que você pode fazer</h2>
            <ul>
                <li>Ver quem leu os seus dados: "Minha conta", "Quem viu meus dados".</li>
                <li>Baixar uma cópia de tudo o que a PLAD guarda sobre você: "Minha conta", "Baixar meus dados".</li>
                <li>
                    Apagar a sua conta: o cadastro, a triagem, os aceites e as inscrições são apagados de verdade, não só escondidos. Só
                    fica o registro de leituras, que guarda números e papéis, sem nome nem respostas.
                </li>
                <li>Trocar a senha: isso encerra a sua sessão em todos os outros aparelhos.</li>
            </ul>

            <h2>O que ainda não fazemos</h2>
            <ul>
                <li>
                    Ainda não há um botão para retirar um consentimento. Hoje o caminho é apagar a conta, e é sempre possível parar de
                    usar a PLAD.
                </li>
                <li>
                    Não conferimos o registro dos psicólogos no conselho: ele é informado por eles. Você pode consultá-lo no conselho de
                    psicologia.
                </li>
                <li>Os textos finais dos Termos de Uso e da Política de Privacidade ainda estão sendo preparados pelo time.</li>
            </ul>

            <h2>Se precisar de ajuda agora</h2>
            <p>
                A PLAD não é um serviço de emergência. O botão "Precisa de ajuda agora?", que aparece em todas as telas, mostra o CVV
                (188), o SAMU (192) e como achar o CAPS mais perto de você. Ele só mostra informação: não grava nada.
            </p>
            <p>
                <Link to="/termos" className="text-plad underline hover:text-plad-hover">
                    Termos de Uso
                </Link>
                {' · '}
                <Link to="/privacidade" className="text-plad underline hover:text-plad-hover">
                    Política de Privacidade
                </Link>
            </p>
        </PaginaDeDocumento>
    )
}
