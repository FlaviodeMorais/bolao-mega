import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verificarToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { linhas } = await req.json()
  if (!Array.isArray(linhas) || linhas.length === 0) {
    return NextResponse.json({ ok: false, erro: 'Nenhuma linha enviada' })
  }

  const { error } = await supabase
    .from('mega_historico')
    .upsert(linhas, { onConflict: 'concurso' })

  if (error) return NextResponse.json({ ok: false, erro: error.message })
  return NextResponse.json({ ok: true, inseridos: linhas.length })
}
