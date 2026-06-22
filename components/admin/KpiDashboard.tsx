'use client'

import styles from '@/app/admin/admin.module.css'

interface KpiGeral {
  totalArrecadado: number; totalConcursos: number
  totalParticipantes: number; totalCotas: number
  ticketMedio: number; taxaConversao: number
  totalPagos: number; totalPendentes: number; taxaRetencao: number
}
interface KpiConcurso { concurso: number; arrecadado: number; pagos: number; total: number }
interface KpiParticipante { nome: string; telefone?: string; concursos: number; totalCotas: number; totalGasto: number }
interface KpiCota { cota: string; count: number }

interface KpiDashboardProps {
  showKpi: boolean
  loadingKpi: boolean
  kpiGeral: KpiGeral | null
  kpiConcursos: KpiConcurso[]
  kpiFreq: KpiParticipante[]
  kpiGasto: KpiParticipante[]
  kpiCotas: KpiCota[]
  kpiAba: 'freq' | 'gasto' | 'cotas'
  onCarregar: () => void
  onAbaChange: (aba: 'freq' | 'gasto' | 'cotas') => void
  whatsappUrl: (tel?: string) => string
}

/**
 * Painel de KPIs e Insights do admin Mega-Sena.
 * Renderiza gráficos de barras, cards e ranking. Sem chamadas de API diretas.
 * Acionado via onCarregar; dados chegam por props do admin/page.tsx.
 */
