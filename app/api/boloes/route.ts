import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verificarToken } from '@/lib/auth'

export async function GET() {
  const { data } = await supabase
    .from('boloes')
    .select('*')
    .order('criado_em', { ascending: false })
  return NextResponse.json({ boloes: data || [] })
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { nome, slug } = await req.json()
  if (!nome || !slug) return NextResponse.json({ error: 'Nome e slug obrigatórios' }, { status: 400 })

  const { data, error } = await supabase
    .from('boloes')
    .insert({ nome, slug, ativo: true })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ bolao: data })
}
