import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET() {
  const [{ data: partic }, { data: boloes }] = await Promise.all([
    supabase
      .from('participantes')
      .select('concurso, total, status, bolao_slug')
      .order('concurso', { ascending: false }),
    supabase
      .from('boloes')
      .select('slug, nome'),
  ])

  if (!partic) return NextResponse.json({ historico: [] })

  const bolaoMap = new Map((boloes || []).map(b => [b.slug, b.nome]))

  const map = new Map<string, {
    concurso: number; bolao_slug: string | null; bolao_nome: string
    total: number; pagos: number; pendentes: number; cancelados: number; arrecadado: number
  }>()

  for (const row of partic) {
    const key = `${row.concurso}-${row.bolao_slug || 'main'}`
    if (!map.has(key)) {
      map.set(key, {
        concurso:   Number(row.concurso),
        bolao_slug: row.bolao_slug,
        bolao_nome: bolaoMap.get(row.bolao_slug) || (row.bolao_slug ? `/${row.bolao_slug}` : 'Principal'),
        total: 0, pagos: 0, pendentes: 0, cancelados: 0, arrecadado: 0,
      })
    }
    const e = map.get(key)!
    e.total += 1
    if (row.status === 'pago')      { e.pagos      += 1; e.arrecadado += Number(row.total) }
    if (row.status === 'aguardando') { e.pendentes  += 1 }
    if (row.status === 'cancelado') { e.cancelados  += 1 }
  }

  const historico = Array.from(map.values())
    .sort((a, b) => b.concurso - a.concurso || (a.bolao_slug || '').localeCompare(b.bolao_slug || ''))

  return NextResponse.json({ historico })
}
