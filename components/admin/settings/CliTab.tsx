'use client'

import styles from '@/app/admin/admin.module.css'
import { Field, type TabProps } from './shared'

interface Props extends TabProps {
  cli: Record<string, string>
}

/**
 * Guarda tokens de acesso das CLIs usadas no dia a dia do projeto
 * (Supabase, Vercel, GitHub), mascarados na tela. Uso pessoal/operacional
 * do admin (copiar e colar no terminal) — a aplicação em produção não lê
 * esses valores em runtime.
 */
export default function CliTab({ cli, updateNs, salvar, saving }: Props) {
  return (
    <div className={styles.settingsGrid}>
      <div style={{ gridColumn: '1 / -1', fontSize: 12, opacity: 0.6, marginBottom: 4 }}>
        Tokens pessoais de CLI — guardados aqui só como referência rápida para você colar no terminal.
        Não são usados pela aplicação em produção.
      </div>

      <Field label="Supabase — Access Token" name="supabase_token"
        value={cli.supabase_token ?? ''} onChange={v => updateNs('cli', 'supabase_token', v)}
        placeholder="sbp_..." type="password" />
      <Field label="Supabase — Project Ref" name="supabase_project_ref"
        value={cli.supabase_project_ref ?? ''} onChange={v => updateNs('cli', 'supabase_project_ref', v)}
        placeholder="ex: abcdefghijklmnop" />

      <Field label="Vercel — Token" name="vercel_token"
        value={cli.vercel_token ?? ''} onChange={v => updateNs('cli', 'vercel_token', v)}
        placeholder="token da conta Vercel" type="password" />

      <Field label="GitHub — Personal Access Token" name="github_token"
        value={cli.github_token ?? ''} onChange={v => updateNs('cli', 'github_token', v)}
        placeholder="ghp_..." type="password" />

      <button type="button" className={styles.settingsSave} onClick={() => salvar('cli')} disabled={saving}>
        {saving ? 'Salvando...' : '💾 Salvar CLIs'}
      </button>
    </div>
  )
}
