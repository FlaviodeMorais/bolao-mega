'use client'
import { useState, useEffect } from 'react'
import TrevoIcon from '@/components/TrevoIcon'

interface Props {
  usuario: { nome: string; email: string; telefone: string }
  onClose: () => void
  onLogout: () => void
}

export default function UserAccountModal({ usuario, onClose, onLogout }: Props) {
  const [senhaAtual, setSenhaAtual] = useState('')
  const [novaSenha, setNovaSenha] = useState('')
  const [confirmaSenha, setConfirmaSenha] = useState('')
  const [erro, setErro] = useState('')
  const [msgOk, setMsgOk] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  async function trocarSenha() {
    setErro(''); setMsgOk('')
    if (!senhaAtual || !novaSenha) { setErro('Preencha a senha atual e a nova senha'); return }
    if (novaSenha.length < 6) { setErro('Nova senha deve ter ao menos 6 caracteres'); return }
    if (novaSenha !== confirmaSenha) { setErro('As senhas novas não coincidem'); return }

    setLoading(true)
    const res = await fetch('/api/usuario/alterar-senha', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senhaAtual, novaSenha }),
    }).then(r => r.json()).catch(() => ({ error: 'Erro de conexão' }))
    setLoading(false)

    if (res.error) { setErro(res.error); return }
    setMsgOk('✅ Senha alterada com sucesso!')
    setSenhaAtual(''); setNovaSenha(''); setConfirmaSenha('')
  }

  async function sair() {
    if (!confirm(`Sair da conta de ${usuario.nome}?`)) return
    await fetch('/api/usuario/logout', { method: 'POST' })
    onLogout()
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '14px 18px', marginBottom: 10,
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.1)',
    borderRadius: 12,
    fontSize: 15, fontWeight: 500, color: '#fff',
    fontFamily: "'Plus Jakarta Sans', sans-serif",
    outline: 'none', boxSizing: 'border-box',
  }

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'rgba(6,9,15,0.85)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        padding: 24,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: 'rgba(13,28,46,0.95)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: 24,
        padding: '48px 40px',
        width: '100%', maxWidth: 400,
        textAlign: 'center',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.06)',
        position: 'relative',
        fontFamily: "'Plus Jakarta Sans', sans-serif",
      }}>
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: 16, right: 16,
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '50%', width: 32, height: 32,
            color: 'rgba(255,255,255,0.4)', cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 16, lineHeight: 1,
          }}
          aria-label="Fechar"
        >✕</button>

        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
          <TrevoIcon loteria="mega" size={48} />
        </div>

        <div style={{ fontSize: 22, fontWeight: 800, color: '#00AB67', letterSpacing: -0.5, marginBottom: 4 }}>
          {usuario.nome}
        </div>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.4)', marginBottom: 28 }}>
          {usuario.email}
        </div>

        <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.3)', letterSpacing: 1.5, textTransform: 'uppercase', textAlign: 'left', marginBottom: 12 }}>
          Trocar senha
        </div>

        <input type="password" placeholder="Senha atual" value={senhaAtual}
          onChange={e => setSenhaAtual(e.target.value)} style={inputStyle} autoFocus />
        <input type="password" placeholder="Nova senha (mín. 6 caracteres)" value={novaSenha}
          onChange={e => setNovaSenha(e.target.value)} style={inputStyle} />
        <input type="password" placeholder="Confirmar nova senha" value={confirmaSenha}
          onChange={e => setConfirmaSenha(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && trocarSenha()}
          style={inputStyle} />

        {erro && <div style={{ fontSize: 12, color: '#EF4444', marginBottom: 10, fontWeight: 500 }}>{erro}</div>}
        {msgOk && <div style={{ fontSize: 12, color: '#00AB67', marginBottom: 10, fontWeight: 600 }}>{msgOk}</div>}

        <button
          onClick={trocarSenha}
          disabled={loading}
          style={{
            width: '100%', padding: 15, marginTop: 4, marginBottom: 20,
            background: 'linear-gradient(135deg, #00AB67 0%, #009B63 100%)',
            color: '#fff', border: 'none', borderRadius: 100,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            transition: 'all .2s',
          }}
        >
          {loading ? 'Aguarde...' : 'Salvar nova senha'}
        </button>

        <button
          onClick={sair}
          style={{
            width: '100%', padding: 12,
            background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
            color: '#EF4444', borderRadius: 100,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}
        >
          Sair da conta
        </button>
      </div>
    </div>
  )
}
