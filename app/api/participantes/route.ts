import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { notificarInscricao } from '@/lib/whatsapp'

export async function GET(req: NextRequest) {
  const concurso = req.nextUrl.searchParams.get('concurso')
  if (!concurso) return NextResponse.json({ participantes: [] })

  const { data } = await supabase
    .from('participantes')
    .select('id, nome, cotas, total, status, created_at')
    .eq('concurso', parseInt(concurso))
    .order('created_at', { ascending: true })

  return NextResponse.json({ participantes: data || [] })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { concurso, nome, telefone, cotas, total, mp_payment_id, pix_code } = body

  // Verifica conflitos
  const { data: existing } = await supabase
    .from('participantes')
    .select('cotas')
    .eq('concurso', concurso)
    .neq('status', 'cancelado')

  const taken = [...new Set((existing || []).flatMap(r => r.cotas as string[]))]
  const conflitos = cotas.filter((c: string) => taken.includes(c))

  if (conflitos.length > 0) {
    return NextResponse.json(
      { error: `Cota(s) já ocupada(s): ${conflitos.join(', ')}` },
      { status: 409 }
    )
  }

  const { data, error } = await supabase
    .from('participantes')
    .insert({ concurso, nome, telefone, cotas, total, mp_payment_id, pix_code, status: 'aguardando' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notifica grupo no WhatsApp
  await notificarInscricao(nome, cotas, concurso, total)

  return NextResponse.json({ participante: data })
}
