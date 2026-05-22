import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verificarToken } from '@/lib/auth'

export const runtime = 'nodejs'

function parseBets(text: string) {
  const betRegex = /\b(\d{2})\s+(\d{2})\s+(\d{2})\s+(\d{2})\s+(\d{2})\s+(\d{2})\b/g
  const bets: number[][] = []
  let m
  while ((m = betRegex.exec(text)) !== null) {
    const nums = [m[1], m[2], m[3], m[4], m[5], m[6]].map(Number)
    if (nums.every(n => n >= 1 && n <= 60)) bets.push(nums)
  }
  return bets
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

// POST com JSON (texto colado) ou multipart (PDF)
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
    // Modo texto colado
    const body = await req.json()
    text    = body.text    || ''
    bolaoId = body.bolao_id || ''
    extraMeta = {
      transacao_id: body.transacao_id || '',
      compra_id:    body.compra_id    || '',
      data_compra:  body.data_compra  || '',
      hora_compra:  body.hora_compra  || '',
      situacao:     body.situacao     || 'Finalizada',
    }
  } else {
    // Modo upload PDF
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
      return NextResponse.json({ error: `Falha ao ler PDF: ${String(err)}` }, { status: 422 })
    }
  }

  if (!bolaoId) return NextResponse.json({ error: 'bolao_id obrigatório' }, { status: 400 })
  if (!text.trim()) return NextResponse.json({ error: 'Texto vazio' }, { status: 400 })

  const bets = parseBets(text)
  if (bets.length === 0) {
    return NextResponse.json(
      { error: 'Nenhuma aposta encontrada. Cole o texto copiado do PDF no Chrome (Ctrl+A → Ctrl+C → Colar).' },
      { status: 422 }
    )
  }

  const tx = Object.keys(extraMeta).some(k => extraMeta[k])
    ? extraMeta
    : parseTransacao(text)

  const apostasData = { bets, ...tx, total_apostas: bets.length }

  const { error } = await supabase
    .from('boloes').update({ apostas_data: apostasData }).eq('id', bolaoId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, total_apostas: bets.length })
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
