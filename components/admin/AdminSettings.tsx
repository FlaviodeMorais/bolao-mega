'use client'

import { useState, useEffect } from 'react'
import styles from '@/app/admin/admin.module.css'

interface SettingsData {
  app?:    Record<string, string>
  pagamento?: Record<string, unknown>
  whatsapp?:  Record<string, unknown>
  email?:     Record<string, unknown>
  'paginas.esporte'?: { header_titulo?: string; premiacao?: unknown[] }
}

type Aba = 'app' | 'pagamento' | 'whatsapp' | 'email' | 'esporte'

const ABAS: { id: Aba; label: string; icon: string }[] = [
  { id: 'app',      label: 'App',       icon: '🏠' },
  { id: 'pagamento', label: 'Pagamento', icon: '💳' },
  { id: 'whatsapp', label: 'WhatsApp',  icon: '💬' },
  { id: 'email',    label: 'E-mail',    icon: '📧' },
  { id: 'esporte',  label: 'Esporte',   icon: '⚽' },
]

function Field({ label, name, value, onChange, type = 'text', placeholder = '' }: {
  label: string; name: string; value: string
  onChange: (v: string) => void; type?: string; placeholder?: string
}) {
  return (
    <div className={styles.settingsField}>
      <label className={styles.settingsLabel}>{label}</label>
      <input
        type={type}
        name={name}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className={styles.settingsInput}
      />
    </div>
  )
}

