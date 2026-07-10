import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verificarToken } from '@/lib/auth'
import { getLoteria, type LoteriaId } from '@/lib/loterias'

interface LoteriaCheck { dezenasDrawn: number; minAcertos: number; maxNum: number }
const CHECK: Record<LoteriaId, LoteriaCheck> = {
  mega:      { dezenasDrawn: 6,  minAcertos: 4,  maxNum: 60 },
  lotofacil: { dezenasDrawn: 15, minAcertos: 11, maxNum: 25 },
  quina:     { dezenasDrawn: 5,  minAcertos: 2,  maxNum: 80 },
}

function premioLabel(_loteria: LoteriaId, acertos: number): string {
  return `${acertos} acertos`
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

  const ganhou      = premiadas.length > 0
  const maiorAcertos = premiadas.length ? Math.max(...premiadas.map(p => p.acertos)) : 0
  const maior       = ganhou ? premioLabel(loteria, maiorAcertos) : null
  const resumo = {
    senas:   loteria === 'mega'      ? premiadas.filter(p => p.acertos === 6).length  : 0,
    quinas:  loteria !== 'lotofacil' ? premiadas.filter(p => p.acertos === 5).length  : premiadas.filter(p => p.acertos >= 14).length,
    quadras: premiadas.filter(p => p.acertos === 4).length,
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

// Busca dezenas do concurso em múltiplas fontes para contornar o bloqueio de
// IP da Vercel na API oficial da Caixa. Ordem de preferência:
//   1. Cache config (populado pelo cron após cada sorteio)
//   2. loteria_historico (populado pelo cron de histórico)
//   3. API alternativa (loteriascaixa-api.herokuapp.com — não bloqueia datacenter)
//   4. API oficial Caixa com headers de browser (último recurso)
async function buscarDezenasCaixa(
  loteria: LoteriaId, concurso: string
): Promise<{ dezenas: number[]; premiosCaixa: { faixa: string; ganhadores: number; valor: number }[] }> {
  const cfg = getLoteria(loteria)
  const chk = CHECK[loteria]
  // Slug da loteria no cache config usa o mesmo padrão do apiSlug mas sem hífen
  const cacheKey = `resultado_${cfg.apiSlug.replace(/-/g, '')}`

  // 1. Cache do config (escrito pelo cron após sorteio)
  try {
    const { data: cached } = await supabase
      .from('config').select('value').eq('key', cacheKey).single()
    if (cached?.value) {
      const d = JSON.parse(cached.value)
      if (String(d.numero) === String(concurso)) {
        const dezenas = (d.listaDezenas || []).map(Number).filter((n: number) => n >= 1 && n <= chk.maxNum)
        if (dezenas.length === chk.dezenasDrawn) {
          const premiosCaixa = (d.listaRateioPremio || []).map((r: { descricaoFaixa?: string; faixa?: string; numerodeGanhadores?: number; ganhadores?: number; valorPremio?: number; valor?: number }) => ({
            faixa:     r.descricaoFaixa || r.faixa || '',
            ganhadores: r.numerodeGanhadores ?? r.ganhadores ?? 0,
            valor:      r.valorPremio ?? r.valor ?? 0,
          }))
          return { dezenas, premiosCaixa }
        }
      }
    }
  } catch { /* continua */ }

  // 2. loteria_historico
  try {
    const { data: hist } = await supabase
      .from('loteria_historico')
      .select('dezenas').eq('loteria', loteria).eq('concurso', Number(concurso)).single()
    if (hist?.dezenas?.length === chk.dezenasDrawn) {
      return { dezenas: hist.dezenas.map(Number), premiosCaixa: [] }
    }
  } catch { /* continua */ }

  // 3. API alternativa (não bloqueia Vercel)
  const ALT_BASE = 'https://loteriascaixa-api.herokuapp.com/api'
  try {
    const res = await fetch(`${ALT_BASE}/${cfg.apiSlug}/${concurso}`, { cache: 'no-store', signal: AbortSignal.timeout(6000) })
    if (res.ok) {
      const d = await res.json()
      const dezenas = ((d.dezenas || d.listaDezenas) as (string | number)[])
        .map(Number).filter((n: number) => n >= 1 && n <= chk.maxNum)
      if (dezenas.length === chk.dezenasDrawn) {
        const premiosCaixa = (d.premiacoes || []).map((r: { descricao?: string; ganhadores?: number; valorPremio?: number }) => ({
          faixa: r.descricao || '', ganhadores: r.ganhadores ?? 0, valor: r.valorPremio ?? 0,
        }))
        return { dezenas, premiosCaixa }
      }
    }
  } catch { /* continua */ }

  // 4. API oficial Caixa (com headers de browser para tentar contornar bloqueio)
  try {
    const res = await fetch(
      `https://servicebus2.caixa.gov.br/portaldeloterias/api/${cfg.apiSlug}/${concurso}`,
      {
        cache: 'no-store',
        signal: AbortSignal.timeout(8000),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          'Referer':    'https://loterias.caixa.gov.br/',
          'Origin':     'https://loterias.caixa.gov.br',
          'Accept':     'application/json, text/plain, */*',
          'Accept-Language': 'pt-BR,pt;q=0.9',
        },
      }
    )
    if (res.ok) {
      const d = await res.json()
      const dezenas = (d.listaDezenas || d.dezenasSorteadasOrdemSorteio || d.dezenas || [])
        .map((n: string | number) => Number(n)).filter((n: number) => n >= 1 && n <= chk.maxNum)
      if (dezenas.length === chk.dezenasDrawn) {
        const premiosCaixa = (d.listaRateioPremio || []).map((r: { descricaoFaixa: string; numerodeGanhadores: number; valorPremio: number }) => ({
          faixa: r.descricaoFaixa, ganhadores: r.numerodeGanhadores, valor: r.valorPremio,
        }))
        // Salva no cache config para próximas chamadas
        try {
          await supabase.from('config').upsert(
            { key: cacheKey, value: JSON.stringify(d), updated_at: new Date().toISOString() },
            { onConflict: 'key' }
          )
        } catch { /* ignore cache write errors */ }
        return { dezenas, premiosCaixa }
      }
    }
  } catch { /* esgotou todas as fontes */ }

  return { dezenas: [], premiosCaixa: [] }
}

// GET — busca resultado e confere automaticamente
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
    return NextResponse.json({ error: 'Nenhuma aposta carregada. Use "📊 Carregar Apostas" primeiro.' }, { status: 422 })
  }

  const loteria = (bolao.loteria || 'mega') as LoteriaId

  // Se já conferido e tem premios_caixa, retorna o salvo direto
  const rc = bolao.resultado_conferencia as { status?: string; premios_caixa?: unknown[] } | null
  if (rc?.status === 'ganhamos' || rc?.status === 'nao_premiada') {
    if (rc.premios_caixa) return NextResponse.json({ ok: true, total_apostas: bolao.apostas_data.bets.length, ...rc })
    // Tinha resultado mas sem premios_caixa — busca e complementa
    const { premiosCaixa } = await buscarDezenasCaixa(loteria, concurso)
    const updated = { ...rc, premios_caixa: premiosCaixa }
    await salvarStatus(bolaoId, updated)
    return NextResponse.json({ ok: true, total_apostas: bolao.apostas_data.bets.length, ...updated })
  }

  const { dezenas, premiosCaixa } = await buscarDezenasCaixa(loteria, concurso)
  const chk = CHECK[loteria]
  const cfg = getLoteria(loteria)

  if (dezenas.length === chk.dezenasDrawn) {
    const dezenasPorAposta = bolao.apostas_data.dezenas_por_aposta ?? bolao.dezenas ?? cfg.minDezenas
    const resultado = classificar(bolao.apostas_data.bets, dezenas, dezenasPorAposta, loteria)
    const payload   = { dezenas_sorteadas: dezenas, dezenas_por_aposta: dezenasPorAposta, loteria, premios_caixa: premiosCaixa, ...resultado }
    await salvarStatus(bolaoId, payload)
    return NextResponse.json({ ok: true, dezenas_sorteadas: dezenas, dezenas_por_aposta: dezenasPorAposta, total_apostas: bolao.apostas_data.bets.length, premios_caixa: premiosCaixa, ...resultado })
  }

  // Não apurado ainda — tenta buscar data do próximo concurso
  let dataProximo = ''
  try {
    const r = await fetch(`https://servicebus2.caixa.gov.br/portaldeloterias/api/${cfg.apiSlug}`, {
      cache: 'no-store', signal: AbortSignal.timeout(5000),
      headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://loterias.caixa.gov.br/', 'Origin': 'https://loterias.caixa.gov.br' },
    })
    if (r.ok) { const d = await r.json(); dataProximo = d.dataProximoConcurso || '' }
  } catch { /* não crítico */ }

  const payload = { status: 'nao_apurado', data_encerramento: dataProximo || '' }
  await salvarStatus(bolaoId, payload)
  return NextResponse.json({
    ok: true, status: 'nao_apurado', data_encerramento: dataProximo,
    message: `Concurso #${concurso} (${cfg.label}) ainda não apurado ou indisponível. Tente novamente em alguns minutos ou insira as dezenas manualmente.`,
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
