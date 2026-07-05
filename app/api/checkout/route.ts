import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verificarTokenUsuario } from '@/lib/auth-usuario'
import { criarPixMP } from '@/lib/mercadopago'
import { gerarPixLocal, gerarTxId } from '@/lib/pix-local'
import QRCode from 'qrcode'

interface ItemLoteria {
  tipo: 'loteria'
  bolaoSlug: string
  concurso: number
  cotas: string[]
  total: number
}
interface ItemEsporte {
  tipo: 'esporte'
  bolaoSlug: string
  palpites: { jogo_id: string; gol_casa: number; gol_fora: number }[]
  total: number
}
type Item = ItemLoteria | ItemEsporte

// POST /api/checkout — finaliza o carrinho: valida cada item (mesmas regras de
// /api/participantes e /api/esporte/participantes), gera UM único PIX cobrindo
// a soma de todos os itens, e insere um participante por item, todos
// compartilhando o mesmo mp_payment_id/pix_code e um pedido_id em comum. O
// webhook do Mercado Pago já atualiza todas as linhas de um mp_payment_id de
// uma vez (.update().eq('mp_payment_id', paymentId) não usa .single()).
export async function POST(req: NextRequest) {
  const token = req.cookies.get('user_token')?.value
  const uid = token ? await verificarTokenUsuario(token) : null
  if (!uid) return NextResponse.json({ error: 'Entre ou cadastre-se para continuar.' }, { status: 401 })

  const { data: usuario } = await supabase.from('usuarios').select('nome, telefone, email').eq('id', uid).single()
  if (!usuario) return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 })

  const { items } = await req.json() as { items: Item[] }
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'Carrinho vazio' }, { status: 400 })
  }

  // ── Valida cada item contra o banco (bolão ativo, cotas livres, valor correto) ──
  for (const item of items) {
    if (item.tipo === 'loteria') {
      const { data: bolao } = await supabase
        .from('boloes').select('valor_cota, ativo, encerrado').eq('slug', item.bolaoSlug).single()

      if (!bolao) return NextResponse.json({ error: `Bolão "${item.bolaoSlug}" não encontrado.` }, { status: 404 })
      if (!bolao.ativo) return NextResponse.json({ error: `Bolão "${item.bolaoSlug}" está cancelado.` }, { status: 409 })
      if (bolao.encerrado) return NextResponse.json({ error: `Bolão "${item.bolaoSlug}" já foi encerrado.` }, { status: 409 })

      const totalEsperado = parseFloat((item.cotas.length * Number(bolao.valor_cota)).toFixed(2))
      if (Math.abs(totalEsperado - item.total) > 0.01) {
        return NextResponse.json({ error: `Valor desatualizado no bolão "${item.bolaoSlug}". Remova e adicione novamente ao carrinho.` }, { status: 409 })
      }

      const { data: existing } = await supabase
        .from('participantes').select('cotas')
        .eq('concurso', item.concurso).eq('bolao_slug', item.bolaoSlug).neq('status', 'cancelado')

      const taken = [...new Set((existing || []).flatMap(r => r.cotas as string[]))]
      const conflitos = item.cotas.filter(c => taken.includes(c))
      if (conflitos.length > 0) {
        return NextResponse.json({ error: `Cota(s) já ocupada(s) no bolão "${item.bolaoSlug}": ${conflitos.join(', ')}. Remova o item e escolha outra cota.` }, { status: 409 })
      }
    } else {
      const { data: bolao } = await supabase
        .from('boloes_esporte').select('valor_cota, ativo, encerrado').eq('slug', item.bolaoSlug).single()

      if (!bolao) return NextResponse.json({ error: `Bolão "${item.bolaoSlug}" não encontrado.` }, { status: 404 })
      if (!bolao.ativo) return NextResponse.json({ error: `Bolão "${item.bolaoSlug}" inativo.` }, { status: 409 })
      if (bolao.encerrado) return NextResponse.json({ error: `Bolão "${item.bolaoSlug}" encerrado.` }, { status: 409 })

      const totalEsperado = Number(bolao.valor_cota)
      if (Math.abs(totalEsperado - item.total) > 0.01) {
        return NextResponse.json({ error: `Valor desatualizado no bolão "${item.bolaoSlug}". Remova e adicione novamente ao carrinho.` }, { status: 409 })
      }

      if (item.palpites.length > 0) {
        const jogoIds = item.palpites.map(p => p.jogo_id)
        const { data: jogos } = await supabase
          .from('jogos').select('id, time_casa, time_fora, data_jogo, hora_jogo, encerrado')
          .in('id', jogoIds)

        const agora = new Date()
        const bloqueado = jogos?.find(j => {
          if (j.encerrado) return true
          if (j.data_jogo && j.hora_jogo) return new Date(`${j.data_jogo}T${j.hora_jogo}:00-03:00`) <= agora
          return false
        })
        if (bloqueado) {
          return NextResponse.json(
            { error: `Aposta bloqueada no bolão "${item.bolaoSlug}": o jogo ${bloqueado.time_casa} × ${bloqueado.time_fora} já começou ou foi encerrado.` },
            { status: 409 },
          )
        }
      }
    }
  }

  const total = items.reduce((s, it) => s + it.total, 0)
  if (total <= 0) return NextResponse.json({ error: 'Total inválido' }, { status: 400 })

  // ── Gera UM PIX consolidado para o total do carrinho ──
  const nomeUpper = usuario.nome.toUpperCase()
  let pixCode = '', paymentId = '', qrCodeBase64 = '', fonte = 'local'
  const mp = await criarPixMP(total, 0, [], nomeUpper)
  if (mp.success && mp.qrCode) {
    pixCode = mp.qrCode
    qrCodeBase64 = mp.qrCodeBase64 || ''
    paymentId = mp.paymentId || ''
    fonte = 'mp'
  } else {
    const txId = gerarTxId(Date.now())
    pixCode = await gerarPixLocal(total, txId)
    const qrUrl = await QRCode.toDataURL(pixCode, { width: 300, margin: 1 })
    qrCodeBase64 = qrUrl.replace('data:image/png;base64,', '')
    paymentId = txId
  }

  const { data: pedido, error: pedidoErr } = await supabase
    .from('pedidos')
    .insert({ usuario_id: uid, total, status: 'aguardando', mp_payment_id: paymentId, pix_code: pixCode })
    .select('id').single()

  if (pedidoErr || !pedido) {
    return NextResponse.json({ error: 'Erro ao criar pedido: ' + (pedidoErr?.message || 'desconhecido') }, { status: 500 })
  }

  const telefoneComDDI = '55' + usuario.telefone.replace(/\D/g, '')

  // ── Insere um participante por item, todos ligados ao mesmo pedido/pagamento ──
  for (const item of items) {
    if (item.tipo === 'loteria') {
      await supabase.from('participantes').insert({
        concurso: item.concurso, nome: nomeUpper, telefone: telefoneComDDI, email: usuario.email,
        cotas: item.cotas, total: item.total, mp_payment_id: paymentId, pix_code: pixCode,
        bolao_slug: item.bolaoSlug, status: 'aguardando', usuario_id: uid, pedido_id: pedido.id,
      })
    } else {
      const { data: part } = await supabase.from('participantes_esporte').insert({
        bolao_slug: item.bolaoSlug, nome: nomeUpper, telefone: telefoneComDDI, email: usuario.email,
        total: item.total, status: 'aguardando', mp_payment_id: paymentId, pix_code: pixCode,
        usuario_id: uid, pedido_id: pedido.id,
      }).select().single()

      if (part && item.palpites.length > 0) {
        const rows = item.palpites.map(p => ({
          participante_id: part.id, bolao_slug: item.bolaoSlug,
          jogo_id: p.jogo_id, gol_casa: p.gol_casa, gol_fora: p.gol_fora,
        }))
        await supabase.from('palpites').insert(rows)
      }
    }
  }

  return NextResponse.json({ pedidoId: pedido.id, pixCode, qrCodeBase64, paymentId, fonte, total })
}
