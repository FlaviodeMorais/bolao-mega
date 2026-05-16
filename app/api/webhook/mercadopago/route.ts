import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { buscarPagamentoMP } from '@/lib/mercadopago'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (body.type !== 'payment') return NextResponse.json({ ok: true })

    const paymentId = String(body.data?.id)
    const pagamento = await buscarPagamentoMP(paymentId)

    if (pagamento?.status === 'approved') {
      await supabase
        .from('participantes')
        .update({ status: 'pago' })
        .eq('mp_payment_id', paymentId)
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}
