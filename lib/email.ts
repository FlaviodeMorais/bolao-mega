import nodemailer from 'nodemailer'
import { getEmailSettings } from './settings'

async function send(to: string, subject: string, html: string) {
  const cfg = await getEmailSettings()
  if (!cfg.ativo) return { ok: false, erro: 'Email desativado nas configurações' }
  if (!to) return { ok: false, erro: 'E-mail não informado' }

  if (cfg.provider === 'resend' && cfg.resend_key) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${cfg.resend_key}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ from: `${cfg.from_name} <noreply@resend.dev>`, to, subject, html }),
      })
      if (!res.ok) return { ok: false, erro: `Resend ${res.status}` }
      return { ok: true }
    } catch (err) {
      return { ok: false, erro: String(err) }
    }
  }

  if (!cfg.gmail_user || !cfg.gmail_pass) return { ok: false, erro: 'Credenciais de e-mail não configuradas' }
  try {
    const transport = nodemailer.createTransport({
      service: 'gmail',
      auth: { user: cfg.gmail_user, pass: cfg.gmail_pass },
    })
    await transport.sendMail({ from: `"${cfg.from_name}" <${cfg.gmail_user}>`, to, subject, html })
    return { ok: true }
  } catch (err) {
    console.error('[Email]', err)
    return { ok: false, erro: String(err) }
  }
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

