import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { buscarPagamentoMP } from '@/lib/mercadopago'
import { notificarPagamento } from '@/lib/whatsapp'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (body.type !== 'payment') return NextResponse.json({ ok: true })

    const paymentId = String(body.data?.id)
    const pagamento = await buscarPagamentoMP(paymentId)

    if (pagamento?.status === 'approved') {
      const { data: part } = await supabase
        .from('participantes')
        .select('nome, cotas, total, concurso, telefone')
        .eq('mp_payment_id', paymentId)
        .single()

      await supabase
        .from('participantes')
        .update({ status: 'pago' })
        .eq('mp_payment_id', paymentId)

      if (part) {
        await notificarPagamento(part.nome, part.cotas, part.concurso, Number(part.total), part.telefone)
      }
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}
