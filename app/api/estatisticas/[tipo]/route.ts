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

// O Supabase/PostgREST limita cada select a 1000 linhas por padrão (max-rows).
// Sem paginar, o historico (ja com 3000+ concursos em mega/lotofacil/quina) e
// truncado silenciosamente, gerando frequencia/atrasos calculados com dados
// incompletos. Pagina em blocos de 1000 ate esgotar as linhas.
async function fetchAllRows<T>(
  build: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: { message: string } | null }>
): Promise<{ data: T[]; error: string | null }> {
  const PAGE = 1000
  const all: T[] = []
  let from = 0
  for (;;) {
    const { data, error } = await build(from, from + PAGE - 1)
    if (error) return { data: all, error: error.message }
    all.push(...(data || []))
    if (!data || data.length < PAGE) break
    from += PAGE
  }
  return { data: all, error: null }
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
      const minConcurso = ultimos ? (await maxConcurso(loteria, legacy)) - Number(ultimos) : null

      const { data, error } = await fetchAllRows<{ dezenas: number[]; concurso: number }>((from, to) => {
        let q = legacy
          ? supabase.from('mega_historico').select('dezenas, concurso')
          : supabase.from('loteria_historico').select('dezenas, concurso').eq('loteria', loteria)
        if (minConcurso) q = q.gte('concurso', minConcurso)
        return q.range(from, to)
      })
      if (error) return NextResponse.json({ error }, { status: 500 })

      const freq: Record<number, number> = {}
      for (let i = 1; i <= totalNums; i++) freq[i] = 0
      for (const row of data) {
        for (const n of row.dezenas || []) freq[n] = (freq[n] || 0) + 1
      }
      const total = data.length || 1
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

    if (tipo === 'combinacoes') {
      const { data, error } = await fetchAllRows<{ dezenas: number[]; concurso: number }>((from, to) => {
        const q = legacy
          ? supabase.from('mega_historico').select('dezenas, concurso')
          : supabase.from('loteria_historico').select('dezenas, concurso').eq('loteria', loteria)
        return q.range(from, to)
      })
      if (error) return NextResponse.json({ error }, { status: 500 })

      // Maior sequência de números consecutivos em cada sorteio
      const maxSequencia = (dez: number[]): number => {
        const s = [...dez].sort((a, b) => a - b)
        let max = 1, atual = 1
        for (let i = 1; i < s.length; i++) {
          if (s[i] === s[i - 1] + 1) { atual++; max = Math.max(max, atual) } else atual = 1
        }
        return max
      }

      const distribSeq: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0, '5+': 0 }
      const somas: number[] = []
      const paresCount: Record<string, number> = {}
      const trincasCount: Record<string, number> = {}
      const paresConsecCount: Record<string, number> = {}
      const trincasConsecCount: Record<string, number> = {}

      for (const row of data) {
        const dez = row.dezenas || []
        if (dez.length === 0) continue

        const seq = maxSequencia(dez)
        const chaveSeq = seq >= 5 ? '5+' : String(seq)
        distribSeq[chaveSeq] = (distribSeq[chaveSeq] || 0) + 1

        somas.push(dez.reduce((s, n) => s + n, 0))

        const ordenado = [...dez].sort((a, b) => a - b)

        // Duplas/trincas em geral (qualquer combinação que saiu junta no sorteio)
        for (let i = 0; i < ordenado.length; i++) {
          for (let j = i + 1; j < ordenado.length; j++) {
            const chave = `${ordenado[i]}-${ordenado[j]}`
            paresCount[chave] = (paresCount[chave] || 0) + 1
            for (let k = j + 1; k < ordenado.length; k++) {
              const chaveTrio = `${ordenado[i]}-${ordenado[j]}-${ordenado[k]}`
              trincasCount[chaveTrio] = (trincasCount[chaveTrio] || 0) + 1
            }
          }
        }

        // Duplas/trincas consecutivas (números literalmente sequenciais, ex: 43-44, 43-44-45)
        for (let i = 0; i < ordenado.length - 1; i++) {
          if (ordenado[i + 1] !== ordenado[i] + 1) continue
          const chave = `${ordenado[i]}-${ordenado[i + 1]}`
          paresConsecCount[chave] = (paresConsecCount[chave] || 0) + 1

          if (i + 2 < ordenado.length && ordenado[i + 2] === ordenado[i] + 2) {
            const chaveTrio = `${ordenado[i]}-${ordenado[i + 1]}-${ordenado[i + 2]}`
            trincasConsecCount[chaveTrio] = (trincasConsecCount[chaveTrio] || 0) + 1
          }
        }
      }

      const total = data.length || 1
      const distribuicaoSequencia = Object.entries(distribSeq)
        .map(([tamanho, count]) => ({ tamanho, count, pct: Math.round((count / total) * 1000) / 10 }))
        .sort((a, b) => (a.tamanho === '5+' ? 1 : b.tamanho === '5+' ? -1 : Number(a.tamanho) - Number(b.tamanho)))

      const duplasFrequentes = Object.entries(paresCount)
        .map(([par, count]) => ({ par: par.split('-').map(Number) as [number, number], count, pct: Math.round((count / total) * 1000) / 10 }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15)

      const trincasFrequentes = Object.entries(trincasCount)
        .map(([trio, count]) => ({ trio: trio.split('-').map(Number) as [number, number, number], count, pct: Math.round((count / total) * 1000) / 10 }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15)

      const duplasConsecutivas = Object.entries(paresConsecCount)
        .map(([par, count]) => ({ par: par.split('-').map(Number) as [number, number], count, pct: Math.round((count / total) * 1000) / 10 }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15)

      const trincasConsecutivas = Object.entries(trincasConsecCount)
        .map(([trio, count]) => ({ trio: trio.split('-').map(Number) as [number, number, number], count, pct: Math.round((count / total) * 1000) / 10 }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 15)

      const somaMedia = Math.round(somas.reduce((s, v) => s + v, 0) / (somas.length || 1))
      const somaMin = Math.min(...somas)
      const somaMax = Math.max(...somas)

      return NextResponse.json(
        {
          tipo, loteria, total_concursos: total, distribuicaoSequencia,
          duplasFrequentes, trincasFrequentes, duplasConsecutivas, trincasConsecutivas,
          soma: { media: somaMedia, min: somaMin, max: somaMax },
        },
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
