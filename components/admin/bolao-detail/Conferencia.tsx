'use client'

import styles from '@/app/admin/admin.module.css'
import type { BolaoDetailPanelProps } from './types'

type Props = Pick<BolaoDetailPanelProps,
  | 'bolao' | 'concursoAtivo' | 'pagosLista'
  | 'showConferir' | 'conferirResult' | 'conferirMsg' | 'conferindoRes' | 'conferindoManual' | 'dezenasInput'
  | 'onConferirSorteio' | 'onResetarConferencia' | 'onConferirManual' | 'onDezenasInputChange'
  | 'onEnviarAcertos' | 'enviarAcertosMsg'
  | 'onEnviarAcertosEmail' | 'enviarAcertosEmailMsg'
  | 'acertosDestinatario' | 'onAcertosDestinatarioChange'
>

/** Conferência do sorteio (busca automática Caixa + entrada manual) e botão de envio de acertos. */
export default function Conferencia(p: Props) {
  const { bolao } = p

  return (
    <>
      {p.showConferir && (
        <div className={styles.resultadoPanel}>
          <div className={styles.resultadoTitle}>🔍 Conferir Resultado — Concurso #{p.concursoAtivo}</div>
          {bolao.apostas_data ? (
            <p className={styles.resultadoInfo}>
              ✅ {bolao.apostas_data.total_apostas} apostas carregadas · O resultado será buscado automaticamente na Caixa.
            </p>
          ) : (
            <p className={styles.resultadoInfo}>
              ⚠️ Nenhuma aposta carregada. Use &quot;📊 Carregar Apostas&quot; primeiro.
            </p>
          )}
          <div className={styles.resultadoBtns}>
            {(!p.conferirResult || p.conferirResult.status === 'nao_apurado') && (
              <button type="button" className={styles.btnGanhou}
                onClick={p.onConferirSorteio}
                disabled={p.conferindoRes || !bolao.apostas_data}>
                {p.conferindoRes ? '⟳ Buscando na Caixa...' : '🔍 Buscar e Conferir'}
              </button>
            )}
            {p.conferirResult && p.conferirResult.status !== 'nao_apurado' && (
              <button type="button" className={styles.btnNaoGanhou} onClick={p.onResetarConferencia}>
                ↺ Resetar resultado
              </button>
            )}
          </div>
          {p.conferirResult?.dezenas_sorteadas && (
            <div className={styles.conferirDezenas}>
              <span className={styles.conferirResumoTitle}>Dezenas sorteadas:</span>
              <div className={styles.conferirDezGrid}>
                {p.conferirResult.dezenas_sorteadas.map((n: number) => (
                  <span key={n} className={styles.conferirDezBall}>{String(n).padStart(2, '0')}</span>
                ))}
              </div>
            </div>
          )}
          {p.conferirMsg && (
            <div className={p.conferirResult?.status === 'ganhamos' ? styles.resultadoMsgBox : styles.resultadoInfo}>
              {p.conferirMsg}
            </div>
          )}
          {(!p.conferirResult || p.conferirResult.status === 'nao_apurado') && bolao.apostas_data && (
            <div className={styles.manualEntry}>
              <div className={styles.manualLabel}>Inserir dezenas manualmente:</div>
              <div className={styles.manualRow}>
                <input type="text" className={styles.manualInput}
                  placeholder={bolao.loteria === 'lotofacil' ? 'Ex: 01 03 05 08 11 12 14 15 17 19 20 21 22 24 25' : bolao.loteria === 'quina' ? 'Ex: 05 22 41 63 77' : 'Ex: 03 30 33 35 45 47'}
                  value={p.dezenasInput}
                  onChange={e => p.onDezenasInputChange(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && p.onConferirManual()}
                />
                <button type="button" className={styles.btnGanhou}
                  onClick={p.onConferirManual}
                  disabled={p.conferindoManual || !p.dezenasInput.trim()}>
                  {p.conferindoManual ? '⟳' : '✓ Conferir'}
                </button>
              </div>
            </div>
          )}
          {p.conferirResult && p.conferirResult.total_premiadas > 0 && (
            <div className={styles.conferirResumo}>
              <div className={styles.conferirResumoTitle}>Apostas premiadas:</div>
              {(['SENA', 'QUINA', 'QUADRA'] as const).map(pr => {
                const key = pr === 'SENA' ? 'senas' : pr === 'QUINA' ? 'quinas' : 'quadras'
                const count = p.conferirResult!.resumo[key as keyof typeof p.conferirResult.resumo]
                return count > 0 ? (
                  <div key={pr} className={styles.conferirPremio}>
                    {pr === 'SENA' ? '🥇' : pr === 'QUINA' ? '🥈' : '🥉'} {pr}: {count} aposta{count !== 1 ? 's' : ''}
                  </div>
                ) : null
              })}
              <div className={styles.conferirApostas}>
                {p.conferirResult.apostas_premiadas.slice(0, 10).map(a => (
                  <div key={a.idx} className={styles.conferirAposta}>
                    <span className={styles.conferirIdx}>#{a.idx}</span>
                    <span className={styles.conferirDez}>{a.dezenas.map((n: number) => String(n).padStart(2, '0')).join(' ')}</span>
                    <span className={styles.conferirPremioTag}>{a.acertos}✓ {a.premio}</span>
                  </div>
                ))}
                {p.conferirResult.apostas_premiadas.length > 10 && (
                  <div className={styles.conferirInfo}>…e mais {p.conferirResult.apostas_premiadas.length - 10} apostas premiadas</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {bolao.resultado_conferencia &&
        (bolao.resultado_conferencia as Record<string, string>).status !== 'nao_apurado' &&
        bolao.apostas_data && p.pagosLista.length > 0 && (
        <div className={styles.acertosEnvioBox}>
          <div className={styles.acertosDestinatario}>
            <label>Destinatário:</label>
            <select value={p.acertosDestinatario} onChange={e => p.onAcertosDestinatarioChange(e.target.value)}>
              <option value="todos">Todos os pagos</option>
              {p.pagosLista.map(pt => (
                <option key={pt.id} value={pt.id}>{pt.nome}</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button type="button" className={styles.btnLembrete} onClick={p.onEnviarAcertos}>
              💬 Enviar por WhatsApp
            </button>
            <button type="button" className={styles.btnLembrete} onClick={p.onEnviarAcertosEmail}>
              📧 Enviar por E-mail
            </button>
          </div>
          {p.enviarAcertosMsg && <div className={styles.lembreteMsg}>{p.enviarAcertosMsg}</div>}
          {p.enviarAcertosEmailMsg && <div className={styles.lembreteMsg}>{p.enviarAcertosEmailMsg}</div>}
        </div>
      )}
    </>
  )
}
