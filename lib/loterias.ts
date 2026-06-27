export type LoteriaId = 'mega' | 'lotofacil' | 'quina'

export interface LoteriaConfig {
  id: LoteriaId
  label: string
  emoji: string
  cor: string
  corSecundaria: string
  totalNumeros: number
  minDezenas: number
  maxDezenas: number
  precos: Record<number, number>
  apiSlug: string
  drawDays: number[]   // 0=dom, 1=seg ...
  tabelaNome: string   // nome da tabela no Supabase (loteria_historico)
}

export const LOTERIAS: Record<LoteriaId, LoteriaConfig> = {
  mega: {
    id: 'mega',
    label: 'Mega-Sena',
    emoji: '🍀',
    cor: '#00AB67',
    corSecundaria: '#005DA9',
    totalNumeros: 60,
    minDezenas: 6,
    maxDezenas: 20,
    apiSlug: 'megasena',
    drawDays: [2, 4, 6],  // ter, qui, sáb
    tabelaNome: 'loteria_historico',
    precos: {
       6:      5,   7:     35,   8:    140,   9:    420,  10:   1050,
      11:   2310,  12:   4620,  13:   8580,  14:  15015,  15:  20020,
      16:  40040,  17:  62244,  18:  93366,  19: 135751,  20: 193536,
    },
  },

  lotofacil: {
    id: 'lotofacil',
    label: 'Lotofácil',
    emoji: '🌸',
    cor: '#702A82',
    corSecundaria: '#803594',
    totalNumeros: 25,
    minDezenas: 15,
    maxDezenas: 20,
    apiSlug: 'lotofacil',
    drawDays: [1, 2, 3, 4, 5],  // seg–sex
    tabelaNome: 'loteria_historico',
    precos: {
      15:       3,
      16:      48,
      17:     408,
      18:    2380,
      19:    9996,
      20:   31654,
    },
  },

  quina: {
    id: 'quina',
    label: 'Quina',
    emoji: '🔵',
    cor: '#00508F',
    corSecundaria: '#005DA4',
    totalNumeros: 80,
    minDezenas: 5,
    maxDezenas: 15,
    apiSlug: 'quina',
    drawDays: [1, 2, 3, 4, 5, 6],  // seg–sáb
    tabelaNome: 'loteria_historico',
    precos: {
       5:    2,   6:   12,   7:   42,   8:  112,   9:  252,
      10:  504,  11:  924,  12: 1584,  13: 2574,  14: 4004,
      15: 6006,
    },
  },
}

export const LOTERIA_LIST = Object.values(LOTERIAS)

export function getLoteria(id?: string | null): LoteriaConfig {
  return LOTERIAS[(id as LoteriaId) ?? 'mega'] ?? LOTERIAS.mega
}
