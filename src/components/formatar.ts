import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import type { MeetingHostDTO } from '../api/meetings'

// Os Instants do backend chegam em ISO-8601 (UTC); a tela os mostra no fuso do navegador, em português.

/** "7 de nov de 2026" */
export function formatarData(iso: string): string {
    return format(parseISO(iso), "d 'de' MMM 'de' yyyy", { locale: ptBR })
}

/** "7 de nov de 2026 às 20:45" */
export function formatarDataHora(iso: string): string {
    return format(parseISO(iso), "d 'de' MMM 'de' yyyy 'às' HH:mm", { locale: ptBR })
}

/** "CRP 06123456": o registro do anfitrião como o backend o guardou (letras e dígitos, sem barra). Contas antigas: "CRM …" */
export function formatarRegistro(host: MeetingHostDTO): string {
    return `${host.credential_type} ${host.crm_crp_number}`
}
