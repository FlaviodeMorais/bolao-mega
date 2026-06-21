import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { criarPixMP } from '@/lib/mercadopago'
import { gerarPixLocal, gerarTxId } from '@/lib/pix-local'
import QRCode from 'qrcode'

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('bolao')
  if (!slug) return NextResponse.json({ participantes: [] })

  const { data } = await supabase
    .from('participantes_esporte')
    .select('id, nome, telefone, email, total, status, pontos_total, created_at')
    .eq('bolao_slug', slug)
    .neq('status', 'cancelado')
    .order('pontos_total', { ascending: false })

  return NextResponse.json({ participantes: data || [] })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const { bolao_slug, nome, telefone, email, palpites } = body

  if (!bolao_slug || !nome) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 })

  // Busca configuração do bolão
  const { data: bolao } = await supabase
    .from('boloes_esporte')
    .select('valor_cota, ativo, encerrado')
    .eq('slug', bolao_slug)
    .single()

  if (!bolao) return NextResponse.json({ error: 'Bolão não encontrado' }, { status: 404 })
  if (!bolao.ativo) return NextResponse.json({ error: 'Bolão inativo' }, { status: 409 })
  if (bolao.encerrado) return NextResponse.json({ error: 'Bolão encerrado' }, { status: 409 })

  // Valida que nenhum jogo apostado já começou
  if (palpites && Array.isArray(palpites) && palpites.length > 0) {
    const jogoIds = palpites.map((p: { jogo_id: string }) => p.jogo_id)
    const { data: jogos } = await supabase
      .from('jogos')
      .select('id, time_casa, time_fora, data_jogo, hora_jogo, encerrado')
      .in('id', jogoIds)

    const agora = new Date()
    const bloqueado = jogos?.find(j => {
      if (j.encerrado) return true
      if (j.data_jogo && j.hora_jogo) {
        const dt = new Date(`${j.data_jogo}T${j.hora_jogo}:00-03:00`)
        return dt <= agora
      }
      return false
    })

    if (bloqueado) {
      return NextResponse.json(
        { error: `Aposta bloqueada: o jogo ${bloqueado.time_casa} × ${bloqueado.time_fora} já começou ou foi encerrado.` },
        { status: 409 }
      )
    }
  }

  const total = Number(bolao.valor_cota)

  // Gera PIX
  let pixCode = '', paymentId = '', qrCodeBase64 = '', fonte = 'local'
  const mp = await criarPixMP(total, 0, [], nome)
  if (mp.success && mp.qrCode) {
    pixCode = mp.qrCode
    qrCodeBase64 = mp.qrCodeBase64 || ''
    paymentId = mp.paymentId || ''
    fonte = 'mp'
  } else {
    const txId = gerarTxId(Date.now())
    pixCode = gerarPixLocal(total, txId)
    const qrUrl = await QRCode.toDataURL(pixCode, { width: 300, margin: 1 })
    qrCodeBase64 = qrUrl.replace('data:image/png;base64,', '')
    paymentId = txId
  }

  // Insere participante
  const { data: part, error } = await supabase
    .from('participantes_esporte')
    .insert({ bolao_slug, nome, telefone, email: email || null, total, status: 'aguardando', mp_payment_id: paymentId, pix_code: pixCode })
    .select().single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Salva palpites
  if (palpites && Array.isArray(palpites) && palpites.length > 0) {
    const rows = palpites.map((p: { jogo_id: string; gol_casa: number; gol_fora: number }) => ({
      participante_id: part.id,
      bolao_slug,
      jogo_id: p.jogo_id,
      gol_casa: p.gol_casa,
      gol_fora: p.gol_fora,
    }))
    await supabase.from('palpites').insert(rows)
  }

  return NextResponse.json({ participante: part, pixCode, qrCodeBase64, paymentId, fonte })
}
