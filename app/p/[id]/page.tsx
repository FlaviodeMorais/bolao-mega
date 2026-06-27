import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ShareButton } from './ShareButton'
import TrevoIcon from '@/components/TrevoIcon'

interface Props { params: { id: string } }

async function getParticipante(id: string) {
  const { data: p } = await supabase
    .from('participantes')
    .select('id, nome, cotas, total, concurso, status, bolao_slug')
    .eq('id', id)
    .single()
  if (!p) return null

  const { data: b } = await supabase
    .from('boloes')
    .select('nome, dezenas, num_apostas, apostas_data, loteria')
    .eq('slug', p.bolao_slug)
    .single()

  return { ...p, bolao: b }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const p = await getParticipante(params.id)
  if (!p) return { title: 'Comprovante — Bolão Mega' }
  return {
    title: `${p.nome} — Bolão Mega-Sena`,
    description: `${p.nome} participou do bolão com ${p.cotas?.length} cota${p.cotas?.length !== 1 ? 's' : ''} no concurso #${p.concurso}. 🍀`,
    openGraph: {
      title: `🍀 ${p.nome} está no Bolão Mega-Sena!`,
      description: `Concurso #${p.concurso} · ${p.cotas?.length} cota${p.cotas?.length !== 1 ? 's' : ''} · R$ ${Number(p.total).toFixed(2).replace('.', ',')}`,
      siteName: 'Bolão Mega',
    },
  }
}

export default async function ComprovantePage({ params }: Props) {
  const p = await getParticipante(params.id)
  if (!p) notFound()

  const pago = p.status === 'pago'
  const cotas: string[] = p.cotas || []
  const total = Number(p.total)

  // Dezenas das apostas (se existirem)
  const apostasData = p.bolao?.apostas_data as { bets?: number[][] } | null
  const apostas: number[][] = apostasData?.bets || []

  return (
    <div className="page-wrap" style={{ minHeight: '100vh' }}>
      <div className="site-header">
        <a href="/" className="header-link"><span className="material-icons-round">home</span></a>
        <div className="header-brand"><span className="brand">MEGA-SENA</span></div>
        <div style={{ width: 40 }} />
      </div>

      <div className="comprov-share-card">
        {/* Status */}
        <div className={`comprov-status ${pago ? 'pago' : 'aguardando'}`}>
          {pago ? '✅ Pagamento Confirmado' : '⏳ Aguardando Pagamento'}
        </div>

        {/* Cabeçalho */}
        <div className="comprov-share-header">
          <div className="comprov-share-clover"><TrevoIcon size={40} loteria={p.bolao?.loteria ?? 'mega'} /></div>
          <div className="comprov-share-nome">{p.nome}</div>
          <div className="comprov-share-sub">Concurso #{p.concurso} · {p.bolao?.nome}</div>
        </div>

        {/* Cotas */}
        <div className="comprov-share-section">
          <div className="comprov-share-label">Cotas adquiridas</div>
          <div className="comprov-share-cotas">
            {cotas.map(c => <span key={c} className="comprov-share-cota">{c}</span>)}
          </div>
        </div>

        {/* Total */}
        <div className="comprov-share-total">
          <span className="comprov-share-total-label">Total pago</span>
          <span className="comprov-share-total-val">R$ {total.toFixed(2).replace('.', ',')}</span>
        </div>

        {/* Apostas */}
        {apostas.length > 0 && (
          <div className="comprov-share-section">
            <div className="comprov-share-label">Dezenas das apostas</div>
            {apostas.map((aposta, i) => (
              <div key={i} className="comprov-share-aposta">
                <span className="comprov-share-aposta-num">{i + 1}</span>
                <div className="comprov-share-aposta-balls">
                  {aposta.map(n => <span key={n} className="result-ball" style={{ width: 28, height: 28, fontSize: 11 }}>{String(n).padStart(2, '0')}</span>)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Compartilhar */}
        <ShareButton nome={p.nome} concurso={String(p.concurso)} cotas={cotas.length} id={params.id} />

        <div className="comprov-share-footer">
          Boa sorte! 🍀 — <a href={`/${p.bolao_slug}`} style={{ color: 'var(--green)' }}>Ver bolão</a>
        </div>
      </div>
    </div>
  )
}