// ── Layout padrão ─────────────────────────────────────────────────────────────
function layout(titulo: string, corpo: string, loteriaLabel = 'Mega-Sena') {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${titulo}</title></head>
<body style="margin:0;padding:0;background:#F0F2F5;font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F0F2F5;padding:40px 16px;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:20px;overflow:hidden;border:1px solid #E2E8F0;box-shadow:0 8px 40px rgba(0,0,0,.10);max-width:560px;">

  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#007A4D 0%,#005DA9 100%);padding:24px 40px 16px;text-align:center;">
    <img src="${APP_URL}/bm-circle.png" width="88" height="88" alt="BetMais" style="display:block;margin:0 auto 10px;border-radius:50%;border:3px solid rgba(255,255,255,0.3);" />
    <div style="color:#FFFFFF;font-size:11px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;opacity:0.8;margin-bottom:3px;">BOLÃO ${loteriaLabel.toUpperCase()}</div>
    <div style="color:#FFFFFF;font-size:20px;font-weight:800;letter-spacing:-0.3px;">${titulo}</div>
  </td></tr>

  <!-- Corpo -->
  <tr><td style="padding:16px 40px 28px;color:#0D1B2A;">${corpo}</td></tr>

  <!-- Divisor -->
  <tr><td style="padding:0 40px;"><div style="height:1px;background:#F1F5F9;"></div></td></tr>

  <!-- Footer -->
  <tr><td style="padding:20px 40px 28px;text-align:center;">
    <div style="color:#94A3B8;font-size:11px;line-height:1.8;">
      Você recebeu este e-mail porque participa do nosso bolão.<br>
      Dúvidas? Fale com o administrador do grupo.
    </div>
  </td></tr>

</table>
</td></tr></table>
</body></html>`
}

// Linha de tabela com separador via div (evita border em td que fica descontinuado)
function statCard(rows: { label: string; valor: string; cor?: string }[]) {
  return `<div style="border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;margin-bottom:20px;">
    ${rows.map((r, i) => `
      ${i > 0 ? '<div style="height:1px;background:#E2E8F0;margin:0 20px;"></div>' : ''}
      <div style="display:flex;justify-content:space-between;align-items:center;padding:11px 20px;">
        <span style="color:#64748B;font-size:12px;text-transform:uppercase;letter-spacing:0.8px;">${r.label}</span>
        <span style="color:${r.cor ?? '#0D1B2A'};font-size:14px;font-weight:700;">${r.valor}</span>
      </div>`).join('')}
  </div>`
}

function stat(label: string, valor: string, cor = '#00AB67') {
  return `<tr>
    <td style="color:#64748B;font-size:12px;padding:7px 0 2px;text-transform:uppercase;letter-spacing:0.8px;border-bottom:1px solid #E2E8F0;">${label}</td>
    <td style="color:${cor};font-size:14px;font-weight:700;text-align:right;padding:7px 0 2px;border-bottom:1px solid #E2E8F0;">${valor}</td>
  </tr>`
}

// ── PIX gerado ─────────────────────────────────────────────────────────────────
export async function enviarPixEmail(
  email: string, nome: string, valor: number, pixCode: string,
  bolaoNome: string, cotas: string[], loteriaLabel = 'Mega-Sena'
) {
  const valorStr = `R$ ${valor.toFixed(2).replace('.', ',')}`
  const corpo = `
    <p style="color:#475569;font-size:15px;margin:0 0 24px;">
      Olá <strong style="color:#0D1B2A;">${nome}</strong>! Sua inscrição foi registrada.<br>
      Efetue o pagamento via PIX para confirmar sua participação.
    </p>
    <div style="background:#F0FDF4;border:1.5px solid #00AB67;border-radius:12px;padding:20px;margin-bottom:24px;text-align:center;">
      <div style="color:#64748B;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Valor a pagar</div>
      <div style="color:#00AB67;font-size:28px;font-weight:800;">${valorStr}</div>
    </div>
    ${statCard([
      { label: 'Bolão', valor: bolaoNome },
      { label: 'Suas cotas', valor: cotas.map(c => `Nº ${c}`).join(' · ') },
    ])}
    <div style="background:#F8FAFB;border:1px solid #E2E8F0;border-radius:10px;padding:16px;margin-bottom:24px;">
      <div style="color:#94A3B8;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Código PIX — Copia e Cola</div>
      <div style="color:#0D1B2A;font-size:11px;word-break:break-all;font-family:monospace;line-height:1.6;">${pixCode}</div>
    </div>
    <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:10px;padding:14px;">
      <div style="color:#D97706;font-size:13px;font-weight:600;">⚠️ Atenção</div>
      <div style="color:#78716C;font-size:13px;margin-top:6px;line-height:1.5;">
        Após o pagamento, aguarde a confirmação do administrador.
        Sua participação só é efetivada após a confirmação do PIX.
      </div>
    </div>
  `
  return send(email, `🔑 PIX gerado — ${bolaoNome}`, layout('Código PIX para pagamento', corpo, loteriaLabel))
}

// ── Pagamento confirmado ───────────────────────────────────────────────────────
export async function enviarConfirmacaoPagamento(
  email: string, nome: string, cotas: string[], total: number,
  concurso: number, bolaoNome: string, numApostas: number,
  dezenas: number, loteriaLabel = 'Mega-Sena'
) {
  const valorStr = `R$ ${total.toFixed(2).replace('.', ',')}`
  const corpo = `
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-flex;align-items:center;justify-content:center;background:#F0FDF4;border-radius:50%;width:64px;height:64px;font-size:28px;">✅</div>
      <h2 style="color:#0D1B2A;margin:12px 0 4px;font-size:20px;">Pagamento confirmado!</h2>
      <p style="color:#64748B;margin:0;font-size:14px;">Você está participando do bolão. Boa sorte!</p>
    </div>
    ${statCard([
      { label: 'Participante', valor: nome },
      { label: 'Bolão', valor: bolaoNome },
      { label: 'Concurso', valor: `#${concurso}` },
      { label: 'Cotas adquiridas', valor: cotas.map(c => `Nº ${c}`).join(' · ') },
      { label: 'Apostas', valor: `${numApostas} apostas · ${dezenas} dezenas` },
      { label: 'Valor pago', valor: valorStr, cor: '#00AB67' },
    ])}
    <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;padding:14px;text-align:center;">
      <div style="color:#475569;font-size:13px;line-height:1.6;">
        🏆 Em caso de premiação, você será notificado por e-mail.<br>
        O prêmio é dividido proporcionalmente ao número de cotas adquiridas.
      </div>
    </div>
  `
  return send(email, `✅ Comprovante de participação — ${bolaoNome}`, layout('Comprovante de Participação', corpo, loteriaLabel))
}

// ── Resultado do sorteio ──────────────────────────────────────────────────────
export async function enviarResultado(
  email: string, nome: string, concurso: number, numeros: string[],
  ganhou: boolean, bolaoNome: string, premioIndividual?: number, loteriaLabel = 'Mega-Sena',
  premioTotal?: number, premioPerCota?: number
) {
  const fmtBRL = (v: number) => `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  const dezenasHtml = `
    <div style="text-align:center;margin:24px 0;">
      <div style="color:#94A3B8;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;margin-bottom:10px;">Dezenas Sorteadas</div>
      <div style="font-size:22px;font-weight:900;color:#005DA9;letter-spacing:6px;font-family:monospace;">${numeros.join('  ')}</div>
    </div>`

  const row = (label: string, valor: string, first = false) => `
    ${first ? '' : '<div style="height:1px;background:#E2E8F0;margin:0 20px;"></div>'}
    <div style="display:flex;justify-content:space-between;align-items:center;padding:11px 20px;">
      <span style="color:#475569;font-size:13px;">${label}</span>
      <span style="color:#15803D;font-size:13px;font-weight:700;">${valor}</span>
    </div>`

  const premioBreakdown = (premioTotal ?? 0) > 0 ? `
    <div style="border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;margin:16px 0;">
      <div style="background:#F8FAFB;padding:10px 20px;border-bottom:1px solid #E2E8F0;">
        <span style="color:#64748B;font-size:10px;font-weight:700;letter-spacing:2px;text-transform:uppercase;">🏅 Prêmios da Caixa</span>
      </div>
      ${row('Prêmio total do bolão', fmtBRL(premioTotal!), true)}
      ${row('Prêmio por cota', fmtBRL(premioPerCota!))}
    </div>` : ''

  const gradienteBloco = (premioPerCota ?? 0) > 0 ? `
    <div style="background:linear-gradient(135deg,#00AB67 0%,#005DA9 100%);border-radius:14px;padding:24px;text-align:center;margin-top:16px;">
      ${premioIndividual ? `
        <div style="color:rgba(255,255,255,0.8);font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;margin-bottom:6px;">Seu prêmio</div>
        <div style="color:#FFFFFF;font-size:38px;font-weight:900;letter-spacing:-1px;margin-bottom:4px;">${fmtBRL(premioIndividual)}</div>
      ` : `
        <div style="color:rgba(255,255,255,0.8);font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;margin-bottom:6px;">Prêmio por cota</div>
        <div style="color:#FFFFFF;font-size:38px;font-weight:900;letter-spacing:-1px;margin-bottom:4px;">${fmtBRL(premioPerCota!)}</div>
      `}
      <div style="color:rgba(255,255,255,0.7);font-size:12px;">O administrador entrará em contato para efetuar o pagamento.</div>
    </div>` : ''

  const badge = (texto: string, bg: string, cor: string) =>
    `<div style="display:inline-block;background:${bg};color:${cor};font-size:10px;font-weight:800;letter-spacing:2.5px;text-transform:uppercase;padding:7px 20px;border-radius:99px;margin-bottom:12px;">${texto}</div>`

  const corpo = ganhou && premioIndividual ? `
    <div style="text-align:center;margin-bottom:12px;">
      ${badge('Resultado', '#DCFCE7', '#15803D')}
      <div style="color:#15803D;font-size:26px;font-weight:900;margin-bottom:3px;">GANHAMOS! 🎉</div>
      <div style="color:#64748B;font-size:13px;">${bolaoNome} · Concurso #${concurso}</div>
    </div>
    ${dezenasHtml}
    ${premioBreakdown}
    ${gradienteBloco}
  ` : `
    <div style="text-align:center;margin-bottom:12px;">
      ${badge('Resultado', '#F1F5F9', '#64748B')}
      <div style="color:#0D1B2A;font-size:22px;font-weight:800;margin-bottom:3px;">Concurso #${concurso}</div>
      <div style="color:#64748B;font-size:13px;">${bolaoNome}</div>
    </div>
    ${dezenasHtml}
    ${premioBreakdown}
    <div style="background:#F8FAFB;border:1px solid #E2E8F0;border-radius:12px;padding:16px;text-align:center;margin-top:16px;">
      <div style="color:#64748B;font-size:14px;line-height:1.6;">Não foi desta vez, <strong style="color:#0D1B2A;">${nome}</strong>.<br>Mas a sorte está chegando! Participe do próximo bolão.</div>
    </div>
  `
  const assunto = ganhou ? `GANHAMOS! Concurso #${concurso}` : `Resultado — Concurso #${concurso}`
  return send(email, assunto, layout('Resultado do Sorteio', corpo, loteriaLabel))
}

