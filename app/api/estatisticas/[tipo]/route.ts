import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest, { params }: { params: { tipo: string } }) {
  const { tipo } = params
  const ultimos = req.nextUrl.searchParams.get('ultimos') // ex: 100 concursos recentes

  try {
    if (tipo === 'frequencia' || tipo === 'frequencia-geral' || tipo === 'frequencia-recente') {
      let query = supabase.from('mega_historico').select('dezenas, concurso')
      if (ultimos) {
        const { data: max } = await supabase.from('mega_historico').select('concurso').order('concurso', { ascending: false }).limit(1).single()
        if (max) query = query.gte('concurso', max.concurso - Number(ultimos))
      }
      const { data, error } = await query
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      const freq: Record<number, number> = {}
      for (let i = 1; i <= 60; i++) freq[i] = 0
      for (const row of data || []) {
        for (const n of row.dezenas || []) freq[n] = (freq[n] || 0) + 1
      }
      const total = data?.length || 1
      const resultado = Object.entries(freq).map(([num, count]) => ({
        numero: Number(num),
        count,
        pct: Math.round((count / total) * 1000) / 10,
      })).sort((a, b) => b.count - a.count)

      return NextResponse.json({ tipo, total_concursos: total, numeros: resultado }, { next: { revalidate: 3600 } } as never)
    }

    if (tipo === 'atrasos') {
      const { data, error } = await supabase
        .from('mega_historico')
        .select('concurso, dezenas')
        .order('concurso', { ascending: false })
        .limit(500)
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })

      const { data: maxRow } = await supabase.from('mega_historico').select('concurso').order('concurso', { ascending: false }).limit(1).single()
      const concursoAtual = maxRow?.concurso || 0

      const ultimoApareceu: Record<number, number> = {}
      for (let i = 1; i <= 60; i++) ultimoApareceu[i] = 0
      for (const row of data || []) {
        for (const n of row.dezenas || []) {
          if (!ultimoApareceu[n]) ultimoApareceu[n] = row.concurso
        }
      }
      const resultado = Object.entries(ultimoApareceu).map(([num, ultimo]) => ({
        numero: Number(num),
        ultimo_concurso: ultimo,
        atraso: ultimo ? concursoAtual - ultimo : 999,
      })).sort((a, b) => b.atraso - a.atraso)

      return NextResponse.json({ tipo, concurso_atual: concursoAtual, numeros: resultado }, { next: { revalidate: 3600 } } as never)
    }

    if (tipo === 'info') {
      const { count } = await supabase.from('mega_historico').select('*', { count: 'exact', head: true })
      const { data: max } = await supabase.from('mega_historico').select('concurso').order('concurso', { ascending: false }).limit(1).single()
      const { data: min } = await supabase.from('mega_historico').select('concurso').order('concurso', { ascending: true }).limit(1).single()
      return NextResponse.json({ total: count || 0, primeiro: min?.concurso, ultimo: max?.concurso })
    }

    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
