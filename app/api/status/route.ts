import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { buscarPagamentoMP } from '@/lib/mercadopago'
import { confirmarPagamento } from '@/lib/confirmar-pagamento'

export async function GET(req: NextRequest) {
  const paymentId = req.nextUrl.searchParams.get('paymentId')
  if (!paymentId) return NextResponse.json({ status: 'unknown' })

  // Consulta o MP diretamente — fonte de verdade
  try {
    const mp = await buscarPagamentoMP(paymentId)
    if (mp?.status === 'approved') {
      // Confirma no banco e notifica (idempotente — não renotifica se já estiver pago)
      await confirmarPagamento(paymentId)
      return NextResponse.json({ status: 'approved' })
    }
    if (mp?.status) {
      return NextResponse.json({ status: mp.status })
    }
  } catch { /* MP indisponível — cai no fallback do banco */ }

  // Fallback: lê o banco (MP token não configurado ou erro de rede)
  const { data: pedido } = await supabase
    .from('pedidos').select('status').eq('mp_payment_id', paymentId).maybeSingle()
  if (pedido) return NextResponse.json({ status: pedido.status })

  const { data: partes } = await supabase
    .from('participantes').select('status').eq('mp_payment_id', paymentId).limit(1)
  if (partes?.[0]) return NextResponse.json({ status: partes[0].status })

  const { data: partesEsp } = await supabase
    .from('participantes_esporte').select('status').eq('mp_payment_id', paymentId).limit(1)

  return NextResponse.json({ status: partesEsp?.[0]?.status ?? 'unknown' })
}
