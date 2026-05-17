import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { notificarInscricao } from '@/lib/whatsapp'

export async function GET(req: NextRequest) {
  const concurso = req.nextUrl.searchParams.get('concurso')
  const bolao    = req.nextUrl.searchParams.get('bolao') || req.nextUrl.searchParams.get('bolao_slug') || null
  if (!concurso) return NextResponse.json({ participantes: [] })

  let query = supabase
    .from('participantes')
    .select('id, nome, cotas, total, status, telefone, acrescimo, acrescimo_pago, created_at')
    .eq('concurso', parseInt(concurso))
    .neq('status', 'cancelado')
    .order('created_at', { ascending: true })

  if (bolao) query = query.eq('bolao_slug', bolao)
  else       query = query.is('bolao_slug', null)

  const { data } = await query
  return NextResponse.json({ participantes: data || [] })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { concurso, nome, telefone, cotas, total, mp_payment_id, pix_code, bolao_slug } = body

  // Verifica conflitos
  const { data: existing } = await supabase
    .from('participantes')
    .select('cotas')
    .eq('concurso', concurso)
    .neq('status', 'cancelado')

  const taken = [...new Set((existing || []).flatMap(r => r.cotas as string[]))]
  // Filtra por bolão se informado
  const conflitos = cotas.filter((c: string) => taken.includes(c))

  if (conflitos.length > 0) {
    return NextResponse.json(
      { error: `Cota(s) já ocupada(s): ${conflitos.join(', ')}` },
      { status: 409 }
    )
  }

  const { data, error } = await supabase
    .from('participantes')
    .insert({ concurso, nome, telefone, cotas, total, mp_payment_id, pix_code, bolao_slug: bolao_slug || null, status: 'aguardando' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notifica grupo no WhatsApp
  await notificarInscricao(nome, cotas, concurso, total)

  return NextResponse.json({ participante: data })
}
