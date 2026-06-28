import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verificarToken } from '@/lib/auth'
import { criarPixMP } from '@/lib/mercadopago'
import { gerarPixLocal } from '@/lib/pix-local'
import { notificarAcrescimo } from '@/lib/whatsapp'

export async function POST(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { bolao_id, bolao_slug, concurso } = await req.json()
  if (!bolao_id || !bolao_slug || !concurso) {
    return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 })
  }

  // 1. Dados do bolão
  const { data: bolao } = await supabase
    .from('boloes')
    .select('nome, valor_cota, total_cotas, encerrado')
    .eq('id', bolao_id)
    .single()

  if (!bolao) return NextResponse.json({ error: 'Bolão não encontrado' }, { status: 404 })
  if (bolao.encerrado) return NextResponse.json({ error: 'Bolão já encerrado' }, { status: 400 })

  // 2. Participantes pagos
  const { data: parts } = await supabase
    .from('participantes')
    .select('id, nome, cotas, telefone')
    .eq('concurso', concurso)
    .eq('bolao_slug', bolao_slug)
    .eq('status', 'pago')

  if (!parts || parts.length === 0) {
    return NextResponse.json({ error: 'Nenhum participante pago encontrado' }, { status: 400 })
  }

  // 3. Calcular cotas restantes e acréscimo
  const cotasVendidas = [...new Set(parts.flatMap(p => p.cotas as string[]))]
  const cotas_restantes = Number(bolao.total_cotas) - cotasVendidas.length
  const valor_restante  = cotas_restantes * Number(bolao.valor_cota)
  const acrescimo       = cotas_restantes > 0
    ? parseFloat((valor_restante / parts.length).toFixed(2))
    : 0

  const erros: string[] = []

  // 4. Processar cada participante
  for (const part of parts) {
    try {
      let pixCode = ''
      let paymentId = `local-${part.id.slice(0, 20)}`

      if (acrescimo > 0) {
        const mp = await criarPixMP(acrescimo, concurso, part.cotas, `${part.nome} Complemento`)
        if (mp.success && mp.qrCode) {
          pixCode    = mp.qrCode
          paymentId  = mp.paymentId || paymentId
        } else {
          pixCode = await gerarPixLocal(acrescimo, part.id.slice(0, 25))
        }
      }

      await supabase
        .from('participantes')
        .update({
          acrescimo:            acrescimo > 0 ? acrescimo : null,
          pix_acrescimo:        acrescimo > 0 ? pixCode   : null,
          acrescimo_payment_id: acrescimo > 0 ? paymentId : null,
          acrescimo_pago:       acrescimo === 0,
        })
        .eq('id', part.id)

      if (acrescimo > 0 && part.telefone) {
        await notificarAcrescimo(
          part.telefone, part.nome, part.cotas as string[],
          acrescimo, pixCode, bolao.nome
        )
      }
    } catch (err) {
      erros.push(`${part.nome}: ${String(err)}`)
    }
  }

  // 5. Marcar bolão como encerrado
  await supabase.from('boloes').update({ encerrado: true }).eq('id', bolao_id)

  return NextResponse.json({
    ok: true,
    cotas_restantes,
    valor_restante,
    acrescimo,
    participantes: parts.length,
    erros,
  })
}
