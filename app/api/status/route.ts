import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const paymentId = req.nextUrl.searchParams.get('paymentId')
  if (!paymentId) return NextResponse.json({ status: 'unknown' })

  const { data: participanteMega } = await supabase
    .from('participantes')
    .select('id, nome, cotas, total, status, mp_payment_id, created_at')
    .eq('mp_payment_id', paymentId)
    .single()

  if (participanteMega) return NextResponse.json(participanteMega)

  const { data: participanteEsporte } = await supabase
    .from('participantes_esporte')
    .select('id, nome, total, status, mp_payment_id, created_at')
    .eq('mp_payment_id', paymentId)
    .single()

  return NextResponse.json(participanteEsporte || { status: 'unknown' })
}
