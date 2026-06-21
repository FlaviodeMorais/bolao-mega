import nodemailer from 'nodemailer'

const GMAIL_USER = process.env.EMAIL_GMAIL_USER || ''
const GMAIL_PASS = process.env.EMAIL_GMAIL_PASS || ''
const FROM_NAME  = process.env.EMAIL_FROM_NAME  || 'Bolão Mega'
const ADMIN      = process.env.EMAIL_ADMIN      || ''

function criarTransport() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user: GMAIL_USER, pass: GMAIL_PASS },
  })
}

async function send(to: string, subject: string, html: string) {
  if (!GMAIL_USER || !GMAIL_PASS) return { ok: false, erro: 'EMAIL_GMAIL_USER ou EMAIL_GMAIL_PASS não configurado' }
  if (!to) return { ok: false, erro: 'E-mail não informado' }
  try {
    const transport = criarTransport()
    await transport.sendMail({ from: `"${FROM_NAME}" <${GMAIL_USER}>`, to, subject, html })
    return { ok: true }
  } catch (err) {
    console.error('[Email]', err)
    return { ok: false, erro: String(err) }
  }
}

function layout(titulo: string, corpo: string) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${titulo}</title></head>
<body style="margin:0;padding:0;background:#0d1117;font-family:'Segoe UI',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#0d1117;padding:32px 0;">
<tr><td align="center">
<table width="560" cellpadding="0" cellspacing="0" style="background:#161b22;border-radius:16px;overflow:hidden;border:1px solid rgba(255,255,255,0.08);">

  <!-- Header -->
  <tr><td style="background:linear-gradient(135deg,#00A651,#007a3d);padding:28px 32px;text-align:center;">
    <div style="font-size:32px;margin-bottom:8px;">🍀</div>
    <div style="color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">GRUPO MEGA</div>
    <div style="color:rgba(255,255,255,0.7);font-size:13px;margin-top:4px;">${titulo}</div>
  </td></tr>

  <!-- Corpo -->
  <tr><td style="padding:32px;">${corpo}</td></tr>

  <!-- Footer -->
  <tr><td style="padding:20px 32px;border-top:1px solid rgba(255,255,255,0.06);text-align:center;">
    <div style="color:rgba(255,255,255,0.25);font-size:11px;line-height:1.6;">
      Bolão Mega — Grupo de apostas na Mega-Sena<br>
      Você recebeu este e-mail porque participa do nosso bolão.
    </div>
  </td></tr>

