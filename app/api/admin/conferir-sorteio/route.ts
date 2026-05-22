import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verificarToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { bolao_id, dezenas_sorteadas } = await req.json()

  if (!bolao_id) {
    return NextResponse.json({ error: 'bolao_id obrigatório' }, { status: 400 })
  }
  if (!Array.isArray(dezenas_sorteadas) || dezenas_sorteadas.length !== 6) {
    return NextResponse.json({ error: 'Informe exatamente 6 dezenas sorteadas' }, { status: 400 })
  }
  const dezenas = dezenas_sorteadas.map(Number)
  if (dezenas.some(n => isNaN(n) || n < 1 || n > 60)) {
    return NextResponse.json({ error: 'Dezenas inválidas — use números de 1 a 60' }, { status: 400 })
  }

  // Buscar apostas do bolão
  const { data: bolao } = await supabase
    .from('boloes')
    .select('apostas_data')
    .eq('id', bolao_id)
    .single()

  if (!bolao?.apostas_data?.bets?.length) {
    return NextResponse.json({ error: 'Nenhuma aposta carregada neste bolão. Carregue o PDF das apostas primeiro.' }, { status: 422 })
  }

  const bets: number[][] = bolao.apostas_data.bets
  const dezenasSet = new Set(dezenas)

  // Conferir cada aposta
  const apostasPremiadas: { idx: number; dezenas: number[]; acertos: number; premio: string }[] = []
  let senas = 0, quinas = 0, quadras = 0

  for (let i = 0; i < bets.length; i++) {
    const bet = bets[i]
    const acertos = bet.filter(n => dezenasSet.has(n)).length

    if (acertos >= 4) {
      const premio = acertos === 6 ? 'SENA' : acertos === 5 ? 'QUINA' : 'QUADRA'
      apostasPremiadas.push({ idx: i + 1, dezenas: bet, acertos, premio })
      if (acertos === 6) senas++
      else if (acertos === 5) quinas++
      else quadras++
    }
  }

  const ganhou = apostasPremiadas.length > 0
  const status = ganhou ? 'ganhamos' : 'nao_premiada'
  const maiorPremio = senas > 0 ? 'SENA' : quinas > 0 ? 'QUINA' : quadras > 0 ? 'QUADRA' : null

  const resultado = {
    dezenas_sorteadas: dezenas,
    status,
    resumo: { senas, quinas, quadras },
    maior_premio: maiorPremio,
    apostas_premiadas: apostasPremiadas,
  }

  const { error } = await supabase
    .from('boloes')
    .update({ resultado_conferencia: resultado })
    .eq('id', bolao_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    status,
    resumo: { senas, quinas, quadras },
    maior_premio: maiorPremio,
    total_apostas: bets.length,
    total_premiadas: apostasPremiadas.length,
    apostas_premiadas: apostasPremiadas,
  })
}

export async function DELETE(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { bolao_id } = await req.json()
  if (!bolao_id) return NextResponse.json({ error: 'bolao_id obrigatório' }, { status: 400 })

  const { error } = await supabase
    .from('boloes')
    .update({ resultado_conferencia: null })
    .eq('id', bolao_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
