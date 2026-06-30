'use client'

import styles from '@/app/admin/admin.module.css'
import { Field, type TabProps } from './shared'

type PremiacaoItem = { lugar: number; emoji: string; label: string; categoria: string; pts: number; pct: number }

interface Props extends TabProps {
  esporte: {
    logo_url_default?: string
    cor_primaria_default?: string
    label_cta_default?: string
    label_palpites_default?: string
    label_jogo_hoje_default?: string
    label_noticias_default?: string
    premiacao?: unknown[]
  }
}

export default function EsporteTab({ esporte, updateNs, salvar, saving }: Props) {
  const premiacao = (esporte.premiacao as PremiacaoItem[] | undefined) ?? []

  function updatePremiacaoItem(i: number, patch: Partial<PremiacaoItem>) {
    const nova = [...premiacao]
    nova[i] = { ...nova[i], ...patch }
    updateNs('paginas.esporte', 'premiacao', nova)
  }

  return (
    <div className={styles.settingsGrid}>
      <div className={styles.settingsInfoBox}>
        <b>📋 Padrões para novos bolões esportivos</b>
        <p>Estes valores são usados como template ao criar um novo bolão. Cada bolão pode sobrescrever individualmente no painel Esporte.</p>
      </div>

      <Field label="Logo / GIF padrão (URL)" name="logo_url_default"
        value={String(esporte.logo_url_default ?? '')}
        onChange={v => updateNs('paginas.esporte','logo_url_default',v)}
        placeholder="/logos/competicao.gif ou https://..." />

      <Field label="Cor principal padrão" name="cor_primaria_default"
        value={String(esporte.cor_primaria_default ?? '#FFB81C')}
        onChange={v => updateNs('paginas.esporte','cor_primaria_default',v)}
        placeholder="#FFB81C" />

      <Field label="Texto do botão CTA padrão" name="label_cta_default"
        value={String(esporte.label_cta_default ?? '⚽ Quero Participar')}
        onChange={v => updateNs('paginas.esporte','label_cta_default',v)}
        placeholder="⚽ Quero Participar" />

      <Field label="Label do card de palpites padrão" name="label_palpites_default"
        value={String(esporte.label_palpites_default ?? '⚽ Seus palpites')}
        onChange={v => updateNs('paginas.esporte','label_palpites_default',v)}
        placeholder="⚽ Seus palpites" />

      <Field label="Badge jogo de hoje padrão" name="label_jogo_hoje_default"
        value={String(esporte.label_jogo_hoje_default ?? '🔥 Jogo de hoje!')}
        onChange={v => updateNs('paginas.esporte','label_jogo_hoje_default',v)}
        placeholder="🔥 Jogo de hoje!" />

      <Field label="Título da seção de notícias padrão" name="label_noticias_default"
        value={String(esporte.label_noticias_default ?? '📺 Notícias')}
        onChange={v => updateNs('paginas.esporte','label_noticias_default',v)}
        placeholder="📺 CazéTV · Copa do Mundo FIFA 2026" />

      <div className={styles.settingsInfoBox}>
        <b>🏆 Premiação padrão por colocação</b>
        <p>Template de premiação usado ao criar novos bolões. Pontos e % do prêmio distribuído entre acertadores.</p>
        {premiacao.map((item, i) => (
          <div key={i} className={styles.settingsPremiacaoRow}>
            <span className={styles.settingsPremiacaoLugar}>{item.emoji} {item.label}</span>
            <div className={styles.settingsPremiacaoFields}>
              <input className={styles.settingsInputSmall} placeholder="Categoria" value={item.categoria}
                onChange={e => updatePremiacaoItem(i, { categoria: e.target.value })} />
              <input className={styles.settingsInputSmall} type="number" placeholder="Pts" value={item.pts} style={{ width: 60 }}
                onChange={e => updatePremiacaoItem(i, { pts: Number(e.target.value) })} />
              <input className={styles.settingsInputSmall} type="number" placeholder="%" value={item.pct} style={{ width: 60 }}
                onChange={e => updatePremiacaoItem(i, { pct: Number(e.target.value) })} />
            </div>
          </div>
        ))}
      </div>

      <button type="button" className={styles.settingsSave} onClick={() => salvar('paginas.esporte')} disabled={saving}>
        {saving ? 'Salvando...' : '💾 Salvar padrões'}
      </button>
    </div>
  )
}
