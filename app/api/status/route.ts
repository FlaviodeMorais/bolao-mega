import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const paymentId = req.nextUrl.searchParams.get('paymentId')
  if (!paymentId) return NextResponse.json({ status: 'unknown' })

  // Verifica o pedido primeiro (cobre carrinho com múltiplos itens)
  const { data: pedido } = await supabase
    .from('pedidos')
    .select('id, status, mp_payment_id')
    .eq('mp_payment_id', paymentId)
    .maybeSingle()

  if (pedido) return NextResponse.json(pedido)

  // Fallback: participante loteria
  const { data: partes } = await supabase
    .from('participantes')
    .select('id, nome, cotas, total, status, mp_payment_id, created_at')
    .eq('mp_payment_id', paymentId)
    .limit(1)

  if (partes?.[0]) return NextResponse.json(partes[0])

  // Fallback: participante esporte
  const { data: partesEsp } = await supabase
    .from('participantes_esporte')
    .select('id, nome, total, status, mp_payment_id, created_at')
    .eq('mp_payment_id', paymentId)
    .limit(1)

  return NextResponse.json(partesEsp?.[0] || { status: 'unknown' })
}
