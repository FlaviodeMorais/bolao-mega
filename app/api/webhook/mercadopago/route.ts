import { NextRequest, NextResponse } from 'next/server'
import { buscarPagamentoMP } from '@/lib/mercadopago'
import { confirmarPagamento } from '@/lib/confirmar-pagamento'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    if (body.type !== 'payment') return NextResponse.json({ ok: true })

    const paymentId = String(body.data?.id)
    const mp = await buscarPagamentoMP(paymentId)

    if (mp?.status === 'approved') {
      await confirmarPagamento(paymentId)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[webhook/mercadopago] erro:', err)
    return NextResponse.json({ ok: false, error: String(err) }, { status: 500 })
  }
}
