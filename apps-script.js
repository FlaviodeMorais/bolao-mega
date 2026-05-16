
//  BOLÃO MEGA 💯 – Backend (Google Apps Script)

const SHEET_NAME = 'Respostas';
const VALOR_COTA = 30;

function doGet(e) {
  const action   = e.parameter.action   || 'get';
  const concurso = (e.parameter.concurso || '').trim();

  if (action === 'submit') {
    const nome      = (e.parameter.nome      || '').trim();
    const cotasStr  = (e.parameter.cotas     || '').trim();
    const pagamento =  e.parameter.pagamento || '';
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

    const ts    = Utilities.formatDate(new Date(), 'America/Sao_Paulo', 'dd/MM/yyyy HH:mm:ss');
    const total = `R$ ${(cotas.length * VALOR_COTA).toFixed(2).replace('.', ',')}`;
    sheet.appendRow([ts, concurso, nome, cotas.join(', '), total, pagamento]);

    return jsonOut({
      success: true,
      message: `Inscricao confirmada!\nNome: ${nome}\nCotas: ${cotas.join(', ')}\nTotal: ${total}`
    });
  }

  // action === 'get': retorna cotas ocupadas do concurso
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
  const taken = getTakenCotas(sheet, concurso);
  return jsonOut({ success: true, taken: taken });
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
