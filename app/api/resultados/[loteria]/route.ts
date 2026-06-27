import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const LOTERIA_IDS = ['megasena', 'lotofacil', 'quina', 'lotomania', 'duplasena', 'diadesorte', 'supersete']
// API pública que não bloqueia IPs de datacenter
const ALT_BASE = 'https://loteriascaixa-api.herokuapp.com/api'
// Fallback: API oficial da Caixa (pode bloquear Vercel, mas tenta)
const CAIXA_BASE = 'https://servicebus2.caixa.gov.br/portaldeloterias/api'
const CACHE_TTL = 60 * 60 * 1000 // 1 hora em ms

// Normaliza o formato da API alternativa para o formato esperado pelo frontend
function normalize(raw: Record<string, unknown>) {
  // Se já veio no formato da Caixa (tem listaDezenas), retorna direto
  if (Array.isArray(raw.listaDezenas)) return raw

  // Formato da API alternativa → formato Caixa
  const premiacoes = (raw.premiacoes as { ganhadores: number }[] | undefined) || []
  return {
    numero:                         raw.concurso,
    dataApuracao:                   raw.data,
    listaDezenas:                   raw.dezenas,
    acumulado:                      raw.acumulou,
    valorEstimadoProximoConcurso:   raw.valorEstimadoProximoConcurso,
    dataProximoConcurso:            raw.dataProximoConcurso,
    listaRateioPremio:              premiacoes.map(p => ({ numeroDeGanhadores: p.ganhadores })),
  }
}

export async function GET(req: NextRequest, { params }: { params: { loteria: string } }) {
  const loteria = params.loteria.toLowerCase()
  if (!LOTERIA_IDS.includes(loteria)) {
    return NextResponse.json({ error: 'Loteria inválida' }, { status: 400 })
  }

  const cacheKey = `resultado_${loteria}`

  // 1. Tenta retornar do cache Supabase (≤ 1h)
  const { data: cached } = await supabase
    .from('config')
    .select('value, updated_at')
    .eq('key', cacheKey)
    .single()

  if (cached?.value) {
    const updatedAt = new Date(cached.updated_at || 0).getTime()
    if (Date.now() - updatedAt < CACHE_TTL) {
      return NextResponse.json(JSON.parse(cached.value), {
        headers: { 'Cache-Control': 'public, max-age=300' }
      })
    }
  }

  // 2. Tenta API alternativa (não bloqueia Vercel)
  try {
    const res = await fetch(`${ALT_BASE}/${loteria}/latest`, { cache: 'no-store' })
    if (res.ok) {
      const raw = await res.json()
      const data = normalize(raw)
      await supabase.from('config').upsert(
        { key: cacheKey, value: JSON.stringify(data), updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      )
      return NextResponse.json(data, { headers: { 'Cache-Control': 'public, max-age=300' } })
    }
  } catch { /* tenta Caixa */ }

  // 3. Tenta API oficial da Caixa (com headers de browser)
  try {
    const res = await fetch(`${CAIXA_BASE}/${loteria}`, {
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
        'Referer': 'https://loterias.caixa.gov.br/',
        'Origin': 'https://loterias.caixa.gov.br',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
    })
    if (res.ok) {
      const data = await res.json()
      await supabase.from('config').upsert(
        { key: cacheKey, value: JSON.stringify(data), updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      )
      return NextResponse.json(data, { headers: { 'Cache-Control': 'public, max-age=300' } })
    }
  } catch { /* usa cache stale */ }

  // 4. Retorna cache stale se existir
  if (cached?.value) {
    return NextResponse.json(JSON.parse(cached.value), {
      headers: { 'Cache-Control': 'public, max-age=60' }
    })
  }

  return NextResponse.json({ error: 'Indisponível' }, { status: 503 })
}
