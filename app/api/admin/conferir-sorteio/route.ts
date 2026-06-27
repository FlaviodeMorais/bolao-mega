import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verificarToken } from '@/lib/auth'
import { getLoteria, type LoteriaId } from '@/lib/loterias'

// Config de classificação por loteria
interface LoteriaCheck { dezenasDrawn: number; minAcertos: number; maxNum: number }
const CHECK: Record<LoteriaId, LoteriaCheck> = {
  mega:      { dezenasDrawn: 6,  minAcertos: 4,  maxNum: 60 },
  lotofacil: { dezenasDrawn: 15, minAcertos: 11, maxNum: 25 },
  quina:     { dezenasDrawn: 5,  minAcertos: 2,  maxNum: 80 },
}

function premioLabel(loteria: LoteriaId, acertos: number): string {
  if (loteria === 'mega') {
    return acertos === 6 ? 'SENA' : acertos === 5 ? 'QUINA' : 'QUADRA'
  }
  if (loteria === 'lotofacil') {
    return acertos === 15 ? '15 PONTOS' : acertos === 14 ? '14 PONTOS' : acertos === 13 ? '13 PONTOS' : acertos === 12 ? '12 PONTOS' : '11 PONTOS'
  }
  // quina
  return acertos === 5 ? 'QUINA' : acertos === 4 ? 'QUADRA' : acertos === 3 ? 'TERNO' : 'DUPLA'
}

function classificar(bets: number[][], dezenasSorteadas: number[], dezenasPorAposta: number, loteria: LoteriaId) {
  const chk   = CHECK[loteria]
  const set   = new Set(dezenasSorteadas)
  const premiadas: { idx: number; dezenas: number[]; acertos: number; premio: string }[] = []
  let invalidas = 0

  for (let i = 0; i < bets.length; i++) {
    if (bets[i].length !== dezenasPorAposta) { invalidas++; continue }
    const acertos = bets[i].filter(n => set.has(n)).length
    if (acertos >= chk.minAcertos) {
      premiadas.push({ idx: i + 1, dezenas: bets[i], acertos, premio: premioLabel(loteria, acertos) })
    }
  }

  const ganhou = premiadas.length > 0
  const maiorAcertos = premiadas.length ? Math.max(...premiadas.map(p => p.acertos)) : 0
  const maior = ganhou ? premioLabel(loteria, maiorAcertos) : null

  // resumo compat. com o frontend (mantém senas/quinas/quadras para mega)
  const resumo = {
    senas:   loteria === 'mega'      ? premiadas.filter(p => p.acertos === 6).length  : 0,
    quinas:  loteria !== 'lotofacil' ? premiadas.filter(p => p.acertos === (loteria === 'mega' ? 5 : 5)).length : premiadas.filter(p => p.acertos >= 14).length,
    quadras: premiadas.filter(p => p.acertos === (loteria === 'mega' ? 4 : 4)).length,
    total:   premiadas.length,
  }

  return {
    status:            ganhou ? 'ganhamos' : 'nao_premiada',
    resumo,
    maior_premio:      maior,
    total_premiadas:   premiadas.length,
    apostas_premiadas: premiadas,
    apostas_invalidas: invalidas,
  }
}

async function salvarStatus(bolaoId: string, payload: object) {
  await supabase.from('boloes').update({ resultado_conferencia: payload }).eq('id', bolaoId)
}

