import { NextResponse } from 'next/server'

// Geração de PIX direta foi substituída pelo carrinho (/api/checkout) — mantido
// como 410 pra qualquer chamador antigo/externo não passar despercebido.
export async function POST() {
  return NextResponse.json({ error: 'Geração de PIX direta desativada. Use o carrinho (/api/checkout).' }, { status: 410 })
}
