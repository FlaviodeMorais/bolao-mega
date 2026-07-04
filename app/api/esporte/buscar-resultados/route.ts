import { NextRequest, NextResponse } from 'next/server'
import { verificarToken } from '@/lib/auth'
import { buscarEAplicarResultados } from '@/lib/esporte-resultado'

// POST — botão manual "🔄 Buscar resultados" no admin: busca no football-data.org
// os jogos já encerrados da competição do bolão e aplica o placar automaticamente
// em qualquer jogo local ainda não conferido (ver lib/esporte-resultado.ts).
export async function POST(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { bolao_slug } = await req.json()
  if (!bolao_slug) return NextResponse.json({ error: 'bolao_slug obrigatório' }, { status: 400 })

  const resumo = await buscarEAplicarResultados(bolao_slug)
  if (!resumo.ok) return NextResponse.json({ error: resumo.erro || 'Falha ao buscar resultados' }, { status: 400 })

  return NextResponse.json(resumo)
}
