import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const concurso = req.nextUrl.searchParams.get('concurso')
  const bolao    = req.nextUrl.searchParams.get('bolao') || req.nextUrl.searchParams.get('bolao_slug') || null

  // Se não tem bolao_slug nem concurso, não retorna nada
  if (!bolao && !concurso) return NextResponse.json({ participantes: [] })

  let query = supabase
    .from('participantes')
    .select('id, nome, cotas, total, status, telefone, email, acrescimo, acrescimo_pago, created_at')
    .neq('status', 'cancelado')
    .order('created_at', { ascending: true })

  // Filtra por concurso apenas se fornecido
  if (concurso) query = query.eq('concurso', parseInt(concurso))

  if (bolao) query = query.eq('bolao_slug', bolao)
  else       query = query.is('bolao_slug', null)

  const { data } = await query
  return NextResponse.json({ participantes: data || [] })
}

// Inscrição direta foi substituída pelo carrinho (/api/checkout) — mantido como
// 410 pra qualquer chamador antigo/externo não passar despercebido.
export async function POST() {
  return NextResponse.json({ error: 'Inscrição direta desativada. Use o carrinho (/api/checkout).' }, { status: 410 })
}
