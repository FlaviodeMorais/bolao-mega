import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verificarToken } from '@/lib/auth'
import { enviarComprovante } from '@/lib/whatsapp'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }
  return NextResponse.json({ ok: true })
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { participante_id, bolao_slug } = await req.json()
  if (!participante_id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  // Dados do participante
  const { data: part } = await supabase
    .from('participantes')
    .select('nome, cotas, total, concurso, telefone, mp_payment_id, created_at, status')
    .eq('id', participante_id)
    .single()

  if (!part) return NextResponse.json({ error: 'Participante não encontrado' }, { status: 404 })
  if (!part.telefone) return NextResponse.json({ error: 'Participante sem telefone cadastrado' }, { status: 400 })

  // Dados do bolão
  const { data: bolao } = await supabase
    .from('boloes')
    .select('nome, num_apostas, dezenas')
    .eq('slug', bolao_slug)
    .single()

  const bolaoNome   = bolao?.nome       || 'Bolão Mega-Sena'
  const numApostas  = bolao?.num_apostas || 1
  const dezenas     = bolao?.dezenas    || 6
  const dataHora    = new Date(part.created_at).toLocaleString('pt-BR')

  const resultado = await enviarComprovante(
    part.telefone,
    part.nome,
    part.cotas,
    Number(part.total),
    part.concurso,
    bolaoNome,
    numApostas,
    dezenas,
    part.mp_payment_id,
    dataHora
  )

  if (!resultado?.ok) {
    return NextResponse.json(
      { error: resultado?.erro || 'Falha ao enviar WhatsApp. Verifique a conexão no Whapi.cloud' },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
}
