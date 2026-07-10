import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const paymentId = req.nextUrl.searchParams.get('paymentId')
  if (!paymentId) return NextResponse.json({ status: 'unknown' })

  // Checa pedidos primeiro (cobre carrinho misto loteria+esporte com um único registro)
  const { data: pedido } = await supabase
    .from('pedidos')
    .select('id, status, total')
    .eq('mp_payment_id', paymentId)
    .maybeSingle()

  if (pedido) return NextResponse.json(pedido)

  // Fallback: participante de loteria (fluxo sem conta / legado)
  const { data: lot } = await supabase
    .from('participantes')
    .select('id, nome, total, status, mp_payment_id, created_at')
    .eq('mp_payment_id', paymentId)
    .limit(1)

  if (lot && lot.length > 0) return NextResponse.json(lot[0])

  // Fallback: participante esportivo
  const { data: esp } = await supabase
    .from('participantes_esporte')
    .select('id, nome, total, status, mp_payment_id, created_at')
    .eq('mp_payment_id', paymentId)
    .limit(1)

  return NextResponse.json(esp?.[0] || { status: 'unknown' })
}
