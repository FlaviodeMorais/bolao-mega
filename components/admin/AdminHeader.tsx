'use client'

import styles from '@/app/admin/admin.module.css'

interface AdminHeaderProps {
  concursoAtivo: string
  waStatus: 'ok' | 'erro' | ''
  waMsg: string
}

/**
 * Cabecalho do painel administrativo.
 * Exibe o concurso ativo, status do WhatsApp e atalho de retorno ao formulario publico.
 */
export default function AdminHeader({ concursoAtivo, waStatus, waMsg }: AdminHeaderProps) {
  return (
    <div className={styles.header}>
      <h1 className={styles.title}>⚙️ Painel Admin — Grupo Mega 💯</h1>
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
