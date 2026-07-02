'use client'

import styles from '@/app/admin/admin.module.css'
import type { BolaoDetailPanelProps } from './types'

type Props = Pick<BolaoDetailPanelProps,
  | 'partsBolao' | 'concursoAtivo' | 'selecionados' | 'loadingParts'
  | 'enviandoComp' | 'formatTel' | 'whatsappUrl'
  | 'onSelecionarTodosPagos' | 'onImprimirSelecionados' | 'onLimparSelecao'
  | 'onToggleSelecionado' | 'onEnviarComprovante' | 'onConfirmarPagamento'
  | 'onConfirmarAcrescimo' | 'onExcluir'
>

/** Lista de participantes do bolão com seleção em lote e ações por participante. */
export default function ParticipantesList(p: Props) {
  return (
    <>
      <div className={styles.partSectionHeader}>
        <div className={styles.partSectionTitle}>
          👥 Participantes — {p.partsBolao.length} cadastrado{p.partsBolao.length !== 1 ? 's' : ''}
        </div>
        {p.partsBolao.some(pt => pt.status === 'pago') && (
          <button type="button" className={styles.btnSelAll}
            onClick={p.onSelecionarTodosPagos}
            title="Selecionar todos os participantes pagos">
            ☑ Selecionar pagos
          </button>
        )}
      </div>

      {p.selecionados.size > 0 && (
        <div className={styles.selecaoBar}>
          <span className={styles.selecaoCount}>
            {p.selecionados.size} selecionado{p.selecionados.size !== 1 ? 's' : ''}
          </span>
          <button type="button" className={styles.btnImprimirSel} onClick={p.onImprimirSelecionados}>
            🖨️ Imprimir / PDF
          </button>
          <button type="button" className={styles.btnLimparSel} onClick={p.onLimparSelecao}>
            ✕ Limpar seleção
          </button>
        </div>
      )}

      {p.loadingParts ? (
        <div className={styles.empty}>Carregando...</div>
      ) : p.partsBolao.length === 0 ? (
        <div className={styles.empty}>Nenhum participante neste bolão para o concurso #{p.concursoAtivo || '?'}</div>
      ) : p.partsBolao.map(pt => (
        <div key={pt.id} className={`${styles.partCard} ${pt.status === 'pago' ? styles.partCardPago : pt.status === 'cancelado' ? styles.partCardCancel : ''} ${p.selecionados.has(pt.id) ? styles.partCardSelecionado : ''}`}>
          {pt.status === 'pago' && (
            <input type="checkbox" className={styles.partCardCheck}
              checked={p.selecionados.has(pt.id)}
              onChange={() => p.onToggleSelecionado(pt.id)}
              title="Selecionar para imprimir" />
          )}
          <div className={styles.partCardLeft}>
            <div className={styles.partCardNome}>{pt.nome}</div>
            <div className={styles.partCardTel}>
              {pt.telefone ? (
                <a href={p.whatsappUrl(pt.telefone)} target="_blank" rel="noopener noreferrer"
                   title={`Abrir WhatsApp — ${p.formatTel(pt.telefone)}`}
                   className={styles.whatsappLink}>
                  📱 {p.formatTel(pt.telefone)}
                </a>
              ) : '—'}
            </div>
            <div className={styles.partCardInfo}>
              <span className={styles.partCardCotas}>
                🎟️ {Array.isArray(pt.cotas) ? pt.cotas.join(', ') : pt.cotas}
              </span>
              <span className={styles.partCardTotal}>R$ {Number(pt.total).toFixed(2).replace('.', ',')}</span>
            </div>
          </div>
          <div className={styles.partCardRight}>
            <div className={styles.partCardStatusCol}>
              {pt.status === 'pago' && (
                <button type="button" className={styles.btnImprimir}
                  onClick={() => window.open(`/comprovante?id=${pt.id}`, '_blank')}
                  title="Imprimir comprovante">🖨️</button>
              )}
              {pt.status === 'pago' && (
                <button type="button" className={styles.btnComprovante}
                  onClick={() => p.onEnviarComprovante(pt.id)}
                  disabled={p.enviandoComp === pt.id}
                  title={pt.email ? `Enviar comprovante por e-mail — ${pt.email}` : 'Participante sem e-mail cadastrado'}>
                  {p.enviandoComp === pt.id ? '⟳' : '📧'}
                </button>
              )}
              {pt.status === 'pago'
                ? <span className={styles.statusPago}>✅ Pago</span>
                : pt.status === 'cancelado'
                  ? <span className={styles.statusCancel}>✕ Excluído</span>
                  : <>
                      <span className={styles.statusPend}>⏳ Pendente</span>
                      <button type="button" className={styles.btnConfirm}
                        onClick={() => p.onConfirmarPagamento(pt.id)}>✔ Pago</button>
                    </>
              }
              {pt.acrescimo != null && (
                <div className={styles.acrescimoRow}>
                  <span className={styles.acrescimoLbl}>
                    +R$ {Number(pt.acrescimo).toFixed(2).replace('.', ',')} complemento
                  </span>
                  {pt.acrescimo_pago
                    ? <span className={styles.statusPago}>✅ Pago</span>
                    : <>
                        <span className={styles.statusPend}>⏳</span>
                        <button type="button" className={styles.btnConfirm}
                          onClick={() => p.onConfirmarAcrescimo(pt.id)}>✔ Confirmar</button>
                      </>
                  }
                </div>
              )}
            </div>
            {pt.status !== 'cancelado' && (
              <button type="button" className={styles.btnExcluir}
                onClick={() => p.onExcluir(pt.id, pt.nome)}>✕</button>
            )}
          </div>
        </div>
      ))}
    </>
  )
}
