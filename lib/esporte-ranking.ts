import { supabase } from '@/lib/supabase'
import { getEsporteSettings, type PremiacaoItem } from '@/lib/settings'

export interface ParticipanteRanking {
  id: string
  nome: string
  telefone?: string
  email?: string
  pontos_total: number | null
  status: string
  posicao: number
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
  const ranking: ParticipanteRanking[] = lista.map((p, i) => ({ ...p, posicao: i + 1 }))

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
