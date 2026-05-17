import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data } = await supabase
    .from('participantes')
    .select('concurso, total, status, bolao_slug, created_at')
    .order('concurso', { ascending: false })

  if (!data) return NextResponse.json({ historico: [] })

  // Agrupa por concurso + bolao_slug
  const map = new Map<string, {
    concurso: number; bolao_slug: string | null;
    total: number; arrecadado: number; pagos: number; cancelados: number; created_at: string
  }>()

  for (const row of data) {
    const key = `${row.concurso}-${row.bolao_slug || 'main'}`
    if (!map.has(key)) {
      map.set(key, {
        concurso:    Number(row.concurso),
        bolao_slug:  row.bolao_slug,
        total:       0, arrecadado: 0, pagos: 0, cancelados: 0,
        created_at:  row.created_at,
      })
    }
    const e = map.get(key)!
    e.total += 1
    if (row.status === 'pago')      { e.arrecadado += Number(row.total); e.pagos += 1 }
    if (row.status === 'cancelado') { e.cancelados += 1 }
  }

  const historico = Array.from(map.values())
    .sort((a, b) => b.concurso - a.concurso || (b.bolao_slug || '').localeCompare(a.bolao_slug || ''))

  return NextResponse.json({ historico })
}
