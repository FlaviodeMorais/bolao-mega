import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const { data } = await supabase
    .from('participantes')
    .select('concurso, total, status, created_at')
    .order('concurso', { ascending: false })

  if (!data) return NextResponse.json({ historico: [] })

  // Agrupa por concurso
  const map = new Map<number, { concurso: number; total: number; arrecadado: number; pagos: number; created_at: string }>()

  for (const row of data) {
    const c = Number(row.concurso)
    if (!map.has(c)) {
      map.set(c, { concurso: c, total: 0, arrecadado: 0, pagos: 0, created_at: row.created_at })
    }
    const entry = map.get(c)!
    entry.total += 1
    if (row.status === 'pago') {
      entry.arrecadado += Number(row.total)
      entry.pagos += 1
    }
  }

  const historico = Array.from(map.values()).sort((a, b) => b.concurso - a.concurso)
  return NextResponse.json({ historico })
}
