import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verificarToken } from '@/lib/auth'

const BASE = 'https://servicebus2.caixa.gov.br/portaldeloterias/api/megasena'

export async function POST(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { de = 1, ate = 100 } = await req.json().catch(() => ({}))

  const numeros = Array.from({ length: Math.min(Number(ate) - Number(de) + 1, 200) }, (_, i) => Number(de) + i)

  const resultados: { concurso: number; dezenas: number[]; data_sorteio: string | null }[] = []
  const erros: number[] = []

  // Lotes de 20 para não sobrecarregar a API
  for (let i = 0; i < numeros.length; i += 20) {
    const lote = numeros.slice(i, i + 20)
    const respostas = await Promise.allSettled(
      lote.map(n =>
        fetch(`${BASE}/${n}`, { next: { revalidate: 0 } })
          .then(r => r.ok ? r.json() : null)
      )
    )
    for (let j = 0; j < respostas.length; j++) {
      const r = respostas[j]
      if (r.status === 'fulfilled' && r.value) {
        const d = r.value
        const dezenas = (d.listaDezenas || d.dezenas || []).map(Number)
        if (dezenas.length === 6) {
          resultados.push({
            concurso: lote[j],
            dezenas,
            data_sorteio: d.dataApuracao || null,
          })
        } else {
          erros.push(lote[j])
        }
      } else {
        erros.push(lote[j])
      }
    }
    // Pequena pausa entre lotes para respeitar rate limit
    await new Promise(r => setTimeout(r, 300))
  }

  if (resultados.length > 0) {
    await supabase.from('mega_historico').upsert(resultados, { onConflict: 'concurso' })
  }

  return NextResponse.json({ ok: true, inseridos: resultados.length, erros: erros.length, erros_lista: erros })
}
