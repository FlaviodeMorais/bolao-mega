import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verificarToken } from '@/lib/auth'

export const runtime = 'nodejs'
export const maxDuration = 30

export async function POST(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const formData = await req.formData()
  const file    = formData.get('file') as File | null
  const bolaoId = formData.get('bolao_id') as string | null

  if (!file || !bolaoId) {
    return NextResponse.json({ error: 'Arquivo e bolão são obrigatórios' }, { status: 400 })
  }

  // Convert File → Buffer
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // Parse PDF (import path evita erro de teste no Vercel)
  let text = ''
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require('pdf-parse/lib/pdf-parse')
    const data = await pdfParse(buffer)
    text = data.text
  } catch (err) {
    return NextResponse.json({ error: `Falha ao ler PDF: ${String(err)}` }, { status: 422 })
  }

  // Extrai apostas: 6 números de 2 dígitos separados por espaço
  const betRegex = /\b(\d{2})\s+(\d{2})\s+(\d{2})\s+(\d{2})\s+(\d{2})\s+(\d{2})\b/g
  const bets: number[][] = []
  let m
  while ((m = betRegex.exec(text)) !== null) {
    const nums = [m[1], m[2], m[3], m[4], m[5], m[6]].map(Number)
    // Filtra linhas de cabeçalho e garante que são números válidos (1-60)
    if (nums.every(n => n >= 1 && n <= 60)) {
      bets.push(nums)
    }
  }

  if (bets.length === 0) {
    return NextResponse.json({ error: 'Nenhuma aposta encontrada no PDF. Verifique o arquivo.' }, { status: 422 })
  }

  // Extrai dados da transação (página 1 do PDF da Caixa)
  const transacaoId = text.match(/ID:\s*([\d]+)/)?.[1] || ''
  const compraId    = text.match(/Número da Compra:\s*[\r\n]*([\d]+)/)?.[1]
                   || text.match(/Número da Compra:\s*([\d]+)/)?.[1] || ''
  const dataCompra  = text.match(/Data da Compra:\s*([\d\/]+)/)?.[1] || ''
  const horaCompra  = text.match(/Hora da Compra:\s*([\d:]+)/)?.[1] || ''
  const situacao    = text.match(/Situação da Compra:\s*([^\r\n]+)/)?.[1]?.trim() || 'Finalizada'

  const apostasData = {
    bets,
    transacao_id: transacaoId,
    compra_id:    compraId,
    data_compra:  dataCompra,
    hora_compra:  horaCompra,
    situacao,
    total_apostas: bets.length,
  }

  const { error } = await supabase
    .from('boloes')
    .update({ apostas_data: apostasData })
    .eq('id', bolaoId)

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
    .from('boloes')
    .update({ apostas_data: null })
    .eq('id', bolao_id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
