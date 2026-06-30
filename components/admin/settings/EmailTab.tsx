'use client'

import styles from '@/app/admin/admin.module.css'
import { Field, Toggle, type TabProps } from './shared'

interface Props extends TabProps {
  em: Record<string, unknown>
}

export default function EmailTab({ em, updateNs, salvar, saving }: Props) {
  return (
    <div className={styles.settingsGrid}>
      <Field label="Gmail (usuário)" name="gmail_user" value={String(em.gmail_user ?? '')} onChange={v => updateNs('email','gmail_user',v)} placeholder="seuemail@gmail.com" />
      <Field label="Gmail (senha app)" name="gmail_pass" value={String(em.gmail_pass ?? '')} onChange={v => updateNs('email','gmail_pass',v)} placeholder="xxxx xxxx xxxx xxxx" type="password" />
      <Field label="Resend API Key (alternativa)" name="resend_key" value={String(em.resend_key ?? '')} onChange={v => updateNs('email','resend_key',v)} placeholder="re_..." />
      <Field label="Nome do Remetente" name="from_name" value={String(em.from_name ?? '')} onChange={v => updateNs('email','from_name',v)} placeholder="Bolão Mega" />
      <Field label="E-mail Admin (notificações)" name="admin_email" value={String(em.admin_email ?? '')} onChange={v => updateNs('email','admin_email',v)} placeholder="admin@meusite.com" />
      <Toggle label="E-mail ativo" checked={Boolean(em.ativo ?? true)} onChange={v => updateNs('email','ativo',v)} />
      <button type="button" className={styles.settingsSave} onClick={() => salvar('email')} disabled={saving}>
        {saving ? 'Salvando...' : '💾 Salvar E-mail'}
      </button>
    </div>
  )
}
