import { NextRequest, NextResponse } from 'next/server'
import { notificarResultado } from '@/lib/whatsapp'
import { supabase } from '@/lib/supabase'

export async function GET(req: NextRequest) {
  // Verifica secret para segurança
  const secret = req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  try {
    // Busca resultado mais recente da Caixa
    const res = await fetch('https://servicebus2.caixa.gov.br/portaldeloterias/api/megasena', {
      next: { revalidate: 0 },
    })
    const data = await res.json()

    const concurso  = data.numero || data.numeroConcurso
    const numeros   = data.listaDezenas || data.dezenas || []
    const premio    = data.valorEstimadoProximoConcurso
      ? `R$ ${(data.valorEstimadoProximoConcurso / 1e6).toFixed(1).replace('.', ',')} mi`
      : '—'

    if (!concurso || !numeros.length) {
      return NextResponse.json({ ok: false, msg: 'Sem resultado disponível' })
    }

    // Verifica se já notificou este concurso
    const { data: cfg } = await supabase
      .from('config')
      .select('value')
      .eq('key', 'ultimo_resultado_notificado')
      .single()

    if (cfg?.value === String(concurso)) {
      return NextResponse.json({ ok: true, msg: 'Já notificado' })
    }

    // Envia notificação no WhatsApp
    await notificarResultado(concurso, numeros, premio)

    // Salva concurso notificado
    await supabase.from('config').upsert({
      key: 'ultimo_resultado_notificado',
      value: String(concurso),
      updated_at: new Date().toISOString(),
    })

    return NextResponse.json({ ok: true, concurso, numeros })
  } catch (err) {
    return NextResponse.json({ ok: false, error: String(err) })
  }
}
