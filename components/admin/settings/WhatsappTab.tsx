'use client'

import styles from '@/app/admin/admin.module.css'
import { Field, Toggle, type TabProps } from './shared'

interface Props extends TabProps {
  wa: Record<string, unknown>
}

export default function WhatsappTab({ wa, updateNs, salvar, saving }: Props) {
  return (
    <div className={styles.settingsGrid}>
      <Field label="Token Whapi"     name="token"         value={String(wa.token    ?? '')} onChange={v => updateNs('whatsapp','token',v)}         placeholder="seu-token-whapi" />
      <Field label="ID do Grupo WA"  name="group_id"      value={String(wa.group_id ?? '')} onChange={v => updateNs('whatsapp','group_id',v)}      placeholder="12055519XXXXXXXX-XXXXXXXXXX@g.us" />
      <Field label="Horário Prazo"   name="prazo_horario" value={String(wa.prazo_horario ?? '12:00')} onChange={v => updateNs('whatsapp','prazo_horario',v)} placeholder="12:00" />
      <Toggle label="WhatsApp ativo (requer assinatura Whapi)" checked={Boolean(wa.ativo ?? false)} onChange={v => updateNs('whatsapp','ativo',v)} />
      <button type="button" className={styles.settingsSave} onClick={() => salvar('whatsapp')} disabled={saving}>
        {saving ? 'Salvando...' : '💾 Salvar WhatsApp'}
      </button>
    </div>
  )
}
