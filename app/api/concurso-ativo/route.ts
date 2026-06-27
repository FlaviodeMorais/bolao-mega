import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verificarToken } from '@/lib/auth'

export async function GET() {
  const { data } = await supabase.from('config').select('key, value')
  const map = Object.fromEntries((data || []).map(r => [r.key, r.value]))
  let ultimoDezenas: number[] = []
  try { ultimoDezenas = JSON.parse(map['ultimo_resultado_dezenas'] || '[]') } catch { ultimoDezenas = [] }
  return NextResponse.json({
    concurso:          map['concurso_ativo']          || '',
    data:              map['data_ativo']               || '',
    premio:            map['premio_ativo']             || '',
    ultimoConcurso:    map['ultimo_resultado_concurso'] || '',
    ultimoDezenas,
  })
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { concurso, data, premio } = await req.json()
  await supabase.from('config').upsert([
    { key: 'concurso_ativo', value: String(concurso), updated_at: new Date().toISOString() },
    { key: 'data_ativo',     value: String(data),     updated_at: new Date().toISOString() },
    { key: 'premio_ativo',   value: String(premio),   updated_at: new Date().toISOString() },
  ])
  return NextResponse.json({ ok: true })
}