// ── Lembrete de pagamento pendente ─────────────────────────────────────────────
export async function enviarLembrete(
  email: string, nome: string, cotas: string[], concurso: number,
  bolaoNome: string, pixCode?: string, loteriaLabel = 'Mega-Sena'
) {
  const corpo = `
    <p style="color:#475569;font-size:15px;margin:0 0 20px;">
      Olá <strong style="color:#0D1B2A;">${nome}</strong>! Seu pagamento ainda está pendente.
    </p>
    ${statCard([
      { label: 'Bolão', valor: bolaoNome },
      { label: 'Concurso', valor: `#${concurso}` },
      { label: 'Suas cotas', valor: cotas.map(c => `Nº ${c}`).join(' · ') },
    ])}
    ${pixCode ? `
    <div style="background:#F8FAFB;border:1px solid #E2E8F0;border-radius:10px;padding:16px;margin-bottom:16px;">
      <div style="color:#94A3B8;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Código PIX</div>
      <div style="color:#0D1B2A;font-size:11px;word-break:break-all;font-family:monospace;line-height:1.6;">${pixCode}</div>
    </div>` : ''}
    <div style="background:#FFFBEB;border:1px solid #FDE68A;border-radius:10px;padding:14px;">
      <div style="color:#D97706;font-size:13px;font-weight:600;">⏰ Pague antes do sorteio para garantir sua participação!</div>
    </div>
  `
  return send(email, `⏰ Lembrete — pagamento pendente #${concurso}`, layout('Lembrete de Pagamento', corpo, loteriaLabel))
}