export default function KpiDashboard({
  showKpi, loadingKpi, kpiGeral, kpiConcursos,
  kpiFreq, kpiGasto, kpiCotas, kpiAba,
  onCarregar, onAbaChange, whatsappUrl,
}: KpiDashboardProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.histHeader}>
        <div>
          <div className={styles.panelTitle}>📊 Insights & KPIs</div>
          <div className={styles.histSubtitle}>Análise de desempenho dos bolões</div>
        </div>
        <button type="button" className={styles.btnAcao} onClick={onCarregar} disabled={loadingKpi}>
          {loadingKpi ? 'Carregando…' : showKpi ? '↻ Atualizar' : 'Ver Insights'}
        </button>
      </div>

      {showKpi && kpiGeral && (
        <div className={styles.kpiWrap}>

          {/* Cards de visão geral */}
          <div className={styles.kpiCards}>
            <div className={styles.kpiCard}>
              <div className={styles.kpiCardLabel}>Total arrecadado</div>
              <div className={styles.kpiCardVal}>R$ {kpiGeral.totalArrecadado.toFixed(2).replace('.', ',')}</div>
              <div className={styles.kpiCardSub}>{kpiGeral.totalConcursos} concursos</div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiCardLabel}>Participantes únicos</div>
              <div className={styles.kpiCardVal}>{kpiGeral.totalParticipantes}</div>
              <div className={styles.kpiCardSub}>{kpiGeral.totalCotas} cotas no total</div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiCardLabel}>Ticket médio</div>
              <div className={styles.kpiCardVal}>R$ {kpiGeral.ticketMedio.toFixed(2).replace('.', ',')}</div>
              <div className={styles.kpiCardSub}>por participação paga</div>
            </div>
            <div className={`${styles.kpiCard} ${kpiGeral.taxaConversao >= 70 ? styles.kpiCardGreen : kpiGeral.taxaConversao >= 40 ? styles.kpiCardYellow : styles.kpiCardRed}`}>
              <div className={styles.kpiCardLabel}>Taxa de pagamento</div>
              <div className={styles.kpiCardVal}>{kpiGeral.taxaConversao.toFixed(0)}%</div>
              <div className={styles.kpiCardSub}>{kpiGeral.totalPagos} pagos · {kpiGeral.totalPendentes} pendentes</div>
            </div>
            <div className={styles.kpiCard}>
              <div className={styles.kpiCardLabel}>Retenção</div>
              <div className={styles.kpiCardVal}>{kpiGeral.taxaRetencao.toFixed(0)}%</div>
              <div className={styles.kpiCardSub}>voltam no próximo concurso</div>
            </div>
          </div>

          {/* Arrecadação por concurso */}
          {kpiConcursos.length > 0 && (
            <div className={styles.kpiSection}>
              <div className={styles.kpiSectionTitle}>Arrecadação por concurso</div>
              <div className={styles.kpiBarChart}>
                {(() => {
                  const max = Math.max(...kpiConcursos.map(c => c.arrecadado), 1)
                  return kpiConcursos.map(c => (
                    <div key={c.concurso} className={styles.kpiBarRow}>
                      <div className={styles.kpiBarLabel}>#{c.concurso}</div>
                      <div className={styles.kpiBarTrack}>
                        <div className={styles.kpiBarFill} style={{ width: `${(c.arrecadado / max) * 100}%` }} />
                      </div>
                      <div className={styles.kpiBarVal}>R$ {c.arrecadado.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}</div>
                      <div className={styles.kpiBarSub}>{c.pagos}/{c.total}</div>
                    </div>
                  ))
                })()}
              </div>
            </div>
          )}

          {/* Tabs: Top participantes / Cotas */}
          <div className={styles.kpiSection}>
            <div className={styles.histSegmentado} style={{ marginBottom: 16 }}>
              <button type="button" className={kpiAba === 'freq' ? styles.histSegAtivo : styles.histSegBtn} onClick={() => onAbaChange('freq')}>Mais fiéis</button>
              <button type="button" className={kpiAba === 'gasto' ? styles.histSegAtivo : styles.histSegBtn} onClick={() => onAbaChange('gasto')}>Maior gasto</button>
              <button type="button" className={kpiAba === 'cotas' ? styles.histSegAtivo : styles.histSegBtn} onClick={() => onAbaChange('cotas')}>Cotas populares</button>
            </div>

            {kpiAba !== 'cotas' && (
              <div className={styles.kpiRanking}>
                {(kpiAba === 'freq' ? kpiFreq : kpiGasto).map((p, i) => (
                  <div key={p.telefone || p.nome} className={styles.kpiRankRow}>
                    <div className={`${styles.kpiRankPos} ${i === 0 ? styles.kpiRankGold : i === 1 ? styles.kpiRankSilver : i === 2 ? styles.kpiRankBronze : ''}`}>{i + 1}</div>
                    <div className={styles.kpiRankInfo}>
                      <div className={styles.kpiRankNome}>{p.nome}</div>
                      <div className={styles.kpiRankMeta}>
                        {p.telefone && <a href={whatsappUrl(p.telefone)} target="_blank" rel="noopener noreferrer" className={styles.crmTelBtn}>📱</a>}
                        <span>{p.concursos} concurso{p.concursos !== 1 ? 's' : ''}</span>
                        <span>·</span>
                        <span>{p.totalCotas} cota{p.totalCotas !== 1 ? 's' : ''}</span>
                      </div>
                    </div>
                    <div className={styles.kpiRankVal}>R$ {p.totalGasto.toFixed(2).replace('.', ',')}</div>
                  </div>
                ))}
              </div>
            )}

            {kpiAba === 'cotas' && (
              <div className={styles.kpiBarChart}>
                {(() => {
                  const max = Math.max(...kpiCotas.map(c => c.count), 1)
                  return kpiCotas.map(c => (
                    <div key={c.cota} className={styles.kpiBarRow}>
                      <div className={styles.kpiBarLabel}>Nº {c.cota}</div>
                      <div className={styles.kpiBarTrack}>
                        <div className={styles.kpiBarFill} style={{ width: `${(c.count / max) * 100}%` }} />
                      </div>
                      <div className={styles.kpiBarVal}>{c.count}×</div>
                    </div>
                  ))
                })()}
              </div>
            )}
          </div>

        </div>
      )}
    </div>
  )
}
