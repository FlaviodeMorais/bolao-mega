import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ShareButton } from './ShareButton'
import { getAppSettings } from '@/lib/settings'

interface Props { params: { id: string } }

// ── Loteria ────────────────────────────────────────────────────────────────────
async function getParticipanteLoteria(id: string) {
  const { data: p } = await supabase
    .from('participantes')
    .select('id, nome, cotas, total, concurso, status, bolao_slug')
    .eq('id', id)
    .single()
  if (!p) return null

  const { data: b } = await supabase
    .from('boloes')
    .select('nome, dezenas, num_apostas, apostas_data, loteria, resultado_conferencia')
    .eq('slug', p.bolao_slug)
    .single()

  return { tipo: 'loteria' as const, ...p, bolao: b }
}

// ── Esporte ────────────────────────────────────────────────────────────────────
async function getParticipanteEsporte(id: string) {
  const { data: p } = await supabase
    .from('participantes_esporte')
    .select('id, nome, total, status, bolao_slug')
    .eq('id', id)
    .single()
  if (!p) return null

  const [{ data: b }, { data: palp }] = await Promise.all([
    supabase.from('boloes_esporte').select('nome, logo_url, cor_primaria').eq('slug', p.bolao_slug).single(),
    supabase.from('palpites')
      .select('gol_casa, gol_fora, pontos, jogos(time_casa, time_fora, data_jogo, fase, encerrado, gol_casa, gol_fora)')
      .eq('participante_id', id),
  ])

  return { tipo: 'esporte' as const, ...p, bolao: b, palpites: palp || [] }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const app = await getAppSettings()
  const p = await getParticipanteLoteria(params.id) || await getParticipanteEsporte(params.id)
  if (!p) return { title: `Comprovante — ${app.nome}` }
  const bolaoNome = p.bolao?.nome || 'Bolão'
  return {
    title: `${p.nome} — ${bolaoNome}`,
    description: p.tipo === 'loteria'
      ? `${p.nome} participou do bolão com ${(p as { cotas: string[] }).cotas?.length} cota(s) no concurso #${(p as { concurso: number }).concurso}. 🍀`
      : `${p.nome} participou do ${bolaoNome}. ⚽`,
    openGraph: {
      title: p.tipo === 'loteria' ? `🍀 ${p.nome} está no ${bolaoNome}!` : `⚽ ${p.nome} está no ${bolaoNome}!`,
      description: `R$ ${Number(p.total).toFixed(2).replace('.', ',')}`,
      siteName: app.nome,
      images: ['/opengraph-image'],
    },
  }
}

