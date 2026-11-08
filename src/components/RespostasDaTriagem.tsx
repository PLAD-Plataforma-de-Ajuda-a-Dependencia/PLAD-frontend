import type { AnswerResponseDTO } from '../api/triage'
import useRotulosDeTriagem, { chaveDaOpcao } from './useRotulosDeTriagem'

/**
 * As respostas de uma triagem, pergunta por pergunta. O valor guardado é o código da opção ("AGE_25_39"): aqui vira o
 * texto que o dependente viu. Texto livre aparece como foi escrito, com as quebras de linha.
 * São dados de saúde: ficam só no estado de quem chama, nunca em storage nem na URL.
 */
export default function RespostasDaTriagem({ respostas }: { respostas: AnswerResponseDTO[] }) {
    const rotulos = useRotulosDeTriagem()

    if (respostas.length === 0) {
        return <p className="text-sm text-texto-suave">Esta triagem não tem respostas guardadas.</p>
    }

    return (
        <dl className="space-y-4">
            {respostas.map((resposta) => {
                const valores = resposta.values.map((valor) => rotulos?.get(chaveDaOpcao(resposta.question_code, valor)) ?? valor)
                return (
                    <div key={resposta.question_id}>
                        <dt className="text-sm text-texto-suave">{resposta.question_text}</dt>
                        {valores.length === 1 ? (
                            <dd className="mt-0.5 whitespace-pre-wrap break-words text-base text-black">{valores[0]}</dd>
                        ) : (
                            <dd className="mt-0.5">
                                <ul className="list-disc space-y-0.5 pl-5 text-base text-black">
                                    {valores.map((valor, indice) => (
                                        <li key={`${indice}-${valor}`} className="whitespace-pre-wrap break-words">
                                            {valor}
                                        </li>
                                    ))}
                                </ul>
                            </dd>
                        )}
                    </div>
                )
            })}
        </dl>
    )
}
