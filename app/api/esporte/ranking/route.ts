import { NextRequest, NextResponse } from 'next/server'
import { calcularRankingBolao } from '@/lib/esporte-ranking'

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('bolao')
  if (!slug) return NextResponse.json({ ranking: [] })

  const dados = await calcularRankingBolao(slug)
  if (!dados) return NextResponse.json({ ranking: [] })

  return NextResponse.json({
    ranking: dados.ranking,
    stats: {
      arrecadado: dados.arrecadado,
      premioLiquido: dados.liquido,
      premios: dados.premios.map(p => ({ ...p, descricao: `${p.label} — ${p.categoria} (${p.pct}% do total)` })),
    },
  })
}
