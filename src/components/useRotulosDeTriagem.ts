import { useEffect, useState } from 'react'
import { getQuestions } from '../api/triage'

/** "PERGUNTA:OPCAO" → o texto da opção. A resposta guardada é o código da opção; a pessoa precisa ler o texto */
export type RotulosDeTriagem = Map<string, string>

export function chaveDaOpcao(codigoDaPergunta: string, codigoDaOpcao: string): string {
    return `${codigoDaPergunta}:${codigoDaOpcao}`
}

// As perguntas só mudam por migração do backend, então uma leitura por aba basta (e não é leitura de dado de saúde: não é
// auditada). Se falhar, a promessa é descartada e a próxima tela tenta de novo.
let promessa: Promise<RotulosDeTriagem> | null = null

function carregarRotulos(): Promise<RotulosDeTriagem> {
    promessa ??= getQuestions()
        .then((perguntas) => {
            const rotulos: RotulosDeTriagem = new Map()
            for (const pergunta of perguntas) {
                // Em texto livre o valor é o que a pessoa escreveu: não há opção para traduzir
                if (pergunta.question_type === 'free_text') continue
                for (const opcao of pergunta.options) rotulos.set(chaveDaOpcao(pergunta.code, opcao.code), opcao.label)
            }
            return rotulos
        })
        .catch((err: unknown) => {
            promessa = null
            throw err
        })
    return promessa
}

/**
 * Os textos das opções de resposta, para mostrar "25 a 39 anos" em vez de "AGE_25_39". Devolve null enquanto carrega ou se
 * não deu para carregar: quem usa cai no valor guardado, que ainda é legível o bastante para não bloquear a leitura.
 */
export default function useRotulosDeTriagem(): RotulosDeTriagem | null {
    const [rotulos, setRotulos] = useState<RotulosDeTriagem | null>(null)

    useEffect(() => {
        let ativo = true
        carregarRotulos()
            .then((mapa) => {
                if (ativo) setRotulos(mapa)
            })
            .catch(() => {
                // sem rótulos: as respostas aparecem com o valor guardado
            })
        return () => {
            ativo = false
        }
    }, [])

    return rotulos
}
