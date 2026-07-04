import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verificarToken } from '@/lib/auth'
import { enviarPremioEsporte } from '@/lib/email'
import { calcularRankingBolao } from '@/lib/esporte-ranking'

export async function POST(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { bolao_slug } = await req.json()
  if (!bolao_slug) return NextResponse.json({ error: 'bolao_slug obrigatório' }, { status: 400 })

  const { data: encerradoCheck } = await supabase
    .from('boloes_esporte')
    .select('encerrado')
    .eq('slug', bolao_slug)
    .single()

  if (!encerradoCheck) return NextResponse.json({ error: 'Bolão não encontrado' }, { status: 404 })
  if (encerradoCheck.encerrado) return NextResponse.json({ error: 'Bolão já encerrado' }, { status: 400 })

  const dados = await calcularRankingBolao(bolao_slug)
  if (!dados) return NextResponse.json({ error: 'Bolão não encontrado' }, { status: 404 })
  if (dados.ranking.length === 0) {
    return NextResponse.json({ error: 'Nenhum participante pago encontrado' }, { status: 400 })
  }

  const erros: string[] = []
  const premiados: { nome: string; posicao: number; premio: number }[] = []

  for (const premio of dados.premios) {
    const ganhador = dados.ranking.find(p => p.posicao === premio.lugar)
    if (!ganhador) continue

    const valor = parseFloat(premio.valor.toFixed(2))
    if (valor <= 0) continue

    try {
      if (ganhador.email) {
        await enviarPremioEsporte(
          ganhador.email, ganhador.nome, dados.bolao.nome || '',
          premio.lugar, premio.emoji, premio.label, premio.categoria,
          ganhador.pontos_total || 0, valor
        ).catch(() => {})
      }

      premiados.push({ nome: ganhador.nome, posicao: premio.lugar, premio: valor })
    } catch (err) {
      erros.push(`${ganhador.nome}: ${String(err)}`)
    }
  }

  await supabase.from('boloes_esporte').update({ encerrado: true }).eq('slug', bolao_slug)

  return NextResponse.json({
    ok: true,
    arrecadado: dados.arrecadado,
    premioLiquido: dados.liquido,
    premiados,
    participantes: dados.ranking.length,
    erros,
  })
}
