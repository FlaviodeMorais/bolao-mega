import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verificarToken } from '@/lib/auth'
import { notificarPremioIndividual, notificarResultadoGrupo } from '@/lib/whatsapp'

export async function POST(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { bolao_id, bolao_slug, concurso, ganhou, premio_total } = await req.json()
  if (!bolao_id || !concurso) {
    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
  }

  // Bolão
  const { data: bolao } = await supabase
    .from('boloes')
    .select('nome, taxa_admin, total_cotas')
    .eq('id', bolao_id)
    .single()

  if (!bolao) return NextResponse.json({ error: 'Bolão não encontrado' }, { status: 404 })

  if (!ganhou) {
    await notificarResultadoGrupo(bolao.nome, concurso, false)
    return NextResponse.json({ ok: true, ganhou: false })
  }

  if (!premio_total || premio_total <= 0) {
    return NextResponse.json({ error: 'Informe o valor do prêmio' }, { status: 400 })
  }

  // Participantes pagos
  const { data: parts } = await supabase
    .from('participantes')
    .select('id, nome, cotas, telefone')
    .eq('concurso', concurso)
    .eq('bolao_slug', bolao_slug)
    .eq('status', 'pago')

  if (!parts || parts.length === 0) {
    return NextResponse.json({ error: 'Nenhum participante pago encontrado' }, { status: 400 })
  }

  // Cálculo do prêmio
  const totalCotas    = parts.reduce((s, p) => s + (p.cotas as string[]).length, 0)
  const valorLiquido  = Number(premio_total) - Number(bolao.taxa_admin || 0)
  const valorPorCota  = valorLiquido / totalCotas

  // Notifica grupo
  await notificarResultadoGrupo(bolao.nome, concurso, true, Number(premio_total), valorPorCota)

  // Notifica cada participante
  const erros: string[] = []
  for (const part of parts) {
    try {
      const cotas = part.cotas as string[]
      const valorParticipante = parseFloat((cotas.length * valorPorCota).toFixed(2))
      if (part.telefone) {
        await notificarPremioIndividual(
          part.telefone, part.nome, cotas,
          valorParticipante, bolao.nome, concurso
        )
      }
    } catch (err) {
      erros.push(`${part.nome}: ${String(err)}`)
    }
  }

  return NextResponse.json({
    ok: true, ganhou: true,
    premio_total, valor_liquido: valorLiquido,
    valor_por_cota: valorPorCota,
    participantes: parts.length,
    total_cotas: totalCotas,
    erros,
  })
}
