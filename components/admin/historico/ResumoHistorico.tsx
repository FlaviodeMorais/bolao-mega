'use client'

import styles from '@/app/admin/admin.module.css'
import type { HistoricoResumoItem } from '@/hooks/admin/useHistoricoResumo'

interface Props {
  loadingHist: boolean
  showHistorico: boolean
  historico: HistoricoResumoItem[]
  onCarregar: () => void
}

/** Card "Resumo" do Histórico — tabela agregada (loteria + esporte) por concurso/bolão. */
export default function ResumoHistorico({ loadingHist, showHistorico, historico, onCarregar }: Props) {
  return (
    <>
      <button type="button" className={styles.btnLoad} onClick={onCarregar} style={{ marginBottom: 14 }}>
        Carregar histórico
      </button>

      {showHistorico && (
        historico.length === 0
          ? <div className={styles.empty}>Nenhum histórico encontrado</div>
          : <div className={styles.histTableWrap}><table className={styles.histTable}>
              <thead>
                <tr>
                  <th>Concurso</th><th>Bolão</th>
                  <th>Pagos</th><th>Pend.</th><th>Canc.</th><th>Arrecadado</th>
                </tr>
              </thead>
              {historico.map((h, i) => {
                const prev = i > 0 ? historico[i - 1].concurso : null
                const novo = h.concurso !== prev
                const rowKey = `${h.tipo}-${h.concurso}-${h.bolao_slug || 'main'}`
                return (
                  <tbody key={rowKey}>
                    {novo && i > 0 && <tr className={styles.histSep}><td colSpan={6} /></tr>}
                    <tr className={novo ? styles.histRowFirst : styles.histRowSub}>
                      <td>{novo ? (h.concurso ? `#${h.concurso}` : '—') : ''}</td>
                      <td>
                        <div className={styles.histBolaoNome}>
                          {h.bolao_nome}{' '}
                          <span className={`${styles.histTipoBadge} ${h.tipo === 'esporte' ? styles.histTipoEsporte : styles.histTipoLoteria}`}>
                            {h.tipo === 'esporte' ? 'Esporte' : 'Loteria'}
                          </span>
                        </div>
                        {h.bolao_slug && <div className={styles.histBolaoSlug}>/{h.bolao_slug}</div>}
                      </td>
                      <td className={styles.histPago}>{h.pagos}</td>
                      <td className={h.pendentes > 0 ? styles.histPend : ''}>{h.pendentes || '—'}</td>
                      <td className={h.cancelados > 0 ? styles.histCancel : ''}>{h.cancelados || '—'}</td>
                      <td className={styles.histValor}>R$ {h.arrecadado.toFixed(2).replace('.', ',')}</td>
                    </tr>
                  </tbody>
                )
              })}
            </table></div>
      )}
    </>
  )
}
