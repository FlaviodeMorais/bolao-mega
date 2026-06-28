import { getWhatsappSettings, getAppSettings } from './settings'

const WHAPI_URL = 'https://gate.whapi.cloud'

async function send(endpoint: string, body: object): Promise<{ ok: boolean; erro?: string }> {
  const cfg = await getWhatsappSettings()
  if (!cfg.token) return { ok: false, erro: 'WHAPI_TOKEN não configurado' }
  try {
    const res = await fetch(`${WHAPI_URL}/${endpoint}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${cfg.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) {
      const txt = await res.text().catch(() => res.status.toString())
      console.error(`[WhatsApp] Erro ${res.status}:`, txt)
      return { ok: false, erro: `Whapi ${res.status}: ${txt.substring(0, 100)}` }
    }
    return { ok: true }
  } catch (err) {
    console.error('[WhatsApp] Erro de rede:', err)
    return { ok: false, erro: String(err) }
  }
}

async function toGroup(text: string) {
  const cfg = await getWhatsappSettings()
  if (!cfg.group_id) return
  return send('messages/text', { to: cfg.group_id, body: text })
}

async function toNumber(telefone: string, text: string): Promise<{ ok: boolean; erro?: string }> {
  if (!telefone) return { ok: false, erro: 'Telefone não informado' }
  const number = telefone.replace(/\D/g, '')
  const to = number.startsWith('55') ? `${number}@s.whatsapp.net` : `55${number}@s.whatsapp.net`
  return send('messages/text', { to, body: text })
}

export async function verificarNumeroWhatsApp(telefone: string): Promise<boolean> {
  const cfg = await getWhatsappSettings()
  if (!cfg.token) return true
  try {
    const number = telefone.replace(/\D/g, '')
    const full   = number.startsWith('55') ? number : `55${number}`
    const res = await fetch(`${WHAPI_URL}/contacts`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocking: 'wait', phones: [full] }),
    })
    if (!res.ok) return true
    const data = await res.json()
    const contato = Array.isArray(data) ? data[0] : data?.contacts?.[0]
    return contato?.exists !== false
  } catch {
    return true
  }
}

export async function enviarQRCodePIX(
  telefone: string,
  qrBase64: string,
  valor: number,
  pixCode: string,
  bolaoNome: string
) {
  const cfg = await getWhatsappSettings()
  if (!cfg.token || !telefone) return
  const number = telefone.replace(/\D/g, '')
  const to     = number.startsWith('55') ? `${number}@s.whatsapp.net` : `55${number}@s.whatsapp.net`
  const valorStr = valor.toFixed(2).replace('.', ',')

  await fetch(`${WHAPI_URL}/messages/image`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      to,
      image: `data:image/png;base64,${qrBase64}`,
      caption:
        `📲 *PIX para pagamento*\n` +
        `🎰 ${bolaoNome}\n\n` +
        `💰 *R$ ${valorStr}*\n\n` +
        `_Escaneie o QR Code ou use o código abaixo._`,
    }),
  }).catch(() => {})

  await send('messages/text', {
    to,
    body:
      `📋 *Código PIX — Copia e Cola:*\n\n` +
      `${pixCode}\n\n` +
      `_Abra seu banco, escolha PIX, cole o código e pague._`,
  })
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

export async function enviarComprovante(
  telefone: string,
  nome: string,
  cotas: string[],
  total: number,
  concurso: number,
  bolaoNome: string,
  numApostas: number,
  dezenas: number,
  paymentId?: string,
  dataHora?: string
) {
  const valor   = total.toFixed(2).replace('.', ',')
  const horario = dataHora || new Date().toLocaleString('pt-BR')
  const idFull  = paymentId || '—'

  return toNumber(telefone,
    `✅ *COMPROVANTE DE PARTICIPAÇÃO*\n` +
    `${horario}\n\n` +
    `💰 *R$ ${valor}*\n\n` +
    `● *De*\n` +
    `  *${nome}*\n` +
    `  🎟️ Cotas adquiridas: *${cotas.join(', ')}*\n\n` +
    `● *Para*\n` +
    `  *${bolaoNome}*\n` +
    `  Administrador do Bolão\n` +
    `  ${numApostas} apostas · ${dezenas} dezenas\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `🔑 *ID da transação*\n` +
    `${idFull}\n\n` +
    `━━━━━━━━━━━━━━━━━━━━\n` +
    `📋 *Termos de Participação Aceitos*\n` +
    `🎰 Cada cota representa uma fração igual das apostas.\n` +
    `💳 Pagamento confirmado pelo administrador.\n` +
    `⚠️ Se sobrar cotas, o saldo é rateado entre os participantes.\n` +
    `🏆 Prêmio dividido proporcionalmente ao número de cotas.\n\n` +
    `_Guarde este comprovante. Boa sorte! 🍀_`
  )
}

export async function notificarPagamento(
  nome: string, cotas: string[], concurso: number, total: number,
  telefone?: string, participanteId?: string
) {
  const app = await getAppSettings()
  const linkComprovante = participanteId ? `\n🔗 Comprovante: ${app.url}/p/${participanteId}` : ''
  const msg =
    `💚 *PAGAMENTO CONFIRMADO*\n\n` +
    `👤 *${nome}*\n` +
    `🎟️ Cotas: ${cotas.join(', ')}\n` +
    `💰 R$ ${total.toFixed(2).replace('.', ',')}\n` +
    `🎯 Concurso: #${concurso}\n\n` +
    `_Boa sorte! 🍀_`

  await toGroup(msg)

  if (telefone) {
    await toNumber(telefone,
      `✅ *Seu pagamento foi confirmado!*\n\n` +
      `🎟️ Cotas: *${cotas.join(', ')}*\n` +
      `💰 R$ ${total.toFixed(2).replace('.', ',')}\n` +
      `🎯 Concurso: #${concurso}` +
      linkComprovante + `\n\n` +
      `Boa sorte! 🍀`
    )
  }
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
  const cfg = await getWhatsappSettings()
  await toGroup(
    `⏰ *LEMBRETE DE PAGAMENTO*\n\n` +
    `🎯 Concurso: #${concurso}\n` +
    `⚠️ ${pendentes} pagamento(s) ainda pendente(s)\n\n` +
    `💳 Prazo: *${cfg.prazo_horario} do dia do sorteio*\n` +
    `_Fale com o administrador para informações de pagamento._`
  )
}

export async function notificarPremioIndividual(
  telefone: string, nome: string, cotas: string[],
  valorPremio: number, bolaoNome: string, concurso: number
) {
  const valor = valorPremio.toFixed(2).replace('.', ',')
  await toNumber(telefone,
    `🏆 *PARABÉNS! VOCÊ GANHOU!*\n\n` +
    `*${nome}*, o bolão *${bolaoNome}* ganhou no concurso #${concurso}!\n\n` +
    `🎟️ Suas cotas: ${cotas.join(', ')}\n` +
    `💰 *Seu prêmio: R$ ${valor}*\n\n` +
    `_O administrador entrará em contato para efetuar o pagamento. Parabéns! 🍀🎉_`
  )
}

export async function notificarResultadoGrupo(
  bolaoNome: string, concurso: number, ganhou: boolean,
  premioTotal?: number, valorPorCota?: number
) {
  if (ganhou && premioTotal != null) {
    await toGroup(
      `🏆 *GANHAMOS! MEGA-SENA #${concurso}*\n\n` +
      `O bolão *${bolaoNome}* acertou! 🎉\n\n` +
      `💰 Prêmio total: *R$ ${premioTotal.toFixed(2).replace('.', ',')}*\n` +
      `🎟️ Valor por cota: *R$ ${(valorPorCota || 0).toFixed(2).replace('.', ',')}*\n\n` +
      `_Cada participante será notificado individualmente. Parabéns a todos! 🍀_`
    )
  } else {
    await toGroup(
      `🎲 *RESULTADO — Concurso #${concurso}*\n\n` +
      `*${bolaoNome}* não acertou desta vez.\n\n` +
      `_Mas a sorte está chegando! Vamos pro próximo! 💪🍀_`
    )
  }
}

export async function notificarAcrescimo(
  telefone: string, nome: string, cotas: string[],
  acrescimo: number, pixCode: string, bolaoNome: string
) {
  const valor = acrescimo.toFixed(2).replace('.', ',')
  await toNumber(telefone,
    `🔔 *COMPLEMENTO DE PAGAMENTO*\n\n` +
    `Olá *${nome}*!\n\n` +
    `O bolão *${bolaoNome}* foi encerrado com cotas não vendidas.\n` +
    `O saldo restante foi dividido entre os participantes.\n\n` +
    `💰 *Seu complemento: R$ ${valor}*\n` +
    `🎟️ Suas cotas: ${cotas.join(', ')}\n\n` +
    `📋 *Código PIX para pagamento:*\n${pixCode}\n\n` +
    `_Copie e pague no seu banco ou app. Boa sorte! 🍀_`
  )
  await toGroup(
    `🔔 *ENCERRAMENTO — ${bolaoNome}*\n\n` +
    `Acréscimo de *R$ ${valor}* enviado para *${nome}* via WhatsApp.\n` +
    `🎟️ Cotas: ${cotas.join(', ')}`
  )
}

export async function notificarQuaseLotado(bolaoNome: string, cotasVendidas: number, totalCotas: number) {
  const pct = Math.round((cotasVendidas / totalCotas) * 100)
  await toGroup(
    `🔥 *BOLÃO QUASE LOTADO!*\n\n` +
    `*${bolaoNome}* está com *${pct}%* das cotas preenchidas.\n\n` +
    `🎟️ ${cotasVendidas} de ${totalCotas} cotas vendidas\n` +
    `⚠️ *Restam apenas ${totalCotas - cotasVendidas} cotas disponíveis!*\n\n` +
    `_Corra para garantir a sua! 🍀_`
  )
}

export async function notificarAcertosIndividual(
  telefone: string,
  nome: string,
  bolaoNome: string,
  concurso: number,
  dezenasSorteadas: number[],
  apostas: number[][],
  cotas: string[]
) {
  if (!telefone) return

  const set = new Set(dezenasSorteadas)
  const acertosPorAposta = apostas.map(bet => bet.filter(n => set.has(n)).length)
  const maxAcertos = acertosPorAposta.length > 0 ? Math.max(...acertosPorAposta) : 0

  const emoji = maxAcertos >= 6 ? '🏆' : maxAcertos === 5 ? '🥈' : maxAcertos === 4 ? '🥉' : '🎲'
  const dezStr = dezenasSorteadas.map(n => String(n).padStart(2, '0')).join(' · ')

  let linhasApostas = ''
  apostas.forEach((bet, i) => {
    const ac = acertosPorAposta[i]
    const betStr = bet.map(n => String(n).padStart(2, '0')).join(' ')
    linhasApostas += `  Jogo ${String(i + 1).padStart(2, '0')}: ${betStr} — *${ac} acerto${ac !== 1 ? 's' : ''}*\n`
  })

  return toNumber(telefone,
    `${emoji} *RESULTADO — Mega-Sena #${concurso}*\n\n` +
    `Olá *${nome}*! Aqui está seu resultado do bolão *${bolaoNome}*:\n\n` +
    `🔢 *Dezenas sorteadas:*\n${dezStr}\n\n` +
    `🎟️ *Suas cotas: ${cotas.join(', ')}*\n\n` +
    `📊 *Seus jogos:*\n${linhasApostas}\n` +
    (maxAcertos >= 4
      ? `🏆 *Parabéns! Você acertou ${maxAcertos} dezenas!*\n\n_O administrador entrará em contato com detalhes do prêmio._`
      : `_Não foi dessa vez — mas a sorte está chegando! 💪🍀_`)
  )
}

export async function buscarGrupos(): Promise<{ id: string; name: string }[]> {
  const cfg = await getWhatsappSettings()
  if (!cfg.token) return []
  try {
    const res = await fetch(`${WHAPI_URL}/groups?count=20`, {
      headers: { 'Authorization': `Bearer ${cfg.token}` },
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
