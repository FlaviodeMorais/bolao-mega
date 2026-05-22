import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verificarToken } from '@/lib/auth'

// BRT = UTC - 3h
function nowBRT(): Date {
  return new Date(Date.now() - 3 * 60 * 60 * 1000)
}

// Compara datas como YYYYMMDD
function toInt(d: Date) {
  return d.getUTCFullYear() * 10000 + (d.getUTCMonth() + 1) * 100 + d.getUTCDate()
}

// Classifica apostas contra dezenas sorteadas
function classificar(bets: number[][], dezenas: number[]) {
  const set = new Set(dezenas)
  const premiadas: { idx: number; dezenas: number[]; acertos: number; premio: string }[] = []
  let senas = 0, quinas = 0, quadras = 0

  for (let i = 0; i < bets.length; i++) {
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
    status:          ganhou ? 'ganhamos' : 'nao_premiada',
    resumo:          { senas, quinas, quadras },
    maior_premio:    maior,
    apostas_premiadas: premiadas,
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

  // Apostas carregadas
  const { data: bolao } = await supabase
    .from('boloes').select('apostas_data').eq('id', bolaoId).single()

  if (!bolao?.apostas_data?.bets?.length) {
    return NextResponse.json({
      error: 'Nenhuma aposta carregada. Use "📊 Carregar Apostas" primeiro.',
    }, { status: 422 })
  }

  // Buscar último resultado publicado na Caixa
  let latestNumero = 0
  let dataProximo  = ''  // "DD/MM/YYYY"
  try {
    const r = await fetch(
      'https://servicebus2.caixa.gov.br/portaldeloterias/api/megasena',
      { cache: 'no-store' }
    )
    if (!r.ok) throw new Error(`Caixa HTTP ${r.status}`)
    const d = await r.json()
    latestNumero = Number(d.numero || d.numeroConcurso || 0)
    dataProximo  = d.dataProximoConcurso || d.proximo || ''
  } catch (err) {
    return NextResponse.json({ error: `Não foi possível consultar a Caixa: ${String(err)}` }, { status: 503 })
  }

  const concursoNum = parseInt(concurso)

  // ── Caso 1: Concurso já apurado (número ≤ último publicado) ──────────────
  if (latestNumero >= concursoNum) {
    let dezenas: number[] = []
    try {
      const r = await fetch(
        `https://servicebus2.caixa.gov.br/portaldeloterias/api/megasena/${concurso}`,
        { cache: 'no-store' }
      )
      if (!r.ok) throw new Error(`Caixa HTTP ${r.status}`)
      const d = await r.json()
      dezenas = (d.listaDezenas || d.dezenasSorteadasOrdemSorteio || d.dezenas || [])
        .map((n: string | number) => Number(n))
        .filter((n: number) => n >= 1 && n <= 60)
    } catch (err) {
      return NextResponse.json({ error: `Erro ao buscar resultado do concurso: ${String(err)}` }, { status: 503 })
    }

    if (dezenas.length !== 6) {
      return NextResponse.json({
        error: `Resultado do concurso #${concurso} não disponível ou incompleto.`,
      }, { status: 404 })
    }

    const resultado = classificar(bolao.apostas_data.bets, dezenas)
    const payload = { dezenas_sorteadas: dezenas, ...resultado }
    await salvarStatus(bolaoId, payload)

    return NextResponse.json({
      ok: true,
      dezenas_sorteadas: dezenas,
      total_apostas: bolao.apostas_data.bets.length,
      ...resultado,
    })
  }

  // ── Casos 2/3/4: Concurso ainda não apurado — verificar data/hora ────────
  if (!dataProximo) {
    return NextResponse.json({ error: 'Data do próximo sorteio não disponível na Caixa.' }, { status: 404 })
  }

  // dataProximo: "DD/MM/YYYY"
  const [drawDay, drawMonth, drawYear] = dataProximo.split('/').map(Number)

  const brt       = nowBRT()
  const brtDate   = toInt(brt)
  const drawDate  = drawYear * 10000 + drawMonth * 100 + drawDay
  const brtHour   = brt.getUTCHours()   // hora em BRT (já ajustada)

  if (brtDate < drawDate) {
    // ── Antes da data do sorteio ────────────────────────────────────────────
    const payload = { status: 'nao_apurado', data_sorteio: dataProximo }
    await salvarStatus(bolaoId, payload)
    return NextResponse.json({
      ok: true,
      status: 'nao_apurado',
      data_sorteio: dataProximo,
      message: `Sorteio não apurado. Data prevista: ${dataProximo}.`,
    })
  }

  if (brtDate === drawDate && brtHour < 22) {
    // ── Dia do sorteio, mas antes das 22h ────────────────────────────────────
    const payload = { status: 'aguardando_apuracao', data_sorteio: dataProximo }
    await salvarStatus(bolaoId, payload)
    return NextResponse.json({
      ok: true,
      status: 'aguardando_apuracao',
      data_sorteio: dataProximo,
      message: `Aguardando apuração. Sorteio em ${dataProximo} — resultado disponível após 22h (BRT).`,
    })
  }

  // ── Dia do sorteio após 22h, mas resultado ainda não publicado na Caixa ──
  const payload = { status: 'apurando', data_sorteio: dataProximo }
  await salvarStatus(bolaoId, payload)
  return NextResponse.json({
    ok: true,
    status: 'apurando',
    data_sorteio: dataProximo,
    message: 'Apuração em andamento. Resultado ainda não publicado na Caixa — tente novamente em alguns minutos.',
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
    .from('boloes').select('apostas_data').eq('id', bolao_id).single()

  if (!bolao?.apostas_data?.bets?.length)
    return NextResponse.json({ error: 'Nenhuma aposta carregada.' }, { status: 422 })

  const resultado = classificar(bolao.apostas_data.bets, dezenas)
  const payload   = { dezenas_sorteadas: dezenas, ...resultado }
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
