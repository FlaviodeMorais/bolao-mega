import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verificarToken } from '@/lib/auth'

// Mapa: código FIFA 3 letras → código ISO 2 letras (flag-icons)
const FIFA_TO_ISO: Record<string, string> = {
  BRA:'br', ARG:'ar', URU:'uy', COL:'co', CHI:'cl', PAR:'py', BOL:'bo', ECU:'ec', PER:'pe', VEN:'ve',
  MEX:'mx', USA:'us', CAN:'ca', CRC:'cr', PAN:'pa', HON:'hn', SLV:'sv', JAM:'jm', TRI:'tt',
  GER:'de', FRA:'fr', ESP:'es', POR:'pt', ENG:'gb-eng', ITA:'it', NED:'nl', BEL:'be',
  CRO:'hr', SRB:'rs', POL:'pl', DEN:'dk', SUI:'ch', AUT:'at', UKR:'ua', HUN:'hu',
  CZE:'cz', SVK:'sk', ALB:'al', SVN:'si', TUR:'tr', ROU:'ro', GEO:'ge', GRE:'gr',
  SCO:'gb-sct', WAL:'gb-wls', KOR:'kr', JPN:'jp', PRK:'kp', KSA:'sa', AUS:'au',
  IRN:'ir', IRQ:'iq', QAT:'qa', CHN:'cn', IDN:'id', NZL:'nz', PHI:'ph', IND:'in', THA:'th', VIE:'vn',
  MAR:'ma', SEN:'sn', GHA:'gh', CMR:'cm', TUN:'tn', EGY:'eg', NGA:'ng', MLI:'ml',
  CPV:'cv', CIV:'ci', RSA:'za', ANG:'ao', ZAM:'zm', BIH:'ba', ISL:'is', FIN:'fi', NOR:'no', SWE:'se',
  ALG:'dz', NIG:'ne', MOZ:'mz', TAN:'tz', BEN:'bj', GUI:'gn',
  // Países presentes na Copa 2026 não mapeados antes
  COD:'cd', CUW:'cw', HAI:'ht', JOR:'jo', UZB:'uz',
}

// Mapa de grupo: IdGroup da FIFA → letra A-L
const GRUPOS_FIFA: Record<string, string> = {
  '289275':'A','289276':'B','289277':'C','289278':'D','289279':'E','289280':'F',
  '289281':'G','289282':'H','289283':'I','289284':'J','289285':'K','289286':'L',
}

interface FifaTeam {
  TeamName?: Array<{ Description: string }>
  ShortClubName?: string
  Abbreviation?: string
  IdCountry?: string
}
interface FifaLocale { Locale: string; Description: string }
interface FifaMatch {
  IdMatch: string
  Date: string
  Home: FifaTeam
  Away: FifaTeam
  HomeTeamScore: number | null
  AwayTeamScore: number | null
  IdGroup: string
  MatchNumber: number
  StageName?: FifaLocale[]
  GroupName?: FifaLocale[]
}

// Ordem de exibição das fases
const FASE_ORDEM: Record<string, number> = {
  'Fase de Grupos': 1,
  'Segundas de final': 2,
  'Oitavas de final': 3,
  'Quartas de final': 4,
  'Semifinal': 5,
  'Decisão do 3º lugar': 6,
  'Final': 7,
}

function getFasePtBR(stageName?: FifaLocale[]): string {
  if (!stageName) return 'Fase de Grupos'
  const pt = stageName.find(s => s.Locale === 'pt-BR')?.Description || stageName[0]?.Description || ''
  if (pt.toLowerCase().includes('primeira') || pt.toLowerCase().includes('grupo')) return 'Fase de Grupos'
  return pt || 'Fase de Grupos'
}

function getGrupoPtBR(groupName?: FifaLocale[]): string | null {
  if (!groupName || groupName.length === 0) return null
  const pt = groupName.find(s => s.Locale === 'pt-BR')?.Description || groupName[0]?.Description || ''
  return pt || null
}

function getNome(team: FifaTeam): string {
  if (Array.isArray(team?.TeamName) && team.TeamName.length > 0) {
    return team.TeamName[0].Description || ''
  }
  return team?.ShortClubName || team?.Abbreviation || ''
}

function parseFifaDate(dateStr: string): { data: string; hora: string } {
  if (!dateStr) return { data: '', hora: '' }
  const d = new Date(dateStr)
  const br = new Date(d.getTime() - 3 * 60 * 60 * 1000)
  return {
    data: br.toISOString().slice(0, 10),
    hora: br.toISOString().slice(11, 16),
  }
}

// POST — recebe jogos já buscados pelo browser e salva no banco
export async function POST(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { bolao_slug, sobrescrever, jogos } = await req.json()
  if (!bolao_slug) return NextResponse.json({ error: 'bolao_slug obrigatório' }, { status: 400 })
  if (!Array.isArray(jogos) || jogos.length === 0) {
    return NextResponse.json({ error: 'Nenhum jogo recebido' }, { status: 400 })
  }

  // Sempre apaga TODOS os jogos do bolão antes de reimportar
  await supabase.from('jogos').delete().eq('bolao_slug', bolao_slug)

  let importados = 0
  let ignorados = 0
  const agora = new Date()
  const fifaJogos = (jogos as FifaMatch[]).filter(j => {
    if (!j.Date) return false
    return new Date(j.Date) > agora
  })

  for (const j of fifaJogos) {
    const nomeCasa = getNome(j.Home)
    const nomeFora = getNome(j.Away)
    if (!nomeCasa || !nomeFora) { ignorados++; continue }

    const { data: dataJogo, hora: horaStr } = parseFifaDate(j.Date)
    const fase = getFasePtBR(j.StageName)
    const grupo = getGrupoPtBR(j.GroupName)
    const ordemFase = FASE_ORDEM[fase] || 1
    const matchNum = j.MatchNumber || 0

    const isoCasa = FIFA_TO_ISO[j.Home?.IdCountry || ''] || ''
    const isoFora = FIFA_TO_ISO[j.Away?.IdCountry || ''] || ''

    const { error } = await supabase.from('jogos').insert({
      bolao_slug,
      time_casa: nomeCasa,
      time_fora: nomeFora,
      bandeira_casa: isoCasa || null,
      bandeira_fora: isoFora || null,
      data_jogo: dataJogo || null,
      hora_jogo: horaStr || null,
      fase,
      grupo,
      ordem: ordemFase * 1000 + matchNum,
      encerrado: false,
    })
    if (!error) importados++
    else ignorados++
  }

  return NextResponse.json({ ok: true, importados, ignorados, total: fifaJogos.length })
}
