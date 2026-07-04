import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { LOTERIA_LIST, getLoteria } from '@/lib/loterias'

const CAIXA_BASE = 'https://servicebus2.caixa.gov.br/portaldeloterias/api'
const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36',
  'Referer': 'https://loterias.caixa.gov.br/',
  'Origin': 'https://loterias.caixa.gov.br',
  'Accept': 'application/json, text/plain, */*',
}

// Cron: mantém loteria_historico em dia sozinho, sem depender de alguém
// clicar em "Carregar histórico" manualmente (Ferramentas). Roda 1x/dia,
// busca só os concursos que faltam desde o último salvo (backfill incremental
// e idempotente — não refaz o histórico inteiro).
export async function GET(req: NextRequest) {
  const secret = req.nextUrl.searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const resumo: Record<string, string> = {}

  for (const l of LOTERIA_LIST) {
    const cfg = getLoteria(l.id)
    try {
      const { data: mx } = await supabase
        .from('loteria_historico')
        .select('concurso')
        .eq('loteria', l.id)
        .order('concurso', { ascending: false })
        .limit(1)
        .single()
      const inicio = (mx?.concurso ?? 0) + 1

      const resAtual = await fetch(`${CAIXA_BASE}/${cfg.apiSlug}`, { headers: HEADERS, cache: 'no-store', signal: AbortSignal.timeout(8000) })
      if (!resAtual.ok) { resumo[l.id] = `falha ao consultar concurso atual (HTTP ${resAtual.status})`; continue }
      const atual = (await resAtual.json()).numero as number | undefined

      if (!atual || inicio > atual) { resumo[l.id] = `já em dia (#${mx?.concurso ?? 0})`; continue }

      let inseridos = 0
      let erros = 0
      for (let n = inicio; n <= atual; n++) {
        try {
          const r = await fetch(`${CAIXA_BASE}/${cfg.apiSlug}/${n}`, { headers: HEADERS, cache: 'no-store', signal: AbortSignal.timeout(6000) })
          if (!r.ok) { erros++; continue }
          const d = await r.json()
          const dez = (d.listaDezenas || d.dezenas || []).map(Number)
          if (dez.length !== cfg.minDezenas) { erros++; continue }
          const { error } = await supabase.from('loteria_historico').upsert(
            { loteria: l.id, concurso: n, dezenas: dez, data_sorteio: d.dataApuracao || null },
            { onConflict: 'loteria,concurso' }
          )
          if (error) erros++; else inseridos++
        } catch { erros++ }
      }
      resumo[l.id] = `${inseridos} inserido(s), ${erros} erro(s) — de #${inicio} a #${atual}`
    } catch (e) {
      resumo[l.id] = `erro: ${String(e)}`
    }
  }

  return NextResponse.json({ ok: true, resumo })
}
