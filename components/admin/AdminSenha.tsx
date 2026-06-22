'use client'

import { useState } from 'react'
import styles from '@/app/admin/admin.module.css'

/**
 * Painel de segurança do admin.
 * Gerencia seu próprio estado local; chama /api/admin/senha diretamente.
 * Não recebe callbacks externos — totalmente autocontido.
 */
export default function AdminSenha() {
  const [show, setShow]             = useState(false)
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha]   = useState('')
  const [confirmSenha, setConfirmSenha] = useState('')
  const [senhaMsg, setSenhaMsg]     = useState('')
  const [salvando, setSalvando]     = useState(false)

  async function alterarSenha() {
    if (!senhaAtual || !novaSenha || novaSenha.length < 6) {
      setSenhaMsg('⚠️ Nova senha deve ter pelo menos 6 caracteres.')
      return
    }
    if (novaSenha !== confirmSenha) {
      setSenhaMsg('⚠️ As senhas não coincidem.')
      return
    }
    setSalvando(true)
    const res = await fetch('/api/admin/senha', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senhaAtual, novaSenha }),
    })
    const data = await res.json()
    setSalvando(false)
    if (res.ok) {
      setSenhaMsg('✅ Senha alterada com sucesso!')
      setSenhaAtual(''); setNovaSenha(''); setConfirmSenha('')
      setTimeout(() => { setSenhaMsg(''); setShow(false) }, 2000)
    } else {
      setSenhaMsg(`❌ ${data.error || 'Erro ao alterar senha.'}`)
    }
  }

  return (
    <div className={styles.panel}>
      <div className={styles.panelTitle}>🔐 Segurança</div>
      {!show
        ? <button type="button" className={styles.btnLoad} onClick={() => setShow(true)}>🔑 Alterar senha do admin</button>
        : (
          <div className={styles.senhaForm}>
            <input type="password" className={styles.createInput} placeholder="Senha atual"
              value={senhaAtual} onChange={e => setSenhaAtual(e.target.value)} />
            <input type="password" className={styles.createInput} placeholder="Nova senha (mín. 6 caracteres)"
              value={novaSenha} onChange={e => setNovaSenha(e.target.value)} />
            <input type="password" className={styles.createInput} placeholder="Confirmar nova senha"
              value={confirmSenha} onChange={e => setConfirmSenha(e.target.value)} />
            {senhaMsg && <div className={styles.senhaMsg}>{senhaMsg}</div>}
            <div className={styles.senhaActions}>
              <button type="button" className={styles.btnCreate} onClick={alterarSenha} disabled={salvando}>
                {salvando ? 'Salvando...' : 'Salvar nova senha'}
              </button>
              <button type="button" className={styles.btnLoad}
                onClick={() => { setShow(false); setSenhaMsg('') }}>Cancelar</button>
            </div>
          </div>
        )
      }
    </div>
  )
}
