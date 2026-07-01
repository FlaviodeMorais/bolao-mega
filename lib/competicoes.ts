export type FonteCompeticao = 'fifa' | 'manual'

export interface Competicao {
  id: string
  label: string
  /** código ISO para flag-icons (ex: 'br') — mutuamente exclusivo com logo */
  flag?: string
  /** caminho /public para logo de competição — mutuamente exclusivo com flag */
  logo?: string
  cor: string
  fonte: FonteCompeticao
}

export const COMPETICOES: Competicao[] = [
  // Internacional – fonte FIFA
  { id: 'copa-2026',        label: 'Copa do Mundo FIFA 2026',     logo: '/WC26_Logo.png',                      cor: '#FFB81C', fonte: 'fifa' },

  // Internacional – manual
  { id: 'champions-2526',   label: 'UEFA Champions League 25/26', logo: '/logos/competicoes/champions.png',    cor: '#1A3A5C', fonte: 'manual' },
  { id: 'europa-2526',      label: 'UEFA Europa League 25/26',    logo: '/logos/competicoes/europa.png',       cor: '#F47B20', fonte: 'manual' },
  { id: 'libertadores-26',  label: 'CONMEBOL Libertadores 2026',  logo: '/logos/competicoes/libertadores.png', cor: '#C8A84B', fonte: 'manual' },
  { id: 'sulamericana-26',  label: 'CONMEBOL Sul-Americana 2026', logo: '/logos/competicoes/sulamericana.png', cor: '#FF8C00', fonte: 'manual' },
  { id: 'mundial-25',       label: 'Mundial de Clubes 2025',      logo: '/logos/competicoes/mundial-25.png',   cor: '#FF6B35', fonte: 'manual' },

  // Brasil – manual
  { id: 'brasileirao-26',   label: 'Brasileirão Série A 2026',    logo: '/logos/competicoes/brasileirao.png',  cor: '#009B3A', fonte: 'manual' },
  { id: 'brasileirao-b-26', label: 'Brasileirão Série B 2026',    logo: '/logos/competicoes/brasileirao-b.png',cor: '#2E7D32', fonte: 'manual' },
  { id: 'copa-brasil-26',   label: 'Copa do Brasil 2026',         logo: '/logos/competicoes/copa-brasil.png',  cor: '#006400', fonte: 'manual' },
  { id: 'carioca-26',       label: 'Campeonato Carioca 2026',     logo: '/logos/competicoes/carioca.png',      cor: '#E8002D', fonte: 'manual' },
  { id: 'paulista-26',      label: 'Campeonato Paulista 2026',    logo: '/logos/competicoes/paulista.png',     cor: '#1C1C1C', fonte: 'manual' },
  { id: 'mineiro-26',       label: 'Campeonato Mineiro 2026',     logo: '/logos/competicoes/mineiro.png',      cor: '#552583', fonte: 'manual' },
  { id: 'gaucho-26',        label: 'Campeonato Gaúcho 2026',      logo: '/logos/competicoes/gaucho.png',       cor: '#C41E3A', fonte: 'manual' },

  // Europa – manual
  { id: 'premier-2526',     label: 'Premier League 25/26',        logo: '/logos/competicoes/premier.png',      cor: '#3D195B', fonte: 'manual' },
  { id: 'laliga-2526',      label: 'La Liga 25/26',               logo: '/logos/competicoes/laliga.png',       cor: '#EF0E0E', fonte: 'manual' },
  { id: 'seriea-2526',      label: 'Serie A (Itália) 25/26',      logo: '/logos/competicoes/seriea-it.png',    cor: '#00529F', fonte: 'manual' },
  { id: 'bundesliga-2526',  label: 'Bundesliga 25/26',            logo: '/logos/competicoes/bundesliga.png',   cor: '#D20515', fonte: 'manual' },
  { id: 'ligue1-2526',      label: 'Ligue 1 (França) 25/26',     logo: '/logos/competicoes/ligue1.png',       cor: '#0055A4', fonte: 'manual' },

  // Outros
  { id: 'outro',            label: 'Outro campeonato',            flag: 'un',                                  cor: '#64748B', fonte: 'manual' },
]

export function getCompeticao(id: string): Competicao | undefined {
  return COMPETICOES.find(c => c.id === id)
}

export function isFifaCompeticao(competicaoIdOuLabel: string): boolean {
  return COMPETICOES.find(c => c.id === competicaoIdOuLabel)?.fonte === 'fifa'
}
