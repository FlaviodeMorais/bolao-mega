import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get('bolao')
  if (!slug) return NextResponse.json({ participantes: [] })

  const { data } = await supabase
    .from('participantes_esporte')
    .select('id, nome, telefone, email, total, status, pontos_total, created_at')
    .eq('bolao_slug', slug)
    .neq('status', 'cancelado')
    .order('pontos_total', { ascending: false })

  return NextResponse.json({ participantes: data || [] })
}

// Inscrição direta foi substituída pelo carrinho (/api/checkout) — mantido como
// 410 pra qualquer chamador antigo/externo não passar despercebido.
export async function POST() {
  return NextResponse.json({ error: 'Inscrição direta desativada. Use o carrinho (/api/checkout).' }, { status: 410 })
}
