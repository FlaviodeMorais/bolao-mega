import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verificarToken } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { linhas, loteria = 'mega' } = await req.json()
  if (!Array.isArray(linhas) || linhas.length === 0) {
    return NextResponse.json({ ok: false, erro: 'Nenhuma linha enviada' })
  }

  const linhasConvertidas = linhas.map((l: { concurso: number; dezenas: number[]; data_sorteio: string | null }) => ({
    loteria,
    concurso: l.concurso,
    dezenas: l.dezenas,
    data_sorteio: l.data_sorteio
      ? l.data_sorteio.replace(/^(\d{2})\/(\d{2})\/(\d{4})$/, '$3-$2-$1')
      : null,
  }))

  const { error } = await supabase
    .from('loteria_historico')
    .upsert(linhasConvertidas, { onConflict: 'loteria,concurso' })

  if (error) return NextResponse.json({ ok: false, erro: error.message })
  return NextResponse.json({ ok: true, inseridos: linhas.length })
}
