'use client'
import { useState, useEffect } from 'react'
import { TERMOS_PARTICIPACAO } from '@/lib/termos'

interface Props {
  onClose: () => void
  onAutenticado: (usuario: { id: string; nome: string; email: string; telefone: string }) => void
}

type Aba = 'entrar' | 'cadastrar' | 'esqueci'

export default function UserAuthModal({ onClose, onAutenticado }: Props) {
  const [aba, setAba] = useState<Aba>('entrar')
  const [nome, setNome] = useState('')
  const [identificador, setIdentificador] = useState('')  // e-mail ou celular no login
  const [email, setEmail] = useState('')
  const [telefone, setTelefone] = useState('')
  const [chavePix, setChavePix] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState('')
  const [sucesso, setSucesso] = useState('')
  const [loading, setLoading] = useState(false)
  const [aceitouTermos, setAceitouTermos] = useState(false)
  const [showTermos, setShowTermos] = useState(false)

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
    setSucesso('')

    if (aba === 'esqueci') {
      if (!identificador.trim()) { setErro('Informe seu e-mail ou celular'); return }
      setLoading(true)
      await fetch('/api/usuario/esqueci-senha', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ identificador }),
      })
      setLoading(false)
      setSucesso('Se o cadastro existir, você receberá a nova senha por WhatsApp e/ou e-mail.')
      return
    }

    if (aba === 'entrar') {
      if (!identificador || !senha) { setErro('Preencha e-mail/celular e senha'); return }
    } else {
      if (!nome.trim()) { setErro('Preencha seu nome'); return }
      if (!email) { setErro('Preencha seu e-mail'); return }
      if (telefone.replace(/\D/g, '').length < 10) { setErro('Telefone inválido'); return }
      if (!chavePix.trim()) { setErro('Preencha sua Chave PIX'); return }
      if (senha.length < 6) { setErro('Senha deve ter ao menos 6 caracteres'); return }
      if (!aceitouTermos) { setErro('É necessário aceitar os Termos de Participação'); return }
    }

    setLoading(true)
    try {
      const url = aba === 'entrar' ? '/api/usuario/login' : '/api/usuario/cadastro'
      const body = aba === 'entrar'
        ? { identificador, senha }
        : { nome, email, telefone, chavePix, senha, aceitouTermos }
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
          <img src="/icon.png" alt="BetMais" style={{ width: 48, height: 48, borderRadius: 12, objectFit: 'cover' }} />
        </div>

        <div style={{ fontSize: 26, fontWeight: 800, color: '#00AB67', letterSpacing: -0.5, marginBottom: 24 }}>
          {aba === 'entrar' ? 'Entrar' : 'Criar conta'}
        </div>

        {aba !== 'esqueci' && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
            <button type="button" onClick={() => { setAba('entrar'); setErro(''); setSucesso('') }}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 100, cursor: 'pointer',
                fontSize: 13, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif",
                border: '1px solid ' + (aba === 'entrar' ? '#00AB67' : 'rgba(255,255,255,0.1)'),
                background: aba === 'entrar' ? 'rgba(0,171,103,0.15)' : 'transparent',
                color: aba === 'entrar' ? '#00AB67' : 'rgba(255,255,255,0.4)',
              }}>Entrar</button>
            <button type="button" onClick={() => { setAba('cadastrar'); setErro(''); setSucesso('') }}
              style={{
                flex: 1, padding: '10px 0', borderRadius: 100, cursor: 'pointer',
                fontSize: 13, fontWeight: 700, fontFamily: "'Plus Jakarta Sans', sans-serif",
                border: '1px solid ' + (aba === 'cadastrar' ? '#00AB67' : 'rgba(255,255,255,0.1)'),
                background: aba === 'cadastrar' ? 'rgba(0,171,103,0.15)' : 'transparent',
                color: aba === 'cadastrar' ? '#00AB67' : 'rgba(255,255,255,0.4)',
              }}>Cadastrar</button>
          </div>
        )}

        {aba === 'esqueci' && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.7)', marginBottom: 16, textAlign: 'left', lineHeight: 1.5 }}>
              Informe seu e-mail ou número de celular cadastrado. Enviaremos uma nova senha temporária por WhatsApp e/ou e-mail.
            </div>
            <input
              type="text"
              placeholder="E-mail ou celular (com DDD)"
              value={identificador}
              onChange={e => setIdentificador(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && submeter()}
              style={inputStyle}
              autoFocus
            />
          </div>
        )}

        {aba === 'entrar' && (<>
          <input
            type="text"
            placeholder="E-mail ou celular (com DDD)"
            value={identificador}
            onChange={e => setIdentificador(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submeter()}
            style={inputStyle}
            autoFocus
          />
          <input type="password" placeholder="Senha" value={senha}
            onChange={e => setSenha(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submeter()}
            style={inputStyle} />
          <div style={{ textAlign: 'right', marginTop: -6, marginBottom: 10 }}>
            <button
              type="button"
              onClick={() => { setAba('esqueci'); setErro(''); setSucesso('') }}
              style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 12, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Esqueci minha senha
            </button>
          </div>
        </>)}

        {aba === 'cadastrar' && (<>
          <input type="text" placeholder="Nome completo" value={nome}
            onChange={e => setNome(e.target.value)} style={inputStyle} autoFocus />
          <input type="email" placeholder="E-mail" value={email}
            onChange={e => setEmail(e.target.value)} style={inputStyle} />
          <input type="tel" placeholder="Telefone (com DDD)" value={telefone}
            onChange={e => setTelefone(e.target.value)} style={inputStyle} />
          <input type="text" placeholder="Chave PIX (CPF, e-mail, telefone ou aleatória)" value={chavePix}
            onChange={e => setChavePix(e.target.value)} style={inputStyle} autoComplete="off" />
          <input type="password" placeholder="Senha" value={senha}
            onChange={e => setSenha(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && submeter()}
            style={inputStyle} />
        </>)}

        {aba === 'cadastrar' && (
          <label style={{
            display: 'flex', alignItems: 'flex-start', gap: 8, textAlign: 'left',
            marginBottom: 14, fontSize: 12.5, color: 'rgba(255,255,255,0.65)', cursor: 'pointer',
          }}>
            <input type="checkbox" checked={aceitouTermos}
              onChange={e => setAceitouTermos(e.target.checked)}
              style={{ marginTop: 2, flexShrink: 0 }} />
            <span>
              Li e concordo com os{' '}
              <span onClick={e => { e.preventDefault(); setShowTermos(true) }}
                style={{ color: '#00AB67', textDecoration: 'underline', fontWeight: 600 }}>
                Termos de Participação
              </span>
            </span>
          </label>
        )}

        {erro && (
          <div style={{ fontSize: 12, color: '#EF4444', marginBottom: 10, fontWeight: 500 }}>
            {erro}
          </div>
        )}
        {sucesso && (
          <div style={{ fontSize: 12, color: '#34d399', marginBottom: 10, fontWeight: 500, lineHeight: 1.5 }}>
            {sucesso}
          </div>
        )}

        {!sucesso && (
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
            {loading ? 'Aguarde...' : aba === 'entrar' ? 'Entrar' : aba === 'esqueci' ? 'Enviar nova senha' : 'Criar conta'}
          </button>
        )}

        {aba === 'esqueci' && (
          <button
            type="button"
            onClick={() => { setAba('entrar'); setErro(''); setSucesso(''); setIdentificador('') }}
            style={{ marginTop: 12, background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', fontSize: 13, cursor: 'pointer', fontFamily: "'Plus Jakarta Sans', sans-serif", width: '100%' }}
          >
            ← Voltar para login
          </button>
        )}
      </div>

      {showTermos && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 10000,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'rgba(6,9,15,0.9)', padding: 24,
          }}
          onClick={e => { if (e.target === e.currentTarget) setShowTermos(false) }}
        >
          <div style={{
            background: 'rgba(13,28,46,0.98)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 20, padding: 28, width: '100%', maxWidth: 440,
            maxHeight: '80vh', overflowY: 'auto',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: '#fff', marginBottom: 16 }}>
              📋 Termos de Participação
            </div>
            {TERMOS_PARTICIPACAO.map((r, i) => (
              <div key={i} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: '#fff', marginBottom: 3 }}>{r.icon} {r.titulo}</div>
                <div style={{ fontSize: 12.5, color: 'rgba(255,255,255,0.6)', lineHeight: 1.5 }}>{r.texto}</div>
              </div>
            ))}
            <button
              onClick={() => setShowTermos(false)}
              style={{
                width: '100%', padding: 13, marginTop: 6,
                background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff', borderRadius: 100, fontSize: 14, fontWeight: 700, cursor: 'pointer',
                fontFamily: "'Plus Jakarta Sans', sans-serif",
              }}
            >
              Fechar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
