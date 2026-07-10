import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verificarToken } from '@/lib/auth'
import { notificarPagamentoEsporte } from '@/lib/whatsapp'
import { enviarConfirmacaoPagamentoEsporte } from '@/lib/email'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { status } = await req.json()
  if (!['pago', 'aguardando', 'cancelado'].includes(status)) {
    return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
  }

  const { data: part } = await supabase
    .from('participantes_esporte')
    .select('id, nome, email, telefone, total, bolao_slug, status')
    .eq('id', params.id)
    .single()

  const { error } = await supabase
    .from('participantes_esporte')
    .update({ status })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Notifica ao confirmar manualmente (igual ao fluxo de loteria)
  if (part && status === 'pago' && part.status !== 'pago') {
    const [{ data: bolaoEsp }, { data: palpites }] = await Promise.all([
      supabase.from('boloes_esporte').select('nome').eq('slug', part.bolao_slug || '').single(),
      supabase.from('palpites')
        .select('gol_casa, gol_fora, jogos(time_casa, time_fora)')
        .eq('participante_id', part.id),
    ])
    const palp = (palpites || []).map((p: { gol_casa: number; gol_fora: number; jogos: { time_casa: string; time_fora: string } | null }) => ({
      timeCasa: p.jogos?.time_casa || '?',
      timeFora: p.jogos?.time_fora || '?',
      golCasa:  p.gol_casa,
      golFora:  p.gol_fora,
    }))
    const bolaoNome = bolaoEsp?.nome || 'Bolão Esportivo'

    if (part.telefone) {
      notificarPagamentoEsporte(part.nome, bolaoNome, Number(part.total), part.telefone, part.id, palp).catch(() => {})
    }
    if (part.email) {
      enviarConfirmacaoPagamentoEsporte(part.email, part.nome, bolaoNome, Number(part.total), palp, part.id).catch(() => {})
    }
  }

  return NextResponse.json({ ok: true })
}

// Soft delete — preserva histórico alterando status para 'cancelado'
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { error } = await supabase
    .from('participantes_esporte')
    .update({ status: 'cancelado' })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
