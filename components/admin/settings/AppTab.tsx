'use client'

import styles from '@/app/admin/admin.module.css'
import { Field, type TabProps } from './shared'

interface Props extends TabProps {
  app: Record<string, string>
}

export default function AppTab({ app, updateNs, salvar, saving }: Props) {
  return (
    <div className={styles.settingsGrid}>
      <Field label="Nome do App"      name="nome"        value={app.nome        ?? ''} onChange={v => updateNs('app','nome',v)}        placeholder="Bolão Mega" />
      <Field label="Nome do Grupo"    name="grupo_nome"  value={app.grupo_nome  ?? ''} onChange={v => updateNs('app','grupo_nome',v)}  placeholder="BOLÃO 💯" />
      <Field label="Descrição"        name="descricao"   value={app.descricao   ?? ''} onChange={v => updateNs('app','descricao',v)}   placeholder="Bolão da Mega-Sena" />
      <Field label="Tagline"          name="tagline"     value={app.tagline     ?? ''} onChange={v => updateNs('app','tagline',v)}     placeholder="Boa sorte a todos! 🍀" />
      <Field label="URL do Site"      name="url"         value={app.url         ?? ''} onChange={v => updateNs('app','url',v)}         placeholder="https://meusite.com.br" />
      <Field label="Rodapé"           name="rodape"      value={app.rodape      ?? ''} onChange={v => updateNs('app','rodape',v)}      placeholder="Dúvidas? Fale com o admin." />
      <Field label="Intervalo dos carrosséis (segundos)" name="carrossel_intervalo_seg" type="number"
        value={app.carrossel_intervalo_seg ?? '5'}
        onChange={v => updateNs('app','carrossel_intervalo_seg', String(Math.max(1, Number(v) || 5)))}
        placeholder="5" />
      <button type="button" className={styles.settingsSave} onClick={() => salvar('app')} disabled={saving}>
        {saving ? 'Salvando...' : '💾 Salvar App'}
      </button>
    </div>
  )
}
