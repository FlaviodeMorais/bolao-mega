'use client'
import { useState, useEffect } from 'react'
import TrevoIcon from '@/components/TrevoIcon'

interface Props {
  onClose: () => void
  onAutenticado: (usuario: { nome: string; email: string; telefone: string }) => void
  appNome?: string
}

type Aba = 'entrar' | 'cadastrar'

export default function UserAuthModal({ onClose, onAutenticado, appNome = 'Bolões' }: Props) {
  const [aba, setAba] = useState<Aba>('entrar')
  const [nome, setNome] = useState('')
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
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

  async function submeter() {
    setErro('')
    if (aba === 'entrar') {
      if (!email || !senha) { setErro('Preencha e-mail e senha'); return }
    } else {
      if (!nome.trim()) { setErro('Preencha seu nome'); return }
      if (!email) { setErro('Preencha seu e-mail'); return }
      if (telefone.replace(/\D/g, '').length < 10) { setErro('Telefone inválido'); return }
      if (senha.length < 6) { setErro('Senha deve ter ao menos 6 caracteres'); return }
    }

    setLoading(true)
    try {
      const url = aba === 'entrar' ? '/api/usuario/login' : '/api/usuario/cadastro'
      const body = aba === 'entrar' ? { email, senha } : { nome, email, telefone, senha }
      const res = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      }).then(r => r.json())

      if (res.error) { setErro(res.error); setLoading(false); return }

      const me = await fetch('/api/usuario/me').then(r => r.json())
      if (me.usuario) onAutenticado(me.usuario)
      onClose()
    } catch {
      setErro('Erro de conexão')
      setLoading(false)
    }
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

        <div style={{ fontSize: 26, fontWeight: 800, color: '#00AB67', letterSpacing: -0.5, marginBottom: 4 }}>
          {aba === 'entrar' ? 'Entrar' : 'Criar conta'}
        </div>
        <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,0.3)', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 24 }}>
          {appNome}
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <button type="button" onClick={() => { setAba('entrar'); setErro('') }}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 100, cursor: 'pointer',
              fontSize: 13, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif",
              border: '1px solid ' + (aba === 'entrar' ? '#00AB67' : 'rgba(255,255,255,0.1)'),
              background: aba === 'entrar' ? 'rgba(0,171,103,0.15)' : 'transparent',
              color: aba === 'entrar' ? '#00AB67' : 'rgba(255,255,255,0.4)',
            }}>Entrar</button>
          <button type="button" onClick={() => { setAba('cadastrar'); setErro('') }}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 100, cursor: 'pointer',
              fontSize: 13, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif",
              border: '1px solid ' + (aba === 'cadastrar' ? '#00AB67' : 'rgba(255,255,255,0.1)'),
              background: aba === 'cadastrar' ? 'rgba(0,171,103,0.15)' : 'transparent',
              color: aba === 'cadastrar' ? '#00AB67' : 'rgba(255,255,255,0.4)',
            }}>Cadastrar</button>
        </div>

        {aba === 'cadastrar' && (
          <input type="text" placeholder="Nome completo" value={nome}
            onChange={e => setNome(e.target.value)} style={inputStyle} autoFocus />
        )}
        <input type="email" placeholder="E-mail" value={email}
          onChange={e => setEmail(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && aba === 'entrar' && submeter()}
          style={inputStyle} autoFocus={aba === 'entrar'} />
        {aba === 'cadastrar' && (
          <input type="tel" placeholder="Telefone (com DDD)" value={telefone}
            onChange={e => setTelefone(e.target.value)} style={inputStyle} />
        )}
        <input type="password" placeholder="Senha" value={senha}
          onChange={e => setSenha(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && submeter()}
          style={inputStyle} />

        {erro && (
          <div style={{ fontSize: 12, color: '#EF4444', marginBottom: 10, fontWeight: 500 }}>
            {erro}
          </div>
        )}

        <button
          onClick={submeter}
          disabled={loading}
          style={{
            width: '100%', padding: 15, marginTop: 4,
            background: 'linear-gradient(135deg, #00AB67 0%, #009B63 100%)',
            color: '#fff', border: 'none', borderRadius: 100,
            fontFamily: "'Plus Jakarta Sans', sans-serif",
            fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
            transition: 'all .2s',
          }}
        >
          {loading ? 'Aguarde...' : aba === 'entrar' ? 'Entrar' : 'Criar conta'}
        </button>
      </div>
    </div>
  )
}
