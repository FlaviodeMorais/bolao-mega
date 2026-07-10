import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verificarToken } from '@/lib/auth'
import { enviarConfirmacaoPagamento, enviarConfirmacaoPagamentoEsporte } from '@/lib/email'
import { notificarPagamento, notificarPagamentoEsporte } from '@/lib/whatsapp'

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

  const { participante_id, bolao_slug, tipo = 'loteria', via = ['email'] } = await req.json()
  if (!participante_id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })

  // ── Bolão esportivo ────────────────────────────────────────────────────────
  if (tipo === 'esporte') {
    const { data: part } = await supabase
      .from('participantes_esporte')
      .select('id, nome, email, telefone, total, bolao_slug')
      .eq('id', participante_id)
      .single()

    if (!part) return NextResponse.json({ error: 'Participante não encontrado' }, { status: 404 })

    const [{ data: bolaoEsp }, { data: palpites }] = await Promise.all([
      supabase.from('boloes_esporte').select('nome').eq('slug', bolao_slug || part.bolao_slug || '').single(),
      supabase.from('palpites')
        .select('gol_casa, gol_fora, jogos(time_casa, time_fora)')
        .eq('participante_id', part.id),
    ])
    const palp = (palpites || []).map((p: { gol_casa: number; gol_fora: number; jogos: { time_casa: string; time_fora: string }[] | null }) => ({
      timeCasa: p.jogos?.[0]?.time_casa || '?',
      timeFora: p.jogos?.[0]?.time_fora || '?',
      golCasa:  p.gol_casa,
      golFora:  p.gol_fora,
    }))
    const bolaoNome = bolaoEsp?.nome || 'Bolão Esportivo'
    const erros: string[] = []

    if (via.includes('wa')) {
      if (!part.telefone) erros.push('sem telefone para WhatsApp')
      else await notificarPagamentoEsporte(part.nome, bolaoNome, Number(part.total), part.telefone, part.id, palp).catch(e => erros.push(String(e)))
    }
    if (via.includes('email')) {
      if (!part.email) erros.push('sem e-mail cadastrado')
      else {
        const res = await enviarConfirmacaoPagamentoEsporte(part.email, part.nome, bolaoNome, Number(part.total), palp, part.id)
        if (!res?.ok) erros.push(res?.erro || 'falha ao enviar e-mail')
      }
    }

    if (erros.length && via.every((_: string) => erros.some(e => e.startsWith('sem')))) {
      return NextResponse.json({ error: erros.join('; ') }, { status: 400 })
    }
    return NextResponse.json({ ok: true, erros })
  }

  // ── Bolão de loteria (comportamento original) ──────────────────────────────
  const { data: part } = await supabase
    .from('participantes')
    .select('nome, cotas, total, concurso, email, telefone, mp_payment_id, created_at, status, bolao_slug')
    .eq('id', participante_id)
    .single()

  if (!part) return NextResponse.json({ error: 'Participante não encontrado' }, { status: 404 })

  const slug = bolao_slug || part.bolao_slug
  const { data: bolao } = await supabase
    .from('boloes')
    .select('nome, num_apostas, dezenas, loteria')
    .eq('slug', slug)
    .single()

  const erros: string[] = []

  if (via.includes('wa')) {
    if (!part.telefone) erros.push('sem telefone para WhatsApp')
    else await notificarPagamento(part.nome, part.cotas, part.concurso, Number(part.total), part.telefone, participante_id, bolao?.loteria).catch(e => erros.push(String(e)))
  }
  if (via.includes('email')) {
    if (!part.email) erros.push('sem e-mail cadastrado')
    else {
      const res = await enviarConfirmacaoPagamento(
        part.email, part.nome, part.cotas, Number(part.total),
        part.concurso, bolao?.nome || 'Bolão', bolao?.num_apostas || 1, bolao?.dezenas || 6,
      )
      if (!res?.ok) erros.push(res?.erro || 'falha ao enviar e-mail')
    }
  }

  if (erros.length && via.every((_: string) => erros.some(e => e.startsWith('sem')))) {
    return NextResponse.json({ error: erros.join('; ') }, { status: 400 })
  }
  return NextResponse.json({ ok: true, erros })
}
