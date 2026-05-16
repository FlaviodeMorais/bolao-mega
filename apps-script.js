//  BOLÃO MEGA 💯 – Backend (Google Apps Script)

const SHEET_NAME = 'Respostas';
const VALOR_COTA = 30;
const MP_TOKEN   = 'APP_USR-5695731252114803-051609-ef2890bdabeb0439ede4309bc5d88ce4-119386321';

// Dados do recebedor PIX (fallback local)
const PIX_CHAVE  = '27210592890';
const PIX_NOME   = 'FLAVIO DE MORAIS';
const PIX_CIDADE = 'SAO PAULO';

function doGet(e) {
  const action   = e.parameter.action   || 'get';
  const concurso = (e.parameter.concurso || '').trim();

  if (action === 'submit') {
    const nome     = (e.parameter.nome  || '').trim();
    const cotasStr = (e.parameter.cotas || '').trim();
    const cotas    = cotasStr ? cotasStr.split(',').map(c => c.trim()) : [];

    if (!nome)         return jsonOut({ success: false, error: 'Nome obrigatório.' });
    if (!concurso)     return jsonOut({ success: false, error: 'Concurso obrigatório.' });
    if (!cotas.length) return jsonOut({ success: false, error: 'Selecione ao menos uma cota.' });

    const sheet     = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    const taken     = getTakenCotas(sheet, concurso);
    const conflitos = cotas.filter(c => taken.includes(c));

    if (conflitos.length > 0) {
      return jsonOut({
        success: false,
        error: `Cota(s) já ocupada(s): ${conflitos.join(', ')}. Escolha outras.`
      });
    }

    const total    = cotas.length * VALOR_COTA;
    const totalStr = `R$ ${total.toFixed(2).replace('.', ',')}`;
    const nomes    = nome.split(' ');

    // Tenta Mercado Pago primeiro
    const mp = criarPixMP(total, concurso, cotas, nomes[0], nomes.slice(1).join(' ') || nomes[0]);
    const ts  = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm:ss');

    if (mp.success) {
      sheet.appendRow([ts, concurso, nome, cotas.join(', '), totalStr, 'Aguardando pagamento', mp.paymentId]);
      return jsonOut({
        success:      true,
        pixCode:      mp.qrCode,
        qrCodeBase64: mp.qrCodeBase64,
        total:        totalStr,
        nome:         nome,
        cotas:        cotas.join(', '),
        fonte:        'mp'
      });
    }

    // Fallback: gera PIX local
    const txId    = ('MEGA' + concurso + Math.random().toString(36).substring(2, 8)).toUpperCase().substring(0, 25);
    const pixCode = gerarPix(PIX_CHAVE, PIX_NOME, PIX_CIDADE, total, txId);
    sheet.appendRow([ts, concurso, nome, cotas.join(', '), totalStr, 'Aguardando pagamento', txId]);
    return jsonOut({
      success:  true,
      pixCode:  pixCode,
      total:    totalStr,
      nome:     nome,
      cotas:    cotas.join(', '),
      fonte:    'local'
    });
  }

  // action === 'get': retorna cotas ocupadas
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const taken = getTakenCotas(sheet, concurso);
  return jsonOut({ success: true, taken: taken });
}

// ── Mercado Pago ──
function criarPixMP(valor, concurso, cotas, firstName, lastName) {
  try {
    const payload = {
      transaction_amount: valor,
      description: `Bolao Mega Conc.${concurso} Cotas:${cotas.join(',')}`,
      payment_method_id: 'pix',
      payer: { email: 'pagador@bolao.com', first_name: firstName, last_name: lastName }
    };
    const resp = UrlFetchApp.fetch('https://api.mercadopago.com/v1/payments', {
      method: 'post',
      contentType: 'application/json',
      headers: { 'Authorization': `Bearer ${MP_TOKEN}`, 'X-Idempotency-Key': Utilities.getUuid() },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    const data = JSON.parse(resp.getContentText());
    if (data.id) {
      return {
        success:      true,
        paymentId:    String(data.id),
        qrCode:       data.point_of_interaction.transaction_data.qr_code,
        qrCodeBase64: data.point_of_interaction.transaction_data.qr_code_base64
      };
    }
    return { success: false };
  } catch (err) {
    return { success: false };
  }
}

// ── Verificação automática de pagamentos (gatilho a cada 5 min) ──
function verificarPagamentosPendentes() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const rows  = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][5] === 'Aguardando pagamento') {
      const id  = String(rows[i][6]);
      if (!id || id.startsWith('MEGA')) continue; // pula PIX local
      try {
        const resp = UrlFetchApp.fetch(`https://api.mercadopago.com/v1/payments/${id}`, {
          headers: { 'Authorization': `Bearer ${MP_TOKEN}` },
          muteHttpExceptions: true
        });
        const pag = JSON.parse(resp.getContentText());
        if (pag && pag.status === 'approved') {
          sheet.getRange(i + 1, 6).setValue('Pago ✅');
        }
      } catch (err) {}
    }
  }
}

// ── Gerador PIX local (fallback) ──
function gerarPix(chave, nome, cidade, valor, txId) {
  function emv(tag, value) {
    return tag + String(value.length).padStart(2, '0') + value;
  }
  const mai = emv('00', 'br.gov.bcb.pix') + emv('01', chave);
  const adf = emv('05', txId);
  let p =
    emv('00', '01') + emv('01', '12') + emv('26', mai) +
    emv('52', '0000') + emv('53', '986') +
    emv('54', valor.toFixed(2)) + emv('58', 'BR') +
    emv('59', nome.substring(0, 25)) + emv('60', cidade.substring(0, 15)) +
    emv('62', adf);
  p += '6304' + crc16(p + '6304');
  return p;
}

function crc16(str) {
  let crc = 0xFFFF;
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 0x8000) ? (crc << 1) ^ 0x1021 : crc << 1;
      crc &= 0xFFFF;
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0');
}

function getTakenCotas(sheet, concurso) {
  if (!concurso) return [];
  const rows  = sheet.getDataRange().getValues();
  const taken = [];
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][1]).trim() === concurso) {
      String(rows[i][3]).split(',').forEach(c => { const t = c.trim(); if (t) taken.push(t); });
    }
  }
  return [...new Set(taken)];
}

function testePermissao() {
  UrlFetchApp.fetch('https://httpbin.org/get');
  Logger.log('UrlFetchApp autorizado com sucesso!');
}

function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
