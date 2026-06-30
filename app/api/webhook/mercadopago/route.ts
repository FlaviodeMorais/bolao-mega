import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { buscarPagamentoMP } from '@/lib/mercadopago'
import { notificarPagamento } from '@/lib/whatsapp'
import { enviarConfirmacaoPagamento } from '@/lib/email'

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
        .select('id, nome, cotas, total, concurso, telefone, email, bolao_slug')
        .eq('mp_payment_id', paymentId)
        .single()

      if (part) {
        await supabase.from('participantes').update({ status: 'pago' }).eq('mp_payment_id', paymentId)
        notificarPagamento(part.nome, part.cotas, part.concurso, Number(part.total), part.telefone, part.id).catch(() => {})

        if (part.email) {
          const { data: bolaoInfo } = await supabase
            .from('boloes').select('nome, num_apostas, dezenas').eq('slug', part.bolao_slug || '').single()
          enviarConfirmacaoPagamento(
            part.email, part.nome, part.cotas, Number(part.total),
            part.concurso, bolaoInfo?.nome || 'Bolão Mega-Sena',
            bolaoInfo?.num_apostas || 1, bolaoInfo?.dezenas || 6
          ).catch(() => {})
        }
      } else {
        const { data: partEsp } = await supabase
          .from('participantes_esporte')
          .select('id')
          .eq('mp_payment_id', paymentId)
          .single()

        if (partEsp) {
          await supabase
            .from('participantes_esporte')
            .update({ status: 'pago' })
            .eq('mp_payment_id', paymentId)
          return NextResponse.json({ ok: true })
        }

        // Pagamento de acréscimo
        const { data: partAcr } = await supabase
          .from('participantes')
          .select('nome, cotas, acrescimo, concurso, telefone, email')
          .eq('acrescimo_payment_id', paymentId)
          .single()

        if (partAcr) {
          await supabase.from('participantes')
            .update({ acrescimo_pago: true })
            .eq('acrescimo_payment_id', paymentId)
          notificarPagamento(
            partAcr.nome, partAcr.cotas, partAcr.concurso,
            Number(partAcr.acrescimo), partAcr.telefone
          ).catch(() => {})
        }
      }
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[webhook/mercadopago] erro ao processar notificação:', err)
    // Status != 2xx faz o Mercado Pago reenviar a notificação mais tarde
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