export default function AdminSettings() {
  const [open, setOpen] = useState(false)
  const [aba, setAba]   = useState<Aba>('app')
  const [loading, setLoading]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState('')
  const [settings, setSettings] = useState<SettingsData>({})

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetch('/api/admin/settings')
      .then(r => r.json())
      .then(d => { setSettings(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [open])

  function updateNs(ns: string, key: string, val: unknown) {
    setSettings(prev => ({
      ...prev,
      [ns]: { ...(prev[ns as keyof SettingsData] as Record<string, unknown> ?? {}), [key]: val },
    }))
  }

  async function salvar(namespace: string) {
    setSaving(true)
    setMsg('')
    const dados = settings[namespace as keyof SettingsData]
    const res = await fetch('/api/admin/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ namespace, dados }),
    }).then(r => r.json())
    setSaving(false)
    setMsg(res.ok ? '✅ Salvo com sucesso!' : `❌ Erro: ${res.error}`)
    setTimeout(() => setMsg(''), 4000)
  }

  const app    = (settings.app    ?? {}) as Record<string, string>
  const pag    = (settings.pagamento ?? {}) as Record<string, unknown>
  const wa     = (settings.whatsapp  ?? {}) as Record<string, unknown>
  const em     = (settings.email     ?? {}) as Record<string, unknown>
  const esporte = settings['paginas.esporte'] ?? {}

  if (!open) {
    return (
      <div className={styles.settingsSection}>
        <button type="button" className={styles.settingsToggle} onClick={() => setOpen(true)}>
          ⚙️ Configurações White-Label
          <span className={styles.settingsBadge}>expandir</span>
        </button>
      </div>
    )
  }

  return (
    <div className={styles.settingsSection}>
      <div className={styles.settingsHeader}>
        <span className={styles.settingsTitle}>⚙️ Configurações White-Label</span>
        <button type="button" className={styles.settingsClose} onClick={() => setOpen(false)}>✕</button>
      </div>

      {loading ? (
        <div className={styles.settingsLoading}>Carregando configurações...</div>
      ) : (
        <>
          {/* Abas */}
          <div className={styles.settingsAbas}>
            {ABAS.map(a => (
              <button
                key={a.id}
                type="button"
                className={`${styles.settingsAba} ${aba === a.id ? styles.settingsAbaAtiva : ''}`}
                onClick={() => setAba(a.id)}
              >
                {a.icon} {a.label}
              </button>
            ))}
          </div>

          <div className={styles.settingsBody}>
            {/* ── APP ── */}
            {aba === 'app' && (
              <div className={styles.settingsGrid}>
                <Field label="Nome do App"      name="nome"        value={app.nome        ?? ''} onChange={v => updateNs('app','nome',v)}        placeholder="Bolão Mega" />
                <Field label="Nome do Grupo"    name="grupo_nome"  value={app.grupo_nome  ?? ''} onChange={v => updateNs('app','grupo_nome',v)}  placeholder="BOLÃO 💯" />
                <Field label="Descrição"        name="descricao"   value={app.descricao   ?? ''} onChange={v => updateNs('app','descricao',v)}   placeholder="Bolão da Mega-Sena" />
                <Field label="Tagline"          name="tagline"     value={app.tagline     ?? ''} onChange={v => updateNs('app','tagline',v)}     placeholder="Boa sorte a todos! 🍀" />
                <Field label="URL do Site"      name="url"         value={app.url         ?? ''} onChange={v => updateNs('app','url',v)}         placeholder="https://meusite.com.br" />
                <Field label="Cor Primária"     name="cor_primaria" value={app.cor_primaria ?? '#00A651'} onChange={v => updateNs('app','cor_primaria',v)} type="color" />
                <Field label="Cor de Fundo"     name="cor_fundo"   value={app.cor_fundo   ?? '#0D1B2A'} onChange={v => updateNs('app','cor_fundo',v)}   type="color" />
                <Field label="Rodapé"           name="rodape"      value={app.rodape      ?? ''} onChange={v => updateNs('app','rodape',v)}      placeholder="Dúvidas? Fale com o admin." />
                <button type="button" className={styles.settingsSave} onClick={() => salvar('app')} disabled={saving}>
                  {saving ? 'Salvando...' : '💾 Salvar App'}
                </button>
              </div>
            )}

            {/* ── PAGAMENTO ── */}
            {aba === 'pagamento' && (
              <div className={styles.settingsGrid}>
                <Field label="Token Mercado Pago"    name="mp_access_token" value={String(pag.mp_access_token ?? '')} onChange={v => updateNs('pagamento','mp_access_token',v)} placeholder="APP_USR-..." />
                <Field label="E-mail Pagador (MP)"   name="pix_email_payer" value={String(pag.pix_email_payer ?? '')} onChange={v => updateNs('pagamento','pix_email_payer',v)} placeholder="pagador@bolao.com" />
                <Field label="Chave PIX (fallback)"  name="pix_chave"  value={String(pag.pix_chave  ?? '')} onChange={v => updateNs('pagamento','pix_chave',v)}  placeholder="CPF, e-mail, telefone ou aleatória" />
                <Field label="Nome PIX"              name="pix_nome"   value={String(pag.pix_nome   ?? '')} onChange={v => updateNs('pagamento','pix_nome',v)}   placeholder="NOME DO RECEBEDOR" />
                <Field label="Cidade PIX"            name="pix_cidade" value={String(pag.pix_cidade ?? '')} onChange={v => updateNs('pagamento','pix_cidade',v)} placeholder="SAO PAULO" />
                <button type="button" className={styles.settingsSave} onClick={() => salvar('pagamento')} disabled={saving}>
                  {saving ? 'Salvando...' : '💾 Salvar Pagamento'}
                </button>
              </div>
            )}

            {/* ── WHATSAPP ── */}
            {aba === 'whatsapp' && (
              <div className={styles.settingsGrid}>
                <Field label="Token Whapi"     name="token"         value={String(wa.token    ?? '')} onChange={v => updateNs('whatsapp','token',v)}         placeholder="seu-token-whapi" />
                <Field label="ID do Grupo WA"  name="group_id"      value={String(wa.group_id ?? '')} onChange={v => updateNs('whatsapp','group_id',v)}      placeholder="12055519XXXXXXXX-XXXXXXXXXX@g.us" />
                <Field label="Horário Prazo"   name="prazo_horario" value={String(wa.prazo_horario ?? '12:00')} onChange={v => updateNs('whatsapp','prazo_horario',v)} placeholder="12:00" />
                <button type="button" className={styles.settingsSave} onClick={() => salvar('whatsapp')} disabled={saving}>
                  {saving ? 'Salvando...' : '💾 Salvar WhatsApp'}
                </button>
              </div>
            )}

            {/* ── EMAIL ── */}
            {aba === 'email' && (
              <div className={styles.settingsGrid}>
                <Field label="Gmail (usuário)" name="gmail_user" value={String(em.gmail_user ?? '')} onChange={v => updateNs('email','gmail_user',v)} placeholder="seuemail@gmail.com" />
                <Field label="Gmail (senha app)" name="gmail_pass" value={String(em.gmail_pass ?? '')} onChange={v => updateNs('email','gmail_pass',v)} placeholder="xxxx xxxx xxxx xxxx" type="password" />
                <Field label="Resend API Key (alternativa)" name="resend_key" value={String(em.resend_key ?? '')} onChange={v => updateNs('email','resend_key',v)} placeholder="re_..." />
                <Field label="Nome do Remetente" name="from_name" value={String(em.from_name ?? '')} onChange={v => updateNs('email','from_name',v)} placeholder="Bolão Mega" />
                <Field label="E-mail Admin (notificações)" name="admin_email" value={String(em.admin_email ?? '')} onChange={v => updateNs('email','admin_email',v)} placeholder="admin@meusite.com" />
                <button type="button" className={styles.settingsSave} onClick={() => salvar('email')} disabled={saving}>
                  {saving ? 'Salvando...' : '💾 Salvar E-mail'}
                </button>
              </div>
            )}

            {/* ── ESPORTE ── */}
            {aba === 'esporte' && (
              <div className={styles.settingsGrid}>
                <Field label="Título do Header" name="header_titulo" value={String(esporte.header_titulo ?? '')} onChange={v => updateNs('paginas.esporte','header_titulo',v)} placeholder="FIFA World Cup 2026" />
                <div className={styles.settingsInfoBox}>
                  <b>Premiação por colocação</b>
                  <p>Os 3 banners de premiação exibidos na página pública. Os dados são atualizados após salvar.</p>
                  {(esporte.premiacao as {lugar:number;emoji:string;label:string;categoria:string;pts:number;pct:number}[] | undefined ?? []).map((item, i) => (
                    <div key={i} className={styles.settingsPremiacaoRow}>
                      <span className={styles.settingsPremiacaoLugar}>{item.emoji} {item.label}</span>
                      <div className={styles.settingsPremiacaoFields}>
                        <input
                          className={styles.settingsInputSmall}
                          placeholder="Categoria"
                          value={item.categoria}
                          onChange={e => {
                            const nova = [...(esporte.premiacao as typeof item[] ?? [])]
                            nova[i] = { ...item, categoria: e.target.value }
                            updateNs('paginas.esporte', 'premiacao', nova)
                          }}
                        />
                        <input
                          className={styles.settingsInputSmall}
                          type="number"
                          placeholder="Pts"
                          value={item.pts}
                          onChange={e => {
                            const nova = [...(esporte.premiacao as typeof item[] ?? [])]
                            nova[i] = { ...item, pts: Number(e.target.value) }
                            updateNs('paginas.esporte', 'premiacao', nova)
                          }}
                          style={{ width: 60 }}
                        />
                        <input
                          className={styles.settingsInputSmall}
                          type="number"
                          placeholder="%"
                          value={item.pct}
                          onChange={e => {
                            const nova = [...(esporte.premiacao as typeof item[] ?? [])]
                            nova[i] = { ...item, pct: Number(e.target.value) }
                            updateNs('paginas.esporte', 'premiacao', nova)
                          }}
                          style={{ width: 60 }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <button type="button" className={styles.settingsSave} onClick={() => salvar('paginas.esporte')} disabled={saving}>
                  {saving ? 'Salvando...' : '💾 Salvar Esporte'}
                </button>
              </div>
            )}
          </div>

          {msg && <div className={styles.settingsMsg}>{msg}</div>}
        </>
      )}
    </div>
  )
}
