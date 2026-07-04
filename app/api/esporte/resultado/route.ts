import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verificarToken } from '@/lib/auth'

// Categoria A: acertou vencedor E placar exato → 5 pts
// Categoria B: acertou só o vencedor            → 3 pts
// Sem acerto                                    → 0 pts
// (acertar o placar exato sem acertar o vencedor é matematicamente impossível —
// os mesmos números que definem o placar também definem o vencedor)
function calcularCategoria(palCasa: number, palFora: number, resCasa: number, resFora: number): 'A' | 'B' | null {
  const acertouPlacar = palCasa === resCasa && palFora === resFora
  if (acertouPlacar) return 'A'

  const palVenc = palCasa > palFora ? 'casa' : palCasa < palFora ? 'fora' : 'empate'
  const resVenc = resCasa > resFora ? 'casa' : resCasa < resFora ? 'fora' : 'empate'
  if (palVenc === resVenc) return 'B'

  return null
}

function categoriaPontos(cat: 'A' | 'B' | null): number {
  if (cat === 'A') return 5
  if (cat === 'B') return 3
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

  const erros: string[] = []
  const participantesAfetados = new Set<string>()

  for (const p of palpites) {
    const cat = calcularCategoria(p.gol_casa, p.gol_fora, gol_casa, gol_fora)
    const pontos = categoriaPontos(cat)

    const { error } = await supabase.from('palpites').update({ pontos }).eq('id', p.id)
    if (error) { erros.push(`palpite ${p.id}: ${error.message}`); continue }
    participantesAfetados.add(p.participante_id)
  }

  // Recalcula pontos_total do zero (soma de todos os palpites do participante em
  // todo o bolão) em vez de incrementar - assim reenviar um resultado corrigido
  // para o mesmo jogo substitui os pontos antigos em vez de duplicá-los.
  for (const participanteId of participantesAfetados) {
    const { data: todosPalpites, error: selErr } = await supabase
      .from('palpites')
      .select('pontos')
      .eq('participante_id', participanteId)

    if (selErr) { erros.push(`participante ${participanteId}: ${selErr.message}`); continue }

    const total = (todosPalpites || []).reduce((s, row) => s + (row.pontos || 0), 0)

    const { error: updErr } = await supabase
      .from('participantes_esporte')
      .update({ pontos_total: total })
      .eq('id', participanteId)

    if (updErr) erros.push(`participante ${participanteId}: ${updErr.message}`)
  }

  return NextResponse.json({
    ok: erros.length === 0,
    atualizados: palpites.length - erros.length,
    resultado: { gol_casa, gol_fora },
    ...(erros.length > 0 && { erros }),
  })
}
