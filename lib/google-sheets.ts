import { google } from 'googleapis'
import { getGoogleSettings } from './settings'

async function getSheetsClient() {
  const cfg = await getGoogleSettings()
  if (!cfg.client_email || !cfg.private_key || !cfg.spreadsheet_id) {
    throw new Error('Google Sheets não configurado. Preencha em Configurações → Google.')
  }

  const auth = new google.auth.JWT({
    email: cfg.client_email,
    // Chaves coladas via textarea às vezes chegam com \n literal — normaliza pra quebra de linha real.
    key: cfg.private_key.replace(/\\n/g, '\n'),
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  })

  return { sheets: google.sheets({ version: 'v4', auth }), spreadsheetId: cfg.spreadsheet_id }
}

/** Exporta uma tabela (headers + linhas) para uma aba da planilha, criando-a se não existir. */
export async function exportarParaSheets(aba: string, headers: string[], linhas: (string | number)[][]) {
  const { sheets, spreadsheetId } = await getSheetsClient()

  const meta = await sheets.spreadsheets.get({ spreadsheetId })
  const existe = meta.data.sheets?.some(s => s.properties?.title === aba)
  if (!existe) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId,
      requestBody: { requests: [{ addSheet: { properties: { title: aba } } }] },
    })
  }

  await sheets.spreadsheets.values.clear({ spreadsheetId, range: `${aba}!A:Z` })
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${aba}!A1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [headers, ...linhas] },
  })
}
