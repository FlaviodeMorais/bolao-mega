// Mapeia nome do país → código ISO 3166-1 alpha-2 (para flagcdn.com)
const CODIGOS: Record<string, string> = {
  // América do Sul
  'BRASIL': 'br', 'BRAZIL': 'br',
  'ARGENTINA': 'ar',
  'URUGUAI': 'uy', 'URUGUAY': 'uy',
  'COLÔMBIA': 'co', 'COLOMBIA': 'co',
  'CHILE': 'cl',
  'PARAGUAI': 'py', 'PARAGUAY': 'py',
  'BOLÍVIA': 'bo', 'BOLIVIA': 'bo',
  'EQUADOR': 'ec', 'ECUADOR': 'ec',
  'PERU': 'pe',
  'VENEZUELA': 've',

  // América do Norte / Central
  'MÉXICO': 'mx', 'MEXICO': 'mx',
  'EUA': 'us', 'USA': 'us', 'ESTADOS UNIDOS': 'us',
  'CANADÁ': 'ca', 'CANADA': 'ca',
  'COSTA RICA': 'cr',
  'PANAMÁ': 'pa', 'PANAMA': 'pa',
  'HONDURAS': 'hn',
  'EL SALVADOR': 'sv',
  'JAMAICA': 'jm',
  'TRINIDAD E TOBAGO': 'tt',

  // Europa
  'ALEMANHA': 'de', 'GERMANY': 'de',
  'FRANÇA': 'fr', 'FRANCE': 'fr',
  'ESPANHA': 'es', 'SPAIN': 'es',
  'PORTUGAL': 'pt',
  'INGLATERRA': 'gb-eng', 'ENGLAND': 'gb-eng',
  'ITÁLIA': 'it', 'ITALY': 'it',
  'HOLANDA': 'nl', 'PAÍSES BAIXOS': 'nl', 'NETHERLANDS': 'nl',
  'BÉLGICA': 'be', 'BELGIUM': 'be',
  'CROÁCIA': 'hr', 'CROATIA': 'hr',
  'SÉRVIA': 'rs', 'SERBIA': 'rs',
  'POLÔNIA': 'pl', 'POLAND': 'pl',
  'DINAMARCA': 'dk', 'DENMARK': 'dk',
  'SUÍÇA': 'ch', 'SWITZERLAND': 'ch',
  'ÁUSTRIA': 'at', 'AUSTRIA': 'at',
  'UCRÂNIA': 'ua', 'UKRAINE': 'ua',
  'HUNGRIA': 'hu', 'HUNGARY': 'hu',
  'REPÚBLICA TCHECA': 'cz', 'CZECH REPUBLIC': 'cz', 'CHÉQUIA': 'cz',
  'ESLOVÁQUIA': 'sk', 'SLOVAKIA': 'sk',
  'ALBÂNIA': 'al', 'ALBANIA': 'al',
  'ESLOVÊNIA': 'si', 'SLOVENIA': 'si',
  'TURQUIA': 'tr', 'TURKEY': 'tr',
  'ESCÓCIA': 'gb-sct', 'SCOTLAND': 'gb-sct',
  'PAÍS DE GALES': 'gb-wls', 'WALES': 'gb-wls',
  'ROMÊNIA': 'ro', 'ROMANIA': 'ro',
  'GEÓRGIA': 'ge', 'GEORGIA': 'ge',
  'GRÉCIA': 'gr', 'GREECE': 'gr',

  // África
  'MARROCOS': 'ma', 'MOROCCO': 'ma',
  'SENEGAL': 'sn',
  'GANA': 'gh', 'GHANA': 'gh',
  'CAMARÕES': 'cm', 'CAMEROON': 'cm',
  'TUNÍSIA': 'tn', 'TUNISIA': 'tn',
  'EGITO': 'eg', 'EGYPT': 'eg',
  'NIGÉRIA': 'ng', 'NIGERIA': 'ng',
  'MALI': 'ml',
  'CABO VERDE': 'cv',
  'COSTA DO MARFIM': 'ci',
  'ÁFRICA DO SUL': 'za', 'SOUTH AFRICA': 'za',
  'ANGOLA': 'ao',
  'ZÂMBIA': 'zm',

  // Ásia / Oceania
  'JAPÃO': 'jp', 'JAPAN': 'jp',
  'COREIA DO SUL': 'kr', 'SOUTH KOREA': 'kr',
  'COREIA DO NORTE': 'kp',
  'ARÁBIA SAUDITA': 'sa', 'SAUDI ARABIA': 'sa',
  'AUSTRÁLIA': 'au', 'AUSTRALIA': 'au',
  'IRÃ': 'ir', 'IRAN': 'ir', 'RI DO IRÃ': 'ir',
  'IRAQUE': 'iq', 'IRAQ': 'iq',
  'CATAR': 'qa', 'QATAR': 'qa',
  'CHINA': 'cn',
  'INDONÉSIA': 'id', 'INDONESIA': 'id',
  'NOVA ZELÂNDIA': 'nz', 'NEW ZEALAND': 'nz',
  'AFEGANISTÃO': 'af',
  'FILIPINAS': 'ph',
  'ÍNDIA': 'in', 'INDIA': 'in',
  'TAILÂNDIA': 'th', 'THAILAND': 'th',
  'VIETNÃ': 'vn', 'VIETNAM': 'vn',
}

export function getFlagUrl(time: string): string {
  const code = CODIGOS[time.toUpperCase().trim()]
  if (!code) return ''
  return `/${code}.png`
}

export function getFlagCode(time: string): string {
  return CODIGOS[time.toUpperCase().trim()] ?? ''
}
