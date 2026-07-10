import { NextRequest, NextResponse } from 'next/server'
import { verificarToken } from '@/lib/auth'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { data: rows } = await supabase
    .from('participantes')
    .select('id, nome, telefone, cotas, total, status, concurso, bolao_slug, created_at, usuario_id')
    .order('created_at', { ascending: true })

  if (!rows) return NextResponse.json({ error: 'Sem dados' }, { status: 500 })

  const pagos     = rows.filter(r => r.status === 'pago')
  const pendentes = rows.filter(r => r.status === 'aguardando')

  // ── Visão geral ─────────────────────────────────────────────────────────
  const totalArrecadado  = pagos.reduce((s, r) => s + Number(r.total), 0)
  // Prefere usuario_id para identificar o participante; cai no telefone ou nome como fallback
  const totalParticipantes = new Set(rows.map(r => r.usuario_id || r.telefone || r.nome)).size
  const ticketMedio      = pagos.length ? totalArrecadado / pagos.length : 0
  const taxaConversao    = rows.length ? (pagos.length / rows.length) * 100 : 0
  const totalCotas       = pagos.reduce((s, r) => s + (r.cotas?.length || 0), 0)

  // ── Arrecadação por concurso ─────────────────────────────────────────────
  const concursoMap = new Map<number, { concurso: number; arrecadado: number; pagos: number; total: number }>()
  for (const r of rows) {
    const c = Number(r.concurso)
    if (!concursoMap.has(c)) concursoMap.set(c, { concurso: c, arrecadado: 0, pagos: 0, total: 0 })
    const e = concursoMap.get(c)!
    e.total += 1
    if (r.status === 'pago') { e.pagos += 1; e.arrecadado += Number(r.total) }
  }
  const porConcurso = Array.from(concursoMap.values())
    .sort((a, b) => b.concurso - a.concurso)
    .slice(0, 10)

  // ── Top participantes por frequência ────────────────────────────────────
  const partMap = new Map<string, {
    nome: string; telefone?: string; concursos: Set<number>
    totalGasto: number; totalCotas: number; pagamentos: number
  }>()
  for (const r of rows) {
    const key = r.usuario_id || r.telefone || r.nome
    if (!partMap.has(key)) {
      partMap.set(key, { nome: r.nome, telefone: r.telefone, concursos: new Set(), totalGasto: 0, totalCotas: 0, pagamentos: 0 })
    }
    const e = partMap.get(key)!
    e.concursos.add(Number(r.concurso))
    if (r.status === 'pago') {
      e.totalGasto  += Number(r.total)
      e.totalCotas  += r.cotas?.length || 0
      e.pagamentos  += 1
    }
  }
  const topFrequencia = Array.from(partMap.values())
    .map(e => ({ ...e, concursos: e.concursos.size }))
    .sort((a, b) => b.concursos - a.concursos || b.totalGasto - a.totalGasto)
    .slice(0, 10)

  const topGasto = Array.from(partMap.values())
    .map(e => ({ ...e, concursos: e.concursos.size }))
    .sort((a, b) => b.totalGasto - a.totalGasto)
    .slice(0, 10)

  // ── Cotas mais escolhidas ────────────────────────────────────────────────
  const cotaCount = new Map<string, number>()
  for (const r of pagos) {
    for (const c of (r.cotas || [])) {
      cotaCount.set(c, (cotaCount.get(c) || 0) + 1)
    }
  }
  const cotasPopulares = Array.from(cotaCount.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([cota, count]) => ({ cota, count }))

  // ── Taxa de retenção: participantes que voltaram no concurso seguinte ────
  const concursosOrdenados = Array.from(concursoMap.keys()).sort((a, b) => a - b)
  let retencaoCount = 0; let retencaoTotal = 0
  for (let i = 1; i < concursosOrdenados.length; i++) {
    const prev = new Set(rows.filter(r => Number(r.concurso) === concursosOrdenados[i-1]).map(r => r.usuario_id || r.telefone || r.nome))
    const curr = rows.filter(r => Number(r.concurso) === concursosOrdenados[i]).map(r => r.usuario_id || r.telefone || r.nome)
    retencaoTotal += prev.size
    retencaoCount += curr.filter(n => prev.has(n)).length
  }
  const taxaRetencao = retencaoTotal ? (retencaoCount / retencaoTotal) * 100 : 0

  return NextResponse.json({
    visaoGeral: {
      totalArrecadado,
      totalParticipantes,
      ticketMedio,
      taxaConversao,
      totalCotas,
      totalPagos: pagos.length,
      totalPendentes: pendentes.length,
      totalConcursos: concursoMap.size,
      taxaRetencao,
    },
    porConcurso,
    topFrequencia,
    topGasto,
    cotasPopulares,
  })
}
