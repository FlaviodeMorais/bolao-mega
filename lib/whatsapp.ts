import { getWhatsappSettings, getAppSettings } from './settings'

// Formata lista de cotas de forma clara: "1 cota (nº 4)" ou "3 cotas (nº 2, 5, 8)"
function fmtCotas(cotas: (string | number)[]): string {
  const nums = cotas.join(', ')
  const qtd  = cotas.length
  return qtd === 1 ? `1 cota (nº ${nums})` : `${qtd} cotas (nº ${nums})`
}

const WHAPI_URL = 'https://gate.whapi.cloud'
const ZAPSTER_URL = 'https://api.zapsterapi.com/v1'

/**
 * Três provedores suportados, mesma interface pública (send/toGroup/toNumber):
 * - 'whapi'     → gate.whapi.cloud (SaaS)
 * - 'evolution' → Evolution API self-hosted (grátis, mas exige servidor 24/7 próprio)
 * - 'zapster'   → api.zapsterapi.com (SaaS, plano Essential R$47/mês)
 * Toda a lógica de negócio (notificarInscricao, notificarPagamento etc.) fica igual —
 * só send()/toGroup()/toNumber()/verificarNumeroWhatsApp()/enviarQRCodePIX()/buscarGrupos()
 * sabem a diferença entre eles.
 */

function normalizarNumero(telefone: string): string {
  const digits = telefone.replace(/\D/g, '')
  return digits.startsWith('55') ? digits : `55${digits}`
}

