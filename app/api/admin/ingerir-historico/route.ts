import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verificarToken } from '@/lib/auth'

const BASE = 'https://servicebus2.caixa.gov.br/portaldeloterias/api/megasena'

export async function GET(req: NextRequest) {
  // Diagnóstico: testa 1 concurso e retorna resposta bruta
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const n = req.nextUrl.searchParams.get('n') || '1'
  try {
    const res = await fetch(`${BASE}/${n}`, { cache: 'no-store' })
    const status = res.status
    const text = await res.text()
    let json: unknown = null
    try { json = JSON.parse(text) } catch { json = null }

    // Testa também o insert no Supabase com dado fictício
    let supabaseTest = null
    if (json && typeof json === 'object') {
      const d = json as Record<string, unknown>
      const dezenas = ((d.listaDezenas || d.dezenas || []) as unknown[]).map(Number)
      if (dezenas.length === 6) {
        const { error } = await supabase.from('mega_historico').upsert(
          [{ concurso: Number(n), dezenas, data_sorteio: d.dataApuracao || null }],
          { onConflict: 'concurso' }
        )
        supabaseTest = error ? { erro: error.message, detalhes: error.details } : { ok: true }
      } else {
        supabaseTest = { erro: `Dezenas encontradas: ${JSON.stringify(d.listaDezenas || d.dezenas)}` }
      }
    }

    return NextResponse.json({ httpStatus: status, campos: json ? Object.keys(json as object) : null, supabaseTest, amostra: text.slice(0, 500) })
  } catch (err) {
    return NextResponse.json({ fetchErro: String(err) })
  }
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { de = 1, ate = 100 } = await req.json().catch(() => ({}))

  const numeros = Array.from({ length: Math.min(Number(ate) - Number(de) + 1, 200) }, (_, i) => Number(de) + i)

  const resultados: { concurso: number; dezenas: number[]; data_sorteio: string | null }[] = []
  const erros: number[] = []
  let primeiroErro: string | null = null

  // Lotes de 10 para não estourar timeout do Vercel
  for (let i = 0; i < numeros.length; i += 10) {
    const lote = numeros.slice(i, i + 10)
    const respostas = await Promise.allSettled(
      lote.map(n =>
        fetch(`${BASE}/${n}`, { cache: 'no-store' })
          .then(async r => {
            if (!r.ok) throw new Error(`HTTP ${r.status}`)
            return r.json()
          })
      )
    )
    for (let j = 0; j < respostas.length; j++) {
      const r = respostas[j]
      if (r.status === 'fulfilled' && r.value) {
        const d = r.value
        const dezenas = (d.listaDezenas || d.dezenas || []).map(Number)
        if (dezenas.length === 6) {
          resultados.push({ concurso: lote[j], dezenas, data_sorteio: d.dataApuracao || null })
        } else {
          if (!primeiroErro) primeiroErro = `Concurso ${lote[j]}: dezenas=${JSON.stringify(d.listaDezenas)}`
          erros.push(lote[j])
        }
      } else {
        if (!primeiroErro && r.status === 'rejected') primeiroErro = String(r.reason)
        erros.push(lote[j])
      }
    }
    await new Promise(r => setTimeout(r, 200))
  }

  let supabaseErro = null
  if (resultados.length > 0) {
    const { error } = await supabase.from('mega_historico').upsert(resultados, { onConflict: 'concurso' })
    if (error) supabaseErro = error.message
  }

  return NextResponse.json({
    ok: true,
    inseridos: supabaseErro ? 0 : resultados.length,
    erros: erros.length + (supabaseErro ? resultados.length : 0),
    primeiroErro,
    supabaseErro,
  })
}
