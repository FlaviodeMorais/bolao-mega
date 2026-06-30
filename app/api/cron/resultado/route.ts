import { NextRequest, NextResponse } from 'next/server'
import { notificarResultado } from '@/lib/whatsapp'
import { supabase } from '@/lib/supabase'
import { LOTERIA_LIST } from '@/lib/loterias'

const CAIXA_BASE = 'https://servicebus2.caixa.gov.br/portaldeloterias/api'

export async function GET(req: NextRequest) {
  // Verifica secret para segurança
  const secret = req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { data: cfg } = await supabase.from('config').select('key, value')
  const map = Object.fromEntries((cfg || []).map(r => [r.key, r.value]))

  const resultados: Record<string, unknown> = {}

  for (const loteria of LOTERIA_LIST) {
    try {
      const res = await fetch(`${CAIXA_BASE}/${loteria.apiSlug}`, {
        cache: 'no-store',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
          'Referer': 'https://loterias.caixa.gov.br/',
          'Origin': 'https://loterias.caixa.gov.br',
          'Accept': 'application/json, text/plain, */*',
        },
      })
      const data = await res.json()

      const concurso = data.numero || data.numeroConcurso
      const numeros  = data.listaDezenas || data.dezenas || []
      const premio   = data.valorEstimadoProximoConcurso
        ? `R$ ${(data.valorEstimadoProximoConcurso / 1e6).toFixed(1).replace('.', ',')} mi`
        : '—'

      if (!concurso || !numeros.length) {
        resultados[loteria.id] = { ok: false, msg: 'Sem resultado disponível' }
        continue
      }

      const notificadoKey = `ultimo_resultado_notificado_${loteria.id}`
      if (map[notificadoKey] === String(concurso)) {
        resultados[loteria.id] = { ok: true, msg: 'Já notificado' }
        continue
      }

      await notificarResultado(concurso, numeros, premio, loteria.label)

      await supabase.from('config').upsert([
        { key: notificadoKey, value: String(concurso), updated_at: new Date().toISOString() },
        { key: `ultimo_resultado_dezenas_${loteria.id}`,  value: JSON.stringify(numeros), updated_at: new Date().toISOString() },
        { key: `ultimo_resultado_concurso_${loteria.id}`, value: String(concurso), updated_at: new Date().toISOString() },
        // Mantém chaves legadas sem sufixo para 'mega' (compatibilidade com /api/concurso-ativo)
        ...(loteria.id === 'mega' ? [
          { key: 'ultimo_resultado_notificado', value: String(concurso), updated_at: new Date().toISOString() },
          { key: 'ultimo_resultado_dezenas',    value: JSON.stringify(numeros), updated_at: new Date().toISOString() },
          { key: 'ultimo_resultado_concurso',   value: String(concurso), updated_at: new Date().toISOString() },
        ] : []),
      ])

      await supabase.from('loteria_historico').upsert({
        loteria: loteria.id,
        concurso: Number(concurso),
        dezenas: numeros.map(Number),
        data_sorteio: data.dataApuracao || null,
      }, { onConflict: 'loteria,concurso' })

      if (loteria.id === 'mega') {
        await supabase.from('mega_historico').upsert({
          concurso: Number(concurso),
          dezenas: numeros.map(Number),
          data_sorteio: data.dataApuracao || null,
        }, { onConflict: 'concurso' })
      }

      resultados[loteria.id] = { ok: true, concurso, numeros }
    } catch (err) {
      resultados[loteria.id] = { ok: false, error: String(err) }
    }
  }

  return NextResponse.json({ ok: true, resultados })
}