async function send(
  destino: string, texto: string,
  media?: { base64: string; caption?: string; fileName?: string }
): Promise<{ ok: boolean; erro?: string }> {
  const cfg = await getWhatsappSettings()
  if (!cfg.ativo) return { ok: false, erro: 'WhatsApp desativado nas configurações' }

  if (cfg.provider === 'zapster') {
    if (!cfg.token || !cfg.zapster_instance_id) {
      return { ok: false, erro: 'Zapster API não configurado (token/instance_id)' }
    }
    try {
      const body: Record<string, unknown> = { recipient: destino, instance_id: cfg.zapster_instance_id }
      if (media) body.media = { base64: media.base64, caption: media.caption, fileName: media.fileName }
      else body.text = texto
      const res = await fetch(`${ZAPSTER_URL}/wa/messages`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const txt = await res.text().catch(() => res.status.toString())
        console.error(`[WhatsApp/Zapster] Erro ${res.status}:`, txt)
        return { ok: false, erro: `Zapster ${res.status}: ${txt.substring(0, 100)}` }
      }
      return { ok: true }
    } catch (err) {
      console.error('[WhatsApp/Zapster] Erro de rede:', err)
      return { ok: false, erro: String(err) }
    }
  }

  if (cfg.provider === 'evolution') {
    if (!cfg.evolution_url || !cfg.evolution_instance || !cfg.token) {
      return { ok: false, erro: 'Evolution API não configurado (URL/instância/apikey)' }
    }
    try {
      const url = media
        ? `${cfg.evolution_url}/message/sendMedia/${cfg.evolution_instance}`
        : `${cfg.evolution_url}/message/sendText/${cfg.evolution_instance}`
      const body = media
        ? { number: destino, mediatype: 'image', mimetype: 'image/png', media: media.base64, fileName: media.fileName || 'imagem.png', caption: media.caption }
        : { number: destino, text: texto }
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'apikey': cfg.token, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) {
        const txt = await res.text().catch(() => res.status.toString())
        console.error(`[WhatsApp/Evolution] Erro ${res.status}:`, txt)
        return { ok: false, erro: `Evolution ${res.status}: ${txt.substring(0, 100)}` }
      }
      return { ok: true }
    } catch (err) {
      console.error('[WhatsApp/Evolution] Erro de rede:', err)
      return { ok: false, erro: String(err) }
    }
  }

  if (!cfg.token) return { ok: false, erro: 'WHAPI_TOKEN não configurado' }
  try {
    const url  = media ? `${WHAPI_URL}/messages/image` : `${WHAPI_URL}/messages/text`
    const body = media
      ? { to: destino, image: `data:image/png;base64,${media.base64}`, caption: media.caption }
      : { to: destino, body: texto }
    const res = await fetch(url, {
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

// Mensagens vão como texto puro (não imagem+legenda): o link já embutido no
// texto vira automaticamente um card de preview rico no WhatsApp, usando o
// favicon/OG image do próprio site (BetMais) — sem precisar anexar mídia.
// O parâmetro `loteria` fica pronto pra uso futuro (ex: emoji/tom por loteria).
async function toGroup(text: string, _loteria?: string) {
  const cfg = await getWhatsappSettings()
  if (!cfg.group_id) return
  // Whapi/Evolution usam o JID puro (12036...@g.us); Zapster usa "group:<numero>" sem o sufixo
  const destino = cfg.provider === 'zapster'
    ? `group:${cfg.group_id.replace('@g.us', '')}`
    : cfg.group_id
  return send(destino, text)
}

async function toNumber(telefone: string, text: string, _loteria?: string): Promise<{ ok: boolean; erro?: string }> {
  if (!telefone) return { ok: false, erro: 'Telefone não informado' }
  const cfg = await getWhatsappSettings()
  const numero = normalizarNumero(telefone)
  // Whapi espera o JID completo; Evolution/Zapster resolvem a partir do número puro
  const destino = cfg.provider === 'whapi' ? `${numero}@s.whatsapp.net` : numero
  return send(destino, text)
}

/** Envio avulso (convite/mensagem livre) — usado pelo disparo em massa do Histórico. */
export async function enviarConviteWhatsapp(telefone: string, mensagem: string, loteria?: string): Promise<{ ok: boolean; erro?: string }> {
  return toNumber(telefone, mensagem, loteria)
}

export async function verificarNumeroWhatsApp(telefone: string): Promise<boolean> {
  const cfg = await getWhatsappSettings()
  if (!cfg.ativo || !cfg.token) return true
  const full = normalizarNumero(telefone)
  try {
    // Zapster não documenta endpoint de verificação de número — assume que existe
    // (mesmo comportamento seguro de fallback usado nos erros dos outros provedores)
    if (cfg.provider === 'zapster') return true

    if (cfg.provider === 'evolution') {
      if (!cfg.evolution_url || !cfg.evolution_instance) return true
      const res = await fetch(`${cfg.evolution_url}/chat/whatsappNumbers/${cfg.evolution_instance}`, {
        method: 'POST',
        headers: { 'apikey': cfg.token, 'Content-Type': 'application/json' },
        body: JSON.stringify({ numbers: [full] }),
      })
      if (!res.ok) return true
      const data = await res.json()
      const contato = Array.isArray(data) ? data[0] : null
      return contato?.exists !== false
    }

    const res = await fetch(`${WHAPI_URL}/contacts`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocking: 'wait', phones: [full] }),
    })
    if (!res.ok) return true
    const data = await res.json()
    const contato = Array.isArray(data) ? data[0] : data?.contacts?.[0]
    return contato?.exists !== false
  } catch (err) {
    console.error('[WhatsApp] erro ao verificar número:', err)
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
  if (!cfg.ativo || !cfg.token || !telefone) return
  const numero = normalizarNumero(telefone)
  const valorStr = valor.toFixed(2).replace('.', ',')
  const legenda =
    `📲 *PIX para pagamento*\n` +
    `🎰 ${bolaoNome}\n\n` +
    `💰 *R$ ${valorStr}*\n\n` +
    `_Escaneie o QR Code ou use o código abaixo._`

  if (cfg.provider === 'zapster') {
    await send(numero, '', { base64: qrBase64, caption: legenda, fileName: 'pix.png' }).catch(() => ({ ok: false }))
  } else if (cfg.provider === 'evolution') {
    if (cfg.evolution_url && cfg.evolution_instance) {
      await fetch(`${cfg.evolution_url}/message/sendMedia/${cfg.evolution_instance}`, {
        method: 'POST',
        headers: { 'apikey': cfg.token, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          number: numero, mediatype: 'image', mimetype: 'image/png',
          media: qrBase64, fileName: 'pix.png', caption: legenda,
        }),
      }).catch(() => {})
    }
  } else {
    const to = `${numero}@s.whatsapp.net`
    await fetch(`${WHAPI_URL}/messages/image`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${cfg.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, image: `data:image/png;base64,${qrBase64}`, caption: legenda }),
    }).catch(() => {})
  }

  await toNumber(telefone,
    `📋 *Código PIX — Copia e Cola:*\n\n` +
    `${pixCode}\n\n` +
    `_Abra seu banco, escolha PIX, cole o código e pague._`
  )
}

