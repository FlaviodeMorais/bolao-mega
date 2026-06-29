'use client'

import styles from '@/app/admin/admin.module.css'

interface AdminHeaderProps {
  concursoAtivo: string
  waStatus: 'ok' | 'erro' | ''
  waMsg: string
  appNome?: string
}

export default function AdminHeader({ concursoAtivo, waStatus, waMsg, appNome = 'Bolões' }: AdminHeaderProps) {
  return (
    <div className={styles.header}>
      <h1 className={styles.title}>⚙️ Admin — {appNome}</h1>
      <div className={styles.headerRight}>
        <span className={styles.headerConcurso}>{concursoAtivo ? `Concurso #${concursoAtivo}` : '—'}</span>
        {waStatus && (
          <span className={waStatus === 'ok' ? styles.waOk : styles.waErro} title={waMsg}>
            {waStatus === 'ok' ? '📱 WA ●' : '📵 WA ●'}
          </span>
        )}
        <a href="/" className={styles.linkForm}>← Formulário</a>
      </div>
    </div>
  )
}
