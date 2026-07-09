import { useState } from 'react'
import styles from '@/app/admin/admin.module.css'

export interface SettingsData {
  app?:    Record<string, string>
  pagamento?: Record<string, unknown>
  whatsapp?:  Record<string, unknown>
  email?:     Record<string, unknown>
  'paginas.esporte'?: {
    header_titulo?: string  // legado — substituído por bolao.competicao
    logo_url_default?: string
    cor_primaria_default?: string
    label_cta_default?: string
    label_palpites_default?: string
    label_jogo_hoje_default?: string
    label_noticias_default?: string
    premiacao?: unknown[]
  }
  'paginas.bolao'?: Record<string, { regras: string[] }>
  'paginas.home'?: {
    titulo?: string
    rodape?: string
    msg_sem_bolao?: string
  }
  cli?: Record<string, string>
  google?: Record<string, string>
}

export type Aba = 'app' | 'home' | 'pagamento' | 'whatsapp' | 'email' | 'esporte' | 'loteria' | 'cli' | 'google' | 'usuarios'

export const ABAS: { id: Aba; label: string; icon: string }[] = [
  { id: 'app',      label: 'App',       icon: '🏠' },
  { id: 'home',     label: 'Página Home', icon: '🎰' },
  { id: 'pagamento', label: 'Pagamento', icon: '💳' },
  { id: 'whatsapp', label: 'WhatsApp',  icon: '💬' },
  { id: 'email',    label: 'E-mail',    icon: '📧' },
  { id: 'loteria',  label: 'Loteria',   icon: '🍀' },
  { id: 'esporte',  label: 'Esporte',   icon: '⚽' },
  { id: 'cli',      label: 'CLIs',      icon: '⌨️' },
  { id: 'google',   label: 'Google',    icon: '📊' },
  { id: 'usuarios', label: 'Usuários',  icon: '👥' },
]

export const LOTERIAS_LABELS: Record<string, string> = {
  mega:      '🍀 Mega-Sena',
  quina:     '🍀 Quina',
  lotofacil: '🍀 Lotofácil',
}

export function Field({ label, name, value, onChange, type = 'text', placeholder = '' }: {
  label: string; name: string; value: string
  onChange: (v: string) => void; type?: string; placeholder?: string
}) {
  const [visivel, setVisivel] = useState(false)
  const isSecreto = type === 'password'

  return (
    <div className={styles.settingsField}>
      <label className={styles.settingsLabel}>{label}</label>
      <div style={isSecreto ? { position: 'relative' } : undefined}>
        <input
          type={isSecreto && !visivel ? 'password' : 'text'}
          name={name}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="off"
          className={styles.settingsInput}
          style={isSecreto ? { paddingRight: 36 } : undefined}
        />
        {isSecreto && (
          <button
            type="button"
            onClick={() => setVisivel(v => !v)}
            title={visivel ? 'Ocultar' : 'Mostrar'}
            style={{
              position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)',
              background: 'none', border: 'none', cursor: 'pointer', fontSize: 15,
              opacity: 0.6, padding: 4, lineHeight: 1,
            }}
          >
            {visivel ? '🙈' : '👁️'}
          </button>
        )}
      </div>
    </div>
  )
}

export function Textarea({ label, name, value, onChange, placeholder = '', secreto = false }: {
  label: string; name: string; value: string
  onChange: (v: string) => void; placeholder?: string; secreto?: boolean
}) {
  const [visivel, setVisivel] = useState(!secreto)

  return (
    <div className={styles.settingsField} style={{ gridColumn: '1 / -1' }}>
      <label className={styles.settingsLabel}>
        {label}
        {secreto && (
          <button
            type="button"
            onClick={() => setVisivel(v => !v)}
            style={{
              marginLeft: 8, background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, opacity: 0.6, padding: 2,
            }}
          >
            {visivel ? '🙈 Ocultar' : '👁️ Mostrar'}
          </button>
        )}
      </label>
      <textarea
        name={name}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        rows={6}
        className={styles.settingsInput}
        style={{
          fontFamily: 'monospace', fontSize: 12, resize: 'vertical',
          filter: visivel ? 'none' : 'blur(4px)',
        }}
      />
    </div>
  )
}

export function Toggle({ label, checked, onChange }: {
  label: string; checked: boolean; onChange: (v: boolean) => void
}) {
  return (
    <div className={styles.settingsField}>
      <label className={styles.settingsLabel}>
        <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ marginRight: 8 }} />
        {label}
      </label>
    </div>
  )
}

export interface TabProps {
  updateNs: (ns: string, key: string, val: unknown) => void
  salvar: (namespace: string) => void
  saving: boolean
}
