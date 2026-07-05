'use client'

import styles from '@/app/admin/admin.module.css'
import { Field, Toggle, type TabProps } from './shared'

interface Props extends TabProps {
  wa: Record<string, unknown>
}

export default function WhatsappTab({ wa, updateNs, salvar, saving }: Props) {
  const provider = String(wa.provider ?? 'whapi')
  const isEvolution = provider === 'evolution'
  const isZapster   = provider === 'zapster'

  return (
    <div className={styles.settingsGrid}>
      <div className={styles.settingsField} style={{ gridColumn: '1 / -1' }}>
        <label className={styles.settingsLabel}>Provedor</label>
        <select className={styles.settingsInput} value={provider}
          onChange={e => updateNs('whatsapp', 'provider', e.target.value)}>
          <option value="whapi">Whapi.cloud (SaaS)</option>
          <option value="evolution">Evolution API (self-hosted — grátis, precisa de servidor próprio)</option>
          <option value="zapster">Zapster API (SaaS — plano Essential R$47/mês)</option>
        </select>
      </div>

      <Field label={isEvolution ? 'API Key da instância' : isZapster ? 'Token (JWT — app.zapsterapi.com/tokens)' : 'Token Whapi'} name="token"
        value={String(wa.token ?? '')} onChange={v => updateNs('whatsapp', 'token', v)}
        placeholder={isEvolution ? 'apikey da instância no Evolution API' : isZapster ? 'JWT gerado em app.zapsterapi.com/tokens' : 'seu-token-whapi'} type="password" />

      {isEvolution && (
        <>
          <Field label="URL do Evolution API" name="evolution_url"
            value={String(wa.evolution_url ?? '')} onChange={v => updateNs('whatsapp', 'evolution_url', v)}
            placeholder="https://evolution.seudominio.com" />
          <Field label="Nome da instância" name="evolution_instance"
            value={String(wa.evolution_instance ?? '')} onChange={v => updateNs('whatsapp', 'evolution_instance', v)}
            placeholder="bolao-mega" />
        </>
      )}

      {isZapster && (
        <Field label="Instance ID" name="zapster_instance_id"
          value={String(wa.zapster_instance_id ?? '')} onChange={v => updateNs('whatsapp', 'zapster_instance_id', v)}
          placeholder="ex: ozj35qv418rpmlrb" />
      )}

      <Field label="ID do Grupo WA"  name="group_id"      value={String(wa.group_id ?? '')} onChange={v => updateNs('whatsapp','group_id',v)}      placeholder={isZapster ? '123456789987654321 (sem @g.us)' : '12055519XXXXXXXX-XXXXXXXXXX@g.us'} />
      <Field label="Horário Prazo"   name="prazo_horario" value={String(wa.prazo_horario ?? '12:00')} onChange={v => updateNs('whatsapp','prazo_horario',v)} placeholder="12:00" />
      <Toggle label="WhatsApp ativo" checked={Boolean(wa.ativo ?? false)} onChange={v => updateNs('whatsapp','ativo',v)} />
      <button type="button" className={styles.settingsSave} onClick={() => salvar('whatsapp')} disabled={saving}>
        {saving ? 'Salvando...' : '💾 Salvar WhatsApp'}
      </button>
    </div>
  )
}
