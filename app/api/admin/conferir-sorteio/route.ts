import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verificarToken } from '@/lib/auth'

function classificar(bets: number[][], dezenas: number[]) {
  const sorteadasSet = new Set(dezenas)
  const premiadas: { idx: number; dezenas: number[]; acertos: number; premio: string }[] = []
  let senas = 0, quinas = 0, quadras = 0

  for (let i = 0; i < bets.length; i++) {
    const acertos = bets[i].filter(n => sorteadasSet.has(n)).length
    if (acertos >= 4) {
      const premio = acertos === 6 ? 'SENA' : acertos === 5 ? 'QUINA' : 'QUADRA'
      premiadas.push({ idx: i + 1, dezenas: bets[i], acertos, premio })
      if (acertos === 6) senas++
      else if (acertos === 5) quinas++
      else quadras++
    }
  }

  const ganhou = premiadas.length > 0
  const maior  = senas > 0 ? 'SENA' : quinas > 0 ? 'QUINA' : quadras > 0 ? 'QUADRA' : null
  return { ganhou, status: ganhou ? 'ganhamos' : 'nao_premiada', resumo: { senas, quinas, quadras }, maior_premio: maior, apostas_premiadas: premiadas }
}

// GET — busca dezenas da Caixa e confere automaticamente
export async function GET(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const bolaoId  = req.nextUrl.searchParams.get('bolao_id')
  const concurso = req.nextUrl.searchParams.get('concurso')

  if (!bolaoId || !concurso) {
    return NextResponse.json({ error: 'bolao_id e concurso são obrigatórios' }, { status: 400 })
  }

  // Buscar apostas do bolão
  const { data: bolao } = await supabase
    .from('boloes')
    .select('apostas_data')
    .eq('id', bolaoId)
    .single()

  if (!bolao?.apostas_data?.bets?.length) {
    return NextResponse.json({ error: 'Nenhuma aposta carregada. Use o botão "Carregar Apostas" primeiro.' }, { status: 422 })
  }

  // Buscar resultado do concurso na API da Caixa
  let dezenas: number[] = []
  try {
    const caixaRes = await fetch(
      `https://servicebus2.caixa.gov.br/portaldeloterias/api/megasena/${concurso}`,
      { cache: 'no-store' }
    )
    if (!caixaRes.ok) throw new Error(`Caixa retornou ${caixaRes.status}`)
    const caixaData = await caixaRes.json()
    const raw = caixaData.listaDezenas || caixaData.dezenasSorteadasOrdemSorteio || caixaData.dezenas || []
    dezenas = raw.map((n: string | number) => Number(n)).filter((n: number) => n >= 1 && n <= 60)
  } catch (err) {
    return NextResponse.json({ error: `Não foi possível buscar o resultado do concurso #${concurso} na Caixa. Verifique se o sorteio já foi apurado. (${String(err)})` }, { status: 503 })
  }

  if (dezenas.length !== 6) {
    return NextResponse.json({ error: `Resultado do concurso #${concurso} ainda não disponível na Caixa. Tente novamente após a apuração.` }, { status: 404 })
  }

  const resultado = classificar(bolao.apostas_data.bets, dezenas)
  const payload = { dezenas_sorteadas: dezenas, ...resultado }

  await supabase.from('boloes').update({ resultado_conferencia: payload }).eq('id', bolaoId)

  return NextResponse.json({ ok: true, dezenas_sorteadas: dezenas, ...resultado, total_apostas: bolao.apostas_data.bets.length })
}

// POST — conferência manual (fallback com dezenas informadas manualmente)
export async function POST(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { bolao_id, dezenas_sorteadas } = await req.json()
  if (!bolao_id) return NextResponse.json({ error: 'bolao_id obrigatório' }, { status: 400 })
  if (!Array.isArray(dezenas_sorteadas) || dezenas_sorteadas.length !== 6) {
    return NextResponse.json({ error: 'Informe exatamente 6 dezenas' }, { status: 400 })
  }
  const dezenas = dezenas_sorteadas.map(Number)
  if (dezenas.some(n => isNaN(n) || n < 1 || n > 60)) {
    return NextResponse.json({ error: 'Dezenas inválidas (1–60)' }, { status: 400 })
  }

  const { data: bolao } = await supabase.from('boloes').select('apostas_data').eq('id', bolao_id).single()
  if (!bolao?.apostas_data?.bets?.length) {
    return NextResponse.json({ error: 'Nenhuma aposta carregada.' }, { status: 422 })
  }

  const resultado = classificar(bolao.apostas_data.bets, dezenas)
  const payload = { dezenas_sorteadas: dezenas, ...resultado }
  await supabase.from('boloes').update({ resultado_conferencia: payload }).eq('id', bolao_id)

  return NextResponse.json({ ok: true, dezenas_sorteadas: dezenas, ...resultado, total_apostas: bolao.apostas_data.bets.length })
}

// DELETE — reset
export async function DELETE(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }
  const { bolao_id } = await req.json()
  if (!bolao_id) return NextResponse.json({ error: 'bolao_id obrigatório' }, { status: 400 })
  await supabase.from('boloes').update({ resultado_conferencia: null }).eq('id', bolao_id)
  return NextResponse.json({ ok: true })
}
