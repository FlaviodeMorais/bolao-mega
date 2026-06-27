'use client'

import styles from '@/app/admin/admin.module.css'
import TrevoIcon from '@/components/TrevoIcon'

interface AdminLoginProps {
  senha: string
  errLogin: string
  onSenhaChange: (senha: string) => void
  onLogin: () => void
}

/**
 * Tela de entrada do painel administrativo.
 * Mantem apenas a UI do login; validacao e criacao de sessao continuam em `app/admin/page.tsx`.
 */
export default function AdminLogin({ senha, errLogin, onSenhaChange, onLogin }: AdminLoginProps) {
  return (
    <div className={styles.loginWrap}>
      <div className={styles.loginBox}>
        <div className={styles.loginLogo}><TrevoIcon loteria="mega" size={48} /></div>
        <div className={styles.loginTitle}>Admin</div>
        <div className={styles.loginSub}>GRUPO MEGA 💯</div>
        <input type="password" placeholder="SENHA ADMIN" value={senha}
          onChange={e => onSenhaChange(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && onLogin()}
          className={styles.loginInput} />
        {errLogin && <div className={styles.loginErr}>{errLogin}</div>}
        <button type="button" className={styles.loginBtn} onClick={onLogin}>Entrar</button>
      </div>
    </div>
  )
}
