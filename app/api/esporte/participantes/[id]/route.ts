import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verificarToken } from '@/lib/auth'

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { status } = await req.json()
  if (!['pago', 'aguardando', 'cancelado'].includes(status)) {
    return NextResponse.json({ error: 'Status inválido' }, { status: 400 })
  }

  const { error } = await supabase
    .from('participantes_esporte')
    .update({ status })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// Soft delete — preserva histórico alterando status para 'cancelado'
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { error } = await supabase
    .from('participantes_esporte')
    .update({ status: 'cancelado' })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
