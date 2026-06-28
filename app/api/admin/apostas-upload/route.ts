import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verificarToken } from '@/lib/auth'
import { getLoteria } from '@/lib/loterias'

export const runtime = 'nodejs'

// Parser dinâmico — detecta automaticamente dezenas por linha dentro do range válido da loteria
function parseBets(text: string, dezenasConfig: number, maxNum: number, minDezenas: number, maxDezenas: number): { bets: number[][], dezenasPorAposta: number } {
  const lines = text.split(/[\r\n]+/)
  const candidatas: number[][] = []

  for (const line of lines) {
    if (!line.trim()) continue
    const nums = (line.match(/\b\d{1,2}\b/g) || [])
      .map(Number)
      .filter(n => n >= 1 && n <= maxNum)
    if (nums.length >= minDezenas && nums.length <= maxDezenas) {
      candidatas.push(nums)
    }
  }

  if (candidatas.length === 0) return { bets: [], dezenasPorAposta: dezenasConfig }

  // Detecta o tamanho mais frequente entre as linhas válidas
  const freq: Record<number, number> = {}
  for (const c of candidatas) freq[c.length] = (freq[c.length] || 0) + 1
  const tamanhoDetectado = Number(Object.entries(freq).sort((a, b) => b[1] - a[1])[0][0])

  const bets = candidatas.filter(c => c.length === tamanhoDetectado)
  return { bets, dezenasPorAposta: tamanhoDetectado }
}

function parseTransacao(text: string) {
  return {
    transacao_id: text.match(/ID:\s*([\d]+)/)?.[1] || '',
    compra_id:    text.match(/Número da Compra:\s*[\r\n]*([\d]+)/)?.[1]
               || text.match(/Número da Compra:\s*([\d]+)/)?.[1] || '',
    data_compra:  text.match(/Data da Compra:\s*([\d\/]+)/)?.[1] || '',
    hora_compra:  text.match(/Hora da Compra:\s*([\d:]+)/)?.[1] || '',
    situacao:     text.match(/Situação da Compra:\s*([^\r\n]+)/)?.[1]?.trim() || 'Finalizada',
  }
}

export async function POST(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const ct = req.headers.get('content-type') || ''
  let text = ''
  let bolaoId = ''
  let extraMeta: Record<string, string> = {}

  if (ct.includes('application/json')) {
    const body = await req.json()
    text      = body.text     || ''
    bolaoId   = body.bolao_id || ''
    extraMeta = {
      transacao_id: body.transacao_id || '',
      compra_id:    body.compra_id    || '',
      data_compra:  body.data_compra  || '',
      hora_compra:  body.hora_compra  || '',
      situacao:     body.situacao     || 'Finalizada',
    }
  } else {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    bolaoId    = formData.get('bolao_id') as string || ''
    if (!file) return NextResponse.json({ error: 'Arquivo obrigatório' }, { status: 400 })
    const buffer = Buffer.from(await file.arrayBuffer())
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdfParse = require('pdf-parse/lib/pdf-parse')
      const data = await pdfParse(buffer)
      text = data.text
    } catch (err) {
      return NextResponse.json({ error: `Falha ao ler: ${String(err)}` }, { status: 422 })
    }
  }

  if (!bolaoId) return NextResponse.json({ error: 'bolao_id obrigatório' }, { status: 400 })
  if (!text.trim()) return NextResponse.json({ error: 'Texto vazio' }, { status: 400 })

  // Busca configuração do bolão para saber quantas dezenas e a loteria
  const { data: bolao } = await supabase
    .from('boloes').select('dezenas, num_apostas, loteria').eq('id', bolaoId).single()

  const cfg              = getLoteria(bolao?.loteria)
  const maxNum           = cfg.totalNumeros
  const dezenasConfig    = bolao?.dezenas || cfg.minDezenas

  const { bets, dezenasPorAposta } = parseBets(text, dezenasConfig, maxNum, cfg.minDezenas, cfg.maxDezenas)
  if (bets.length === 0) {
    return NextResponse.json({
      error: `Nenhuma aposta encontrada (${cfg.label}, números 1–${maxNum}). `
           + `Cada linha deve conter entre ${cfg.minDezenas} e ${cfg.maxDezenas} números separados por espaço.`,
    }, { status: 422 })
  }

  const tx = Object.keys(extraMeta).some(k => extraMeta[k])
    ? extraMeta
    : parseTransacao(text)

  const apostasData = { bets, ...tx, total_apostas: bets.length, dezenas_por_aposta: dezenasPorAposta }

  const { error } = await supabase
    .from('boloes').update({ apostas_data: apostasData }).eq('id', bolaoId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, total_apostas: bets.length, dezenas_por_aposta: dezenasPorAposta })
}

export async function DELETE(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }
  const { bolao_id } = await req.json()
  if (!bolao_id) return NextResponse.json({ error: 'bolao_id obrigatório' }, { status: 400 })
  const { error } = await supabase
    .from('boloes').update({ apostas_data: null }).eq('id', bolao_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
