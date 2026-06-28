import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

// Para Mega-Sena: usa loteria_historico se tiver dados, senão cai em mega_historico (legado)
async function megaFallback(loteria: string) {
  if (loteria !== 'mega') return false
  const { count } = await supabase
    .from('loteria_historico').select('*', { count: 'exact', head: true }).eq('loteria', 'mega')
  return !count || count === 0
}

async function queryHistorico(loteria: string, useLegacy: boolean) {
  if (useLegacy) return supabase.from('mega_historico').select('dezenas, concurso')
  return supabase.from('loteria_historico').select('dezenas, concurso').eq('loteria', loteria)
}

async function maxConcurso(loteria: string, useLegacy: boolean) {
  if (useLegacy) {
    const { data } = await supabase.from('mega_historico').select('concurso').order('concurso', { ascending: false }).limit(1).single()
    return data?.concurso ?? 0
  }
  const { data } = await supabase.from('loteria_historico').select('concurso').eq('loteria', loteria).order('concurso', { ascending: false }).limit(1).single()
  return data?.concurso ?? 0
}

export async function GET(req: NextRequest, { params }: { params: { tipo: string } }) {
  const { tipo } = params
  const ultimos   = req.nextUrl.searchParams.get('ultimos')
  const loteria   = req.nextUrl.searchParams.get('loteria') || 'mega'
  const totalNums = loteria === 'lotofacil' ? 25 : loteria === 'quina' ? 80 : 60

  try {
    const legacy = await megaFallback(loteria)

    if (tipo === 'frequencia' || tipo === 'frequencia-geral' || tipo === 'frequencia-recente') {
      let q = legacy
        ? supabase.from('mega_historico').select('dezenas, concurso')
        : supabase.from('loteria_historico').select('dezenas, concurso').eq('loteria', loteria)

      if (ultimos) {
        const maxC = await maxConcurso(loteria, legacy)
        if (maxC) q = q.gte('concurso', maxC - Number(ultimos))
      }

      const { data, error } = await q
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      const freq: Record<number, number> = {}
      for (let i = 1; i <= totalNums; i++) freq[i] = 0
      for (const row of data || []) {
        for (const n of row.dezenas || []) freq[n] = (freq[n] || 0) + 1
      }
      const total = data?.length || 1
      const resultado = Object.entries(freq).map(([num, count]) => ({
        numero: Number(num), count, pct: Math.round((count / total) * 1000) / 10,
      })).sort((a, b) => b.count - a.count)

      return NextResponse.json(
        { tipo, loteria, total_concursos: total, numeros: resultado },
        { next: { revalidate: 3600 } } as never,
      )
    }

    if (tipo === 'atrasos') {
      const q = legacy
        ? supabase.from('mega_historico').select('concurso, dezenas').order('concurso', { ascending: false }).limit(500)
        : supabase.from('loteria_historico').select('concurso, dezenas').eq('loteria', loteria).order('concurso', { ascending: false }).limit(500)

      const { data, error } = await q
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      const concursoAtual = await maxConcurso(loteria, legacy)

      const ultimoApareceu: Record<number, number> = {}
      for (let i = 1; i <= totalNums; i++) ultimoApareceu[i] = 0
      for (const row of data || []) {
        for (const n of row.dezenas || []) {
          if (!ultimoApareceu[n]) ultimoApareceu[n] = row.concurso
        }
      }
      const resultado = Object.entries(ultimoApareceu).map(([num, ultimo]) => ({
        numero: Number(num), count: 0, pct: 0,
        ultimo_concurso: ultimo,
        atraso: ultimo ? concursoAtual - ultimo : 999,
      })).sort((a, b) => b.atraso - a.atraso)

      return NextResponse.json(
        { tipo, loteria, concurso_atual: concursoAtual, numeros: resultado },
        { next: { revalidate: 3600 } } as never,
      )
    }

    if (tipo === 'info') {
      let count: number | null = 0
      let max: number | undefined, min: number | undefined

      if (legacy) {
        const r = await supabase.from('mega_historico').select('*', { count: 'exact', head: true })
        count = r.count
        const { data: mx } = await supabase.from('mega_historico').select('concurso').order('concurso', { ascending: false }).limit(1).single()
        const { data: mn } = await supabase.from('mega_historico').select('concurso').order('concurso', { ascending: true }).limit(1).single()
        max = mx?.concurso; min = mn?.concurso
      } else {
        const r = await supabase.from('loteria_historico').select('*', { count: 'exact', head: true }).eq('loteria', loteria)
        count = r.count
        const { data: mx } = await supabase.from('loteria_historico').select('concurso').eq('loteria', loteria).order('concurso', { ascending: false }).limit(1).single()
        const { data: mn } = await supabase.from('loteria_historico').select('concurso').eq('loteria', loteria).order('concurso', { ascending: true }).limit(1).single()
        max = mx?.concurso; min = mn?.concurso
      }

      return NextResponse.json({ total: count || 0, primeiro: min, ultimo: max, loteria })
    }

    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
