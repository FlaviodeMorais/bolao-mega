import { NextRequest, NextResponse } from 'next/server'
import { verificarToken } from '@/lib/auth'
import { enviarConviteWhatsapp } from '@/lib/whatsapp'

interface Contato { telefone: string; nome: string }

// Disparo servidor-a-servidor via Whapi — substitui o antigo padrão de abrir
// N janelas wa.me no navegador do admin (exigia clique manual em cada uma,
// dependia do popup blocker e da aba ficar aberta). Aqui o envio acontece
// de fato, sequencialmente, com um pequeno intervalo entre mensagens pra não
// estourar rate limit do Whapi.
export async function POST(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { contatos, mensagem, loteria } = await req.json() as { contatos: Contato[]; mensagem: string; loteria?: string }
  if (!Array.isArray(contatos) || contatos.length === 0) {
    return NextResponse.json({ error: 'Nenhum contato informado' }, { status: 400 })
  }
  if (!mensagem?.trim()) {
    return NextResponse.json({ error: 'Mensagem obrigatória' }, { status: 400 })
  }
  if (contatos.length > 300) {
    return NextResponse.json({ error: 'Máximo de 300 contatos por disparo — filtre e envie em lotes menores.' }, { status: 400 })
  }

  const falhas: { telefone: string; nome: string; erro: string }[] = []
  let enviados = 0

  for (const c of contatos) {
    const texto = mensagem.replaceAll('{nome}', c.nome || '')
    const res = await enviarConviteWhatsapp(c.telefone, texto, loteria)
    if (res.ok) enviados++
    else falhas.push({ telefone: c.telefone, nome: c.nome, erro: res.erro || 'Erro desconhecido' })
    // Intervalo entre envios pra não estourar rate limit do Whapi
    await new Promise(r => setTimeout(r, 250))
  }

  return NextResponse.json({ ok: true, enviados, falhas })
}
