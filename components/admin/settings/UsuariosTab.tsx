'use client'

import { useEffect, useState } from 'react'
import styles from '@/app/admin/admin.module.css'

interface Participante {
  chave: string
  nome: string
  email: string | null
  telefone: string
  tem_conta: boolean
  usuario_id: string | null
  senha_temporaria: boolean
  criado_em: string | null
}

export default function UsuariosTab() {
  const [lista, setLista]       = useState<Participante[]>([])
  const [loading, setLoading]   = useState(true)
  const [busca, setBusca]       = useState('')
  const [migrando, setMigrando] = useState(false)
  const [enviando, setEnviando] = useState<string | null>(null)
  const [editando, setEditando] = useState<string | null>(null)
  const [form, setForm]         = useState({ nome: '', email: '', telefone: '', chave_pix: '' })
  const [salvando, setSalvando] = useState(false)
  const [msg, setMsg]           = useState('')

  async function carregar() {
    setLoading(true)
    const res = await fetch('/api/admin/usuarios').then(r => r.json())
    setLista(res.usuarios || [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  function flash(text: string) {
    setMsg(text)
    setTimeout(() => setMsg(''), 8000)
  }

  async function migrar() {
    if (!confirm('Criará contas para participantes que ainda não têm, enviando senha temporária por e-mail e/ou WhatsApp conforme disponível. Continuar?')) return
    setMigrando(true)
    const res = await fetch('/api/admin/migrar-usuarios', { method: 'POST' }).then(r => r.json())
    setMigrando(false)
    if (!res.ok) { flash('❌ ' + res.error); return }
    const { criados, ignorados, erros } = res
    const partes = [
      criados.length   ? `✅ ${criados.length} conta(s) criada(s)` : '',
      ignorados.length ? `⏭️ ${ignorados.length} já existia(m)` : '',
      erros.length     ? `❌ ${erros.length} erro(s)` : '',
    ].filter(Boolean).join(' · ')
    flash(partes || '✅ Nenhum participante novo')
    carregar()
  }

  async function convidar(p: Participante, via: string[]) {
    setEnviando(p.chave)
    const res = await fetch('/api/admin/convidar-participante', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: p.nome, email: p.email, telefone: p.telefone, via }),
    }).then(r => r.json())
    setEnviando(null)
    if (!res.ok) { flash('❌ ' + res.error); return }
    const partes = Object.entries(res.resultados as Record<string, string>)
      .map(([k, v]) => `${k}: ${v}`).join(' · ')
    flash(`✅ ${res.criada ? 'Conta criada' : 'Senha resetada'} — ${partes}`)
    carregar()
  }

  async function salvarEdicao(p: Participante) {
    if (!p.usuario_id) return
    setSalvando(true)
    const res = await fetch(`/api/admin/usuarios/${p.usuario_id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    }).then(r => r.json())
    setSalvando(false)
    if (res.ok) { setEditando(null); flash('✅ Cadastro atualizado'); carregar() }
    else flash('❌ ' + res.error)
  }

  function fmt(tel: string) {
    const d = (tel || '').replace(/\D/g, '')
    if (d.length === 13) return `+${d.slice(0,2)} (${d.slice(2,4)}) ${d.slice(4,9)}-${d.slice(9)}`
    if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
    if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
    return tel
  }

  const filtrados = lista.filter(p =>
    !busca || [p.nome, p.email, p.telefone].some(v => v?.toLowerCase().includes(busca.toLowerCase()))
  )

  const comConta  = filtrados.filter(p => p.tem_conta).length
  const semConta  = filtrados.filter(p => !p.tem_conta).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Barra de ações */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="search"
          placeholder="Buscar por nome, e-mail ou telefone…"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className={styles.settingsInput}
          style={{ flex: 1, minWidth: 180 }}
        />
        <button type="button" className={styles.settingsSave} onClick={carregar} style={{ whiteSpace: 'nowrap' }}>
          🔄 Atualizar
        </button>
        <button
          type="button"
          onClick={migrar}
          disabled={migrando}
          style={{ whiteSpace: 'nowrap', fontSize: 13, padding: '8px 14px', borderRadius: 8, border: '1px solid #a5b4fc', background: '#eef2ff', cursor: migrando ? 'not-allowed' : 'pointer', color: '#3730a3', fontWeight: 600 }}
        >
          {migrando ? '⏳ Migrando…' : '🔁 Migrar todos'}
        </button>
      </div>

      {msg && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: msg.startsWith('✅') ? '#e8f5e9' : '#fce4ec', color: msg.startsWith('✅') ? '#1b5e20' : '#b71c1c', fontSize: 13 }}>
          {msg}
        </div>
      )}

      {/* Totais */}
      {!loading && lista.length > 0 && (
        <div style={{ display: 'flex', gap: 12, fontSize: 12, color: '#64748b' }}>
          <span>👥 {lista.length} participante(s)</span>
          <span>✅ {comConta} com conta</span>
          {semConta > 0 && <span style={{ color: '#b45309' }}>⚠️ {semConta} sem conta</span>}
        </div>
      )}

      {loading && <p style={{ color: '#64748b', fontSize: 13 }}>Carregando…</p>}
      {!loading && filtrados.length === 0 && (
        <p style={{ color: '#64748b', fontSize: 13 }}>Nenhum participante encontrado.</p>
      )}

      {/* Lista */}
      {filtrados.map(p => (
        <div key={p.chave} style={{ border: `1px solid ${p.tem_conta ? '#e2e8f0' : '#fde68a'}`, borderRadius: 10, overflow: 'hidden', background: p.tem_conta ? '#fff' : '#fffbeb' }}>
          <div style={{ padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            {/* Info */}
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#0d1b2a', display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                {p.nome}
                {!p.tem_conta && (
                  <span style={{ fontSize: 10, background: '#fef3c7', color: '#92400e', borderRadius: 4, padding: '1px 6px', fontWeight: 700 }}>SEM CONTA</span>
                )}
                {p.tem_conta && p.senha_temporaria && (
                  <span style={{ fontSize: 10, background: '#fff3e0', color: '#e65100', borderRadius: 4, padding: '1px 6px', fontWeight: 700 }}>SENHA TEMP</span>
                )}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                {p.email ? `✉️ ${p.email}` : <span style={{ color: '#b45309' }}>sem e-mail</span>}
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                📱 {fmt(p.telefone) || <span style={{ color: '#b45309' }}>sem telefone</span>}
              </div>
            </div>

            {/* Ações */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Enviar convite / reset */}
              {p.telefone && (
                <button
                  type="button"
                  onClick={() => convidar(p, p.email ? ['whatsapp', 'email'] : ['whatsapp'])}
                  disabled={enviando === p.chave}
                  title={p.tem_conta ? 'Resetar senha e notificar' : 'Criar conta e enviar acesso'}
                  style={{ fontSize: 12, padding: '5px 10px', borderRadius: 6, border: '1px solid #bbf7d0', background: '#f0fdf4', cursor: enviando === p.chave ? 'not-allowed' : 'pointer', color: '#15803d', fontWeight: 600 }}
                >
                  {enviando === p.chave ? '…' : p.tem_conta ? '💬 Reset WA' : '💬 Convidar WA'}
                </button>
              )}
              {p.email && (
                <button
                  type="button"
                  onClick={() => convidar(p, ['email'])}
                  disabled={enviando === p.chave}
                  title={p.tem_conta ? 'Resetar senha por e-mail' : 'Criar conta e enviar por e-mail'}
                  style={{ fontSize: 12, padding: '5px 10px', borderRadius: 6, border: '1px solid #bfdbfe', background: '#eff6ff', cursor: enviando === p.chave ? 'not-allowed' : 'pointer', color: '#1d4ed8', fontWeight: 600 }}
                >
                  {enviando === p.chave ? '…' : p.tem_conta ? '📧 Reset e-mail' : '📧 Convidar e-mail'}
                </button>
              )}
              {/* Editar (só para quem tem conta) */}
              {p.usuario_id && (
                <button
                  type="button"
                  onClick={() => {
                    if (editando === p.chave) { setEditando(null); return }
                    setEditando(p.chave)
                    setForm({ nome: p.nome, email: p.email || '', telefone: p.telefone || '', chave_pix: '' })
                  }}
                  style={{ fontSize: 12, padding: '5px 10px', borderRadius: 6, border: '1px solid #cbd5e1', background: editando === p.chave ? '#e8f5e9' : '#f8fafc', cursor: 'pointer', color: '#334155' }}
                >
                  ✏️
                </button>
              )}
            </div>
          </div>

          {/* Edição inline */}
          {editando === p.chave && p.usuario_id && (
            <div style={{ borderTop: '1px solid #e2e8f0', padding: '12px 16px', background: '#f8fafc', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
              {(['nome', 'email', 'telefone', 'chave_pix'] as const).map(campo => (
                <div key={campo}>
                  <label className={styles.settingsLabel}>
                    {campo === 'nome' ? 'Nome' : campo === 'email' ? 'E-mail' : campo === 'telefone' ? 'Telefone' : 'Chave PIX'}
                  </label>
                  <input
                    type="text"
                    value={(form as Record<string, string>)[campo]}
                    onChange={e => setForm(f => ({ ...f, [campo]: e.target.value }))}
                    className={styles.settingsInput}
                  />
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                <button type="button" onClick={() => salvarEdicao(p)} disabled={salvando} className={styles.settingsSave} style={{ flex: 1 }}>
                  {salvando ? 'Salvando…' : '💾 Salvar'}
                </button>
                <button type="button" onClick={() => setEditando(null)} style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontSize: 12, color: '#64748b' }}>
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'right' }}>
        {filtrados.length} de {lista.length} participante(s)
      </div>
    </div>
  )
}
