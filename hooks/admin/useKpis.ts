import { useState } from 'react'

export interface KpiGeral {
  totalArrecadado: number; totalParticipantes: number; ticketMedio: number
  taxaConversao: number; totalCotas: number; totalPagos: number
  totalPendentes: number; totalConcursos: number; taxaRetencao: number
}
export interface KpiConcurso { concurso: number; arrecadado: number; pagos: number; total: number }
export interface KpiParticipante { nome: string; telefone?: string; concursos: number; totalGasto: number; totalCotas: number; pagamentos: number }
export interface KpiCota { cota: string; count: number }

export function useKpis() {
  const [showKpi, setShowKpi]           = useState(false)
  const [loadingKpi, setLoadingKpi]     = useState(false)
  const [kpiGeral, setKpiGeral]         = useState<KpiGeral | null>(null)
  const [kpiConcursos, setKpiConcursos] = useState<KpiConcurso[]>([])
  const [kpiFreq, setKpiFreq]           = useState<KpiParticipante[]>([])
  const [kpiGasto, setKpiGasto]         = useState<KpiParticipante[]>([])
  const [kpiCotas, setKpiCotas]         = useState<KpiCota[]>([])
  const [kpiAba, setKpiAba]             = useState<'freq' | 'gasto' | 'cotas'>('freq')

  async function carregarKpis() {
    setLoadingKpi(true)
    const d = await fetch('/api/admin/kpis').then(r => r.json())
    setKpiGeral(d.visaoGeral)
    setKpiConcursos(d.porConcurso || [])
    setKpiFreq(d.topFrequencia || [])
    setKpiGasto(d.topGasto || [])
    setKpiCotas(d.cotasPopulares || [])
    setLoadingKpi(false)
    setShowKpi(true)
  }

  return {
    showKpi, loadingKpi,
    kpiGeral, kpiConcursos, kpiFreq, kpiGasto, kpiCotas, kpiAba,
    carregarKpis,
    setKpiAba,
  }
}
