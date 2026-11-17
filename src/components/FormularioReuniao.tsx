import { useId, useRef, useState } from 'react'
import type { FormEvent } from 'react'
import { format, parseISO } from 'date-fns'
import { ApiError, errosPorCampo } from '../api/client'
import { createMeeting, updateMeeting } from '../api/meetings'
import type { MeetingRequestDTO, MeetingResponseDTO } from '../api/meetings'
import Botao from './Botao'
import Campo from './Campo'
import EntradaComMascara from './EntradaComMascara'
import Modal from './Modal'
import { isoParaData, lerData, lerHora, mascararData, mascararHora } from './mascaras'

interface FormularioReuniaoProps {
    /** Null para criar; a reunião para editar */
    reuniao: MeetingResponseDTO | null
    /** "yyyy-MM-dd" que já vem no campo Data ao criar */
    diaInicial: string
    onFechar: () => void
    /** A reunião como a API a devolveu (criada ou editada) */
    onSalvo: (reuniao: MeetingResponseDTO) => void
}

type CamposReuniao = 'title' | 'description' | 'data' | 'starts_at' | 'ends_at' | 'capacity'

/**
 * Criar e editar reunião (psicólogo), sobre o `Modal` base: os campos no corpo, "Voltar" e enviar no rodapé fixo. O
 * painel (Calendário) abre para criar; o detalhe da reunião, para editar. Data e horários são no fuso do navegador e viram
 * instantes ISO-8601 no envio. Os erros do backend (VALIDATION_ERROR e INVALID_MEETING trazem `errors` por campo)
 * aparecem ao lado de cada campo; o 409 (cruza outra reunião sua, ou a reunião mudou de situação) vai num aviso geral.
 * Nada digitado se perde no erro.
 */
