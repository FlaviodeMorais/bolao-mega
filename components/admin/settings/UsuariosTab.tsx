'use client'

import { useEffect, useState } from 'react'
import styles from '@/app/admin/admin.module.css'

interface Usuario {
  id: string
  nome: string
  email: string
  telefone: string
  chave_pix: string
  senha_temporaria: boolean
  created_at: string
}

interface EditForm {
  nome: string
  email: string
  telefone: string
  chave_pix: string
}

export default function UsuariosTab() {
  const [usuarios, setUsuarios]   = useState<Usuario[]>([])
  const [loading, setLoading]     = useState(true)
  const [busca, setBusca]         = useState('')
  const [editando, setEditando]   = useState<string | null>(null)
  const [form, setForm]           = useState<EditForm>({ nome: '', email: '', telefone: '', chave_pix: '' })
  const [salvando, setSalvando]   = useState(false)
  const [resetando, setResetando] = useState<string | null>(null)
  const [migrando, setMigrando]   = useState(false)
  const [msg, setMsg]             = useState('')

  async function carregar() {
    setLoading(true)
    const res = await fetch('/api/admin/usuarios').then(r => r.json())
    setUsuarios(res.usuarios || [])
    setLoading(false)
  }

  useEffect(() => { carregar() }, [])

  function abrirEdicao(u: Usuario) {
    setEditando(u.id)
    setForm({ nome: u.nome, email: u.email, telefone: u.telefone, chave_pix: u.chave_pix || '' })
  }

  async function salvarEdicao() {
    if (!editando) return
    setSalvando(true)
    const res = await fetch(`/api/admin/usuarios/${editando}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    }).then(r => r.json())
    setSalvando(false)
    if (res.ok) { setEditando(null); flash('✅ Cadastro atualizado'); carregar() }
    else flash('❌ ' + res.error)
  }

  async function excluir(u: Usuario) {
    if (!confirm(`Excluir o usuário ${u.nome}? Esta ação não pode ser desfeita.`)) return
    const res = await fetch(`/api/admin/usuarios/${u.id}`, { method: 'DELETE' }).then(r => r.json())
    if (res.ok) { flash('✅ Usuário excluído'); carregar() }
    else flash('❌ ' + res.error)
  }

  async function resetarSenha(u: Usuario, via: string[]) {
    setResetando(u.id)
    const res = await fetch(`/api/admin/usuarios/${u.id}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ via }),
    }).then(r => r.json())
    setResetando(null)
    if (res.ok) {
      const r = res.resultados as Record<string, string>
      const partes = Object.entries(r).map(([k, v]) => `${k}: ${v}`).join(' · ')
      flash(`✅ Senha resetada — ${partes}`)
      carregar()
    } else flash('❌ ' + res.error)
  }

  async function migrar() {
    if (!confirm('Isso criará contas para todos os participantes com e-mail que ainda não têm conta, e enviará a senha temporária por e-mail. Continuar?')) return
    setMigrando(true)
    const res = await fetch('/api/admin/migrar-usuarios', { method: 'POST' }).then(r => r.json())
    setMigrando(false)
    if (!res.ok) { flash('❌ ' + res.error); return }
    const { criados, ignorados, erros } = res
    const partes = [
      criados.length  ? `✅ ${criados.length} conta(s) criada(s)` : '',
      ignorados.length ? `⏭️ ${ignorados.length} já existia(m)` : '',
      erros.length    ? `❌ ${erros.length} erro(s): ${erros.slice(0,3).join(', ')}` : '',
    ].filter(Boolean).join(' · ')
    flash(partes || '✅ Nenhum participante novo para migrar')
    if (criados.length) carregar()
  }

  function flash(text: string) {
    setMsg(text)
    setTimeout(() => setMsg(''), 8000)
  }

  const filtrados = usuarios.filter(u =>
    !busca || [u.nome, u.email, u.telefone].some(v => v?.toLowerCase().includes(busca.toLowerCase()))
  )

  function fmt(tel: string) {
    const d = (tel || '').replace(/\D/g, '')
    if (d.length === 11) return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
    if (d.length === 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
    return tel
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Cabeçalho */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="search"
          placeholder="Buscar por nome, e-mail ou telefone…"
          value={busca}
          onChange={e => setBusca(e.target.value)}
          className={styles.settingsInput}
          style={{ flex: 1, minWidth: 200 }}
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
          {migrando ? '⏳ Migrando…' : '🔁 Migrar participantes'}
        </button>
      </div>

      {msg && (
        <div style={{ padding: '10px 14px', borderRadius: 8, background: msg.startsWith('✅') ? '#e8f5e9' : '#fce4ec', color: msg.startsWith('✅') ? '#1b5e20' : '#b71c1c', fontSize: 13 }}>
          {msg}
        </div>
      )}

      {loading && <p style={{ color: '#64748b', fontSize: 13 }}>Carregando…</p>}

      {!loading && filtrados.length === 0 && (
        <p style={{ color: '#64748b', fontSize: 13 }}>Nenhum usuário encontrado.</p>
      )}

      {/* Lista */}
      {filtrados.map(u => (
        <div key={u.id} style={{ border: '1px solid #e2e8f0', borderRadius: 10, overflow: 'hidden', background: '#fff' }}>
          {/* Linha principal */}
          <div style={{ padding: '12px 16px', display: 'flex', gap: 12, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontWeight: 600, fontSize: 14, color: '#0d1b2a', display: 'flex', alignItems: 'center', gap: 6 }}>
                {u.nome}
                {u.senha_temporaria && (
                  <span style={{ fontSize: 10, background: '#fff3e0', color: '#e65100', borderRadius: 4, padding: '1px 6px', fontWeight: 700 }}>
                    SENHA TEMP
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
                {u.email}
              </div>
              <div style={{ fontSize: 12, color: '#64748b' }}>
                📱 {fmt(u.telefone)} {u.chave_pix && `· PIX: ${u.chave_pix}`}
              </div>
            </div>

            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button
                type="button"
                onClick={() => editando === u.id ? setEditando(null) : abrirEdicao(u)}
                style={{ fontSize: 12, padding: '5px 10px', borderRadius: 6, border: '1px solid #cbd5e1', background: editando === u.id ? '#e8f5e9' : '#f8fafc', cursor: 'pointer', color: '#334155' }}
              >
                ✏️ Editar
              </button>
              <button
                type="button"
                onClick={() => resetarSenha(u, ['email'])}
                disabled={resetando === u.id}
                style={{ fontSize: 12, padding: '5px 10px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', color: '#334155' }}
              >
                {resetando === u.id ? '…' : '📧 Reset e-mail'}
              </button>
              <button
                type="button"
                onClick={() => resetarSenha(u, ['email', 'whatsapp'])}
                disabled={resetando === u.id}
                style={{ fontSize: 12, padding: '5px 10px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', color: '#334155' }}
              >
                {resetando === u.id ? '…' : '💬 Reset e-mail + WA'}
              </button>
              <button
                type="button"
                onClick={() => excluir(u)}
                style={{ fontSize: 12, padding: '5px 10px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fff5f5', cursor: 'pointer', color: '#dc2626' }}
              >
                🗑️
              </button>
            </div>
          </div>

          {/* Formulário de edição inline */}
          {editando === u.id && (
            <div style={{ borderTop: '1px solid #e2e8f0', padding: '12px 16px', background: '#f8fafc', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
              {(['nome', 'email', 'telefone', 'chave_pix'] as const).map(campo => (
                <div key={campo}>
                  <label className={styles.settingsLabel}>
                    {campo === 'nome' ? 'Nome' : campo === 'email' ? 'E-mail' : campo === 'telefone' ? 'Telefone' : 'Chave PIX'}
                  </label>
                  <input
                    type="text"
                    value={form[campo]}
                    onChange={e => setForm(f => ({ ...f, [campo]: e.target.value }))}
                    className={styles.settingsInput}
                  />
                </div>
              ))}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8 }}>
                <button
                  type="button"
                  onClick={salvarEdicao}
                  disabled={salvando}
                  className={styles.settingsSave}
                  style={{ flex: 1 }}
                >
                  {salvando ? 'Salvando…' : '💾 Salvar'}
                </button>
                <button
                  type="button"
                  onClick={() => setEditando(null)}
                  style={{ padding: '8px 12px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontSize: 12, color: '#64748b' }}
                >
                  Cancelar
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      <div style={{ fontSize: 12, color: '#94a3b8', textAlign: 'right' }}>
        {filtrados.length} de {usuarios.length} usuário(s)
      </div>
    </div>
  )
}
