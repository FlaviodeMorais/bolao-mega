import { NextRequest, NextResponse } from 'next/server'
import { verificarToken } from '@/lib/auth'
import { aplicarResultadoJogo } from '@/lib/esporte-resultado'

export async function POST(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const { jogo_id, gol_casa, gol_fora } = await req.json()
  if (jogo_id === undefined || gol_casa === undefined || gol_fora === undefined) {
    return NextResponse.json({ error: 'jogo_id, gol_casa e gol_fora são obrigatórios' }, { status: 400 })
  }

  const resultado = await aplicarResultadoJogo(jogo_id, gol_casa, gol_fora)
  if (!resultado.ok && resultado.atualizados === 0 && resultado.erros?.length) {
    return NextResponse.json({ ok: false, error: resultado.erros[0] }, { status: 404 })
  }

  return NextResponse.json({ ...resultado, resultado: { gol_casa, gol_fora } })
}
