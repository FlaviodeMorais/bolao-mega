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

  // Valida valor da cota contra o banco (evita valor desatualizado no form)
  if (bolao_slug) {
    const { data: bolao } = await supabase
      .from('boloes')
      .select('valor_cota, total_cotas')
      .eq('slug', bolao_slug)
      .single()

    if (bolao) {
      const totalEsperado = parseFloat((cotas.length * Number(bolao.valor_cota)).toFixed(2))
      const totalEnviado  = parseFloat(Number(total).toFixed(2))
      if (Math.abs(totalEsperado - totalEnviado) > 0.01) {
        return NextResponse.json(
          { error: `Valor desatualizado. Recarregue a página — valor atual da cota: R$ ${Number(bolao.valor_cota).toFixed(2).replace('.', ',')}` },
          { status: 409 }
        )
      }
    }
  }

  // Verifica conflitos de cotas
  let cotasQuery = supabase
    .from('participantes')
    .select('cotas')
    .eq('concurso', concurso)
    .neq('status', 'cancelado')

  if (bolao_slug) cotasQuery = cotasQuery.eq('bolao_slug', bolao_slug)

  const { data: existing } = await cotasQuery
  const taken     = [...new Set((existing || []).flatMap(r => r.cotas as string[]))]
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

  await notificarInscricao(nome, cotas, concurso, total)
  return NextResponse.json({ participante: data })
}
