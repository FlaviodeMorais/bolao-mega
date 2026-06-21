import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verificarToken } from '@/lib/auth'

// Categoria A: acertou vencedor E placar exato → 40%
// Categoria B: acertou só o vencedor            → 20%
// Categoria C: acertou só o placar exato        → 20%
// Sem acerto                                    →  0
export function calcularCategoria(palCasa: number, palFora: number, resCasa: number, resFora: number): 'A' | 'B' | 'C' | null {
  const acertouPlacar = palCasa === resCasa && palFora === resFora

  const palVenc = palCasa > palFora ? 'casa' : palCasa < palFora ? 'fora' : 'empate'
  const resVenc = resCasa > resFora ? 'casa' : resCasa < resFora ? 'fora' : 'empate'
  const acertouVencedor = palVenc === resVenc

  if (acertouVencedor && acertouPlacar) return 'A'
  if (acertouVencedor && !acertouPlacar) return 'B'
  if (!acertouVencedor && acertouPlacar) return 'C'
  return null
}

// Pontos para manter ranking ordenável: A=5, B=3, C=2, null=0
function categoriaPontos(cat: 'A' | 'B' | 'C' | null): number {
  if (cat === 'A') return 5
  if (cat === 'B') return 3
  if (cat === 'C') return 2
  return 0
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { jogo_id, gol_casa, gol_fora } = await req.json()
  if (jogo_id === undefined || gol_casa === undefined || gol_fora === undefined) {
    return NextResponse.json({ error: 'jogo_id, gol_casa e gol_fora são obrigatórios' }, { status: 400 })
  }

  const { data: jogo, error: jogoErr } = await supabase
    .from('jogos')
    .update({ gol_casa, gol_fora, encerrado: true })
    .eq('id', jogo_id)
    .select('bolao_slug').single()

  if (jogoErr || !jogo) return NextResponse.json({ error: 'Jogo não encontrado' }, { status: 404 })

  const { data: palpites } = await supabase
    .from('palpites')
    .select('id, participante_id, gol_casa, gol_fora')
    .eq('jogo_id', jogo_id)

  if (!palpites || palpites.length === 0) return NextResponse.json({ ok: true, atualizados: 0 })

  let atualizados = 0
  for (const p of palpites) {
    const cat = calcularCategoria(p.gol_casa, p.gol_fora, gol_casa, gol_fora)
    const pontos = categoriaPontos(cat)

    await supabase.from('palpites').update({ pontos }).eq('id', p.id)

    const { data: part } = await supabase
      .from('participantes_esporte')
      .select('pontos_total')
      .eq('id', p.participante_id).single()

    if (part) {
      await supabase
        .from('participantes_esporte')
        .update({ pontos_total: (part.pontos_total || 0) + pontos })
        .eq('id', p.participante_id)
    }
    atualizados++
  }

  return NextResponse.json({ ok: true, atualizados, resultado: { gol_casa, gol_fora } })
}
