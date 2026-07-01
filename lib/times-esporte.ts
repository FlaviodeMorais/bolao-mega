export interface TimeEsporte {
  id: string
  nome: string
  abrev: string     // 3 letras para o shield SVG
  cor1: string      // cor principal
  cor2: string      // cor secundária
  textoCor: string  // cor do texto no shield
  pais: string      // código ISO para bandeira
  liga?: string     // id da competição principal
}

export const TIMES_BRASILEIRAO: TimeEsporte[] = [
  { id: 'flamengo',    nome: 'Flamengo',           abrev: 'FLA', cor1: '#CC0000', cor2: '#000000', textoCor: '#fff', pais: 'br', liga: 'brasileirao-26' },
  { id: 'palmeiras',   nome: 'Palmeiras',           abrev: 'PAL', cor1: '#006633', cor2: '#fff',    textoCor: '#fff', pais: 'br', liga: 'brasileirao-26' },
  { id: 'corinthians', nome: 'Corinthians',         abrev: 'COR', cor1: '#000000', cor2: '#fff',    textoCor: '#fff', pais: 'br', liga: 'brasileirao-26' },
  { id: 'sao-paulo',   nome: 'São Paulo',           abrev: 'SAO', cor1: '#CC0000', cor2: '#fff',    textoCor: '#fff', pais: 'br', liga: 'brasileirao-26' },
  { id: 'botafogo',    nome: 'Botafogo',            abrev: 'BOT', cor1: '#000000', cor2: '#fff',    textoCor: '#fff', pais: 'br', liga: 'brasileirao-26' },
  { id: 'fluminense',  nome: 'Fluminense',          abrev: 'FLU', cor1: '#8B0000', cor2: '#006400', textoCor: '#fff', pais: 'br', liga: 'brasileirao-26' },
  { id: 'vasco',       nome: 'Vasco da Gama',       abrev: 'VAS', cor1: '#000000', cor2: '#fff',    textoCor: '#fff', pais: 'br', liga: 'brasileirao-26' },
  { id: 'atletico-mg', nome: 'Atlético Mineiro',    abrev: 'CAM', cor1: '#000000', cor2: '#fff',    textoCor: '#fff', pais: 'br', liga: 'brasileirao-26' },
  { id: 'cruzeiro',    nome: 'Cruzeiro',            abrev: 'CRU', cor1: '#003087', cor2: '#fff',    textoCor: '#fff', pais: 'br', liga: 'brasileirao-26' },
  { id: 'gremio',      nome: 'Grêmio',              abrev: 'GRE', cor1: '#1A3A8C', cor2: '#000000', textoCor: '#fff', pais: 'br', liga: 'brasileirao-26' },
  { id: 'internacional',nome: 'Internacional',      abrev: 'INT', cor1: '#CC0000', cor2: '#fff',    textoCor: '#fff', pais: 'br', liga: 'brasileirao-26' },
  { id: 'athletico-pr',nome: 'Athletico Paranaense',abrev: 'CAP', cor1: '#CC0000', cor2: '#000000', textoCor: '#fff', pais: 'br', liga: 'brasileirao-26' },
  { id: 'fortaleza',   nome: 'Fortaleza',           abrev: 'FOR', cor1: '#003087', cor2: '#CC0000', textoCor: '#fff', pais: 'br', liga: 'brasileirao-26' },
  { id: 'bahia',       nome: 'Bahia',               abrev: 'BAH', cor1: '#003087', cor2: '#CC0000', textoCor: '#fff', pais: 'br', liga: 'brasileirao-26' },
  { id: 'bragantino',  nome: 'RB Bragantino',       abrev: 'RBB', cor1: '#CC0000', cor2: '#fff',    textoCor: '#fff', pais: 'br', liga: 'brasileirao-26' },
  { id: 'santos',      nome: 'Santos',              abrev: 'SAN', cor1: '#000000', cor2: '#fff',    textoCor: '#fff', pais: 'br', liga: 'brasileirao-26' },
  { id: 'sport',       nome: 'Sport Recife',        abrev: 'SPT', cor1: '#CC0000', cor2: '#000000', textoCor: '#fff', pais: 'br', liga: 'brasileirao-26' },
  { id: 'america-mg',  nome: 'América Mineiro',     abrev: 'AME', cor1: '#006400', cor2: '#fff',    textoCor: '#fff', pais: 'br', liga: 'brasileirao-26' },
  { id: 'juventude',   nome: 'Juventude',           abrev: 'JUV', cor1: '#006400', cor2: '#fff',    textoCor: '#fff', pais: 'br', liga: 'brasileirao-26' },
  { id: 'ceara',       nome: 'Ceará',               abrev: 'CEA', cor1: '#000000', cor2: '#fff',    textoCor: '#fff', pais: 'br', liga: 'brasileirao-26' },
]

// Gera o SVG inline de um escudo simples com as cores e abreviação do time
export function gerarShieldSVG(time: TimeEsporte, size = 64): string {
  const { cor1, cor2, textoCor, abrev } = time
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}">
  <path d="M${size/2} ${size*0.06} L${size*0.875} ${size*0.22} L${size*0.875} ${size*0.59} Q${size*0.875} ${size*0.85} ${size/2} ${size*0.97} Q${size*0.125} ${size*0.85} ${size*0.125} ${size*0.59} L${size*0.125} ${size*0.22} Z" fill="${cor1}"/>
  <path d="M${size/2} ${size*0.06} L${size*0.875} ${size*0.22} L${size*0.875} ${size*0.59} Q${size*0.875} ${size*0.85} ${size/2} ${size*0.97} L${size/2} ${size*0.06} Z" fill="${cor2}" opacity="0.35"/>
  <text x="${size/2}" y="${size*0.62}" font-family="Arial Black,sans-serif" font-size="${size*0.22}" font-weight="900" fill="${textoCor}" text-anchor="middle">${abrev}</text>
</svg>`
}

/** Retorna o caminho do logo oficial se existir em /public/logos/times/ */
export function logoPath(id: string): string {
  return `/logos/times/${id}.png`
}

export function getTime(id: string): TimeEsporte | undefined {
  return TIMES_BRASILEIRAO.find(t => t.id === id)
}

export function buscarTimes(query: string): TimeEsporte[] {
  const q = query.toLowerCase()
  return TIMES_BRASILEIRAO.filter(t =>
    t.nome.toLowerCase().includes(q) ||
    t.abrev.toLowerCase().includes(q) ||
    t.id.includes(q)
  )
}