</table>
</td></tr></table>
</body></html>`
}

function stat(label: string, valor: string, cor = '#00A651') {
  return `<tr>
    <td style="color:rgba(255,255,255,0.45);font-size:12px;padding:6px 0 2px;text-transform:uppercase;letter-spacing:0.8px;">${label}</td>
    <td style="color:${cor};font-size:15px;font-weight:700;text-align:right;padding:6px 0 2px;">${valor}</td>
  </tr>`
}

// ── PIX gerado — envia código e instruções ─────────────────────────────────
export async function enviarPixEmail(
  email: string,
  nome: string,
  valor: number,
  pixCode: string,
  bolaoNome: string,
  cotas: string[]
) {
  const valorStr = `R$ ${valor.toFixed(2).replace('.', ',')}`
  const corpo = `
    <p style="color:rgba(255,255,255,0.75);font-size:15px;margin:0 0 24px;">
      Olá <strong style="color:#fff;">${nome}</strong>! Sua inscrição foi registrada.<br>
      Efetue o pagamento via PIX para confirmar sua participação.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(0,166,81,0.08);border:1px solid rgba(0,166,81,0.2);border-radius:12px;padding:20px;margin-bottom:24px;">
      <tr><td>
        <div style="color:rgba(255,255,255,0.5);font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Valor a pagar</div>
        <div style="color:#00A651;font-size:28px;font-weight:800;">${valorStr}</div>
      </td></tr>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      ${stat('Bolão', bolaoNome)}
      ${stat('Suas cotas', cotas.map(c => `Nº ${c}`).join(' · '))}
      ${stat('Concurso', 'Mega-Sena')}
    </table>

    <div style="background:#0d1117;border-radius:10px;padding:16px;margin-bottom:24px;">
      <div style="color:rgba(255,255,255,0.4);font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Código PIX — Copia e Cola</div>
      <div style="color:#e6edf3;font-size:11px;word-break:break-all;font-family:monospace;line-height:1.6;">${pixCode}</div>
    </div>

    <div style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.2);border-radius:10px;padding:14px;">
      <div style="color:#F59E0B;font-size:13px;font-weight:600;">⚠️ Atenção</div>
      <div style="color:rgba(255,255,255,0.6);font-size:13px;margin-top:6px;line-height:1.5;">
        Após o pagamento, aguarde a confirmação do administrador.
        Sua participação só é efetivada após a confirmação do PIX.
      </div>
    </div>
  `
  return send(email, `🔑 PIX gerado — ${bolaoNome}`, layout('Código PIX para pagamento', corpo))
}

// ── Pagamento confirmado ───────────────────────────────────────────────────
export async function enviarConfirmacaoPagamento(
  email: string,
  nome: string,
  cotas: string[],
  total: number,
  concurso: number,
  bolaoNome: string,
  numApostas: number,
  dezenas: number
) {
  const valorStr = `R$ ${total.toFixed(2).replace('.', ',')}`
  const corpo = `
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-block;background:rgba(0,166,81,0.15);border-radius:50%;width:64px;height:64px;line-height:64px;font-size:28px;">✅</div>
      <h2 style="color:#fff;margin:12px 0 4px;font-size:20px;">Pagamento confirmado!</h2>
      <p style="color:rgba(255,255,255,0.5);margin:0;font-size:14px;">Você está participando do bolão. Boa sorte!</p>
    </div>

    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border-top:1px solid rgba(255,255,255,0.06);">
      ${stat('Participante', nome, '#e6edf3')}
      ${stat('Bolão', bolaoNome, '#e6edf3')}
      ${stat('Concurso', `#${concurso}`)}
      ${stat('Cotas adquiridas', cotas.map(c => `Nº ${c}`).join(' · '), '#e6edf3')}
      ${stat('Apostas', `${numApostas} apostas · ${dezenas} dezenas`, '#e6edf3')}
      ${stat('Valor pago', valorStr)}
    </table>

    <div style="background:rgba(0,166,81,0.08);border:1px solid rgba(0,166,81,0.15);border-radius:10px;padding:14px;text-align:center;">
      <div style="color:rgba(255,255,255,0.6);font-size:13px;line-height:1.6;">
        🏆 Em caso de premiação, você será notificado por e-mail.<br>
        O prêmio é dividido proporcionalmente ao número de cotas adquiridas.
      </div>
    </div>
  `
  return send(email, `✅ Pagamento confirmado — ${bolaoNome}`, layout('Comprovante de Participação', corpo))
}

// ── Resultado do sorteio ──────────────────────────────────────────────────
export async function enviarResultado(
  email: string,
  nome: string,
  concurso: number,
  numeros: string[],
  ganhou: boolean,
  bolaoNome: string,
  premioIndividual?: number
) {
  const corpo = ganhou && premioIndividual ? `
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:40px;margin-bottom:8px;">🏆</div>
      <h2 style="color:#00A651;margin:0 0 8px;font-size:24px;">GANHAMOS!</h2>
      <p style="color:rgba(255,255,255,0.6);margin:0;">Concurso #${concurso} — ${bolaoNome}</p>
    </div>
    <div style="background:rgba(0,166,81,0.12);border:1px solid rgba(0,166,81,0.25);border-radius:12px;padding:20px;text-align:center;margin-bottom:24px;">
      <div style="color:rgba(255,255,255,0.5);font-size:12px;text-transform:uppercase;letter-spacing:1px;">Seu prêmio, ${nome}</div>
      <div style="color:#00A651;font-size:32px;font-weight:800;margin:8px 0;">R$ ${premioIndividual.toFixed(2).replace('.', ',')}</div>
      <div style="color:rgba(255,255,255,0.4);font-size:12px;">O administrador entrará em contato para efetuar o pagamento.</div>
    </div>
    <div style="text-align:center;">
      <div style="color:rgba(255,255,255,0.5);font-size:12px;margin-bottom:8px;">Dezenas sorteadas</div>
      <div style="font-size:20px;font-weight:800;color:#fff;letter-spacing:4px;">${numeros.join('  ')}</div>
    </div>
  ` : `
    <div style="text-align:center;margin-bottom:28px;">
      <div style="font-size:40px;margin-bottom:8px;">🎲</div>
      <h2 style="color:#fff;margin:0 0 8px;font-size:20px;">Resultado do Concurso #${concurso}</h2>
      <p style="color:rgba(255,255,255,0.5);margin:0;">${bolaoNome}</p>
    </div>
    <div style="text-align:center;margin-bottom:24px;">
      <div style="color:rgba(255,255,255,0.5);font-size:12px;margin-bottom:12px;">Dezenas sorteadas</div>
      <div style="font-size:24px;font-weight:800;color:#1D6EA6;letter-spacing:4px;">${numeros.join('  ')}</div>
    </div>
    <div style="background:rgba(239,68,68,0.08);border:1px solid rgba(239,68,68,0.15);border-radius:10px;padding:14px;text-align:center;">
      <div style="color:rgba(255,255,255,0.6);font-size:14px;">😔 Não foi desta vez, ${nome}.<br>Mas a sorte está chegando! Participe do próximo bolão.</div>
    </div>
  `
  const assunto = ganhou ? `🏆 GANHAMOS! Concurso #${concurso}` : `🎲 Resultado — Concurso #${concurso}`
  return send(email, assunto, layout('Resultado do Sorteio', corpo))
}