// GET — busca resultado na Caixa e confere automaticamente
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

  const { data: bolao } = await supabase
    .from('boloes').select('apostas_data, dezenas, loteria, resultado_conferencia').eq('id', bolaoId).single()

  if (!bolao?.apostas_data?.bets?.length) {
    return NextResponse.json({
      error: 'Nenhuma aposta carregada. Use "📊 Carregar Apostas" primeiro.',
    }, { status: 422 })
  }

  const rc = bolao.resultado_conferencia as { status?: string } | null
  if (rc?.status === 'ganhamos' || rc?.status === 'nao_premiada') {
    return NextResponse.json({ ok: true, total_apostas: bolao.apostas_data.bets.length, ...rc })
  }

  const loteria = (bolao.loteria || 'mega') as LoteriaId
  const cfg     = getLoteria(loteria)
  const chk     = CHECK[loteria]

  let dezenas: number[] = []
  try {
    const r = await fetch(
      `https://servicebus2.caixa.gov.br/portaldeloterias/api/${cfg.apiSlug}/${concurso}`,
      { cache: 'no-store' }
    )
    if (r.ok) {
      const d = await r.json()
      dezenas = (d.listaDezenas || d.dezenasSorteadasOrdemSorteio || d.dezenas || [])
        .map((n: string | number) => Number(n))
        .filter((n: number) => n >= 1 && n <= chk.maxNum)
    }
  } catch { /* ignora */ }

  if (dezenas.length === chk.dezenasDrawn) {
    const dezenasPorAposta = bolao.apostas_data.dezenas_por_aposta ?? bolao.dezenas ?? cfg.minDezenas
    const resultado = classificar(bolao.apostas_data.bets, dezenas, dezenasPorAposta, loteria)
    const payload   = { dezenas_sorteadas: dezenas, dezenas_por_aposta: dezenasPorAposta, loteria, ...resultado }
    await salvarStatus(bolaoId, payload)
    return NextResponse.json({ ok: true, dezenas_sorteadas: dezenas, dezenas_por_aposta: dezenasPorAposta, total_apostas: bolao.apostas_data.bets.length, ...resultado })
  }

  // Não apurado ainda
  let dataProximo = ''
  try {
    const r = await fetch(`https://servicebus2.caixa.gov.br/portaldeloterias/api/${cfg.apiSlug}`, { cache: 'no-store' })
    if (r.ok) { const d = await r.json(); dataProximo = d.dataProximoConcurso || '' }
  } catch { /* não crítico */ }

  const payload = { status: 'nao_apurado', data_encerramento: dataProximo || '' }
  await salvarStatus(bolaoId, payload)
  return NextResponse.json({
    ok: true, status: 'nao_apurado', data_encerramento: dataProximo,
    message: `Concurso #${concurso} (${cfg.label}) ainda não apurado. Tente novamente após o sorteio.`,
  })
}

// POST — conferência manual
export async function POST(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { bolao_id, dezenas_sorteadas } = await req.json()
  if (!bolao_id) return NextResponse.json({ error: 'bolao_id obrigatório' }, { status: 400 })

  const { data: bolao } = await supabase
    .from('boloes').select('apostas_data, dezenas, loteria').eq('id', bolao_id).single()

  if (!bolao?.apostas_data?.bets?.length)
    return NextResponse.json({ error: 'Nenhuma aposta carregada.' }, { status: 422 })

  const loteria = (bolao.loteria || 'mega') as LoteriaId
  const chk     = CHECK[loteria]

  if (!Array.isArray(dezenas_sorteadas) || dezenas_sorteadas.length !== chk.dezenasDrawn)
    return NextResponse.json({ error: `Informe exatamente ${chk.dezenasDrawn} dezenas para ${getLoteria(loteria).label}` }, { status: 400 })

  const dezenas = dezenas_sorteadas.map(Number)
  if (dezenas.some(n => isNaN(n) || n < 1 || n > chk.maxNum))
    return NextResponse.json({ error: `Dezenas inválidas (1–${chk.maxNum})` }, { status: 400 })

  const dezenasPorAposta = bolao.apostas_data.dezenas_por_aposta ?? bolao.dezenas ?? getLoteria(loteria).minDezenas
  const resultado = classificar(bolao.apostas_data.bets, dezenas, dezenasPorAposta, loteria)
  const payload   = { dezenas_sorteadas: dezenas, dezenas_por_aposta: dezenasPorAposta, loteria, ...resultado }
  await supabase.from('boloes').update({ resultado_conferencia: payload }).eq('id', bolao_id)

  return NextResponse.json({ ok: true, dezenas_sorteadas: dezenas, total_apostas: bolao.apostas_data.bets.length, ...resultado })
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
