import { useState } from 'react'

export interface HistoricoResumoItem {
  tipo: 'loteria' | 'esporte'
  concurso: number | null; bolao_slug: string | null; bolao_nome: string
  total: number; pagos: number; pendentes: number; cancelados: number; arrecadado: number
}

/** Card "Resumo" do Histórico — lê a view historico_resumo (já agregada no Postgres). */
export function useHistoricoResumo() {
  const [historico, setHistorico]         = useState<HistoricoResumoItem[]>([])
  const [showHistorico, setShowHistorico] = useState(false)
  const [loadingHist, setLoadingHist]     = useState(false)

  async function carregarHistorico() {
    setLoadingHist(true)
    const res = await fetch('/api/historico/resumo').then(r => r.json())
    setHistorico(res.historico || [])
    setShowHistorico(true)
    setLoadingHist(false)
  }

  return { historico, showHistorico, loadingHist, carregarHistorico }
}
