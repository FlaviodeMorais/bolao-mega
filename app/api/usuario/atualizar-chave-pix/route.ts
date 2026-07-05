import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verificarTokenUsuario } from '@/lib/auth-usuario'

export async function POST(req: NextRequest) {
  const token = req.cookies.get('user_token')?.value
  const uid = token ? await verificarTokenUsuario(token) : null
  if (!uid) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { chavePix } = await req.json()
  if (!chavePix?.trim()) return NextResponse.json({ error: 'Chave PIX obrigatória' }, { status: 400 })

  const { error } = await supabase.from('usuarios').update({ chave_pix: chavePix.trim() }).eq('id', uid)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
