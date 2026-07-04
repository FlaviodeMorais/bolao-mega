import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { getEsporteSettings } from '@/lib/settings'

const CACHE_TTL = 60 * 60 * 1000 // 1 hora

interface FootballDataMatch {
  id: number
  utcDate: string
  status: string
  matchday: number | null
  stage: string
  homeTeam: { name: string }
  awayTeam: { name: string }
}

const STAGE_PT: Record<string, string> = {
  GROUP_STAGE: 'Fase de Grupos', LAST_16: 'Oitavas de final', QUARTER_FINALS: 'Quartas de final',
  SEMI_FINALS: 'Semifinal', FINAL: 'Final', REGULAR_SEASON: 'Rodada',
}

function normalizar(matches: FootballDataMatch[]) {
  return matches
    .filter(m => m.status === 'SCHEDULED' || m.status === 'TIMED')
    .map((m, i) => {
      const d = new Date(m.utcDate)
      const fase = STAGE_PT[m.stage] || m.stage || 'Rodada'
      return {
        id: String(m.id),
        nomeCasa: m.homeTeam.name,
        nomeFora: m.awayTeam.name,
        data: d.toISOString().slice(0, 10),
        hora: d.toISOString().slice(11, 16),
        fase: m.matchday ? `${fase} ${m.matchday}` : fase,
        grupo: null as string | null,
        ordem: i + 1,
      }
    })
}

// GET — busca próximos jogos de um campeonato (fonte football-data) com cache de 1h
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const force = req.nextUrl.searchParams.get('force') === '1'

  const { data: comp } = await supabase
    .from('competicoes_esporte')
    .select('*')
    .eq('id', params.id)
    .single()

  if (!comp) return NextResponse.json({ error: 'Campeonato não encontrado' }, { status: 404 })
  if (comp.fonte !== 'football-data') {
    return NextResponse.json({ error: 'Este campeonato não tem importação automática configurada (fonte manual/fifa).' }, { status: 400 })
  }
  if (!comp.api_codigo) {
    return NextResponse.json({ error: 'Campeonato sem código do football-data.org configurado.' }, { status: 400 })
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

  const { football_data_key } = await getEsporteSettings()
  if (!football_data_key) {
    if (cached?.value) return NextResponse.json({ jogos: JSON.parse(cached.value), atualizadoEm: cached.updated_at, stale: true })
    return NextResponse.json({ error: 'Chave do football-data.org não configurada (Configurações → Esporte).' }, { status: 400 })
  }

  try {
    const url = `https://api.football-data.org/v4/competitions/${comp.api_codigo}/matches?status=SCHEDULED`
    const res = await fetch(url, { headers: { 'X-Auth-Token': football_data_key }, cache: 'no-store' })
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}))
      throw new Error(errBody.message || `football-data.org retornou ${res.status}`)
    }
    const raw = await res.json()
    const jogos = normalizar(raw.matches || [])

    const updated_at = new Date().toISOString()
    await supabase.from('config').upsert(
      { key: cacheKey, value: JSON.stringify(jogos), updated_at },
      { onConflict: 'key' }
    )
    return NextResponse.json({ jogos, atualizadoEm: updated_at })
  } catch (e) {
    if (cached?.value) return NextResponse.json({ jogos: JSON.parse(cached.value), atualizadoEm: cached.updated_at, stale: true })
    return NextResponse.json({ error: 'Falha ao buscar jogos no football-data.org: ' + String(e) }, { status: 502 })
  }
}
