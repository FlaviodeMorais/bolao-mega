import { NextRequest, NextResponse } from 'next/server'
import { criarPixMP } from '@/lib/mercadopago'
import { gerarPixLocal, gerarTxId } from '@/lib/pix-local'
import { getPagamentoSettings } from '@/lib/settings'
import QRCode from 'qrcode'

export async function POST(req: NextRequest) {
  const { concurso, nome, cotas, total } = await req.json()
  const pg = await getPagamentoSettings()

  // Tenta Mercado Pago primeiro, só se habilitado
  if (pg.mp_ativo) {
    const mp = await criarPixMP(total, concurso, cotas, nome)
    if (mp.success && mp.qrCode) {
      return NextResponse.json({
        pixCode:      mp.qrCode,
        qrCodeBase64: mp.qrCodeBase64,
        paymentId:    mp.paymentId,
        fonte:        'mp',
      })
    }
  }

  if (!pg.pix_ativo) {
    return NextResponse.json({ error: 'Nenhum método de pagamento disponível no momento.' }, { status: 503 })
  }

  // Fallback: PIX local
  const txId    = gerarTxId(concurso)
  const pixCode = await gerarPixLocal(total, txId)
  const qrCodeBase64 = await QRCode.toDataURL(pixCode, { width: 300, margin: 1 })

  return NextResponse.json({
    pixCode,
    qrCodeBase64: qrCodeBase64.replace('data:image/png;base64,', ''),
    paymentId:    txId,
    fonte:        'local',
  })
}