// ── Lembrete de pagamento pendente ─────────────────────────────────────────
export async function enviarLembrete(
  email: string,
  nome: string,
  cotas: string[],
  concurso: number,
  bolaoNome: string,
  pixCode?: string
) {
  const corpo = `
    <p style="color:rgba(255,255,255,0.75);font-size:15px;margin:0 0 20px;">
      Olá <strong style="color:#fff;">${nome}</strong>! Seu pagamento ainda está pendente.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border-top:1px solid rgba(255,255,255,0.06);">
      ${stat('Bolão', bolaoNome, '#e6edf3')}
      ${stat('Concurso', `#${concurso}`)}
      ${stat('Suas cotas', cotas.map(c => `Nº ${c}`).join(' · '), '#e6edf3')}
    </table>
    ${pixCode ? `
    <div style="background:#0d1117;border-radius:10px;padding:16px;margin-bottom:16px;">
      <div style="color:rgba(255,255,255,0.4);font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Código PIX</div>
      <div style="color:#e6edf3;font-size:11px;word-break:break-all;font-family:monospace;line-height:1.6;">${pixCode}</div>
    </div>` : ''}
    <div style="background:rgba(245,158,11,0.1);border:1px solid rgba(245,158,11,0.2);border-radius:10px;padding:14px;">
      <div style="color:#F59E0B;font-size:13px;">⏰ Pague antes do sorteio para garantir sua participação!</div>
    </div>
  `
  return send(email, `⏰ Lembrete — pagamento pendente #${concurso}`, layout('Lembrete de Pagamento', corpo))
}

// ── Acréscimo (encerramento com cotas sobrando) ────────────────────────────
export async function enviarAcrescimo(
  email: string,
  nome: string,
  cotas: string[],
  acrescimo: number,
  pixCode: string,
  bolaoNome: string
) {
  const valorStr = `R$ ${acrescimo.toFixed(2).replace('.', ',')}`
  const corpo = `
    <p style="color:rgba(255,255,255,0.75);font-size:15px;margin:0 0 20px;">
      Olá <strong style="color:#fff;">${nome}</strong>! O bolão foi encerrado com cotas não vendidas.
      O saldo foi dividido entre os participantes.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(0,166,81,0.08);border:1px solid rgba(0,166,81,0.2);border-radius:12px;padding:20px;margin-bottom:24px;">
      <tr><td>
        <div style="color:rgba(255,255,255,0.5);font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Seu complemento</div>
        <div style="color:#00A651;font-size:28px;font-weight:800;">${valorStr}</div>
      </td></tr>
    </table>
    <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px;border-top:1px solid rgba(255,255,255,0.06);">
      ${stat('Bolão', bolaoNome, '#e6edf3')}
      ${stat('Suas cotas', cotas.map(c => `Nº ${c}`).join(' · '), '#e6edf3')}
    </table>
    <div style="background:#0d1117;border-radius:10px;padding:16px;">
      <div style="color:rgba(255,255,255,0.4);font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:8px;">Código PIX para pagamento</div>
      <div style="color:#e6edf3;font-size:11px;word-break:break-all;font-family:monospace;line-height:1.6;">${pixCode}</div>
    </div>
  `
  return send(email, `🔔 Complemento de pagamento — ${bolaoNome}`, layout('Complemento de Pagamento', corpo))
}

// ── Notifica admin sobre nova inscrição ───────────────────────────────────
export async function notificarAdminInscricao(
  nome: string,
  cotas: string[],
  total: number,
  concurso: number,
  telefone: string
) {
  if (!ADMIN) return { ok: false, erro: 'EMAIL_ADMIN não configurado' }
  const corpo = `
    <div style="background:rgba(0,166,81,0.08);border:1px solid rgba(0,166,81,0.2);border-radius:12px;padding:20px;margin-bottom:20px;">
      <div style="color:rgba(255,255,255,0.5);font-size:11px;text-transform:uppercase;letter-spacing:1px;margin-bottom:4px;">Nova inscrição</div>
      <div style="color:#fff;font-size:20px;font-weight:700;">${nome}</div>
    </div>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid rgba(255,255,255,0.06);">
      ${stat('Telefone', telefone, '#e6edf3')}
      ${stat('Cotas', cotas.map(c => `Nº ${c}`).join(' · '), '#e6edf3')}
      ${stat('Total', `R$ ${total.toFixed(2).replace('.', ',')}` )}
      ${stat('Concurso', `#${concurso}`)}
    </table>
  `
  return send(ADMIN, `✅ Nova inscrição — ${nome}`, layout('Nova Inscrição', corpo))
}
