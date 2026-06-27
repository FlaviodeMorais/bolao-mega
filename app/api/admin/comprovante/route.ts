import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verificarToken } from '@/lib/auth'
import { enviarConfirmacaoPagamento } from '@/lib/email'

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

  const { data: part } = await supabase
    .from('participantes')
    .select('nome, cotas, total, concurso, email, mp_payment_id, created_at, status')
    .eq('id', participante_id)
    .single()

  if (!part) return NextResponse.json({ error: 'Participante não encontrado' }, { status: 404 })
  if (!part.email) return NextResponse.json({ error: 'Participante sem e-mail cadastrado' }, { status: 400 })

  const { data: bolao } = await supabase
    .from('boloes')
    .select('nome, num_apostas, dezenas')
    .eq('slug', bolao_slug)
    .single()

  const resultado = await enviarConfirmacaoPagamento(
    part.email,
    part.nome,
    part.cotas,
    Number(part.total),
    part.concurso,
    bolao?.nome        || 'Bolão',
    bolao?.num_apostas || 1,
    bolao?.dezenas     || 6,
  )

  if (!resultado?.ok) {
    return NextResponse.json(
      { error: resultado?.erro || 'Falha ao enviar e-mail. Verifique EMAIL_GMAIL_USER e EMAIL_GMAIL_PASS.' },
      { status: 500 }
    )
  }

  return NextResponse.json({ ok: true })
}
