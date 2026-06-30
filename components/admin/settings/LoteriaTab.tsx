'use client'

import styles from '@/app/admin/admin.module.css'
import { LOTERIAS_LABELS, type TabProps } from './shared'

type LoteriaId = 'mega' | 'quina' | 'lotofacil'

interface Props extends TabProps {
  bolao: Record<string, { regras: string[] }>
  loteriaAba: LoteriaId
  onLoteriaAbaChange: (l: LoteriaId) => void
  onUpdateRegra: (loteria: string, idx: number, val: string) => void
  onAddRegra: (loteria: string) => void
  onRemoveRegra: (loteria: string, idx: number) => void
}

export default function LoteriaTab({
  bolao, loteriaAba, onLoteriaAbaChange, onUpdateRegra, onAddRegra, onRemoveRegra, salvar, saving,
}: Props) {
  return (
    <div className={styles.settingsGrid}>
      <div className={styles.settingsAbas} style={{ padding: 0, marginBottom: 4 }}>
        {(['mega','quina','lotofacil'] as const).map(l => (
          <button key={l} type="button"
            className={`${styles.settingsAba} ${loteriaAba === l ? styles.settingsAbaAtiva : ''}`}
            onClick={() => onLoteriaAbaChange(l)}>
            {LOTERIAS_LABELS[l]}
          </button>
        ))}
      </div>

      <div className={styles.settingsInfoBox}>
        <b>Regras de Participação — {LOTERIAS_LABELS[loteriaAba]}</b>
        <p>Exibidas no modal &quot;Termos de Participação&quot; antes do participante confirmar. Cada linha é um item separado.</p>
        {(bolao[loteriaAba]?.regras ?? []).map((texto, idx) => (
          <div key={idx} className={styles.settingsPremiacaoRow} style={{ alignItems: 'flex-start' }}>
            <span className={styles.settingsPremiacaoLugar} style={{ paddingTop: 8, minWidth: 28 }}>{idx + 1}.</span>
            <textarea
              className={styles.settingsInput}
              style={{ flex: 1, minHeight: 60, resize: 'vertical', fontFamily: 'inherit', fontSize: 13 }}
              value={texto}
              onChange={e => onUpdateRegra(loteriaAba, idx, e.target.value)}
            />
            <button type="button" onClick={() => onRemoveRegra(loteriaAba, idx)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#94A3B8', fontSize: 18, paddingTop: 6 }}>
              ✕
            </button>
          </div>
        ))}
        <button type="button" onClick={() => onAddRegra(loteriaAba)}
          className={styles.settingsAba} style={{ alignSelf: 'flex-start', marginTop: 4 }}>
          + Adicionar regra
        </button>
      </div>

      <button type="button" className={styles.settingsSave} onClick={() => salvar('paginas.bolao')} disabled={saving}>
        {saving ? 'Salvando...' : `💾 Salvar Regras — ${LOTERIAS_LABELS[loteriaAba]}`}
      </button>
    </div>
  )
}
