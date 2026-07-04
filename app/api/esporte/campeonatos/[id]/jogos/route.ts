import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getEsporteSettings } from '@/lib/settings'

const CACHE_TTL = 60 * 60 * 1000 // 1 hora

interface ApiFootballFixture {
  fixture: { id: number; date: string; status: { short: string } }
  league: { round: string }
  teams: { home: { name: string }; away: { name: string } }
}

function normalizar(fixtures: ApiFootballFixture[]) {
  return fixtures
    .filter(f => f.fixture?.date)
    .map((f, i) => {
      const d = new Date(f.fixture.date)
      return {
        id: String(f.fixture.id),
        nomeCasa: f.teams.home.name,
        nomeFora: f.teams.away.name,
        data: d.toISOString().slice(0, 10),
        hora: d.toISOString().slice(11, 16),
        fase: f.league.round || 'Rodada',
        grupo: null as string | null,
        ordem: i + 1,
      }
    })
}

// GET — busca jogos futuros de um campeonato (fonte api-football) com cache de 1h
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const force = req.nextUrl.searchParams.get('force') === '1'

  const { data: comp } = await supabase
    .from('competicoes_esporte')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!comp) return NextResponse.json({ error: 'Campeonato não encontrado' }, { status: 404 })
  if (comp.fonte !== 'api-football') {
    return NextResponse.json({ error: 'Este campeonato não tem importação automática configurada (fonte manual/fifa).' }, { status: 400 })
  }
  if (!comp.api_competition_id) {
    return NextResponse.json({ error: 'Campeonato sem ID de liga da API-Football configurado.' }, { status: 400 })
  }

  const cacheKey = `campeonato_jogos_${params.id}`

  const { data: cached } = await supabase
    .from('config')
    .select('value, updated_at')
    .eq('key', cacheKey)
    .single()

  if (!force && cached?.value) {
    const updatedAt = new Date(cached.updated_at || 0).getTime()
    if (Date.now() - updatedAt < CACHE_TTL) {
      return NextResponse.json({ jogos: JSON.parse(cached.value), atualizadoEm: cached.updated_at })
    }
  }

  const { api_football_key } = await getEsporteSettings()
  if (!api_football_key) {
    if (cached?.value) return NextResponse.json({ jogos: JSON.parse(cached.value), atualizadoEm: cached.updated_at, stale: true })
    return NextResponse.json({ error: 'Chave da API-Football não configurada (Configurações → Esporte).' }, { status: 400 })
  }

  try {
    const season = comp.temporada || String(new Date().getFullYear())
    const url = `https://v3.football.api-sports.io/fixtures?league=${comp.api_competition_id}&season=${season}&next=60`
    const res = await fetch(url, { headers: { 'x-apisports-key': api_football_key }, cache: 'no-store' })
    if (!res.ok) throw new Error(`API-Football retornou ${res.status}`)
    const raw = await res.json()
    const jogos = normalizar(raw.response || [])

    const updated_at = new Date().toISOString()
    await supabase.from('config').upsert(
      { key: cacheKey, value: JSON.stringify(jogos), updated_at },
      { onConflict: 'key' }
    )
    return NextResponse.json({ jogos, atualizadoEm: updated_at })
  } catch (e) {
    if (cached?.value) return NextResponse.json({ jogos: JSON.parse(cached.value), atualizadoEm: cached.updated_at, stale: true })
    return NextResponse.json({ error: 'Falha ao buscar jogos na API-Football: ' + String(e) }, { status: 502 })
  }
}