// ── Acréscimo (encerramento) ───────────────────────────────────────────────────
export async function enviarAcrescimo(
  email: string, nome: string, cotas: string[], acrescimo: number,
  pixCode: string, bolaoNome: string, loteriaLabel = 'Mega-Sena'
) {
  const valorStr = `R$ ${acrescimo.toFixed(2).replace('.', ',')}`
  const corpo = `
    <p style="color:#475569;font-size:15px;margin:0 0 20px;">
      Olá <strong style="color:#0D1B2A;">${nome}</strong>! O bolão foi encerrado com cotas não vendidas.
      O saldo foi dividido entre os participantes.
    </p>
    <div style="background:#F0FDF4;border:1.5px solid #00AB67;border-radius:12px;padding:20px;margin-bottom:24px;text-align:center;">
      <div style="color:#64748B;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Seu complemento</div>
      <div style="color:#00AB67;font-size:28px;font-weight:800;">${valorStr}</div>
    </div>
    ${statCard([
      { label: 'Bolão', valor: bolaoNome },
      { label: 'Suas cotas', valor: cotas.map(c => `Nº ${c}`).join(' · ') },
    ])}
    <div style="background:#F8FAFB;border:1px solid #E2E8F0;border-radius:10px;padding:16px;">
      <div style="color:#94A3B8;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Código PIX para pagamento</div>
      <div style="color:#0D1B2A;font-size:11px;word-break:break-all;font-family:monospace;line-height:1.6;">${pixCode}</div>
    </div>
  `
  return send(email, `🔔 Complemento de pagamento — ${bolaoNome}`, layout('Complemento de Pagamento', corpo, loteriaLabel))
}

