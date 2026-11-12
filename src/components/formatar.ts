import { format, parseISO } from 'date-fns'
import type { MeetingHostDTO } from '../api/meetings'

// Os Instants do backend chegam em ISO-8601 (UTC); a tela os mostra no fuso do navegador, no formato brasileiro.

/** "07/11/2026" */
export function formatarData(iso: string): string {
    return format(parseISO(iso), 'dd/MM/yyyy')
}

/** "07/11/2026 às 20:45" */
export function formatarDataHora(iso: string): string {
    return format(parseISO(iso), "dd/MM/yyyy 'às' HH:mm")
}

/**
 * "CRP 06/123456": o backend guarda o registro só com letras e dígitos ("06123456"), e a tela devolve a barra entre a
 * região (os 2 primeiros dígitos) e o número. Qualquer outro valor sai como foi guardado (contas antigas: "CRM …").
 */
export function formatarRegistro(registro: Pick<MeetingHostDTO, 'credential_type' | 'crm_crp_number'>): string {
    const { credential_type: tipo, crm_crp_number: numero } = registro
    if (tipo === 'CRP' && /^\d{3,}$/.test(numero)) {
        return `CRP ${numero.slice(0, 2)}/${numero.slice(2)}`
    }
    return `${tipo} ${numero}`
}
