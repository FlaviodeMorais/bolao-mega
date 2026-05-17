import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verificarToken } from '@/lib/auth'

async function isAdmin(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  return token ? verificarToken(token) : false
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const body = await req.json()
  const fields: Record<string, unknown> = {}
  if ('status'         in body) fields.status          = body.status
  if ('acrescimo_pago' in body) fields.acrescimo_pago  = body.acrescimo_pago

  if (!Object.keys(fields).length) return NextResponse.json({ error: 'Nenhum campo' }, { status: 400 })

  const { error } = await supabase
    .from('participantes')
    .update(fields)
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// Soft delete — preserva histórico alterando status para 'cancelado'
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { error } = await supabase
    .from('participantes')
    .update({ status: 'cancelado' })
    .eq('id', params.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
