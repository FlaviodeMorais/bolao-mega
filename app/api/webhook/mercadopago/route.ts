import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { buscarPagamentoMP } from '@/lib/mercadopago'
import { notificarPagamento, notificarPagamentoEsporte } from '@/lib/whatsapp'
import { enviarConfirmacaoPagamento } from '@/lib/email'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (body.type !== 'payment') return NextResponse.json({ ok: true })

    const paymentId = String(body.data?.id)
    const pagamento = await buscarPagamentoMP(paymentId)

    if (pagamento?.status !== 'approved') return NextResponse.json({ ok: true })

    // Atualiza o pedido primeiro (cobre todos os itens do carrinho de uma vez)
    await supabase.from('pedidos').update({ status: 'pago' }).eq('mp_payment_id', paymentId)

    // Sempre verifica participantes de loteria (sem else — suporta carrinho misto)
    const { data: partes } = await supabase
      .from('participantes')
      .select('id, nome, cotas, total, concurso, telefone, email, bolao_slug')
      .eq('mp_payment_id', paymentId)

    if (partes && partes.length > 0) {
      await supabase.from('participantes').update({ status: 'pago' }).eq('mp_payment_id', paymentId)

      for (const part of partes) {
        const { data: bolaoInfo } = await supabase
          .from('boloes').select('nome, num_apostas, dezenas, loteria').eq('slug', part.bolao_slug || '').single()

        notificarPagamento(part.nome, part.cotas, part.concurso, Number(part.total), part.telefone, part.id, bolaoInfo?.loteria).catch(() => {})

        if (part.email) {
          enviarConfirmacaoPagamento(
            part.email, part.nome, part.cotas, Number(part.total),
            part.concurso, bolaoInfo?.nome || 'Bolão',
            bolaoInfo?.num_apostas || 1, bolaoInfo?.dezenas || 6
          ).catch(() => {})
        }
      }
    }

    // Sempre verifica participantes de esporte (sem else — suporta carrinho misto)
    const { data: partesEsp } = await supabase
      .from('participantes_esporte')
      .select('id, nome, total, telefone, email, bolao_slug')
      .eq('mp_payment_id', paymentId)

    if (partesEsp && partesEsp.length > 0) {
      await supabase.from('participantes_esporte').update({ status: 'pago' }).eq('mp_payment_id', paymentId)

      for (const part of partesEsp) {
        const [{ data: bolaoEsp }, { data: palpites }] = await Promise.all([
          supabase.from('boloes_esporte').select('nome').eq('slug', part.bolao_slug || '').single(),
          supabase.from('palpites')
            .select('gol_casa, gol_fora, jogos(time_casa, time_fora)')
            .eq('participante_id', part.id),
        ])
        const palp = (palpites || []).map((p: { gol_casa: number; gol_fora: number; jogos: { time_casa: string; time_fora: string } | null }) => ({
          timeCasa: p.jogos?.time_casa || '?',
          timeFora: p.jogos?.time_fora || '?',
          golCasa:  p.gol_casa,
          golFora:  p.gol_fora,
        }))
        notificarPagamentoEsporte(
          part.nome, bolaoEsp?.nome || 'Bolão Esportivo',
          Number(part.total), part.telefone, part.id, palp
        ).catch(() => {})
      }
    }

    // Pagamento de acréscimo (individual, fora do fluxo do carrinho)
    if ((!partes || partes.length === 0) && (!partesEsp || partesEsp.length === 0)) {
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

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[webhook/mercadopago] erro:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
