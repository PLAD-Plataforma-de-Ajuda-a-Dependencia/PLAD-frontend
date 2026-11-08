import { useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { VERSOES_CONSENTIMENTO } from '../api/consentimento'
import Botao from './Botao'
import LinkDocumento from './LinkDocumento'
import useArmadilhaFoco from './useArmadilhaFoco'

interface TermoDeParticipacaoProps {
    titulo: string
    /** Quando a reunião acontece, já formatado ("Sábado, 14 de novembro · 18:30 - 19:30") */
    quando: string
    /** Nome do psicólogo anfitrião e o registro dele no conselho ("CRP 06123456"), se a reunião os trouxer */
    anfitriao?: string
    registro?: string
    enviando: boolean
    /** O aceite foi marcado e a pessoa confirmou: o pai manda a inscrição com a versão do termo */
    onAceitar: () => void
    onVoltar: () => void
}

/**
 * Termo de participação (Res. CFP 9/2024, art. 7º), mostrado a cada inscrição em reunião: o que a reunião é, os direitos e
 * deveres de quem participa, a tecnologia usada e como o sigilo é protegido. O aceite vai junto com a inscrição
 * (`accepted_participation_version`) e o backend o grava com a versão, a hora e o IP.
 *
 * O texto descreve o que o sistema faz hoje (decisões 13 e 23 a 31 do backend): se uma dessas regras mudar, este texto
 * muda e a versão sobe, no backend (consent.participation-version) e em consentimento.ts. Escrito sem revisão jurídica
 * nem clínica: está na decisão 36 como texto a revisar.
 * Montado só enquanto aberto, então a caixa de aceite começa desmarcada a cada vez.
 */
export default function TermoDeParticipacao({
    titulo,
    quando,
    anfitriao,
    registro,
    enviando,
    onAceitar,
    onVoltar,
}: TermoDeParticipacaoProps) {
    const painel = useRef<HTMLDivElement>(null)
    const idTitulo = useId()
    const [aceitou, setAceitou] = useState(false)

    useArmadilhaFoco(painel, true, () => {
        if (!enviando) onVoltar()
    })

    return createPortal(
        <div
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 sm:items-center"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget && !enviando) onVoltar()
            }}
        >
            <div
                ref={painel}
                role="dialog"
                aria-modal="true"
                aria-labelledby={idTitulo}
                tabIndex={-1}
                className="flex max-h-full w-full max-w-xl flex-col rounded-cartao bg-white font-roboto text-gray-900 shadow-xl"
            >
                {/* Focável de propósito: o foco inicial cai aqui, no começo do termo, e não no primeiro link (lá embaixo), que
                    rolaria o texto até o fim; e quem usa o teclado consegue rolar o texto com as setas */}
                <div
                    tabIndex={0}
                    role="region"
                    aria-labelledby={idTitulo}
                    className="space-y-5 overflow-y-auto p-6 text-sm focus-visible:outline-offset-[-2px]"
                >
                    <div>
                        <h2 id={idTitulo} className="font-outfit text-xl font-semibold text-black">
                            Termo de participação
                        </h2>
                        <p className="mt-1 text-texto-suave">
                            Versão {VERSOES_CONSENTIMENTO.participacao}. Leia antes de se inscrever em <strong>{titulo}</strong>.
                        </p>
                    </div>

                    <section className="space-y-2">
                        <h3 className="font-semibold text-black">O que é esta reunião</h3>
                        <p>
                            É um encontro de apoio em grupo, por vídeo, conduzido por {anfitriao ? <strong>{anfitriao}</strong> : 'um psicólogo'}
                            {registro ? ` (${registro})` : ''}. {quando}.
                        </p>
                        <p>
                            O registro no conselho foi informado pelo próprio psicólogo no cadastro, e a PLAD ainda não o confere: você
                            pode consultá-lo no conselho de psicologia. A reunião não substitui consulta nem tratamento individual, e a
                            PLAD não é um serviço de emergência. Se precisar de ajuda agora, ligue para o CVV,{' '}
                            <a href="tel:188" className="font-medium text-plad underline hover:text-plad-hover">
                                188
                            </a>
                            , ou para o SAMU,{' '}
                            <a href="tel:192" className="font-medium text-plad underline hover:text-plad-hover">
                                192
                            </a>
                            . O botão "Precisa de ajuda agora?" fica em todas as telas.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h3 className="font-semibold text-black">Seus direitos</h3>
                        <ul className="list-disc space-y-1.5 pl-5">
                            <li>Você participa pelo seu apelido: as outras pessoas da sala não veem o seu nome real.</li>
                            <li>Você pode cancelar a inscrição até a reunião começar e sair da sala quando quiser.</li>
                            <li>
                                Você entra só ouvindo. A câmera e o microfone ficam desligados até o psicólogo liberar a sua fala, e você
                                escolhe se quer usá-los.
                            </li>
                            <li>
                                Em "Minha conta" você vê quando e em que papel alguém leu a sua triagem, pede uma cópia dos seus dados e
                                pode apagar a sua conta.
                            </li>
                        </ul>
                    </section>

                    <section className="space-y-2">
                        <h3 className="font-semibold text-black">Seus deveres</h3>
                        <ul className="list-disc space-y-1.5 pl-5">
                            <li>Tratar as outras pessoas com respeito, sem julgamentos.</li>
                            <li>Guardar sigilo: não gravar, não fotografar e não contar a ninguém o que for dito nem quem estava na reunião.</li>
                            <li>Não se passar por outra pessoa, nem no chat.</li>
                            <li>Seguir as orientações do psicólogo, que pode retirar da sala quem atrapalhar o grupo.</li>
                        </ul>
                    </section>

                    <section className="space-y-2">
                        <h3 className="font-semibold text-black">A tecnologia</h3>
                        <p>
                            A imagem, o som e o chat passam pelo <strong>LiveKit</strong>, um serviço de videochamada de terceiros. Para
                            transmitir a chamada, ele tem acesso técnico ao que é transmitido. A PLAD não grava a reunião, não faz
                            transcrição e não guarda as mensagens do chat.
                        </p>
                    </section>

                    <section className="space-y-2">
                        <h3 className="font-semibold text-black">Como o sigilo é protegido</h3>
                        <ul className="list-disc space-y-1.5 pl-5">
                            <li>
                                O psicólogo que conduz vê o seu nome real e, se você enviou a triagem, as respostas dela. Psicólogos têm
                                dever de sigilo profissional.
                            </li>
                            <li>
                                Cada leitura da sua triagem e da lista de inscritos fica registrada, e você a vê em "Minha conta", sem o
                                nome de quem leu.
                            </li>
                            <li>Os outros participantes só veem o seu apelido, nunca o seu nome real nem o seu e-mail.</li>
                        </ul>
                        <p>
                            Os detalhes, em linguagem simples, estão em <LinkDocumento documento="protecao" />.
                        </p>
                    </section>
                </div>

                <div className="space-y-3 border-t border-borda-cartao p-6">
                    <label className="flex min-h-11 cursor-pointer items-start gap-3 text-sm text-gray-800">
                        <input
                            type="checkbox"
                            checked={aceitou}
                            onChange={(e) => setAceitou(e.target.checked)}
                            disabled={enviando}
                            className="mt-0.5 size-6 shrink-0 accent-plad"
                        />
                        <span>Li e aceito o termo de participação (versão {VERSOES_CONSENTIMENTO.participacao}).</span>
                    </label>
                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <Botao variante="secundario" onClick={onVoltar} disabled={enviando}>
                            Voltar
                        </Botao>
                        <Botao carregando={enviando} disabled={!aceitou} onClick={onAceitar}>
                            {enviando ? 'Inscrevendo…' : 'Aceitar e inscrever-me'}
                        </Botao>
                    </div>
                </div>
            </div>
        </div>,
        document.body,
    )
}