export async function notificarInscricao(nome: string, cotas: string[], concurso: number, total: number, loteria?: string) {
  await toGroup(
    `✅ *NOVA INSCRIÇÃO*\n\n` +
    `👤 *${nome}*\n` +
    `🎟️ ${fmtCotas(cotas)}\n` +
    `💰 Total: R$ ${total.toFixed(2).replace('.', ',')}\n` +
    `🎯 Concurso: #${concurso}\n\n` +
    `_Aguardando pagamento via PIX_`,
    loteria
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
  dataHora?: string,
  loteria?: string
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
    `  🎟️ ${fmtCotas(cotas)}\n\n` +
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
    `_Guarde este comprovante. Boa sorte! 🍀_`,
    loteria
  )
}

export async function notificarPagamento(
  nome: string, cotas: string[], concurso: number, total: number,
  telefone?: string, participanteId?: string, loteria?: string
) {
  const app = await getAppSettings()
  const linkComprovante = participanteId ? `\n🔗 Comprovante: ${app.url}/p/${participanteId}` : ''
  const msg =
    `💚 *PAGAMENTO CONFIRMADO*\n\n` +
    `👤 *${nome}*\n` +
    `🎟️ ${fmtCotas(cotas)}\n` +
    `💰 R$ ${total.toFixed(2).replace('.', ',')}\n` +
    `🎯 Concurso: #${concurso}\n\n` +
    `_Boa sorte! 🍀_`

  await toGroup(msg, loteria)

  if (telefone) {
    await toNumber(telefone,
      `✅ *Seu pagamento foi confirmado!*\n\n` +
      `🎟️ *${fmtCotas(cotas)}*\n` +
      `💰 R$ ${total.toFixed(2).replace('.', ',')}\n` +
      `🎯 Concurso: #${concurso}` +
      linkComprovante + `\n\n` +
      `Boa sorte! 🍀`,
      loteria
    )
  }
}

export async function notificarResultado(concurso: number, numeros: string[], premio: string, loteriaLabel = 'MEGA-SENA', loteria?: string) {
  await toGroup(
    `🍀 *RESULTADO ${loteriaLabel.toUpperCase()} #${concurso}*\n\n` +
    `🔢 *${numeros.join(' · ')}*\n\n` +
    `🏆 Prêmio estimado próximo: ${premio}\n\n` +
    `_Confira seus números! Acesse o painel para ver os resultados._`,
    loteria
  )
}

export async function notificarLembrete(concurso: number, pendentes: number, loteria?: string) {
  const cfg = await getWhatsappSettings()
  await toGroup(
    `⏰ *LEMBRETE DE PAGAMENTO*\n\n` +
    `🎯 Concurso: #${concurso}\n` +
    `⚠️ ${pendentes} pagamento(s) ainda pendente(s)\n\n` +
    `💳 Prazo: *${cfg.prazo_horario} do dia do sorteio*\n` +
    `_Fale com o administrador para informações de pagamento._`,
    loteria
  )
}

