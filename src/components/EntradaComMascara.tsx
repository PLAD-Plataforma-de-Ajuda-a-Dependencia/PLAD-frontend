import type { ChangeEvent, InputHTMLAttributes } from 'react'

interface EntradaComMascaraProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type' | 'value' | 'onChange'> {
    /** Uma das máscaras de `mascaras.ts`: recebe o que foi digitado e devolve o texto formatado */
    mascara: (texto: string) => string
    value: string
    onValor: (valor: string) => void
}

/**
 * Campo de texto com máscara (data dd/mm/aaaa, hora hh:mm, CRP 06/123456), no lugar dos campos nativos de data e hora,
 * que seguem o idioma do navegador (mm/dd/yyyy e AM/PM em inglês). Teclado numérico no celular. Vai dentro do `Campo`:
 *
 *   <Campo rotulo="Data" erro={erros.data}>{(c) => <EntradaComMascara {...c} mascara={mascararData} value={data} onValor={setData} />}</Campo>
 *
 * Quando a pessoa corrige o meio do texto, o cursor fica depois do mesmo dígito em vez de pular para o fim.
 */
export default function EntradaComMascara({ mascara, value, onValor, ...resto }: EntradaComMascaraProps) {
    function aoMudar(e: ChangeEvent<HTMLInputElement>) {
        const campo = e.target
        const digitado = campo.value
        const cursor = campo.selectionStart ?? digitado.length
        const digitosAntes = digitado.slice(0, cursor).replace(/\D/g, '').length
        const novo = mascara(digitado)
        onValor(novo)

        // Posição logo depois do mesmo número de dígitos no texto formatado
        let posicao = 0
        for (let vistos = 0; posicao < novo.length && vistos < digitosAntes; posicao++) {
            if (/\d/.test(novo[posicao])) vistos++
        }
        // O React grava o valor novo no campo (o que leva o cursor para o fim) ainda dentro do evento; a microtarefa roda
        // logo depois disso, sem esperar o próximo quadro
        queueMicrotask(() => {
            if (document.activeElement === campo) campo.setSelectionRange(posicao, posicao)
        })
    }

    return <input {...resto} type="text" inputMode="numeric" value={value} onChange={aoMudar} />
}
