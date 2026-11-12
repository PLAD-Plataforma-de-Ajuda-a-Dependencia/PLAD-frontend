// Máscaras dos campos digitados (data, hora e CRP): só dígitos, e o separador entra sozinho quando chega o dígito
// seguinte, para o Backspace apagar como a pessoa espera. A validação fica para o envio (`lerData`, `lerHora`).

function digitos(texto: string, maximo: number): string {
    return texto.replace(/\D/g, '').slice(0, maximo)
}

/** "15031990" → "15/03/1990" (dd/mm/aaaa) */
export function mascararData(texto: string): string {
    const d = digitos(texto, 8)
    if (d.length <= 2) return d
    if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`
    return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`
}

/** "1930" → "19:30" (24 h) */
export function mascararHora(texto: string): string {
    const d = digitos(texto, 4)
    return d.length <= 2 ? d : `${d.slice(0, 2)}:${d.slice(2)}`
}

/** "06123456" → "06/123456": a região (2 dígitos), a barra e o número (até 6 dígitos) */
export function mascararCrp(texto: string): string {
    const d = digitos(texto, 8)
    return d.length <= 2 ? d : `${d.slice(0, 2)}/${d.slice(2)}`
}

/** "dd/mm/aaaa" digitado → "yyyy-MM-dd" para a API, ou a mensagem do que está errado */
export function lerData(texto: string): { iso: string } | { erro: string } {
    const partes = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(texto)
    if (!partes) {
        return { erro: 'Digite a data completa, no formato dd/mm/aaaa.' }
    }
    const [, dia, mes, ano] = partes
    // Dia 0 do mês seguinte = último dia deste mês (já conta o 29/02 dos anos bissextos). Sem o `parse` do date-fns,
    // que pesa no pacote principal (o cadastro não é carregado sob demanda)
    // (setUTCFullYear, e não Date.UTC, que leria os anos 0 a 99 como 1900 a 1999)
    const fimDoMes = new Date(0)
    fimDoMes.setUTCFullYear(Number(ano), Number(mes), 0)
    const diasNoMes = fimDoMes.getUTCDate()
    if (Number(mes) < 1 || Number(mes) > 12 || Number(dia) < 1 || Number(dia) > diasNoMes) {
        return { erro: 'Essa data não existe. Confira o dia e o mês.' }
    }
    return { iso: `${ano}-${mes}-${dia}` }
}

/** "hh:mm" digitado (00:00 a 23:59), ou a mensagem do que está errado */
export function lerHora(texto: string): { hora: string } | { erro: string } {
    const partes = /^(\d{2}):(\d{2})$/.exec(texto)
    if (!partes) {
        return { erro: 'Digite a hora completa, no formato hh:mm.' }
    }
    if (Number(partes[1]) > 23 || Number(partes[2]) > 59) {
        return { erro: 'Hora inválida: use de 00:00 a 23:59.' }
    }
    return { hora: texto }
}

/** "2026-11-12" → "12/11/2026", sem passar por `Date` (nada de fuso no meio) */
export function isoParaData(iso: string): string {
    const [ano, mes, dia] = iso.split('-')
    return ano && mes && dia ? `${dia}/${mes}/${ano}` : ''
}
