const WHAPI_URL   = 'https://gate.whapi.cloud'
const WHAPI_TOKEN = process.env.WHAPI_TOKEN || ''
const GROUP_ID    = process.env.WHAPI_GROUP_ID || ''

async function send(endpoint: string, body: object) {
  if (!WHAPI_TOKEN) return
  try {
    await fetch(`${WHAPI_URL}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${WHAPI_TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
  } catch (err) {
    console.error('[WhatsApp] Erro ao enviar:', err)
  }
}

function toGroup(text: string) {
  if (!GROUP_ID) return
  return send('messages/text', { to: GROUP_ID, body: text })
}

export async function notificarInscricao(nome: string, cotas: string[], concurso: number, total: number) {
  await toGroup(
    `✅ *NOVA INSCRIÇÃO*\n\n` +
    `👤 *${nome}*\n` +
    `🎟️ Cotas: ${cotas.join(', ')}\n` +
    `💰 Total: R$ ${total.toFixed(2).replace('.', ',')}\n` +
    `🎯 Concurso: #${concurso}\n\n` +
    `_Aguardando pagamento via PIX_`
  )
}

export async function notificarPagamento(nome: string, cotas: string[], concurso: number, total: number) {
  await toGroup(
    `💚 *PAGAMENTO CONFIRMADO*\n\n` +
    `👤 *${nome}*\n` +
    `🎟️ Cotas: ${cotas.join(', ')}\n` +
    `💰 R$ ${total.toFixed(2).replace('.', ',')}\n` +
    `🎯 Concurso: #${concurso}\n\n` +
    `_Boa sorte! 🍀_`
  )
}

export async function notificarResultado(concurso: number, numeros: string[], premio: string) {
  await toGroup(
    `🍀 *RESULTADO MEGA-SENA #${concurso}*\n\n` +
    `🔢 *${numeros.join(' · ')}*\n\n` +
    `🏆 Prêmio estimado próximo: ${premio}\n\n` +
    `_Confira seus números! Acesse o painel para ver os resultados._`
  )
}

export async function notificarLembrete(concurso: number, pendentes: number) {
  await toGroup(
    `⏰ *LEMBRETE DE PAGAMENTO*\n\n` +
    `🎯 Concurso: #${concurso}\n` +
    `⚠️ ${pendentes} pagamento(s) ainda pendente(s)\n\n` +
    `💳 Prazo: *12:00 do dia do sorteio*\n` +
    `_Chave PIX: 272.105.928-90_`
  )
}

export async function buscarGrupos(): Promise<{ id: string; name: string }[]> {
  if (!WHAPI_TOKEN) return []
  try {
    const res = await fetch(`${WHAPI_URL}/groups?count=20`, {
      headers: { 'Authorization': `Bearer ${WHAPI_TOKEN}` },
    })
    const data = await res.json()
    return (data.groups || []).map((g: { id: string; name: string }) => ({
      id:   g.id,
      name: g.name,
    }))
  } catch {
    return []
  }
}
