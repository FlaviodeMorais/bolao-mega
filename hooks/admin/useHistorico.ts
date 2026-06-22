import { useState } from 'react'

export interface HistoricoItem {
  concurso: number; bolao_slug: string | null; bolao_nome: string
  total: number; pagos: number; pendentes: number; cancelados: number; arrecadado: number
}
export interface HistoricoParticipante {
  id: string; nome: string; telefone?: string; cotas: string[]
  total: number; status: string; concurso: number
  bolao_slug: string | null; bolao_nome: string
  acrescimo?: number | null; acrescimo_pago?: boolean
  created_at: string
}
interface BolaoOpt { slug: string; ativo: boolean }

export function useHistorico(boloes: BolaoOpt[], concursoAtivo: string) {
  const [historico, setHistorico]                   = useState<HistoricoItem[]>([])
  const [showHistorico, setShowHistorico]           = useState(false)
  const [modoHistorico, setModoHistorico]           = useState<'resumo' | 'participantes'>('resumo')
  const [histParticipantes, setHistParticipantes]   = useState<HistoricoParticipante[]>([])
  const [histFiltroConc, setHistFiltroConc]         = useState('')
  const [histFiltroSlug, setHistFiltroSlug]         = useState('')
  const [histBusca, setHistBusca]                   = useState('')
  const [loadingHist, setLoadingHist]               = useState(false)
  const [msgConvite, setMsgConvite]                 = useState('')

  async function carregarHistorico() {
    setLoadingHist(true)
    const res = await fetch('/api/historico').then(r => r.json())
    setHistorico(res.historico || [])
    setShowHistorico(true)
    setLoadingHist(false)
  }

  async function carregarHistParticipantes() {
    setLoadingHist(true)
    const params = new URLSearchParams({ detalhes: '1' })
    if (histFiltroConc) params.set('concurso', histFiltroConc)
    if (histFiltroSlug) params.set('bolao', histFiltroSlug)
    const res = await fetch(`/api/historico?${params}`).then(r => r.json())
    setHistParticipantes(res.participantes || [])
    setLoadingHist(false)
  }

  function enviarConviteNovoBolao(tel: string, nome: string) {
    if (!tel) return
    const n = tel.replace(/\D/g, '')
    const num = n.startsWith('55') ? n : `55${n}`
    const bolaoAtivo = boloes.find(b => b.ativo)
    const origem = typeof window !== 'undefined' ? window.location.origin : ''
    const link = bolaoAtivo ? `${origem}/${bolaoAtivo.slug}` : origem
    const trevo = '\u{1F340}'
    const msg = msgConvite ||
      `${trevo} Olá ${nome}! Temos um novo bolão disponível para o concurso #${concursoAtivo}.\n\nAcesse: ${link}\n\nBoa sorte!`
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  return {
    historico, showHistorico,
    modoHistorico, setModoHistorico,
    histParticipantes,
    histFiltroConc, setHistFiltroConc,
    histFiltroSlug, setHistFiltroSlug,
    histBusca, setHistBusca,
    loadingHist,
    msgConvite, setMsgConvite,
    carregarHistorico,
    carregarHistParticipantes,
    enviarConviteNovoBolao,
  }
}
