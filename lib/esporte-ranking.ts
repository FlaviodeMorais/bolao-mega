import { supabase } from '@/lib/supabase'
import { getEsporteSettings, type PremiacaoItem } from '@/lib/settings'

export interface PalpiteDetalhado {
  jogo_id: string
  time_casa: string
  time_fora: string
  gol_casa_real: number | null
  gol_fora_real: number | null
  palpite_casa: number
  palpite_fora: number
  pontos: number | null
  encerrado: boolean
  fase: string
  data_jogo: string | null
  hora_jogo: string | null
}

export interface ParticipanteRanking {
  id: string
  nome: string
  telefone?: string
  email?: string
  pontos_total: number | null
  status: string
  posicao: number
  palpites: PalpiteDetalhado[]
}

/** Palpites de todos os participantes de um bolão, já casados com o jogo
 * correspondente (placar real, fase, data) — usado pra exibir no ranking
 * quem acertou o quê, jogo a jogo. */
async function palpitesPorParticipante(bolaoSlug: string): Promise<Record<string, PalpiteDetalhado[]>> {
  const { data: jogos } = await supabase
    .from('jogos')
    .select('id, time_casa, time_fora, gol_casa, gol_fora, fase, data_jogo, hora_jogo, encerrado')
    .eq('bolao_slug', bolaoSlug)
    .order('data_jogo', { ascending: true, nullsFirst: false })
    .order('hora_jogo', { ascending: true, nullsFirst: false })

  const jogosMap = new Map((jogos || []).map(j => [j.id, j]))

  const { data: palpites } = await supabase
    .from('palpites')
    .select('participante_id, jogo_id, gol_casa, gol_fora, pontos')
    .eq('bolao_slug', bolaoSlug)

  const porParticipante: Record<string, PalpiteDetalhado[]> = {}
  for (const p of palpites || []) {
    const jogo = jogosMap.get(p.jogo_id)
    if (!jogo) continue
    ;(porParticipante[p.participante_id] ??= []).push({
      jogo_id: p.jogo_id,
      time_casa: jogo.time_casa,
      time_fora: jogo.time_fora,
      gol_casa_real: jogo.gol_casa,
      gol_fora_real: jogo.gol_fora,
      palpite_casa: p.gol_casa,
      palpite_fora: p.gol_fora,
      pontos: p.pontos,
      encerrado: jogo.encerrado,
      fase: jogo.fase,
      data_jogo: jogo.data_jogo,
      hora_jogo: jogo.hora_jogo,
    })
  }
  return porParticipante
}

export interface PremioCalculado {
  lugar: number
  emoji: string
  label: string
  categoria: string
  pct: number
  valor: number
}

export interface RankingBolao {
  bolao: { nome?: string; valor_cota: number; taxa_admin: number }
  ranking: ParticipanteRanking[]
  arrecadado: number
  taxa: number
  liquido: number
  premios: PremioCalculado[]
}

/**
 * Ranking + cálculo financeiro de um bolão esportivo — único ponto que lê
 * participantes pagos, ordena por pontos_total e aplica a premiação (config
 * do bolão ou default global). Usado por /api/esporte/ranking e
 * /api/esporte/encerrar-bolao para evitar que a regra de cálculo divirja
 * entre os dois endpoints.
 */
export async function calcularRankingBolao(bolaoSlug: string): Promise<RankingBolao | null> {
  const { data: bolao } = await supabase
    .from('boloes_esporte')
    .select('nome, valor_cota, taxa_admin, premiacao')
    .eq('slug', bolaoSlug)
    .single()

  if (!bolao) return null

  const { data: participantes } = await supabase
    .from('participantes_esporte')
    .select('id, nome, telefone, email, pontos_total, status')
    .eq('bolao_slug', bolaoSlug)
    .eq('status', 'pago')
    .order('pontos_total', { ascending: false })

  const lista = participantes || []
  const palpitesMap = await palpitesPorParticipante(bolaoSlug)
  const ranking: ParticipanteRanking[] = lista.map((p, i) => ({
    ...p, posicao: i + 1, palpites: palpitesMap[p.id] || [],
  }))

  const arrecadado = ranking.length * Number(bolao.valor_cota || 0)
  const taxa = arrecadado * (Number(bolao.taxa_admin || 20) / 100)
  const liquido = arrecadado - taxa

  const premiacao: PremiacaoItem[] = Array.isArray(bolao.premiacao) && bolao.premiacao.length > 0
    ? bolao.premiacao
    : (await getEsporteSettings()).premiacao

  const premios: PremioCalculado[] = premiacao.map(item => ({
    lugar: item.lugar,
    emoji: item.emoji,
    label: item.label,
    categoria: item.categoria,
    pct: item.pct,
    valor: liquido * (item.pct / 100),
  }))

  return { bolao, ranking, arrecadado, taxa, liquido, premios }
}
