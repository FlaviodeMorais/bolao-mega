'use client'

import styles from '@/app/admin/admin.module.css'
import { Field, Toggle, type TabProps } from './shared'

interface Props extends TabProps {
  pag: Record<string, unknown>
}

export default function PagamentoTab({ pag, updateNs, salvar, saving }: Props) {
  return (
    <div className={styles.settingsGrid}>
      <Field label="Token Mercado Pago"    name="mp_access_token" value={String(pag.mp_access_token ?? '')} onChange={v => updateNs('pagamento','mp_access_token',v)} placeholder="APP_USR-..." />
      <Field label="E-mail Pagador (MP)"   name="pix_email_payer" value={String(pag.pix_email_payer ?? '')} onChange={v => updateNs('pagamento','pix_email_payer',v)} placeholder="pagador@bolao.com" />
      <Field label="Chave PIX (fallback)"  name="pix_chave"  value={String(pag.pix_chave  ?? '')} onChange={v => updateNs('pagamento','pix_chave',v)}  placeholder="CPF, e-mail, telefone ou aleatória" />
      <Field label="Nome PIX"              name="pix_nome"   value={String(pag.pix_nome   ?? '')} onChange={v => updateNs('pagamento','pix_nome',v)}   placeholder="NOME DO RECEBEDOR" />
      <Field label="Cidade PIX"            name="pix_cidade" value={String(pag.pix_cidade ?? '')} onChange={v => updateNs('pagamento','pix_cidade',v)} placeholder="SAO PAULO" />
      <Toggle label="Mercado Pago ativo" checked={Boolean(pag.mp_ativo ?? true)} onChange={v => updateNs('pagamento','mp_ativo',v)} />
      <Toggle label="PIX (fallback local) ativo" checked={Boolean(pag.pix_ativo ?? true)} onChange={v => updateNs('pagamento','pix_ativo',v)} />
      <button type="button" className={styles.settingsSave} onClick={() => salvar('pagamento')} disabled={saving}>
        {saving ? 'Salvando...' : '💾 Salvar Pagamento'}
      </button>
    </div>
  )
}
