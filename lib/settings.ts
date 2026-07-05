/**
 * settings.ts — Sistema de configurações white-label
 *
 * Lê da tabela `settings` no Supabase com cache em memória (5 min).
 * Cada namespace é um registro com dados jsonb.
 * Fallback para env vars / valores padrão quando não configurado.
 */

import { supabase } from './supabase'

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface AppSettings {
  nome:        string   // "Bolão Mega"
  tagline:     string   // "Boa sorte a todos! 🍀"
  url:         string   // "https://meudominio.com.br"
  logo_url:    string   // "/logo.png"
  cor_primaria: string  // "#00A651"
  cor_fundo:   string   // "#0D1B2A"
  rodape:      string   // "Dúvidas? Fale com o administrador."
  grupo_nome:  string   // "Bolões BetMais"
  descricao:   string   // "Bolão da Mega-Sena — Grupo Fechado"
  carrossel_intervalo_seg: number  // segundos entre cada slide dos carrosséis da home
}

export interface PagamentoSettings {
  mp_access_token: string
  mp_ativo:        boolean
  pix_chave:       string
  pix_nome:        string
  pix_cidade:      string
  pix_ativo:       boolean
  pix_email_payer: string  // email usado no payer do MP
}

export interface WhatsappSettings {
  token:         string
  group_id:      string
  ativo:         boolean
  prazo_horario: string  // "12:00"
}

export interface EmailSettings {
  provider:    'gmail' | 'resend'
  gmail_user:  string
  gmail_pass:  string
  resend_key:  string
  from_name:   string
  admin_email: string
  ativo:       boolean
}

export interface PaginaHomeSettings {
  titulo:        string
  rodape:        string
  msg_sem_bolao: string
}

export interface PaginaBolaoSettings {
  regras: string[]
}

export interface PremiacaoItem {
  lugar:     number
  emoji:     string
  label:     string
  categoria: string
  pts:       number
  pct:       number
}

export interface PaginaEsporteSettings {
  header_titulo:           string
  logo_url_default:        string
  cor_primaria_default:    string
  label_cta_default:       string
  label_palpites_default:  string
  label_jogo_hoje_default: string
  label_noticias_default:  string
  premiacao:               PremiacaoItem[]
  football_data_key:       string
}

// Tokens pessoais de CLI (Supabase, Vercel, GitHub) — guardados só como
// referência operacional do admin; a aplicação não os lê em runtime.
export interface CliSettings {
  supabase_token:       string
  supabase_project_ref: string
  vercel_token:         string
  github_token:         string
}

export interface AllSettings {
  app:              AppSettings
  pagamento:        PagamentoSettings
  whatsapp:         WhatsappSettings
  email:            EmailSettings
  'paginas.home':   PaginaHomeSettings
  'paginas.bolao':  Record<string, PaginaBolaoSettings>
  'paginas.esporte': PaginaEsporteSettings
  cli:              CliSettings
}

// ─── Defaults (valores quando settings não configurado) ───────────────────────

export const DEFAULTS: AllSettings = {
  app: {
    nome:         'Bet Mais',
    tagline:      'Boa sorte a todos! 🍀',
    url:          process.env.NEXT_PUBLIC_APP_URL || 'https://bolao-mega-zeta.vercel.app',
    logo_url:     '/logo.png',
    cor_primaria: '#00A651',
    cor_fundo:    '#0D1B2A',
    rodape:       'Dúvidas? Fale com o administrador do grupo.',
    grupo_nome:   'Bolões BetMais',
    descricao:    'Bolão da Mega-Sena — Grupo Fechado',
    carrossel_intervalo_seg: 5,
  },
  pagamento: {
    mp_access_token: process.env.MP_ACCESS_TOKEN || '',
    mp_ativo:        true,
    pix_chave:       process.env.PIX_KEY          || '',
    pix_nome:        process.env.PIX_NOME         || 'ADMIN',
    pix_cidade:      process.env.PIX_CIDADE       || 'SAO PAULO',
    pix_ativo:       true,
    pix_email_payer: process.env.PIX_EMAIL_PAYER  || 'pagador@bolao.com',
  },
  whatsapp: {
    token:         process.env.WHAPI_TOKEN    || '',
    group_id:      process.env.WHAPI_GROUP_ID || '',
    ativo:         false,
    prazo_horario: '12:00',
  },
  email: {
    provider:    'gmail',
    gmail_user:  process.env.EMAIL_GMAIL_USER || '',
    gmail_pass:  process.env.EMAIL_GMAIL_PASS || '',
    resend_key:  process.env.RESEND_API_KEY   || '',
    from_name:   process.env.EMAIL_FROM_NAME  || 'Bet Mais',
    admin_email: process.env.EMAIL_ADMIN      || '',
    ativo:       true,
  },
  'paginas.home': {
    titulo:        '🎰 Escolha seu Bolão',
    rodape:        'Boa sorte a todos! 🍀',
    msg_sem_bolao: 'Nenhum bolão disponível no momento',
  },
  'paginas.bolao': {
    mega: {
      regras: [
        'Bolão particular — não é uma promoção oficial da Caixa Econômica Federal.',
        'A participação é voluntária e por conta e risco do participante.',
        'O prazo para inscrição é até às 12h do dia do sorteio.',
        'O pagamento deve ser realizado via PIX até o prazo estabelecido.',
        'Cotas não pagas até o prazo serão canceladas.',
        'A premiação será distribuída proporcionalmente às cotas pagas.',
        'O pagamento dos prêmios ocorrerá em até 90 dias após o sorteio.',
        'Não haverá reembolso após a confirmação do pagamento.',
      ],
    },
    quina: {
      regras: [
        'Bolão particular — não é uma promoção oficial da Caixa Econômica Federal.',
        'A participação é voluntária e por conta e risco do participante.',
        'O prazo para inscrição é até às 12h do dia do sorteio.',
        'O pagamento deve ser realizado via PIX até o prazo estabelecido.',
        'Cotas não pagas até o prazo serão canceladas.',
        'A premiação será distribuída proporcionalmente às cotas pagas.',
      ],
    },
    lotofacil: {
      regras: [
        'Bolão particular — não é uma promoção oficial da Caixa Econômica Federal.',
        'A participação é voluntária e por conta e risco do participante.',
        'O prazo para inscrição é até às 12h do dia do sorteio.',
        'O pagamento deve ser realizado via PIX até o prazo estabelecido.',
        'Cotas não pagas até o prazo serão canceladas.',
        'A premiação será distribuída proporcionalmente às cotas pagas.',
      ],
    },
  },
  'paginas.esporte': {
    header_titulo:           'FIFA World Cup 2026',
    logo_url_default:        '',
    cor_primaria_default:    '#FFB81C',
    label_cta_default:       '⚽ Quero Participar',
    label_palpites_default:  '⚽ Seus palpites',
    label_jogo_hoje_default: '🔥 Jogo de hoje!',
    label_noticias_default:  '📺 Notícias',
    premiacao: [
      { lugar: 1, emoji: '🏆', label: '1º lugar', categoria: 'Acertou o Placar e o Vencedor', pts: 5, pct: 40 },
      { lugar: 2, emoji: '🥈', label: '2º lugar', categoria: 'Acertou o Vencedor',            pts: 3, pct: 30 },
      { lugar: 3, emoji: '🥉', label: '3º lugar', categoria: 'Acertou o Placar',              pts: 2, pct: 20 },
    ],
    football_data_key: process.env.FOOTBALL_DATA_KEY || '',
  },
  cli: {
    supabase_token:       '',
    supabase_project_ref: '',
    vercel_token:         '',
    github_token:         '',
  },
}

