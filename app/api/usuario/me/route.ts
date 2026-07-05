import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verificarTokenUsuario } from '@/lib/auth-usuario'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('user_token')?.value
  const uid = token ? await verificarTokenUsuario(token) : null
  if (!uid) return NextResponse.json({ usuario: null })

  const { data } = await supabase.from('usuarios').select('id, nome, email, telefone, senha_temporaria, chave_pix').eq('id', uid).single()
  if (!data) return NextResponse.json({ usuario: null })

  return NextResponse.json({ usuario: data })
}
