'use client'
import { useState, useEffect } from 'react'
import TrevoIcon from '@/components/TrevoIcon'

interface Props {
  onClose: () => void
  appNome?: string
}

export default function LoginModal({ onClose, appNome = 'Bolões' }: Props) {
  const [senha, setSenha] = useState('')
  const [erro, setErro]   = useState('')
  const [loading, setLoading] = useState(false)

  // Fecha com ESC
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  // Impede scroll do body enquanto aberto
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  async function login() {
    if (!senha) return
    setLoading(true); setErro('')
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ senha }),
      })
      if (res.ok) {
        window.location.href = '/admin'
      } else {
        setErro('Senha incorreta')
        setLoading(false)
      }
    } catch {
      setErro('Erro de conexão')
      setLoading(false)
    }
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
        {/* Fechar */}
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

        {/* Logo */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 14 }}>
          <TrevoIcon loteria="mega" size={48} />
        </div>

        <div style={{ fontSize: 26, fontWeight: 800, color: '#00AB67', letterSpacing: -0.5, marginBottom: 4 }}>
          Admin
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 32 }}>
          {appNome}
        </div>

        <input
          type="password"
          placeholder="SENHA ADMIN"
          value={senha}
          onChange={e => setSenha(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && login()}
          autoFocus
          style={{
            width: '100%', padding: '14px 18px', marginBottom: 10,
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 12,
            fontSize: 15, fontWeight: 500, color: '#fff',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            outline: 'none', letterSpacing: 2, textAlign: 'center',
            boxSizing: 'border-box',
          }}
        />

        {erro && (
          <div style={{ fontSize: 12, color: '#EF4444', marginBottom: 10, fontWeight: 500 }}>
            {erro}
          </div>
        )}

        <button
          onClick={login}
          disabled={loading}
          style={{
            width: '100%', padding: 15,
            background: 'linear-gradient(135deg, #00AB67 0%, #009B63 100%)',
            color: '#fff', border: 'none', borderRadius: 100,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            transition: 'all .2s',
          }}
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
      </div>
    </div>
  )
}
