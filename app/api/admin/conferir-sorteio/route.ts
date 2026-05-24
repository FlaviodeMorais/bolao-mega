import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verificarToken } from '@/lib/auth'

// Classifica apostas contra as 6 dezenas sorteadas pela Mega-Sena.
// Independe da quantidade de dezenas por aposta — a Mega-Sena sempre sorteia 6.
// Premia apostas que acertam 4 (QUADRA), 5 (QUINA) ou 6 (SENA) das dezenas sorteadas.
function classificar(bets: number[][], dezenasSorteadas: number[], dezenasPorAposta: number) {
  const set = new Set(dezenasSorteadas)
  const premiadas: { idx: number; dezenas: number[]; acertos: number; premio: string }[] = []
  let senas = 0, quinas = 0, quadras = 0
  let invalidas = 0

  for (let i = 0; i < bets.length; i++) {
    // Valida que a aposta tem o número correto de dezenas
    if (bets[i].length !== dezenasPorAposta) { invalidas++; continue }
    const acertos = bets[i].filter(n => set.has(n)).length
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
  return {
    status:            ganhou ? 'ganhamos' : 'nao_premiada',
    resumo:            { senas, quinas, quadras },
    maior_premio:      maior,
    total_premiadas:   premiadas.length,
    apostas_premiadas: premiadas,
    apostas_invalidas: invalidas,
  }
}

// Salva status intermediário no banco para exibir na página pública
async function salvarStatus(bolaoId: string, payload: object) {
  await supabase.from('boloes').update({ resultado_conferencia: payload }).eq('id', bolaoId)
}

// GET — busca resultado na Caixa e confere automaticamente com lógica de data/hora
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

  // Apostas carregadas + resultado já salvo
  const { data: bolao } = await supabase
    .from('boloes').select('apostas_data, dezenas, resultado_conferencia').eq('id', bolaoId).single()

  if (!bolao?.apostas_data?.bets?.length) {
    return NextResponse.json({
      error: 'Nenhuma aposta carregada. Use "📊 Carregar Apostas" primeiro.',
    }, { status: 422 })
  }

  // Se já tem resultado final salvo, retorna sem tentar buscar novamente
  const rc = bolao.resultado_conferencia as { status?: string } | null
  if (rc?.status === 'ganhamos' || rc?.status === 'nao_premiada') {
    return NextResponse.json({ ok: true, total_apostas: bolao.apostas_data.bets.length, ...rc })
  }

  // Tenta buscar o concurso específico diretamente — mais confiável que checar o "último publicado"
  // pois a API geral pode demorar para atualizar após o sorteio.
  let dezenas: number[] = []
  try {
    const r = await fetch(
      `https://servicebus2.caixa.gov.br/portaldeloterias/api/megasena/${concurso}`,
      { cache: 'no-store' }
    )
    if (r.ok) {
      const d = await r.json()
      dezenas = (d.listaDezenas || d.dezenasSorteadasOrdemSorteio || d.dezenas || [])
        .map((n: string | number) => Number(n))
        .filter((n: number) => n >= 1 && n <= 60)
    }
  } catch { /* ignora — tratado abaixo */ }

  // ── Caso 1: Resultado disponível ─────────────────────────────────────────
  if (dezenas.length === 6) {
    const dezenasPorAposta = bolao.apostas_data.dezenas_por_aposta ?? bolao.dezenas ?? 6
    const resultado = classificar(bolao.apostas_data.bets, dezenas, dezenasPorAposta)
    const payload = { dezenas_sorteadas: dezenas, dezenas_por_aposta: dezenasPorAposta, ...resultado }
    await salvarStatus(bolaoId, payload)

    return NextResponse.json({
      ok: true,
      dezenas_sorteadas: dezenas,
      dezenas_por_aposta: dezenasPorAposta,
      total_apostas: bolao.apostas_data.bets.length,
      ...resultado,
    })
  }

  // ── Caso 2: Ainda não apurado — busca data de encerramento na API geral ──
  let dataProximo = ''
  try {
    const r = await fetch(
      'https://servicebus2.caixa.gov.br/portaldeloterias/api/megasena',
      { cache: 'no-store' }
    )
    if (r.ok) {
      const d = await r.json()
      dataProximo = d.dataProximoConcurso || d.proximo || ''
    }
  } catch { /* não crítico */ }

  const payload = { status: 'nao_apurado', data_encerramento: dataProximo || '' }
  await salvarStatus(bolaoId, payload)
  return NextResponse.json({
    ok: true,
    status: 'nao_apurado',
    data_encerramento: dataProximo,
    message: dataProximo
      ? `Sorteio do concurso #${concurso} ainda não apurado. Encerramento das apostas: ${dataProximo}. Tente novamente após o sorteio.`
      : `Concurso #${concurso} ainda não apurado. Tente novamente após o sorteio.`,
  })
}

// POST — conferência manual com dezenas informadas (fallback)
export async function POST(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { bolao_id, dezenas_sorteadas } = await req.json()
  if (!bolao_id) return NextResponse.json({ error: 'bolao_id obrigatório' }, { status: 400 })
  if (!Array.isArray(dezenas_sorteadas) || dezenas_sorteadas.length !== 6)
    return NextResponse.json({ error: 'Informe exatamente 6 dezenas' }, { status: 400 })

  const dezenas = dezenas_sorteadas.map(Number)
  if (dezenas.some(n => isNaN(n) || n < 1 || n > 60))
    return NextResponse.json({ error: 'Dezenas inválidas (1–60)' }, { status: 400 })

  const { data: bolao } = await supabase
    .from('boloes').select('apostas_data, dezenas').eq('id', bolao_id).single()

  if (!bolao?.apostas_data?.bets?.length)
    return NextResponse.json({ error: 'Nenhuma aposta carregada.' }, { status: 422 })

  const dezenasPorAposta = bolao.apostas_data.dezenas_por_aposta ?? bolao.dezenas ?? 6
  const resultado = classificar(bolao.apostas_data.bets, dezenas, dezenasPorAposta)
  const payload   = { dezenas_sorteadas: dezenas, dezenas_por_aposta: dezenasPorAposta, ...resultado }
  await supabase.from('boloes').update({ resultado_conferencia: payload }).eq('id', bolao_id)

  return NextResponse.json({
    ok: true, dezenas_sorteadas: dezenas,
    total_apostas: bolao.apostas_data.bets.length, ...resultado,
  })
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
