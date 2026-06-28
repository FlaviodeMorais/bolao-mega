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

// ── Layout padrão ─────────────────────────────────────────────────────────────
function layout(titulo: string, corpo: string, loteriaLabel = 'Mega-Sena') {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${titulo}</title></head>
<body style="margin:0;padding:0;background:#F4F6F8;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#F4F6F8;padding:32px 0;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#FFFFFF;border-radius:16px;overflow:hidden;border:1px solid #E2E8F0;box-shadow:0 4px 24px rgba(0,0,0,.07);">

  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#00AB67,#005DA9);padding:28px 32px;text-align:center;">
    <div style="font-size:32px;margin-bottom:8px;">🍀</div>
    <div style="color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">BOLÃO ${loteriaLabel.toUpperCase()}</div>
    <div style="color:rgba(255,255,255,0.85);font-size:13px;margin-top:4px;">${titulo}</div>
  </td></tr>

  <!-- Corpo -->
  <tr><td style="padding:32px;color:#0D1B2A;">${corpo}</td></tr>

  <!-- Footer -->
  <tr><td style="padding:20px 32px;border-top:1px solid #E2E8F0;text-align:center;background:#F8FAFB;">
    <div style="color:#94A3B8;font-size:11px;line-height:1.6;">
      Você recebeu este e-mail porque participa do nosso bolão.<br>
      Dúvidas? Fale com o administrador do grupo.
    </div>
  </td></tr>

</table>
</td></tr></table>
</body></html>`
}

function stat(label: string, valor: string, cor = '#00AB67') {
  return `<tr>
    <td style="color:#64748B;font-size:12px;padding:7px 0 2px;text-transform:uppercase;letter-spacing:0.8px;border-bottom:1px solid #F1F5F9;">${label}</td>
    <td style="color:${cor};font-size:14px;font-weight:700;text-align:right;padding:7px 0 2px;border-bottom:1px solid #F1F5F9;">${valor}</td>
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
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      ${stat('Bolão', bolaoNome, '#0D1B2A')}
      ${stat('Suas cotas', cotas.map(c => `Nº ${c}`).join(' · '), '#0D1B2A')}
    </table>
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
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      ${stat('Participante', nome, '#0D1B2A')}
      ${stat('Bolão', bolaoNome, '#0D1B2A')}
      ${stat('Concurso', `#${concurso}`, '#0D1B2A')}
      ${stat('Cotas adquiridas', cotas.map(c => `Nº ${c}`).join(' · '), '#0D1B2A')}
      ${stat('Apostas', `${numApostas} apostas · ${dezenas} dezenas`, '#0D1B2A')}
      ${stat('Valor pago', valorStr)}
    </table>
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
  ganhou: boolean, bolaoNome: string, premioIndividual?: number, loteriaLabel = 'Mega-Sena'
) {
  const corpo = ganhou && premioIndividual ? `
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:40px;margin-bottom:8px;">🏆</div>
      <h2 style="color:#00AB67;margin:0 0 8px;font-size:24px;">GANHAMOS!</h2>
      <p style="color:#64748B;margin:0;">Concurso #${concurso} — ${bolaoNome}</p>
    </div>
    <div style="background:#F0FDF4;border:1.5px solid #00AB67;border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
      <div style="color:#64748B;font-size:12px;text-transform:uppercase;letter-spacing:1px;">Seu prêmio, ${nome}</div>
      <div style="color:#00AB67;font-size:32px;font-weight:800;margin:8px 0;">R$ ${premioIndividual.toFixed(2).replace('.', ',')}</div>
      <div style="color:#94A3B8;font-size:12px;">O administrador entrará em contato para efetuar o pagamento.</div>
    </div>
    <div style="text-align:center;">
      <div style="color:#64748B;font-size:12px;margin-bottom:8px;">Dezenas sorteadas</div>
      <div style="font-size:20px;font-weight:800;color:#005DA9;letter-spacing:4px;">${numeros.join('  ')}</div>
    </div>
  ` : `
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:40px;margin-bottom:8px;">🎲</div>
      <h2 style="color:#0D1B2A;margin:0 0 8px;font-size:20px;">Resultado do Concurso #${concurso}</h2>
      <p style="color:#64748B;margin:0;">${bolaoNome}</p>
    </div>
    <div style="text-align:center;margin-bottom:24px;">
      <div style="color:#64748B;font-size:12px;margin-bottom:12px;">Dezenas sorteadas</div>
      <div style="font-size:24px;font-weight:800;color:#005DA9;letter-spacing:4px;">${numeros.join('  ')}</div>
    </div>
    <div style="background:#FEF2F2;border:1px solid #FECACA;border-radius:10px;padding:14px;text-align:center;">
      <div style="color:#64748B;font-size:14px;">😔 Não foi desta vez, ${nome}.<br>Mas a sorte está chegando! Participe do próximo bolão.</div>
    </div>
  `
  const assunto = ganhou ? `🏆 GANHAMOS! Concurso #${concurso}` : `🎲 Resultado — Concurso #${concurso}`
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
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      ${stat('Bolão', bolaoNome, '#0D1B2A')}
      ${stat('Concurso', `#${concurso}`, '#0D1B2A')}
      ${stat('Suas cotas', cotas.map(c => `Nº ${c}`).join(' · '), '#0D1B2A')}
    </table>
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
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      ${stat('Bolão', bolaoNome, '#0D1B2A')}
      ${stat('Suas cotas', cotas.map(c => `Nº ${c}`).join(' · '), '#0D1B2A')}
    </table>
    <div style="background:#F8FAFB;border:1px solid #E2E8F0;border-radius:10px;padding:16px;">
      <div style="color:#94A3B8;font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Código PIX para pagamento</div>
      <div style="color:#0D1B2A;font-size:11px;word-break:break-all;font-family:monospace;line-height:1.6;">${pixCode}</div>
    </div>
  `
  return send(email, `🔔 Complemento de pagamento — ${bolaoNome}`, layout('Complemento de Pagamento', corpo, loteriaLabel))
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
    <table width="100%" cellpadding="0" cellspacing="0">
      ${stat('Telefone', telefone, '#0D1B2A')}
      ${stat('Cotas', cotas.map(c => `Nº ${c}`).join(' · '), '#0D1B2A')}
      ${stat('Total', `R$ ${total.toFixed(2).replace('.', ',')}`)}
      ${stat('Concurso', `#${concurso}`, '#0D1B2A')}
    </table>
  `
  return send(cfg.admin_email, `✅ Nova inscrição — ${nome}`, layout('Nova Inscrição', corpo))
}
