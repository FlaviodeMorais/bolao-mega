'use client'

import styles from '@/app/admin/admin.module.css'
import { Field, Textarea, type TabProps } from './shared'

interface Props extends TabProps {
  google: Record<string, string>
}

/**
 * Credenciais da Service Account do Google (Sheets API), usadas em runtime
 * pela exportação de participantes/KPIs para planilhas (lib/google-sheets.ts).
 */
export default function GoogleTab({ google, updateNs, salvar, saving }: Props) {
  return (
    <div className={styles.settingsGrid}>
      <div style={{ gridColumn: '1 / -1', fontSize: 12, opacity: 0.6, marginBottom: 4 }}>
        Credenciais de uma Service Account do Google Cloud (Sheets API habilitada).
        Compartilhe a planilha de destino com o e-mail abaixo, com permissão de editor.
      </div>

      <Field label="E-mail da Service Account" name="client_email"
        value={google.client_email ?? ''} onChange={v => updateNs('google', 'client_email', v)}
        placeholder="nome@projeto.iam.gserviceaccount.com" />

      <Field label="ID da Planilha (Spreadsheet ID)" name="spreadsheet_id"
        value={google.spreadsheet_id ?? ''} onChange={v => updateNs('google', 'spreadsheet_id', v)}
        placeholder="cole o ID que aparece na URL da planilha" />

      <Textarea label="Chave Privada (private_key do JSON)" name="private_key" secreto
        value={google.private_key ?? ''} onChange={v => updateNs('google', 'private_key', v)}
        placeholder={'-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----'} />

      <button type="button" className={styles.settingsSave} onClick={() => salvar('google')} disabled={saving}>
        {saving ? 'Salvando...' : '💾 Salvar Google'}
      </button>
    </div>
  )
}
