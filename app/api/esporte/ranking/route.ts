import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getEsporteSettings } from '@/lib/settings'

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('bolao')
  if (!slug) return NextResponse.json({ ranking: [] })

  const { data: bolao } = await supabase
    .from('boloes_esporte')
    .select('valor_cota, taxa_admin, premiacao')
    .eq('slug', slug).single()

  const { data: participantes } = await supabase
    .from('participantes_esporte')
    .select('id, nome, pontos_total, status')
    .eq('bolao_slug', slug)
    .eq('status', 'pago')
    .order('pontos_total', { ascending: false })

  if (!participantes) return NextResponse.json({ ranking: [] })

  const ranking = participantes.map((p, i) => ({ ...p, posicao: i + 1 }))

  const totalPagos = participantes.length
  const arrecadado = totalPagos * Number(bolao?.valor_cota || 0)
  const taxa = arrecadado * (Number(bolao?.taxa_admin || 20) / 100)
  const liquido = arrecadado - taxa

  const premiacao = Array.isArray(bolao?.premiacao) && bolao.premiacao.length > 0
    ? bolao.premiacao
    : (await getEsporteSettings()).premiacao

  const premios = premiacao.map(item => ({
    lugar:     item.lugar,
    emoji:     item.emoji,
    label:     item.label,
    categoria: item.categoria,
    valor:     liquido * (item.pct / 100),
    descricao: `${item.label} — ${item.categoria} (${item.pct}% do total)`,
  }))

  return NextResponse.json({
    ranking,
    stats: {
      arrecadado,
      premioLiquido: liquido,
      premios,
    }
  })
}
