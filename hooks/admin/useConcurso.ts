import { useState } from 'react'
import { getLoteria, type LoteriaId } from '@/lib/loterias'

export interface Concurso { num: number; data: string; premio: string }

function parseBRDate(s: string): Date | null {
  const m = s.match(/(\d{2})\/(\d{2})\/(\d{4})/)
  if (!m) return null
  return new Date(+m[3], +m[2] - 1, +m[1])
}
function nextDrawDate(d: Date, drawDays: number[]): Date {
  const next = new Date(d)
  do { next.setDate(next.getDate() + 1) } while (!drawDays.includes(next.getDay()))
  return next
}
function formatData(d: Date | null): string {
  if (!d) return '—'
  return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' })
}
function formatPremio(v: number): string {
  return `R$ ${(v / 1e6).toLocaleString('pt-BR', { minimumFractionDigits: 1 })} mi`
}

export function useConcurso() {
  const [concursoAtivo, setConcursoAtivo] = useState('')
  const [dataAtiva, setDataAtiva]         = useState('')
  const [premioAtivo, setPremioAtivo]     = useState('')
  const [proximos, setProximos]           = useState<Concurso[]>([])
  const [loadingCaixa, setLoadingCaixa]   = useState(false)
  const [editDatas, setEditDatas]         = useState<Record<number, string>>({})

  function setFromApi(concurso: string, data: string, premio: string) {
    setConcursoAtivo(concurso)
    setDataAtiva(data)
    setPremioAtivo(premio)
  }

  async function buscarCaixa(loteria: LoteriaId = 'mega') {
    setLoadingCaixa(true)
    try {
      const cfg = getLoteria(loteria)
      // Usa nossa API de resultados (já tem cache + fallback)
      const res = await fetch(`/api/resultados/${cfg.apiSlug}`)
      if (!res.ok) throw new Error('Falha')
      const data: Record<string, unknown> = await res.json()

      const ultimo    = parseInt(String(data.numero || data.numeroConcurso || 0))
      const proxData  = String(data.dataProximoConcurso || '')
      const premioVal = data.valorEstimadoProximoConcurso as number | undefined
      const d1 = parseBRDate(proxData)
      const d2 = d1 ? nextDrawDate(d1, cfg.drawDays) : null
      const d3 = d2 ? nextDrawDate(d2, cfg.drawDays) : null
      setProximos([
        { num: ultimo + 1, data: formatData(d1), premio: premioVal ? formatPremio(premioVal) : '—' },
        { num: ultimo + 2, data: formatData(d2), premio: 'Acumulando' },
        { num: ultimo + 3, data: formatData(d3), premio: 'Acumulando' },
      ])
    } catch { /* mantém lista vazia */ }
    finally { setLoadingCaixa(false) }
  }

  async function selecionarConcurso(c: Concurso) {
    await fetch('/api/concurso-ativo', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ concurso: c.num, data: c.data, premio: c.premio }),
    })
    setConcursoAtivo(String(c.num))
    setDataAtiva(c.data)
    setPremioAtivo(c.premio)
  }

  return {
    concursoAtivo, dataAtiva, premioAtivo,
    proximos, setProximos, loadingCaixa,
    editDatas, setEditDatas,
    setFromApi,
    buscarCaixa, selecionarConcurso,
  }
}
