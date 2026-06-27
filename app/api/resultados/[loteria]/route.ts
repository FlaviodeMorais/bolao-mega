import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

const LOTERIA_IDS = ['megasena', 'lotofacil', 'quina', 'lotomania', 'duplasena', 'diadesorte', 'supersete']
const BASE = 'https://servicebus2.caixa.gov.br/portaldeloterias/api'
const CACHE_TTL = 60 * 60 * 1000 // 1 hora em ms

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

  // 2. Busca na Caixa com headers de browser (bypass WAF)
  try {
    const res = await fetch(`${BASE}/${loteria}`, {
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
      // Salva no cache
      await supabase.from('config').upsert(
        { key: cacheKey, value: JSON.stringify(data), updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      )
      return NextResponse.json(data, {
        headers: { 'Cache-Control': 'public, max-age=300' }
      })
    }
  } catch { /* falhou — usa cache stale */ }

  // 3. Retorna cache stale se existir
  if (cached?.value) {
    return NextResponse.json(JSON.parse(cached.value), {
      headers: { 'Cache-Control': 'public, max-age=60' }
    })
  }

  return NextResponse.json({ error: 'Indisponível' }, { status: 503 })
}
