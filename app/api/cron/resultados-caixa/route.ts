import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const LOTERIAS = ['megasena', 'lotofacil', 'quina', 'lotomania']
const BASE = 'https://servicebus2.caixa.gov.br/portaldeloterias/api'

// Cron: atualiza cache de resultados da Caixa no Supabase (roda após cada sorteio)
// Chamado de dentro do Vercel — mesmo IP que pode ser bloqueado; por isso temos o
// cache manual como fallback (populado localmente ou pelo próximo cron bem-sucedido).
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const resultados: Record<string, string> = {}

  await Promise.all(LOTERIAS.map(async (lot) => {
    try {
      const res = await fetch(`${BASE}/${lot}`, {
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          'Referer': 'https://loterias.caixa.gov.br/',
          'Origin': 'https://loterias.caixa.gov.br',
          'Accept': 'application/json, text/plain, */*',
        },
      })

      if (!res.ok) { resultados[lot] = `HTTP ${res.status}`; return }

      const data = await res.json()
      const slim = {
        numero: data.numero,
        dataApuracao: data.dataApuracao,
        listaDezenas: data.listaDezenas,
        acumulado: data.acumulado,
        valorEstimadoProximoConcurso: data.valorEstimadoProximoConcurso,
        dataProximoConcurso: data.dataProximoConcurso,
        listaRateioPremio: (data.listaRateioPremio || []).map((r: { numeroDeGanhadores: number }) => ({
          numeroDeGanhadores: r.numeroDeGanhadores,
        })),
      }

      await supabase.from('config').upsert(
        { key: `resultado_${lot}`, value: JSON.stringify(slim), updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      )

      resultados[lot] = `ok #${slim.numero}`
    } catch (e) {
      resultados[lot] = `erro: ${String(e).slice(0, 60)}`
    }
  }))

  return NextResponse.json({ resultados })
}
