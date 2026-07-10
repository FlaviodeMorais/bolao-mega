import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verificarToken } from '@/lib/auth'

function telVariants(t: string): string[] {
  const d = (t || '').replace(/\D/g, '')
  if (!d) return []
  const base = d.startsWith('55') ? d.slice(2) : d
  return [base, `55${base}`, `+55${base}`]
}

// POST /api/admin/vincular-participantes
// Percorre participantes e participantes_esporte sem usuario_id e popula
// com base no e-mail ou telefone correspondente em usuarios.
export async function POST(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { data: usuarios } = await supabase
    .from('usuarios')
    .select('id, email, telefone')

  if (!usuarios?.length) return NextResponse.json({ vinculados: 0, msg: 'Nenhum usuário encontrado' })

  const porEmail = new Map<string, string>()
  const porTel   = new Map<string, string>()
  for (const u of usuarios) {
    if (u.email)    porEmail.set(u.email.toLowerCase().trim(), u.id)
    if (u.telefone) {
      for (const v of telVariants(u.telefone)) porTel.set(v, u.id)
    }
  }

  function resolveId(email: string | null, tel: string | null): string | null {
    if (email) { const id = porEmail.get(email.toLowerCase().trim()); if (id) return id }
    if (tel)   { for (const v of telVariants(tel)) { const id = porTel.get(v); if (id) return id } }
    return null
  }

  let vinculados = 0

  // ── participantes (loteria) ────────────────────────────────────────────────
  const { data: lot } = await supabase
    .from('participantes')
    .select('id, email, telefone')
    .is('usuario_id', null)

  for (const p of lot || []) {
    const uid = resolveId(p.email, p.telefone)
    if (!uid) continue
    const { error } = await supabase.from('participantes').update({ usuario_id: uid }).eq('id', p.id)
    if (!error) vinculados++
  }

  // ── participantes_esporte ──────────────────────────────────────────────────
  const { data: esp } = await supabase
    .from('participantes_esporte')
    .select('id, email, telefone')
    .is('usuario_id', null)

  for (const p of esp || []) {
    const uid = resolveId(p.email, p.telefone)
    if (!uid) continue
    const { error } = await supabase.from('participantes_esporte').update({ usuario_id: uid }).eq('id', p.id)
    if (!error) vinculados++
  }

  return NextResponse.json({
    ok: true,
    vinculados,
    msg: `${vinculados} participante(s) vinculado(s) a uma conta de usuário`,
  })
}