// ── Acertos individuais por aposta (pós-conferência) ───────────────────────────
export async function enviarAcertosIndividual(
  email: string, nome: string, bolaoNome: string, concurso: number,
  dezenasSorteadas: number[], apostas: number[][], cotas: string[], loteriaLabel = 'Mega-Sena'
) {
  const set = new Set(dezenasSorteadas)
  const acertosPorAposta = apostas.map(bet => bet.filter(n => set.has(n)).length)
  const maxAcertos = acertosPorAposta.length > 0 ? Math.max(...acertosPorAposta) : 0
  const dezStr = dezenasSorteadas.map(n => String(n).padStart(2, '0')).join('  ')

  const linhasApostas = apostas.map((bet, i) => {
    const ac = acertosPorAposta[i]
    const betStr = bet.map(n => String(n).padStart(2, '0')).join(' ')
    const cor = ac >= 4 ? '#00AB67' : '#64748B'
    return `<tr>
      <td style="color:#64748B;font-size:12px;padding:6px 0;border-bottom:1px solid #F1F5F9;">Jogo ${String(i + 1).padStart(2, '0')}: ${betStr}</td>
      <td style="color:${cor};font-size:13px;font-weight:700;text-align:right;padding:6px 0;border-bottom:1px solid #F1F5F9;">${ac} acerto${ac !== 1 ? 's' : ''}</td>
    </tr>`
  }).join('')

  const corpo = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="font-size:36px;margin-bottom:8px;">${maxAcertos >= 6 ? '🏆' : maxAcertos === 5 ? '🥈' : maxAcertos === 4 ? '🥉' : '🎲'}</div>
      <h2 style="color:#0D1B2A;margin:0 0 4px;font-size:20px;">Resultado — Concurso #${concurso}</h2>
      <p style="color:#64748B;margin:0;font-size:14px;">${bolaoNome}</p>
    </div>
    <div style="text-align:center;margin-bottom:24px;">
      <div style="color:#64748B;font-size:12px;margin-bottom:8px;">Dezenas sorteadas</div>
      <div style="font-size:20px;font-weight:800;color:#005DA9;letter-spacing:4px;">${dezStr}</div>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px;">
      ${stat('Suas cotas', cotas.map(c => `Nº ${c}`).join(' · '), '#0D1B2A')}
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">${linhasApostas}</table>
    ${maxAcertos >= 4
      ? `<div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:10px;padding:14px;text-align:center;">
          <div style="color:#00AB67;font-size:14px;font-weight:700;">🏆 Parabéns! Você acertou ${maxAcertos} dezenas!</div>
          <div style="color:#475569;font-size:13px;margin-top:4px;">O administrador entrará em contato com detalhes do prêmio.</div>
        </div>`
      : `<div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:14px;text-align:center;">
          <div style="color:#64748B;font-size:13px;">Não foi dessa vez — mas a sorte está chegando! 💪🍀</div>
        </div>`}
  `
  return send(email, `${maxAcertos >= 4 ? '🏆' : '🎲'} Seu resultado — Concurso #${concurso}`, layout('Acertos do Bolão', corpo, loteriaLabel))
}

// ── Premiação do bolão esportivo (encerramento) ────────────────────────────────
export async function enviarPremioEsporte(
  email: string, nome: string, bolaoNome: string,
  posicao: number, emoji: string, label: string, categoria: string,
  pontos: number, premio: number
) {
  const valorStr = `R$ ${premio.toFixed(2).replace('.', ',')}`
  const corpo = `
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:40px;margin-bottom:8px;">${emoji}</div>
      <h2 style="color:#00AB67;margin:0 0 8px;font-size:22px;">Parabéns, ${nome}!</h2>
      <p style="color:#64748B;margin:0;">Você ficou em ${posicao}º lugar — ${label} — ${bolaoNome}</p>
    </div>
    <div style="background:#F0FDF4;border:1.5px solid #00AB67;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
      <div style="color:#64748B;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Seu prêmio</div>
      <div style="color:#00AB67;font-size:32px;font-weight:800;margin:8px 0;">${valorStr}</div>
      <div style="color:#94A3B8;font-size:12px;">${categoria} · ${pontos} pontos</div>
    </div>
    <div style="background:#F8FAFB;border:1px solid #E2E8F0;border-radius:10px;padding:16px;text-align:center;">
      <div style="color:#475569;font-size:13px;">O administrador entrará em contato em breve para combinar o pagamento do seu prêmio via PIX.</div>
    </div>
  `
  return send(email, `${emoji} Você ganhou! ${label} — ${bolaoNome}`, layout('Premiação do Bolão', corpo, 'Esporte'))
}

// ── Notifica admin sobre nova inscrição ───────────────────────────────────────
export async function notificarAdminInscricao(
  nome: string, cotas: string[], total: number, concurso: number, telefone: string
) {
  const cfg = await getEmailSettings()
  if (!cfg.admin_email) return { ok: false, erro: 'EMAIL_ADMIN não configurado' }
  const corpo = `
    <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:12px;padding:20px;margin-bottom:20px;">
      <div style="color:#64748B;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Nova inscrição</div>
      <div style="color:#0D1B2A;font-size:20px;font-weight:700;">${nome}</div>
    </div>
    ${statCard([
      { label: 'Telefone', valor: telefone },
      { label: 'Cotas', valor: cotas.map(c => `Nº ${c}`).join(' · ') },
      { label: 'Total', valor: `R$ ${total.toFixed(2).replace('.', ',')}`, cor: '#00AB67' },
      { label: 'Concurso', valor: `#${concurso}` },
    ])}
  `
  return send(cfg.admin_email, `✅ Nova inscrição — ${nome}`, layout('Nova Inscrição', corpo))
}
