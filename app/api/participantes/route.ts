import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { notificarInscricao, notificarQuaseLotado } from '@/lib/whatsapp'
import { enviarPixEmail, notificarAdminInscricao } from '@/lib/email'

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
  const { concurso, nome, telefone, email, cotas, total, mp_payment_id, pix_code, bolao_slug } = body

  // Valida configuração e valor da cota contra o banco
  if (bolao_slug) {
    const { data: bolao } = await supabase
      .from('boloes')
      .select('valor_cota, total_cotas, encerrado, ativo')
      .eq('slug', bolao_slug)
      .single()

    if (!bolao) {
      return NextResponse.json({ error: 'Bolão não encontrado.' }, { status: 404 })
    }
    if (!bolao.ativo) {
      return NextResponse.json({ error: 'Este bolão está cancelado.' }, { status: 409 })
    }
    if (bolao.encerrado) {
      return NextResponse.json({ error: 'Este bolão já foi encerrado.' }, { status: 409 })
    }
    if (!bolao.valor_cota || Number(bolao.valor_cota) <= 0) {
      return NextResponse.json(
        { error: 'Bolão ainda não configurado pelo administrador. Aguarde.' },
        { status: 409 }
      )
    }

    const totalEsperado = parseFloat((cotas.length * Number(bolao.valor_cota)).toFixed(2))
    const totalEnviado  = parseFloat(Number(total).toFixed(2))
    if (Math.abs(totalEsperado - totalEnviado) > 0.01) {
      return NextResponse.json(
        { error: `Valor desatualizado. Recarregue a página — valor atual: R$ ${Number(bolao.valor_cota).toFixed(2).replace('.', ',')} por cota.` },
        { status: 409 }
      )
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
    .insert({ concurso, nome, telefone, email: email || null, cotas, total, mp_payment_id, pix_code, bolao_slug: bolao_slug || null, status: 'aguardando' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: bolaoInfo } = await supabase
    .from('boloes').select('nome, num_apostas, dezenas, total_cotas').eq('slug', bolao_slug || '').single()
  const bolaoNome = bolaoInfo?.nome || 'Bolão Mega-Sena'

  // Notifica grupo WhatsApp (silencioso se Whapi não estiver ativo)
  notificarInscricao(nome, cotas, concurso, total).catch(() => {})

  // Alerta de quase lotado (80% das cotas vendidas)
  if (bolao_slug && bolaoInfo) {
    const { data: todas } = await supabase
      .from('participantes')
      .select('cotas')
      .eq('bolao_slug', bolao_slug)
      .eq('concurso', concurso)
      .neq('status', 'cancelado')

    const totalVendidas = (todas || []).reduce((acc, r) => acc + (r.cotas as string[]).length, 0)
    const totalCotas = (bolaoInfo as { total_cotas?: number }).total_cotas ?? 0

    if (totalCotas > 0) {
      const pct = totalVendidas / totalCotas
      const pctAntes = (totalVendidas - cotas.length) / totalCotas
      // Dispara apenas uma vez: quando cruza o limiar de 80%
      if (pct >= 0.8 && pctAntes < 0.8) {
        notificarQuaseLotado(bolaoInfo.nome || 'Bolão', totalVendidas, totalCotas).catch(() => {})
      }
    }
  }

  // Envia PIX por e-mail ao participante
  if (email && pix_code) {
    enviarPixEmail(email, nome, total, pix_code, bolaoNome, cotas).catch(() => {})
  }

  // Notifica admin por e-mail
  notificarAdminInscricao(nome, cotas, total, concurso, telefone).catch(() => {})

  return NextResponse.json({ participante: data })
}
