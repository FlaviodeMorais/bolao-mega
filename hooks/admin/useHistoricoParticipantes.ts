import { useState, useCallback } from 'react'

export interface HistoricoParticipante {
  id: string; tipo: 'loteria' | 'esporte'
  nome: string; telefone?: string; email?: string; chave_pix?: string
  cotas: string[] | null
  total: number; status: string
  concurso: number | null
  bolao_slug: string | null; bolao_nome: string
  acrescimo?: number | null; acrescimo_pago?: boolean
  created_at: string
}
interface BolaoOpt { slug: string; nome: string; ativo: boolean }

const TREVO = '\u{1F340}'

/** Card "Participantes" do Histórico — busca/filtro/paginação server-side (view historico_participantes)
 *  + disparo sistemático de convite via Whapi (POST /api/admin/convite-massa), sem depender de wa.me/popups. */
export function useHistoricoParticipantes(boloes: BolaoOpt[], concursoAtivo: string) {
  const [participantes, setParticipantes] = useState<HistoricoParticipante[]>([])
  const [total, setTotal]           = useState(0)
  const [page, setPage]             = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const [busca, setBusca]             = useState('')
  const [filtroSlug, setFiltroSlug]   = useState('')
  const [filtroConc, setFiltroConc]   = useState('')
  const [filtroTipo, setFiltroTipo]   = useState<'todos' | 'loteria' | 'esporte'>('todos')

  // Bolão cujo link vai na mensagem de convite ({link}) — escolhido explicitamente
  // pelo admin; se não escolher, cai no primeiro bolão ativo (comportamento anterior).
  const [bolaoConviteSlug, setBolaoConviteSlug] = useState('')

  const [loadingHist, setLoadingHist] = useState(false)
  const [msgConvite, setMsgConvite]   = useState('')
  const [enviandoId, setEnviandoId]   = useState<string | null>(null)
  const [enviandoMassa, setEnviandoMassa] = useState(false)
  const [resultadoConvite, setResultadoConvite] = useState('')

  // Seleção manual (sobrevive entre páginas — guarda nome/telefone, não só o id,
  // pra poder disparar o convite sem depender do que está carregado na hora do envio)
  const [selecionados, setSelecionados] = useState<Map<string, { nome: string; telefone: string }>>(new Map())

  const carregarHistParticipantes = useCallback(async (novaPagina = 1) => {
    setLoadingHist(true)
    const params = new URLSearchParams({ page: String(novaPagina) })
    if (busca)      params.set('busca', busca)
    if (filtroSlug) params.set('bolao', filtroSlug)
    if (filtroConc) params.set('concurso', filtroConc)
    if (filtroTipo !== 'todos') params.set('tipo', filtroTipo)
    const res = await fetch(`/api/historico/participantes?${params}`).then(r => r.json())
    setParticipantes(res.participantes || [])
    setTotal(res.total || 0)
    setPage(res.page || 1)
    setTotalPages(res.totalPages || 1)
    setLoadingHist(false)
  }, [busca, filtroSlug, filtroConc, filtroTipo])

  const bolaoConvite = boloes.find(b => b.slug === bolaoConviteSlug) || boloes.find(b => b.ativo) || null

  function montarMensagem(nome: string) {
    const origem = typeof window !== 'undefined' ? window.location.origin : ''
    const link = bolaoConvite ? `${origem}/${bolaoConvite.slug}` : origem
    const template = msgConvite ||
      `${TREVO} Olá {nome}! Temos um novo bolão disponível para o concurso #${concursoAtivo}.\n\nAcesse: ${link}\n\nBoa sorte!`
    return template.replaceAll('{nome}', nome).replaceAll('{link}', link)
  }

  async function dispararConvite(contatos: { telefone: string; nome: string }[]) {
    const res = await fetch('/api/admin/convite-massa', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contatos: contatos.map(c => ({ ...c })), mensagem: montarMensagem('{nome}') }),
    }).then(r => r.json())
    return res as { ok?: boolean; enviados?: number; falhas?: { telefone: string; nome: string; erro: string }[]; error?: string }
  }

  async function enviarConviteIndividual(telefone: string, nome: string, id: string) {
    setEnviandoId(id); setResultadoConvite('')
    const res = await dispararConvite([{ telefone, nome }])
    setEnviandoId(null)
    if (res.error) { setResultadoConvite(`❌ ${res.error}`); return }
    setResultadoConvite(res.enviados ? `✅ Convite enviado para ${nome}!` : `❌ Falha ao enviar: ${res.falhas?.[0]?.erro || 'erro desconhecido'}`)
    setTimeout(() => setResultadoConvite(''), 5000)
  }

  function toggleSelecionado(p: HistoricoParticipante) {
    if (!p.telefone) return
    setSelecionados(prev => {
      const next = new Map(prev)
      if (next.has(p.id)) next.delete(p.id)
      else next.set(p.id, { nome: p.nome, telefone: p.telefone! })
      return next
    })
  }

  function selecionarVisiveis() {
    setSelecionados(prev => {
      const next = new Map(prev)
      for (const p of participantes) if (p.telefone) next.set(p.id, { nome: p.nome, telefone: p.telefone })
      return next
    })
  }

  function limparSelecao() {
    setSelecionados(new Map())
  }

  async function enviarConviteSelecionados() {
    const contatos = Array.from(selecionados.values())
    if (!contatos.length) return
    if (!confirm(`Enviar convite para ${contatos.length} selecionado(s)?`)) return

    setEnviandoMassa(true); setResultadoConvite('')
    const res = await dispararConvite(contatos)
    setEnviandoMassa(false)
    if (res.error) { setResultadoConvite(`❌ ${res.error}`); return }
    const falhas = res.falhas?.length || 0
    setResultadoConvite(`✅ ${res.enviados} enviado(s)${falhas ? ` · ❌ ${falhas} falha(s)` : ''}`)
    limparSelecao()
    setTimeout(() => setResultadoConvite(''), 8000)
  }

  async function enviarConviteTodos() {
    setEnviandoMassa(true); setResultadoConvite('')
    const params = new URLSearchParams({ paraContato: '1' })
    if (busca)      params.set('busca', busca)
    if (filtroSlug) params.set('bolao', filtroSlug)
    if (filtroConc) params.set('concurso', filtroConc)
    if (filtroTipo !== 'todos') params.set('tipo', filtroTipo)
    const { contatos } = await fetch(`/api/historico/participantes?${params}`).then(r => r.json())

    if (!contatos?.length) { setEnviandoMassa(false); setResultadoConvite('Nenhum contato com WhatsApp encontrado.'); return }
    if (!confirm(`Enviar convite para ${contatos.length} contato(s)?`)) { setEnviandoMassa(false); return }

    const res = await dispararConvite(contatos)
    setEnviandoMassa(false)
    if (res.error) { setResultadoConvite(`❌ ${res.error}`); return }
    const falhas = res.falhas?.length || 0
    setResultadoConvite(`✅ ${res.enviados} enviado(s)${falhas ? ` · ❌ ${falhas} falha(s)` : ''}`)
    setTimeout(() => setResultadoConvite(''), 8000)
  }

  return {
    participantes, total, page, totalPages,
    busca, setBusca, filtroSlug, setFiltroSlug, filtroConc, setFiltroConc, filtroTipo, setFiltroTipo,
    bolaoConviteSlug, setBolaoConviteSlug, bolaoConvite,
    loadingHist, msgConvite, setMsgConvite,
    enviandoId, enviandoMassa, resultadoConvite,
    selecionados, toggleSelecionado, selecionarVisiveis, limparSelecao,
    carregarHistParticipantes,
    enviarConviteIndividual, enviarConviteTodos, enviarConviteSelecionados,
  }
}
