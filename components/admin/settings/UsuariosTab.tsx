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

interface RegistroDup {
  nome: string
  email: string | null
  telefone: string
  chave_pix: string | null
  usuario_id: string | null
  senha_temporaria: boolean
}

interface FormMerge {
  nome: string
  email: string
  telefone: string
  chave_pix: string
  vencedor_idx: number
}

export default function UsuariosTab() {
  const [lista, setLista]           = useState<Participante[]>([])
  const [loading, setLoading]       = useState(true)
  const [busca, setBusca]           = useState('')
  const [migrando, setMigrando]     = useState(false)
  const [vinculando, setVinculando] = useState(false)
  const [enviando, setEnviando]     = useState<string | null>(null)
  const [editando, setEditando]     = useState<string | null>(null)
  const [form, setForm]             = useState({ nome: '', email: '', telefone: '', chave_pix: '' })
  const [salvando, setSalvando]     = useState(false)
  const [msg, setMsg]               = useState('')
  // Duplicatas
  const [dupGrupos, setDupGrupos]   = useState<RegistroDup[][]>([])
  const [dupLoading, setDupLoading] = useState(false)
  const [dupAberto, setDupAberto]   = useState<number | null>(null)
  const [mergeForm, setMergeForm]   = useState<FormMerge | null>(null)
  const [mesclando, setMesclando]   = useState(false)

  async function carregar() {
    setLoading(true)
    const res = await fetch('/api/admin/usuarios').then(r => r.json())
    setLista(res.usuarios || [])
    setLoading(false)
  }

  useEffect(() => { carregar(); carregarDuplic() }, [])

  async function carregarDuplic() {
    setDupLoading(true)
    const res = await fetch('/api/admin/usuarios/duplicatas').then(r => r.json())
    setDupGrupos(res.grupos || [])
    setDupLoading(false)
  }

  function abrirMerge(idx: number, grupo: RegistroDup[]) {
    setDupAberto(idx)
    // Preenche com os valores mais completos de cada campo
    const melhor = (campo: keyof RegistroDup) =>
      grupo.map(r => r[campo]).find(v => v) || ''
    setMergeForm({
      nome:          String(melhor('nome') || ''),
      email:         String(melhor('email') || ''),
      telefone:      String(melhor('telefone') || ''),
      chave_pix:     String(melhor('chave_pix') || ''),
      vencedor_idx:  grupo.findIndex(r => r.usuario_id) ?? 0,
    })
  }

  async function executarMerge(grupo: RegistroDup[]) {
    if (!mergeForm) return
    setMesclando(true)
    const vencedor = grupo[mergeForm.vencedor_idx]
    const perdedores = grupo.filter((_, i) => i !== mergeForm.vencedor_idx)
    const res = await fetch('/api/admin/usuarios/mesclar', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vencedor: { ...vencedor, ...mergeForm },
        perdedores,
      }),
    }).then(r => r.json())
    setMesclando(false)
    if (res.ok) {
      flash('✅ Contatos mesclados com sucesso')
      setDupAberto(null)
      setMergeForm(null)
      carregar()
      carregarDuplic()
    } else flash('❌ ' + res.error)
  }

  function flash(text: string) {
    setMsg(text)
    setTimeout(() => setMsg(''), 8000)
  }

  async function vincular() {
    setVinculando(true)
    const res = await fetch('/api/admin/vincular-participantes', { method: 'POST' }).then(r => r.json())
    setVinculando(false)
    if (!res.ok) { flash('❌ ' + res.error); return }
    flash(res.msg || `✅ ${res.vinculados} vinculado(s)`)
    carregar()
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

  async function excluirConta(p: Participante) {
    if (!p.usuario_id) return
    if (!confirm(`Excluir a conta de ${p.nome}? O histórico de participações é mantido, mas o acesso ao app será removido.`)) return
    const res = await fetch(`/api/admin/usuarios/${p.usuario_id}`, { method: 'DELETE' }).then(r => r.json())
    if (res.ok) { flash('✅ Conta excluída'); carregar() }
    else flash('❌ ' + res.error)
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
          onClick={vincular}
          disabled={vinculando}
          title="Vincula participantes existentes a contas de usuário pelo e-mail ou telefone"
          style={{ whiteSpace: 'nowrap', fontSize: 13, padding: '8px 14px', borderRadius: 8, border: '1px solid #6ee7b7', background: '#ecfdf5', cursor: vinculando ? 'not-allowed' : 'pointer', color: '#065f46', fontWeight: 600 }}
        >
          {vinculando ? '⏳ Vinculando…' : '🔗 Vincular participantes'}
        </button>
        <button
          type="button"
          onClick={migrar}
          disabled={migrando}
          title="Cria contas para participantes que ainda não têm, enviando senha temporária"
          style={{ whiteSpace: 'nowrap', fontSize: 13, padding: '8px 14px', borderRadius: 8, border: '1px solid #a5b4fc', background: '#eef2ff', cursor: migrando ? 'not-allowed' : 'pointer', color: '#3730a3', fontWeight: 600 }}
        >
          {migrando ? '⏳ Migrando…' : '🔁 Migrar todos'}
        </button>
      </div>

      {msg && (
        <div style={{ padding: '10px 14px', borderRadius: 8, fontSize: 13,
          background: msg.startsWith('❌') ? '#fce4ec' : '#e8f5e9',
          color:      msg.startsWith('❌') ? '#b71c1c' : '#1b5e20' }}>
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

      {/* ── Duplicatas ── */}
      {(dupLoading || dupGrupos.length > 0) && (
        <div style={{ border: '1px solid #fde68a', borderRadius: 10, overflow: 'hidden', background: '#fffbeb' }}>
          <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontWeight: 700, fontSize: 13, color: '#92400e' }}>
              ⚠️ {dupLoading ? 'Verificando duplicatas…' : `${dupGrupos.length} grupo(s) duplicado(s) detectado(s)`}
            </span>
            {!dupLoading && dupGrupos.length > 0 && (
              <span style={{ fontSize: 12, color: '#b45309' }}>Clique em cada grupo para revisar e mesclar</span>
            )}
          </div>

          {dupGrupos.map((grupo, gi) => (
            <div key={gi} style={{ borderTop: '1px solid #fde68a' }}>
              {/* Resumo do grupo */}
              <div
                style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', background: dupAberto === gi ? '#fef3c7' : '#fffde7' }}
                onClick={() => dupAberto === gi ? setDupAberto(null) : abrirMerge(gi, grupo)}
              >
                <span style={{ fontSize: 12, fontWeight: 600, color: '#78350f', flex: 1 }}>
                  {grupo.map(r => r.nome).join(' · ')}
                </span>
                <span style={{ fontSize: 11, color: '#a16207', background: '#fef9c3', borderRadius: 4, padding: '2px 8px' }}>
                  {grupo.length} registros
                </span>
                <span style={{ fontSize: 14, color: '#92400e' }}>{dupAberto === gi ? '▲' : '▼'}</span>
              </div>

              {/* Painel de merge */}
              {dupAberto === gi && mergeForm && (
                <div style={{ padding: '16px', background: '#fff', borderTop: '1px solid #fde68a' }}>
                  {/* Registros lado a lado */}
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${grupo.length}, 1fr)`, gap: 12, marginBottom: 16 }}>
                    {grupo.map((r, ri) => (
                      <div key={ri} style={{ border: `2px solid ${mergeForm.vencedor_idx === ri ? '#00AB67' : '#e2e8f0'}`, borderRadius: 8, padding: 10, fontSize: 12 }}>
                        <div style={{ fontWeight: 700, marginBottom: 6, color: '#0d1b2a' }}>{r.nome}</div>
                        <div style={{ color: '#64748b' }}>✉️ {r.email || <em>sem e-mail</em>}</div>
                        <div style={{ color: '#64748b' }}>📱 {r.telefone || <em>sem telefone</em>}</div>
                        <div style={{ color: '#64748b' }}>PIX: {r.chave_pix || <em>—</em>}</div>
                        <div style={{ marginTop: 4, color: r.usuario_id ? '#15803d' : '#b45309', fontSize: 11 }}>
                          {r.usuario_id ? '✅ tem conta' : '⚠️ sem conta'}
                        </div>
                        <button
                          type="button"
                          onClick={() => setMergeForm(f => f ? { ...f, vencedor_idx: ri } : f)}
                          style={{ marginTop: 8, width: '100%', fontSize: 11, padding: '4px 0', borderRadius: 6, border: `1px solid ${mergeForm.vencedor_idx === ri ? '#00AB67' : '#cbd5e1'}`, background: mergeForm.vencedor_idx === ri ? '#d1fae5' : '#f8fafc', cursor: 'pointer', color: mergeForm.vencedor_idx === ri ? '#065f46' : '#334155', fontWeight: 600 }}
                        >
                          {mergeForm.vencedor_idx === ri ? '★ Registro base' : 'Usar como base'}
                        </button>
                      </div>
                    ))}
                  </div>

                  {/* Campos finais (admin edita) */}
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 8 }}>Cadastro final após mescla:</div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
                    {(['nome', 'email', 'telefone', 'chave_pix'] as const).map(campo => (
                      <div key={campo}>
                        <label className={styles.settingsLabel}>
                          {campo === 'nome' ? 'Nome' : campo === 'email' ? 'E-mail' : campo === 'telefone' ? 'Telefone' : 'Chave PIX'}
                        </label>
                        <input
                          type="text"
                          value={(mergeForm as unknown as Record<string, string>)[campo]}
                          onChange={e => setMergeForm(f => f ? { ...f, [campo]: e.target.value } : f)}
                          className={styles.settingsInput}
                          style={{ fontSize: 12 }}
                        />
                        {/* Botões de copiar valor de cada registro */}
                        <div style={{ display: 'flex', gap: 4, marginTop: 4, flexWrap: 'wrap' }}>
                          {grupo.map((r, ri) => {
                            const val = String((r as unknown as Record<string, unknown>)[campo] || '')
                            return val ? (
                              <button key={ri} type="button"
                                onClick={() => setMergeForm(f => f ? { ...f, [campo]: val } : f)}
                                style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, border: '1px solid #cbd5e1', background: '#f8fafc', cursor: 'pointer', color: '#475569' }}
                                title={`Usar valor do registro ${ri + 1}`}
                              >
                                #{ri + 1}: {val.length > 20 ? val.slice(0, 18) + '…' : val}
                              </button>
                            ) : null
                          })}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                    <button
                      type="button"
                      onClick={() => executarMerge(grupo)}
                      disabled={mesclando}
                      className={styles.settingsSave}
                    >
                      {mesclando ? '⏳ Mesclando…' : '🔀 Confirmar mescla'}
                    </button>
                    <button
                      type="button"
                      onClick={() => { setDupAberto(null); setMergeForm(null) }}
                      style={{ padding: '8px 14px', borderRadius: 6, border: '1px solid #cbd5e1', background: '#fff', cursor: 'pointer', fontSize: 13, color: '#64748b' }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
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
                  ✏️ Editar
                </button>
              )}
              {/* Excluir conta */}
              {p.usuario_id && (
                <button
                  type="button"
                  onClick={() => excluirConta(p)}
                  style={{ fontSize: 12, padding: '5px 10px', borderRadius: 6, border: '1px solid #fca5a5', background: '#fff5f5', cursor: 'pointer', color: '#dc2626' }}
                >
                  🗑️ Excluir conta
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
