'use client'

import styles from '@/app/admin/admin.module.css'
import type { BolaoDetailPanelProps } from './types'

type Props = Pick<BolaoDetailPanelProps,
  | 'bolao' | 'cotasLivres' | 'pagosLista'
  | 'lembreteMsg' | 'compMsg'
  | 'showEncerrar' | 'encerrando' | 'encerrarOk'
  | 'onToggleEncerrar' | 'onEncerrarBolao' | 'onArquivarBolao'
>

/** Botão e painel de encerramento do bolão com rateio das cotas restantes. */
export default function Encerramento(p: Props) {
  const { bolao } = p

  return (
    <>
      {!bolao.encerrado && p.cotasLivres > 0 && p.pagosLista.length > 0 && (
        <button type="button" className={styles.btnEncerrar}
          onClick={p.onToggleEncerrar}>
          ⛔ Encerrar Bolão
        </button>
      )}
      {p.lembreteMsg && <div className={styles.lembreteMsg}>{p.lembreteMsg}</div>}
      {p.compMsg && <div className={styles.lembreteMsg}>{p.compMsg}</div>}

      {bolao.encerrado && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <div className={styles.encerradoBanner} style={{ flex: 1 }}>
            ⛔ Bolão encerrado — complemento de pagamento enviado por e-mail
          </div>
          <button
            type="button"
            onClick={() => {
              if (confirm('Arquivar este bolão? Ele sairá da lista do admin, mas todos os dados e KPIs são mantidos.')) {
                p.onArquivarBolao()
              }
            }}
            style={{ whiteSpace: 'nowrap', fontSize: 12, padding: '6px 14px', borderRadius: 8, border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', color: '#475569', fontWeight: 600 }}
          >
            🗄 Arquivar bolão
          </button>
        </div>
      )}
      {p.encerrarOk && (
        <div className={styles.encerrarSucesso}>
          ✅ Encerrado com sucesso!&nbsp;
          Acréscimo de <strong>R$ {p.encerrarOk.acrescimo.toFixed(2).replace('.', ',')}</strong> por cota&nbsp;
          enviado para {p.encerrarOk.participantes} participante(s) por e-mail.
        </div>
      )}
      {p.showEncerrar && !bolao.encerrado && (
        <div className={styles.encerrarPanel}>
          <div className={styles.encerrarTitle}>⚠️ Encerrar Bolão com Rateio</div>
          <div className={styles.encerrarCalc}>
            <div className={styles.encerrarRow}>
              <span>Cotas não vendidas</span>
              <span>{p.cotasLivres} de {bolao.total_cotas || 20}</span>
            </div>
            <div className={styles.encerrarRow}>
              <span>Valor das cotas restantes</span>
              <span>R$ {(p.cotasLivres * Number(bolao.valor_cota)).toFixed(2).replace('.', ',')}</span>
            </div>
            <div className={styles.encerrarRow}>
              <span>Participantes pagos</span>
              <span>{p.pagosLista.length}</span>
            </div>
            <div className={`${styles.encerrarRow} ${styles.encerrarDestaque}`}>
              <span>Acréscimo por participante</span>
              <span>R$ {p.pagosLista.length > 0
                ? ((p.cotasLivres * Number(bolao.valor_cota)) / p.pagosLista.length).toFixed(2).replace('.', ',')
                : '0,00'}
              </span>
            </div>
          </div>
          <div className={styles.encerrarInfo}>
            ✅ Cada participante receberá um PIX com o complemento por e-mail.<br />
            ✅ O bolão será marcado como encerrado.<br />
            ⛔ Novos cadastros serão bloqueados.
          </div>
          <div className={styles.encerrarActions}>
            <button type="button" className={styles.btnEncerrarConfirm}
              onClick={p.onEncerrarBolao} disabled={p.encerrando}>
              {p.encerrando ? '⟳ Processando...' : '⛔ Confirmar Encerramento'}
            </button>
            <button type="button" className={styles.btnLoad}
              onClick={p.onToggleEncerrar}>Cancelar</button>
          </div>
        </div>
      )}
    </>
  )
}
