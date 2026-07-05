'use client'

import { useState, useEffect } from 'react'
import styles from '@/app/admin/admin.module.css'
import { ABAS, type Aba, type SettingsData } from './settings/shared'
import AppTab from './settings/AppTab'
import HomeTab from './settings/HomeTab'
import PagamentoTab from './settings/PagamentoTab'
import WhatsappTab from './settings/WhatsappTab'
import EmailTab from './settings/EmailTab'
import LoteriaTab from './settings/LoteriaTab'
import EsporteTab from './settings/EsporteTab'
import CliTab from './settings/CliTab'
import GoogleTab from './settings/GoogleTab'

/**
 * Painel de configurações white-label do admin, organizado em abas.
 * Cada aba é um componente próprio em components/admin/settings/.
 */
export default function AdminSettings() {
  const [open, setOpen] = useState(false)
  const [aba, setAba]   = useState<Aba>('app')
  const [loading, setLoading]   = useState(false)
  const [saving, setSaving]     = useState(false)
  const [msg, setMsg]           = useState('')
  const [settings, setSettings] = useState<SettingsData>({})
  const [loteriaAba, setLoteriaAba] = useState<'mega'|'quina'|'lotofacil'>('mega')

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

  const app     = (settings.app    ?? {}) as Record<string, string>
  const pag     = (settings.pagamento ?? {}) as Record<string, unknown>
  const wa      = (settings.whatsapp  ?? {}) as Record<string, unknown>
  const em      = (settings.email     ?? {}) as Record<string, unknown>
  const esporte = settings['paginas.esporte'] ?? {}
  const home    = settings['paginas.home'] ?? {}
  const bolao   = (settings['paginas.bolao'] ?? {}) as Record<string, { regras: string[] }>
  const cli     = (settings.cli ?? {}) as Record<string, string>
  const googleCfg = (settings.google ?? {}) as Record<string, string>

  function updateRegra(loteria: string, idx: number, val: string) {
    const atual = bolao[loteria]?.regras ?? []
    const nova  = [...atual]
    nova[idx]   = val
    setSettings(prev => ({
      ...prev,
      'paginas.bolao': { ...(prev['paginas.bolao'] ?? {}), [loteria]: { regras: nova } },
    }))
  }

  function addRegra(loteria: string) {
    const atual = bolao[loteria]?.regras ?? []
    setSettings(prev => ({
      ...prev,
      'paginas.bolao': { ...(prev['paginas.bolao'] ?? {}), [loteria]: { regras: [...atual, ''] } },
    }))
  }

  function removeRegra(loteria: string, idx: number) {
    const atual = bolao[loteria]?.regras ?? []
    const nova  = atual.filter((_, i) => i !== idx)
    setSettings(prev => ({
      ...prev,
      'paginas.bolao': { ...(prev['paginas.bolao'] ?? {}), [loteria]: { regras: nova } },
    }))
  }

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
            {aba === 'app'      && <AppTab app={app} updateNs={updateNs} salvar={salvar} saving={saving} />}
            {aba === 'home'     && <HomeTab home={home} updateNs={updateNs} salvar={salvar} saving={saving} />}
            {aba === 'pagamento' && <PagamentoTab pag={pag} updateNs={updateNs} salvar={salvar} saving={saving} />}
            {aba === 'whatsapp' && <WhatsappTab wa={wa} updateNs={updateNs} salvar={salvar} saving={saving} />}
            {aba === 'email'    && <EmailTab em={em} updateNs={updateNs} salvar={salvar} saving={saving} />}
            {aba === 'loteria'  && (
              <LoteriaTab
                bolao={bolao}
                loteriaAba={loteriaAba}
                onLoteriaAbaChange={setLoteriaAba}
                onUpdateRegra={updateRegra}
                onAddRegra={addRegra}
                onRemoveRegra={removeRegra}
                updateNs={updateNs}
                salvar={salvar}
                saving={saving}
              />
            )}
            {aba === 'esporte'  && <EsporteTab esporte={esporte} updateNs={updateNs} salvar={salvar} saving={saving} />}
            {aba === 'cli'      && <CliTab cli={cli} updateNs={updateNs} salvar={salvar} saving={saving} />}
            {aba === 'google'   && <GoogleTab google={googleCfg} updateNs={updateNs} salvar={salvar} saving={saving} />}
          </div>

          {msg && <div className={styles.settingsMsg}>{msg}</div>}
        </>
      )}
    </div>
  )
}