export default function FormularioReuniao({ reuniao, diaInicial, onFechar, onSalvo }: FormularioReuniaoProps) {
    const formRef = useRef<HTMLFormElement>(null)
    const idFormulario = useId()
    const [titulo, setTitulo] = useState(reuniao?.title ?? '')
    const [descricao, setDescricao] = useState(reuniao?.description ?? '')
    // Data e horas são texto com máscara (dd/mm/aaaa, hh:mm 24 h): os campos nativos seguem o idioma do navegador
    const [data, setData] = useState(() => isoParaData(reuniao ? format(parseISO(reuniao.starts_at), 'yyyy-MM-dd') : diaInicial))
    const [inicio, setInicio] = useState(() => (reuniao ? format(parseISO(reuniao.starts_at), 'HH:mm') : ''))
    const [fim, setFim] = useState(() => (reuniao ? format(parseISO(reuniao.ends_at), 'HH:mm') : ''))
    const [capacidade, setCapacidade] = useState(reuniao ? String(reuniao.capacity) : '')
    const [erros, setErros] = useState<Partial<Record<CamposReuniao, string>>>({})
    const [erroGeral, setErroGeral] = useState<string | null>(null)
    const [enviando, setEnviando] = useState(false)

    // Depois de mostrar os erros, o foco vai para o primeiro campo inválido
    function focarPrimeiroInvalido() {
        requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus())
    }

    async function enviar(e: FormEvent) {
        e.preventDefault()
        if (enviando) return

        const locais: Partial<Record<CamposReuniao, string>> = {}
        const dataLida = lerData(data)
        const inicioLido = lerHora(inicio)
        const fimLido = lerHora(fim)
        if (!titulo.trim()) locais.title = 'Campo obrigatório.'
        if (!data) locais.data = 'Campo obrigatório.'
        else if ('erro' in dataLida) locais.data = dataLida.erro
        if (!inicio) locais.starts_at = 'Campo obrigatório.'
        else if ('erro' in inicioLido) locais.starts_at = inicioLido.erro
        if (!fim) locais.ends_at = 'Campo obrigatório.'
        else if ('erro' in fimLido) locais.ends_at = fimLido.erro
        if (!capacidade) locais.capacity = 'Campo obrigatório.'
        setErroGeral(null)
        // Os três `'erro' in` já estão em `locais`; repetidos aqui, garantem ao TypeScript que daqui para baixo tudo foi lido
        if (Object.keys(locais).length > 0 || 'erro' in dataLida || 'erro' in inicioLido || 'erro' in fimLido) {
            setErros(locais)
            focarPrimeiroInvalido()
            return
        }

        const corpo: MeetingRequestDTO = {
            title: titulo.trim(),
            description: descricao.trim() || null,
            // data e horas digitadas são do fuso do navegador; o backend recebe o instante
            starts_at: new Date(`${dataLida.iso}T${inicioLido.hora}`).toISOString(),
            ends_at: new Date(`${dataLida.iso}T${fimLido.hora}`).toISOString(),
            capacity: Number(capacidade),
        }

        setEnviando(true)
        try {
            const salva = reuniao ? await updateMeeting(reuniao.id, corpo) : await createMeeting(corpo)
            onSalvo(salva)
        } catch (erro) {
            const doServidor = errosPorCampo(erro)
            const porCampo: Partial<Record<CamposReuniao, string>> = {}
            for (const campo of ['title', 'description', 'starts_at', 'ends_at', 'capacity'] as const) {
                if (doServidor[campo]) porCampo[campo] = doServidor[campo]
            }
            setErros(porCampo)
            if (Object.keys(porCampo).length > 0) {
                focarPrimeiroInvalido()
            } else {
                // 409, 403, 404, rede fora do ar...: a mensagem já vem em pt-BR do ApiError
                setErroGeral(erro instanceof ApiError ? erro.message : 'Algo deu errado. Tente novamente em instantes.')
            }
        } finally {
            setEnviando(false)
        }
    }

    return (
        <Modal
            aberto
            titulo={reuniao ? 'Editar reunião' : 'Criar reunião'}
            onFechar={onFechar}
            bloqueado={enviando}
            largura="lg"
            rodape={
                <div className="space-y-3">
                    {erroGeral && (
                        <p role="alert" className="rounded-campo bg-erro-fundo px-4 py-3 text-sm text-erro">
                            {erroGeral}
                        </p>
                    )}
                    <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                        <Botao variante="secundario" onClick={onFechar} disabled={enviando}>
                            Voltar
                        </Botao>
                        <Botao type="submit" form={idFormulario} carregando={enviando}>
                            {reuniao ? 'Salvar alterações' : 'Criar reunião'}
                        </Botao>
                    </div>
                </div>
            }
        >
            <form id={idFormulario} ref={formRef} onSubmit={enviar} noValidate className="space-y-4">
                <Campo rotulo="Título" erro={erros.title}>
                    {(c) => (
                        <input
                            {...c}
                            type="text"
                            name="title"
                            value={titulo}
                            onChange={(e) => setTitulo(e.target.value)}
                            maxLength={120}
                            autoComplete="off"
                            aria-required="true"
                        />
                    )}
                </Campo>

                <Campo rotulo="Descrição (opcional)" erro={erros.description} ajuda="Conte do que se trata a reunião.">
                    {(c) => (
                        <textarea
                            {...c}
                            name="description"
                            value={descricao}
                            onChange={(e) => setDescricao(e.target.value)}
                            maxLength={2000}
                            rows={3}
                        />
                    )}
                </Campo>

                <Campo rotulo="Data" erro={erros.data}>
                    {(c) => (
                        <EntradaComMascara
                            {...c}
                            mascara={mascararData}
                            name="date"
                            placeholder="dd/mm/aaaa"
                            autoComplete="off"
                            maxLength={10}
                            value={data}
                            onValor={setData}
                            aria-required="true"
                        />
                    )}
                </Campo>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Campo rotulo="Início" erro={erros.starts_at} ajuda="Pelo menos 60 minutos a partir de agora.">
                        {(c) => (
                            <EntradaComMascara
                                {...c}
                                mascara={mascararHora}
                                name="starts_at"
                                placeholder="hh:mm"
                                autoComplete="off"
                                maxLength={5}
                                value={inicio}
                                onValor={setInicio}
                                aria-required="true"
                            />
                        )}
                    </Campo>
                    <Campo rotulo="Fim" erro={erros.ends_at} ajuda="A reunião dura de 15 minutos a 3 horas.">
                        {(c) => (
                            <EntradaComMascara
                                {...c}
                                mascara={mascararHora}
                                name="ends_at"
                                placeholder="hh:mm"
                                autoComplete="off"
                                maxLength={5}
                                value={fim}
                                onValor={setFim}
                                aria-required="true"
                            />
                        )}
                    </Campo>
                </div>

                <Campo rotulo="Capacidade" erro={erros.capacity} ajuda="De 2 a 30 pessoas.">
                    {(c) => (
                        <input
                            {...c}
                            type="number"
                            inputMode="numeric"
                            name="capacity"
                            value={capacidade}
                            onChange={(e) => setCapacidade(e.target.value)}
                            min={2}
                            max={30}
                            aria-required="true"
                        />
                    )}
                </Campo>
            </form>
        </Modal>
    )
}
