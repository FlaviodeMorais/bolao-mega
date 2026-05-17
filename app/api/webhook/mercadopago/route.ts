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
      // Pagamento principal
      const { data: part } = await supabase
        .from('participantes')
        .select('nome, cotas, total, concurso, telefone')
        .eq('mp_payment_id', paymentId)
        .single()

      if (part) {
        await supabase.from('participantes').update({ status: 'pago' }).eq('mp_payment_id', paymentId)
        await notificarPagamento(part.nome, part.cotas, part.concurso, Number(part.total), part.telefone)
      } else {
        // Pagamento de acréscimo
        const { data: partAcr } = await supabase
          .from('participantes')
          .select('nome, cotas, acrescimo, concurso, telefone')
          .eq('acrescimo_payment_id', paymentId)
          .single()

        if (partAcr) {
          await supabase.from('participantes')
            .update({ acrescimo_pago: true })
            .eq('acrescimo_payment_id', paymentId)
          await notificarPagamento(
            partAcr.nome, partAcr.cotas, partAcr.concurso,
            Number(partAcr.acrescimo), partAcr.telefone
          )
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: true })
  }
}
