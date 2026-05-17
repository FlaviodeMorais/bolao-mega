import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import QRCode from 'qrcode'
import { notificarInscricao, verificarNumeroWhatsApp, enviarQRCodePIX } from '@/lib/whatsapp'

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

    // Verifica se o telefone é válido no WhatsApp
    if (telefone) {
      const existe = await verificarNumeroWhatsApp(telefone)
      if (!existe) {
        return NextResponse.json(
          { error: 'Número de celular não encontrado no WhatsApp. Verifique o número informado.' },
          { status: 409 }
        )
      }
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
    .insert({ concurso, nome, telefone, cotas, total, mp_payment_id, pix_code, bolao_slug: bolao_slug || null, status: 'aguardando' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notifica grupo e envia QR Code PIX para o participante
  await notificarInscricao(nome, cotas, concurso, total)

  if (telefone && pix_code) {
    const { data: bolaoInfo } = await supabase
      .from('boloes').select('nome, num_apostas, dezenas').eq('slug', bolao_slug || '').single()
    const qrDataUrl = await QRCode.toDataURL(pix_code, { width: 400, margin: 2 }).catch(() => '')
    const qrBase64 = qrDataUrl.replace('data:image/png;base64,', '')
    if (qrBase64) {
      await enviarQRCodePIX(
        telefone, qrBase64, total, pix_code,
        bolaoInfo?.nome || 'Bolão Mega-Sena'
      )
    }
  }

  return NextResponse.json({ participante: data })
}
