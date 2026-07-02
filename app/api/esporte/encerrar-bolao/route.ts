import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verificarToken } from '@/lib/auth'
import { enviarPremioEsporte } from '@/lib/email'
import { getEsporteSettings } from '@/lib/settings'

export async function POST(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { bolao_slug } = await req.json()
  if (!bolao_slug) return NextResponse.json({ error: 'bolao_slug obrigatório' }, { status: 400 })

  const { data: bolao } = await supabase
    .from('boloes_esporte')
    .select('nome, valor_cota, taxa_admin, encerrado, premiacao')
    .eq('slug', bolao_slug)
    .single()

  if (!bolao) return NextResponse.json({ error: 'Bolão não encontrado' }, { status: 404 })
  if (bolao.encerrado) return NextResponse.json({ error: 'Bolão já encerrado' }, { status: 400 })

  const { data: participantes } = await supabase
    .from('participantes_esporte')
    .select('id, nome, telefone, email, pontos_total, status')
    .eq('bolao_slug', bolao_slug)
    .eq('status', 'pago')
    .order('pontos_total', { ascending: false })

  if (!participantes || participantes.length === 0) {
    return NextResponse.json({ error: 'Nenhum participante pago encontrado' }, { status: 400 })
  }

  const arrecadado = participantes.length * Number(bolao.valor_cota)
  const taxa = arrecadado * (Number(bolao.taxa_admin || 20) / 100)
  const liquido = arrecadado - taxa

  const premiacaoBolao = Array.isArray(bolao.premiacao) && bolao.premiacao.length > 0
    ? bolao.premiacao
    : (await getEsporteSettings()).premiacao
  const ranking = participantes.map((p, i) => ({ ...p, posicao: i + 1 }))

  const erros: string[] = []
  const premiados: { nome: string; posicao: number; premio: number }[] = []

  for (const item of premiacaoBolao) {
    const ganhador = ranking.find(p => p.posicao === item.lugar)
    if (!ganhador) continue

    const premio = parseFloat((liquido * (item.pct / 100)).toFixed(2))
    if (premio <= 0) continue

    try {
      if (ganhador.email) {
        await enviarPremioEsporte(
          ganhador.email, ganhador.nome, bolao.nome,
          item.lugar, item.emoji, item.label, item.categoria,
          ganhador.pontos_total || 0, premio
        ).catch(() => {})
      }

      premiados.push({ nome: ganhador.nome, posicao: item.lugar, premio })
    } catch (err) {
      erros.push(`${ganhador.nome}: ${String(err)}`)
    }
  }

  await supabase.from('boloes_esporte').update({ encerrado: true }).eq('slug', bolao_slug)

  return NextResponse.json({
    ok: true,
    arrecadado,
    premioLiquido: liquido,
    premiados,
    participantes: participantes.length,
    erros,
  })
}