export default async function ComprovantePage({ params }: Props) {
  const loteria = await getParticipanteLoteria(params.id)
  const esporte = !loteria ? await getParticipanteEsporte(params.id) : null
  const p = loteria || esporte
  if (!p) notFound()

  const pago  = p.status === 'pago'
  const total = Number(p.total)

  // ── Esportivo ──────────────────────────────────────────────────────────────
  if (p.tipo === 'esporte') {
    const cor = p.bolao?.cor_primaria || '#2563EB'
    return (
      <div className="page-wrap" style={{ minHeight: '100vh' }}>
        <div className="site-header">
          <a href="/" className="header-link"><span className="material-icons-round">home</span></a>
          <div className="header-brand"><span className="brand">BOLÃO ESPORTIVO</span></div>
          <div style={{ width: 40 }} />
        </div>

        <div className="comprov-share-card">
          <div className={`comprov-status ${pago ? 'pago' : 'aguardando'}`}>
            {pago ? '✅ Pagamento Confirmado' : '⏳ Aguardando Pagamento'}
          </div>

          <div className="comprov-share-header">
            {p.bolao?.logo_url
              ? <img src={p.bolao.logo_url} alt={p.bolao.nome} width={52} height={52} style={{ borderRadius: '50%', marginBottom: 8, objectFit: 'contain' }} />
              : <div style={{ fontSize: 36, marginBottom: 8 }}>⚽</div>
            }
            <div className="comprov-share-nome">{p.nome}</div>
            <div className="comprov-share-sub">{p.bolao?.nome}</div>
          </div>

          <div className="comprov-share-total">
            <span className="comprov-share-total-label">Total pago</span>
            <span className="comprov-share-total-val">R$ {total.toFixed(2).replace('.', ',')}</span>
          </div>

          {p.palpites.length > 0 && (
            <div className="comprov-share-section">
              <div className="comprov-share-label">⚽ Seus palpites</div>
              {p.palpites.map((palp, i) => {
                const jogo = palp.jogos as { time_casa: string; time_fora: string; data_jogo: string | null; fase: string; encerrado: boolean; gol_casa: number | null; gol_fora: number | null } | null
                const acertou = jogo?.encerrado && jogo?.gol_casa === palp.gol_casa && jogo?.gol_fora === palp.gol_fora
                return (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '10px 14px', margin: '4px 0', borderRadius: 10,
                    background: acertou ? '#F0FDF4' : '#F8FAFB',
                    border: `1px solid ${acertou ? '#BBF7D0' : '#E2E8F0'}`,
                    fontSize: 14,
                  }}>
                    <span style={{ fontWeight: 600, color: '#0D1B2A' }}>{jogo?.time_casa || '?'}</span>
                    <span style={{ fontWeight: 700, color: cor, fontSize: 16, margin: '0 12px' }}>
                      {palp.gol_casa} × {palp.gol_fora}
                    </span>
                    <span style={{ fontWeight: 600, color: '#0D1B2A' }}>{jogo?.time_fora || '?'}</span>
                    {palp.pontos != null && palp.pontos > 0 && (
                      <span style={{ marginLeft: 8, fontSize: 12, color: '#00AB67', fontWeight: 700 }}>+{palp.pontos}pts</span>
                    )}
                  </div>
                )
              })}
            </div>
          )}

          <ShareButton nome={p.nome} concurso="" cotas={0} id={params.id} bolaoNome={p.bolao?.nome || 'Bolão'} />

          <div className="comprov-share-footer">
            Boa sorte! — <a href={`/esporte/${p.bolao_slug}`} style={{ color: cor }}>Ver bolão</a>
          </div>
        </div>
      </div>
    )
  }

  // ── Loteria ────────────────────────────────────────────────────────────────
  const cotas: string[] = (p as { cotas: string[] }).cotas || []
  const concurso = (p as { concurso: number }).concurso
  const apostasData = p.bolao?.apostas_data as { bets?: number[][] } | null
  const todasApostas: number[][] = apostasData?.bets || []
  const cotasIdx: number[] = cotas.map(Number)
  const apostas: number[][] = cotasIdx.length > 0
    ? cotasIdx.map(c => todasApostas[c - 1]).filter(Boolean)
    : todasApostas

  const rc = p.bolao?.resultado_conferencia as { dezenas_sorteadas?: number[] } | null
  const dezenasAcerto = new Set<number>(rc?.dezenas_sorteadas ?? [])

  return (
    <div className="page-wrap" style={{ minHeight: '100vh' }}>
      <div className="site-header">
        <a href="/" className="header-link"><span className="material-icons-round">home</span></a>
        <div className="header-brand"><span className="brand">MEGA-SENA</span></div>
        <div style={{ width: 40 }} />
      </div>

      <div className="comprov-share-card">
        <div className={`comprov-status ${pago ? 'pago' : 'aguardando'}`}>
          {pago ? '✅ Pagamento Confirmado' : '⏳ Aguardando Pagamento'}
        </div>

        <div className="comprov-share-header">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/bm-circle.png" alt="BetMais" width={52} height={52} style={{ borderRadius: '50%', marginBottom: 8 }} />
          <div className="comprov-share-nome">{p.nome}</div>
          <div className="comprov-share-sub">Concurso #{concurso} · {p.bolao?.nome}</div>
        </div>

        <div className="comprov-share-section">
          <div className="comprov-share-label">Cotas adquiridas</div>
          <div className="comprov-share-cotas">
            {cotas.map(c => <span key={c} className="comprov-share-cota">{c}</span>)}
          </div>
        </div>

        <div className="comprov-share-total">
          <span className="comprov-share-total-label">Total pago</span>
          <span className="comprov-share-total-val">R$ {total.toFixed(2).replace('.', ',')}</span>
        </div>

        {apostas.length > 0 && (
          <div className="comprov-share-section">
            <div className="comprov-share-label">Dezenas das apostas</div>
            {apostas.map((aposta, i) => (
              <div key={i} className="comprov-share-aposta">
                <span className="comprov-share-aposta-num">{cotasIdx[i] ?? i + 1}</span>
                <div className="comprov-share-aposta-balls">
                  {aposta.map(n => (
                    <span
                      key={n}
                      className={dezenasAcerto.size > 0 && dezenasAcerto.has(n) ? 'result-ball result-ball--acerto' : 'result-ball'}
                      style={{ width: 28, height: 28, fontSize: 11 }}
                    >
                      {String(n).padStart(2, '0')}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <ShareButton nome={p.nome} concurso={String(concurso)} cotas={cotas.length} id={params.id} bolaoNome={p.bolao?.nome || 'Bolão'} />

        <div className="comprov-share-footer">
          Boa sorte! — <a href={`/${p.bolao_slug}`} style={{ color: 'var(--green)' }}>Ver bolão</a>
        </div>
      </div>
    </div>
  )
}
