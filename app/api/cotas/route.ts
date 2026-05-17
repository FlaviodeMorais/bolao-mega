import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const concurso = req.nextUrl.searchParams.get('concurso')
  const bolao    = req.nextUrl.searchParams.get('bolao') || null
  if (!concurso) return NextResponse.json({ cotas: [] })

  let query = supabase
    .from('participantes')
    .select('cotas')
    .eq('concurso', parseInt(concurso))
    .neq('status', 'cancelado')

  if (bolao) query = query.eq('bolao_slug', bolao)
  else       query = query.is('bolao_slug', null)

  const { data } = await query
  const taken = [...new Set((data || []).flatMap(r => r.cotas as string[]))]
  return NextResponse.json({ cotas: taken })
}
