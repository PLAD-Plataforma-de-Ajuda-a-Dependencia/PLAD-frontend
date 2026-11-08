import { Ambulance, ExternalLink, MapPin, MessageCircle, Phone } from 'lucide-react'

/**
 * Recursos de crise (Res. CFP 9/2024, art. 4º, VI e art. 5º). SÓ INFORMAÇÃO: nada aqui lê a triagem, classifica risco,
 * chama a API, grava que o botão foi aberto ou guarda estado. Os números e endereços são nacionais e públicos:
 *   CVV 188 (24 h, gratuito, sigiloso) e chat em cvv.org.br/chat · SAMU 192 · CAPS pelo SUS.
 * Para o CAPS não há um endereço único que sirva o país inteiro, então o texto manda perguntar na UBS do bairro ou na
 * Secretaria Municipal de Saúde, e o link leva à página do Ministério da Saúde sobre os CAPS.
 * É o conteúdo do diálogo do botão "Precisa de ajuda agora?" (AjudaAgora) e do cartão do fim da triagem.
 */

const LINK_EXTERNO = 'inline-flex min-h-11 items-center gap-1.5 font-medium text-plad underline hover:text-plad-hover'

export default function RecursosDeCrise() {
    return (
        <>
            <ul className="space-y-4 text-sm text-gray-800">
                <li className="flex gap-3">
                    <Phone size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-plad" />
                    <div className="space-y-1">
                        <p className="font-semibold text-black">CVV: ligue 188</p>
                        <p>
                            Conversa de apoio emocional e prevenção do suicídio, 24 horas por dia, gratuita e sigilosa. Pode ser por
                            ligação ou por chat.
                        </p>
                        <div className="flex flex-wrap gap-x-5">
                            <a href="tel:188" className={LINK_EXTERNO}>
                                <Phone size={16} aria-hidden="true" />
                                Ligar para o 188
                            </a>
                            <a href="https://cvv.org.br/chat/" target="_blank" rel="noreferrer" className={LINK_EXTERNO}>
                                <MessageCircle size={16} aria-hidden="true" />
                                Conversar pelo chat do CVV
                                <span className="sr-only"> (abre em outra aba)</span>
                            </a>
                        </div>
                    </div>
                </li>

                <li className="flex gap-3">
                    <Ambulance size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-plad" />
                    <div className="space-y-1">
                        <p className="font-semibold text-black">SAMU: ligue 192</p>
                        <p>
                            Se há risco de vida, se alguém se machucou, ou depois de uma overdose ou de uma crise muito forte, ligue
                            agora. A ligação é gratuita.
                        </p>
                        <a href="tel:192" className={LINK_EXTERNO}>
                            <Phone size={16} aria-hidden="true" />
                            Ligar para o 192
                        </a>
                    </div>
                </li>

                <li className="flex gap-3">
                    <MapPin size={20} aria-hidden="true" className="mt-0.5 shrink-0 text-plad" />
                    <div className="space-y-1">
                        <p className="font-semibold text-black">CAPS: o centro de atenção psicossocial perto de você</p>
                        <p>
                            O CAPS atende, pelo SUS, quem está em sofrimento mental ou com o uso de álcool e outras drogas (nesse caso,
                            procure um CAPS AD). Para saber qual é o mais próximo, pergunte na Unidade Básica de Saúde (UBS) do seu
                            bairro ou na Secretaria Municipal de Saúde da sua cidade.
                        </p>
                        <a href="https://www.gov.br/saude/pt-br/caps" target="_blank" rel="noreferrer" className={LINK_EXTERNO}>
                            <ExternalLink size={16} aria-hidden="true" />
                            Saiba mais sobre os CAPS (Ministério da Saúde)
                            <span className="sr-only"> (abre em outra aba)</span>
                        </a>
                    </div>
                </li>
            </ul>

            <p className="text-xs text-texto-suave">
                A PLAD não é um serviço de emergência e não atende em tempo real. Esta informação não grava nada: não fica registrado
                que você a viu.
            </p>
        </>
    )
}