// ─── Cache em memória (5 minutos) ─────────────────────────────────────────────

const cache: Map<string, { data: unknown; at: number }> = new Map()
const TTL = 5 * 60 * 1000

async function fetchNamespace<T>(namespace: string, fallback: T): Promise<T> {
  const hit = cache.get(namespace)
  if (hit && Date.now() - hit.at < TTL) return hit.data as T

  const { data } = await supabase
    .from('settings')
    .select('dados')
    .eq('namespace', namespace)
    .single()

  const result: T = data?.dados ? { ...fallback, ...(data.dados as Partial<T>) } : fallback
  cache.set(namespace, { data: result, at: Date.now() })
  return result
}

// ─── API pública ──────────────────────────────────────────────────────────────

export async function getAppSettings():      Promise<AppSettings>          { return fetchNamespace('app',              DEFAULTS.app) }
export async function getPagamentoSettings(): Promise<PagamentoSettings>   { return fetchNamespace('pagamento',        DEFAULTS.pagamento) }
export async function getWhatsappSettings():  Promise<WhatsappSettings>    { return fetchNamespace('whatsapp',         DEFAULTS.whatsapp) }
export async function getEmailSettings():     Promise<EmailSettings>       { return fetchNamespace('email',            DEFAULTS.email) }
export async function getHomeSettings():      Promise<PaginaHomeSettings>  { return fetchNamespace('paginas.home',     DEFAULTS['paginas.home']) }
export async function getBolaoSettings():     Promise<Record<string, PaginaBolaoSettings>> { return fetchNamespace('paginas.bolao', DEFAULTS['paginas.bolao']) }
export async function getEsporteSettings():   Promise<PaginaEsporteSettings> { return fetchNamespace('paginas.esporte', DEFAULTS['paginas.esporte']) }
export async function getCliSettings():       Promise<CliSettings>          { return fetchNamespace('cli',              DEFAULTS.cli) }

/** Invalida o cache de um namespace (chamar após salvar via admin) */
export function invalidarCache(namespace?: string) {
  if (namespace) cache.delete(namespace)
  else cache.clear()
}

/** Salva um namespace no banco e invalida o cache */
export async function salvarSettings(namespace: string, dados: unknown): Promise<{ ok: boolean; error?: string }> {
  const { error } = await supabase
    .from('settings')
    .upsert({ namespace, dados, updated_at: new Date().toISOString() })
  if (error) return { ok: false, error: error.message }
  invalidarCache(namespace)
  return { ok: true }
}

/** Retorna todas as configurações de uma vez (para o painel admin) */
export async function getAllSettings(): Promise<AllSettings> {
  const [app, pagamento, whatsapp, email, home, bolao, esporte, cli] = await Promise.all([
    getAppSettings(),
    getPagamentoSettings(),
    getWhatsappSettings(),
    getEmailSettings(),
    getHomeSettings(),
    getBolaoSettings(),
    getEsporteSettings(),
    getCliSettings(),
  ])
  return { app, pagamento, whatsapp, email, 'paginas.home': home, 'paginas.bolao': bolao, 'paginas.esporte': esporte, cli }
}
