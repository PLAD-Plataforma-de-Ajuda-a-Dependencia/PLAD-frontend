import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

// Os Instants do backend chegam em ISO-8601 (UTC); a tela os mostra no fuso do navegador, em português.

/** "7 de nov de 2026" */
export function formatarData(iso: string): string {
    return format(parseISO(iso), "d 'de' MMM 'de' yyyy", { locale: ptBR })
}

/** "7 de nov de 2026 às 20:45" */
export function formatarDataHora(iso: string): string {
    return format(parseISO(iso), "d 'de' MMM 'de' yyyy 'às' HH:mm", { locale: ptBR })
}
