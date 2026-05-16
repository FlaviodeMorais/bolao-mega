//  BOLÃO MEGA 💯 – Backend (Google Apps Script)

const SHEET_NAME = 'Respostas';
const VALOR_COTA = 30;
const MP_TOKEN   = 'APP_USR-5695731252114803-051609-ef2890bdabeb0439ede4309bc5d88ce4-119386321';

function doGet(e) {
  const action   = e.parameter.action   || 'get';
  const concurso = (e.parameter.concurso || '').trim();

  if (action === 'submit') {
    const nome      = (e.parameter.nome      || '').trim();
    const cotasStr  = (e.parameter.cotas     || '').trim();
    const cotas     = cotasStr ? cotasStr.split(',').map(c => c.trim()) : [];

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

    const total = cotas.length * VALOR_COTA;
    const pix   = criarPixMP(total, concurso, cotas, nome);

    if (!pix.success) {
      return jsonOut({ success: false, error: 'Erro ao gerar PIX: ' + pix.error });
    }

    const ts = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm:ss');
    sheet.appendRow([
      ts,
      concurso,
      nome,
      cotas.join(', '),
      `R$ ${total.toFixed(2).replace('.', ',')}`,
      'Aguardando pagamento',
      pix.paymentId
    ]);

    return jsonOut({
      success:       true,
      qrCode:        pix.qrCode,
      qrCodeBase64:  pix.qrCodeBase64,
      total:         `R$ ${total.toFixed(2).replace('.', ',')}`,
      nome:          nome,
      cotas:         cotas.join(', ')
    });
  }

  // action === 'get': retorna cotas ocupadas do concurso
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const taken = getTakenCotas(sheet, concurso);
  return jsonOut({ success: true, taken: taken });
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.type === 'payment') {
      const pagamento = buscarPagamentoMP(String(body.data.id));
      if (pagamento && pagamento.status === 'approved') {
        atualizarStatus(String(body.data.id), 'Pago');
      }
    }
    return ContentService.createTextOutput('OK');
  } catch (err) {
    return ContentService.createTextOutput('Error: ' + err.message);
  }
}

function criarPixMP(valor, concurso, cotas, nome) {
  try {
    const nomes     = nome.split(' ');
    const firstName = nomes[0];
    const lastName  = nomes.slice(1).join(' ') || nomes[0];

    const payload = {
      transaction_amount: valor,
      description: `Bolao Mega - Concurso ${concurso} - Cotas: ${cotas.join(', ')}`,
      payment_method_id: 'pix',
      payer: {
        email: 'pagador@bolao.com',
        first_name: firstName,
        last_name: lastName
      }
    };

    const resp = UrlFetchApp.fetch('https://api.mercadopago.com/v1/payments', {
      method: 'post',
      contentType: 'application/json',
      headers: {
        'Authorization': `Bearer ${MP_TOKEN}`,
        'X-Idempotency-Key': Utilities.getUuid()
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });

    const data = JSON.parse(resp.getContentText());

    if (data.id) {
      return {
        success:       true,
        paymentId:     String(data.id),
        qrCode:        data.point_of_interaction.transaction_data.qr_code,
        qrCodeBase64:  data.point_of_interaction.transaction_data.qr_code_base64
      };
    }
    return { success: false, error: JSON.stringify(data) };

  } catch (err) {
    return { success: false, error: err.message };
  }
}

function buscarPagamentoMP(paymentId) {
  try {
    const resp = UrlFetchApp.fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${MP_TOKEN}` },
      muteHttpExceptions: true
    });
    return JSON.parse(resp.getContentText());
  } catch (err) {
    return null;
  }
}

function atualizarStatus(paymentId, novoStatus) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const rows  = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][6]) === paymentId) {
      sheet.getRange(i + 1, 6).setValue(novoStatus);
      break;
    }
  }
}

function getTakenCotas(sheet, concurso) {
  if (!concurso) return [];
  const rows  = sheet.getDataRange().getValues();
  const taken = [];
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][1]).trim() === concurso) {
      String(rows[i][3]).split(',').forEach(c => {
        const t = c.trim();
        if (t) taken.push(t);
      });
    }
  }
  return [...new Set(taken)];
}

function jsonOut(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
