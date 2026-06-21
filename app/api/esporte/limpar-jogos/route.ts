import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verificarToken } from '@/lib/auth'

export async function DELETE(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }
  const slug = req.nextUrl.searchParams.get('bolao')
  if (!slug) return NextResponse.json({ error: 'bolao obrigatório' }, { status: 400 })

  const { error } = await supabase.from('jogos').delete().eq('bolao_slug', slug)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
