import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('bolao')
  if (!slug) return NextResponse.json({ ranking: [] })

  const { data: bolao } = await supabase
    .from('boloes_esporte')
    .select('valor_cota, taxa_admin')
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

  // 1º (cat A): 40% | 2º (cat B): 20% | 3º (cat C): 20%
  return NextResponse.json({
    ranking,
    stats: {
      arrecadado,
      premioLiquido: liquido,
      premio1: liquido * 0.5,  // 40% do total bruto ≈ 50% do líquido (taxa 20%)
      premio2: liquido * 0.25,
      premio3: liquido * 0.25,
      descricao: {
        premio1: '1º Lugar — Acertou vencedor + placar exato (40% do total)',
        premio2: '2º Lugar — Acertou o vencedor (20% do total)',
        premio3: '3º Lugar — Acertou o placar exato (20% do total)',
      }
    }
  })
}
