import { supabase } from '@/lib/supabase'
import { getEsporteSettings } from '@/lib/settings'

// Categoria A: acertou o placar exato                                        → 5 pts
// Categoria B: acertou vencedor casa ou fora (não empate), placar diferente   → 3 pts
// Categoria C: errou o vencedor, mas acertou a margem de gols (diferença
//              absoluta entre os gols) - ex: previu casa vencendo por 1,
//              saiu fora vencendo por 1                                       → 2 pts
// Categoria D: previu empate e saiu empate, mas placar diferente              → 1 pt
// Errou tudo acima                                                            → 0 pts
function calcularCategoria(palCasa: number, palFora: number, resCasa: number, resFora: number): 'A' | 'B' | 'C' | 'D' | null {
  const acertouPlacar = palCasa === resCasa && palFora === resFora
  if (acertouPlacar) return 'A'

  const palVenc = palCasa > palFora ? 'casa' : palCasa < palFora ? 'fora' : 'empate'
  const resVenc = resCasa > resFora ? 'casa' : resCasa < resFora ? 'fora' : 'empate'
  if (palVenc === resVenc) return palVenc === 'empate' ? 'D' : 'B'

  const margemPalpite = Math.abs(palCasa - palFora)
  const margemReal = Math.abs(resCasa - resFora)
  if (margemReal > 0 && margemPalpite === margemReal) return 'C'

  return null
}

function categoriaPontos(cat: 'A' | 'B' | 'C' | 'D' | null): number {
  if (cat === 'A') return 5
  if (cat === 'B') return 3
  if (cat === 'C') return 2
  if (cat === 'D') return 1
  return 0
}

export interface ResultadoAplicado {
  ok: boolean
  atualizados: number
  erros?: string[]
}

/**
 * Grava o placar de um jogo e recalcula os pontos de todos os palpites feitos
 * para ele, junto com o pontos_total de cada participante afetado (recalculado
 * do zero a partir da soma de todos os palpites - idempotente: reenviar um
 * placar corrigido para o mesmo jogo substitui os pontos antigos, não duplica).
 */
export async function aplicarResultadoJogo(jogoId: string, golCasa: number, golFora: number): Promise<ResultadoAplicado> {
  const { data: jogo, error: jogoErr } = await supabase
    .from('jogos')
    .update({ gol_casa: golCasa, gol_fora: golFora, encerrado: true })
    .eq('id', jogoId)
    .select('bolao_slug').single()

  if (jogoErr || !jogo) return { ok: false, atualizados: 0, erros: ['Jogo não encontrado'] }

  const { data: palpites } = await supabase
    .from('palpites')
    .select('id, participante_id, gol_casa, gol_fora')
    .eq('jogo_id', jogoId)

  if (!palpites || palpites.length === 0) return { ok: true, atualizados: 0 }

  const erros: string[] = []
  const participantesAfetados = new Set<string>()

  for (const p of palpites) {
    const cat = calcularCategoria(p.gol_casa, p.gol_fora, golCasa, golFora)
    const pontos = categoriaPontos(cat)

    const { error } = await supabase.from('palpites').update({ pontos }).eq('id', p.id)
    if (error) { erros.push(`palpite ${p.id}: ${error.message}`); continue }
    participantesAfetados.add(p.participante_id)
  }

  for (const participanteId of participantesAfetados) {
    const { data: todosPalpites, error: selErr } = await supabase
      .from('palpites')
      .select('pontos')
      .eq('participante_id', participanteId)

    if (selErr) { erros.push(`participante ${participanteId}: ${selErr.message}`); continue }

    const total = (todosPalpites || []).reduce((s, row) => s + (row.pontos || 0), 0)

    const { error: updErr } = await supabase
      .from('participantes_esporte')
      .update({ pontos_total: total })
      .eq('id', participanteId)

    if (updErr) erros.push(`participante ${participanteId}: ${updErr.message}`)
  }

  return { ok: erros.length === 0, atualizados: palpites.length - erros.length, ...(erros.length > 0 && { erros }) }
}

interface FootballDataScore { fullTime: { home: number | null; away: number | null } }
interface FootballDataMatch { id: number; status: string; score: FootballDataScore }

export interface BuscaResultadosResumo {
  ok: boolean
  jogosVerificados: number
  atualizados: number
  erro?: string
}

/**
 * Busca no football-data.org os jogos já encerrados (status=FINISHED) da
 * competição vinculada ao bolão e aplica automaticamente o placar em qualquer
 * jogo local (jogos.api_jogo_id) que ainda não tenha sido conferido.
 */
export async function buscarEAplicarResultados(bolaoSlug: string): Promise<BuscaResultadosResumo> {
  const { data: bolao } = await supabase
    .from('boloes_esporte')
    .select('competicao_id')
    .eq('slug', bolaoSlug)
    .single()

  if (!bolao?.competicao_id) {
    return { ok: false, jogosVerificados: 0, atualizados: 0, erro: 'Bolão sem campeonato vinculado' }
  }

  const { data: comp } = await supabase
    .from('competicoes_esporte')
    .select('fonte, api_codigo')
    .eq('id', bolao.competicao_id)
    .single()

  if (!comp || comp.fonte !== 'football-data' || !comp.api_codigo) {
    return { ok: false, jogosVerificados: 0, atualizados: 0, erro: 'Campeonato sem busca automática de resultados (fonte manual/fifa)' }
  }

  const { data: jogosPendentes } = await supabase
    .from('jogos')
    .select('id, api_jogo_id')
    .eq('bolao_slug', bolaoSlug)
    .eq('encerrado', false)
    .not('api_jogo_id', 'is', null)

  if (!jogosPendentes || jogosPendentes.length === 0) {
    return { ok: true, jogosVerificados: 0, atualizados: 0 }
  }

  const { football_data_key } = await getEsporteSettings()
  if (!football_data_key) {
    return { ok: false, jogosVerificados: 0, atualizados: 0, erro: 'Chave do football-data.org não configurada (Configurações → Esporte)' }
  }

  try {
    const url = `https://api.football-data.org/v4/competitions/${comp.api_codigo}/matches?status=FINISHED`
    const res = await fetch(url, { headers: { 'X-Auth-Token': football_data_key }, cache: 'no-store' })
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}))
      throw new Error(errBody.message || `football-data.org retornou ${res.status}`)
    }
    const raw: { matches?: FootballDataMatch[] } = await res.json()
    const finalizados = raw.matches || []

    const porApiId = new Map(finalizados.map(m => [String(m.id), m]))

    let atualizados = 0
    for (const jogo of jogosPendentes) {
      const match = jogo.api_jogo_id ? porApiId.get(jogo.api_jogo_id) : undefined
      if (!match) continue

      const { home, away } = match.score.fullTime
      if (home === null || away === null) continue

      const resultado = await aplicarResultadoJogo(jogo.id, home, away)
      if (resultado.ok) atualizados++
    }

    return { ok: true, jogosVerificados: jogosPendentes.length, atualizados }
  } catch (e) {
    return { ok: false, jogosVerificados: jogosPendentes.length, atualizados: 0, erro: 'Falha ao buscar no football-data.org: ' + String(e) }
  }
}
