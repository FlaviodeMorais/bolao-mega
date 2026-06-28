import { getPagamentoSettings } from './settings'

const MP_URL = 'https://api.mercadopago.com/v1/payments'

interface PixResult {
  success: boolean
  paymentId?: string
  qrCode?: string
  qrCodeBase64?: string
  error?: string
}

export async function criarPixMP(
  valor: number,
  concurso: number,
  cotas: string[],
  nome: string
): Promise<PixResult> {
  try {
    const cfg   = await getPagamentoSettings()
    const token = cfg.mp_access_token
    if (!token) return { success: false, error: 'MP_ACCESS_TOKEN não configurado' }

    const nomes     = nome.split(' ')
    const firstName = nomes[0]
    const lastName  = nomes.slice(1).join(' ') || nomes[0]

    const res = await fetch(MP_URL, {
      method: 'POST',
      headers: {
        'Authorization':     `Bearer ${token}`,
        'Content-Type':      'application/json',
        'X-Idempotency-Key': crypto.randomUUID(),
      },
      body: JSON.stringify({
        transaction_amount: valor,
        description: `Bolao Conc.${concurso} Cotas:${cotas.join(',')}`,
        payment_method_id: 'pix',
        payer: {
          email:      cfg.pix_email_payer,
          first_name: firstName,
          last_name:  lastName,
        },
      }),
    })

    const data = await res.json()

    if (data.id) {
      return {
        success:      true,
        paymentId:    String(data.id),
        qrCode:       data.point_of_interaction.transaction_data.qr_code,
        qrCodeBase64: data.point_of_interaction.transaction_data.qr_code_base64,
      }
    }
    return { success: false, error: JSON.stringify(data) }
  } catch (err) {
    return { success: false, error: String(err) }
  }
}

export async function buscarPagamentoMP(paymentId: string) {
  const cfg = await getPagamentoSettings()
  const res = await fetch(`${MP_URL}/${paymentId}`, {
    headers: { 'Authorization': `Bearer ${cfg.mp_access_token}` },
  })
  return res.json()
}
