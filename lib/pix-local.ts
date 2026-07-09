import { getPagamentoSettings } from './settings'

function emv(tag: string, value: string): string {
  return tag + String(value.length).padStart(2, '0') + value
}

function crc16(str: string): string {
  let crc = 0xffff
  for (let i = 0; i < str.length; i++) {
    crc ^= str.charCodeAt(i) << 8
    for (let j = 0; j < 8; j++) {
      crc = crc & 0x8000 ? (crc << 1) ^ 0x1021 : crc << 1
      crc &= 0xffff
    }
  }
  return crc.toString(16).toUpperCase().padStart(4, '0')
}

export async function gerarPixLocal(valor: number, txId: string): Promise<string> {
  const cfg = await getPagamentoSettings()
  const chave  = cfg.pix_chave
  const nome   = cfg.pix_nome
  const cidade = cfg.pix_cidade

  const mai = emv('00', 'br.gov.bcb.pix') + emv('01', chave)
  const adf = emv('05', txId.substring(0, 25))
  let p =
    emv('00', '01') + emv('26', mai) +
    emv('52', '0000') + emv('53', '986') +
    emv('54', valor.toFixed(2)) + emv('58', 'BR') +
    emv('59', nome.substring(0, 25)) + emv('60', cidade.substring(0, 15)) +
    emv('62', adf)
  p += '6304' + crc16(p + '6304')
  return p
}

export function gerarTxId(concurso: number): string {
  return ('BOLAO' + concurso + Math.random().toString(36).substring(2, 8))
    .toUpperCase()
    .substring(0, 25)
}