export async function notificarPremioIndividual(
  telefone: string, nome: string, cotas: string[],
  valorPremio: number, bolaoNome: string, concurso: number, loteria?: string
) {
  const valor = valorPremio.toFixed(2).replace('.', ',')
  await toNumber(telefone,
    `🏆 *PARABÉNS! VOCÊ GANHOU!*\n\n` +
    `*${nome}*, o bolão *${bolaoNome}* ganhou no concurso #${concurso}!\n\n` +
    `🎟️ ${fmtCotas(cotas)}\n` +
    `💰 *Seu prêmio: R$ ${valor}*\n\n` +
    `_O administrador entrará em contato para efetuar o pagamento. Parabéns! 🍀🎉_`,
    loteria
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
  acrescimo: number, pixCode: string, bolaoNome: string, loteria?: string
) {
  const valor = acrescimo.toFixed(2).replace('.', ',')
  await toNumber(telefone,
    `🔔 *COMPLEMENTO DE PAGAMENTO*\n\n` +
    `Olá *${nome}*!\n\n` +
    `O bolão *${bolaoNome}* foi encerrado com cotas não vendidas.\n` +
    `O saldo restante foi dividido entre os participantes.\n\n` +
    `💰 *Seu complemento: R$ ${valor}*\n` +
    `🎟️ ${fmtCotas(cotas)}\n\n` +
    `📋 *Código PIX para pagamento:*\n${pixCode}\n\n` +
    `_Copie e pague no seu banco ou app. Boa sorte! 🍀_`,
    loteria
  )
  await toGroup(
    `🔔 *ENCERRAMENTO — ${bolaoNome}*\n\n` +
    `Acréscimo de *R$ ${valor}* enviado para *${nome}* via WhatsApp.\n` +
    `🎟️ ${fmtCotas(cotas)}`,
    loteria
  )
}

export async function notificarQuaseLotado(bolaoNome: string, cotasVendidas: number, totalCotas: number, loteria?: string) {
  const pct = Math.round((cotasVendidas / totalCotas) * 100)
  await toGroup(
    `🔥 *BOLÃO QUASE LOTADO!*\n\n` +
    `*${bolaoNome}* está com *${pct}%* das cotas preenchidas.\n\n` +
    `🎟️ ${cotasVendidas} de ${totalCotas} cotas vendidas\n` +
    `⚠️ *Restam apenas ${totalCotas - cotasVendidas} cotas disponíveis!*\n\n` +
    `_Corra para garantir a sua! 🍀_`,
    loteria
  )
}

export async function notificarAcertosIndividual(
  telefone: string,
  nome: string,
  bolaoNome: string,
  concurso: number,
  dezenasSorteadas: number[],
  apostas: number[][],
  cotas: string[],
  loteria?: string
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
    `🎟️ *${fmtCotas(cotas)}*\n\n` +
    `📊 *Seus jogos:*\n${linhasApostas}\n` +
    (maxAcertos >= 4
      ? `🏆 *Parabéns! Você acertou ${maxAcertos} dezenas!*\n\n_O administrador entrará em contato com detalhes do prêmio._`
      : `_Não foi dessa vez — mas a sorte está chegando! 💪🍀_`),
    loteria
  )
}

export async function buscarGrupos(): Promise<{ id: string; name: string }[]> {
  const cfg = await getWhatsappSettings()
  if (!cfg.token) return []
  try {
    // Zapster não documenta endpoint de listagem de grupos — ID do grupo é colado manualmente
    if (cfg.provider === 'zapster') return []

    if (cfg.provider === 'evolution') {
      if (!cfg.evolution_url || !cfg.evolution_instance) return []
      const res = await fetch(`${cfg.evolution_url}/group/fetchAllGroups/${cfg.evolution_instance}?getParticipants=false`, {
        headers: { 'apikey': cfg.token },
      })
      const data = await res.json()
      return (Array.isArray(data) ? data : []).map((g: { id: string; subject: string }) => ({
        id:   g.id,
        name: g.subject,
      }))
    }

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
