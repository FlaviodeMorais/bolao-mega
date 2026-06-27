import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verificarToken } from '@/lib/auth'
import { notificarAcertosIndividual } from '@/lib/whatsapp'

// POST — envia WhatsApp com acertos individuais para cada participante pago
export async function POST(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { bolao_slug, concurso } = await req.json()
  if (!bolao_slug || !concurso) {
    return NextResponse.json({ error: 'bolao_slug e concurso são obrigatórios' }, { status: 400 })
  }

  const { data: bolao } = await supabase
    .from('boloes')
    .select('nome, apostas_data, resultado_conferencia')
    .eq('slug', bolao_slug)
    .single()

  if (!bolao) return NextResponse.json({ error: 'Bolão não encontrado' }, { status: 404 })

  const rc = bolao.resultado_conferencia as {
    status: string
    dezenas_sorteadas?: number[]
  } | null

  if (!rc?.dezenas_sorteadas?.length) {
    return NextResponse.json({ error: 'Resultado da conferência não disponível. Confira o sorteio primeiro.' }, { status: 409 })
  }

  const apostasData = bolao.apostas_data as { bets?: number[][] } | null
  const apostas: number[][] = apostasData?.bets || []

  if (!apostas.length) {
    return NextResponse.json({ error: 'Apostas não carregadas no bolão.' }, { status: 409 })
  }

  const { data: participantes } = await supabase
    .from('participantes')
    .select('id, nome, telefone, cotas')
    .eq('bolao_slug', bolao_slug)
    .eq('concurso', parseInt(concurso))
    .eq('status', 'pago')

  if (!participantes?.length) {
    return NextResponse.json({ error: 'Nenhum participante pago encontrado.' }, { status: 404 })
  }

  let enviados = 0
  let erros = 0

  await Promise.all(
    participantes.map(async (p) => {
      if (!p.telefone) { erros++; return }
      try {
        await notificarAcertosIndividual(
          p.telefone,
          p.nome,
          bolao.nome,
          parseInt(concurso),
          rc.dezenas_sorteadas!,
          apostas,
          p.cotas as string[]
        )
        enviados++
      } catch {
        erros++
      }
    })
  )

  return NextResponse.json({ enviados, erros, total: participantes.length })
}
