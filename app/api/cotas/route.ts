import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const concurso = req.nextUrl.searchParams.get('concurso')
  if (!concurso) return NextResponse.json({ cotas: [] })

  const { data } = await supabase
    .from('participantes')
    .select('cotas')
    .eq('concurso', parseInt(concurso))
    .neq('status', 'cancelado')

  const taken = [...new Set((data || []).flatMap(r => r.cotas as string[]))]
  return NextResponse.json({ cotas: taken })
}
