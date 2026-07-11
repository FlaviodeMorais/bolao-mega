import { supabase } from './supabase'
import { notificarPagamento, notificarPagamentoEsporte } from './whatsapp'
import { enviarConfirmacaoPagamento } from './email'

// Confirma um pagamento no banco e dispara notificações.
// Idempotente: se já estiver pago, retorna { ok: true, jaConfirmado: true } sem renotificar.
export async function confirmarPagamento(paymentId: string): Promise<{ ok: boolean; jaConfirmado?: boolean; msg?: string }> {
  // Verifica se o pedido já está pago (evita dupla notificação)
  const { data: pedido } = await supabase
    .from('pedidos').select('id, status').eq('mp_payment_id', paymentId).maybeSingle()

  if (pedido?.status === 'pago') return { ok: true, jaConfirmado: true }

  // Atualiza pedido
  await supabase.from('pedidos').update({ status: 'pago' }).eq('mp_payment_id', paymentId)

  // Participantes de loteria
  const { data: partes } = await supabase
    .from('participantes')
    .select('id, nome, cotas, total, concurso, telefone, email, bolao_slug, status')
    .eq('mp_payment_id', paymentId)

  let notificou = false

  if (partes && partes.length > 0) {
    // Só atualiza/notifica os que ainda não foram confirmados
    const pendentes = partes.filter(p => p.status !== 'pago')
    if (pendentes.length > 0) {
      await supabase.from('participantes').update({ status: 'pago' }).eq('mp_payment_id', paymentId)
      for (const part of pendentes) {
        const { data: bolaoInfo } = await supabase
          .from('boloes').select('nome, num_apostas, dezenas, loteria').eq('slug', part.bolao_slug || '').single()
        notificarPagamento(part.nome, part.cotas, part.concurso, Number(part.total), part.telefone, part.id, bolaoInfo?.loteria).catch(() => {})
        if (part.email) {
          enviarConfirmacaoPagamento(
            part.email, part.nome, part.cotas, Number(part.total),
            part.concurso, bolaoInfo?.nome || 'Bolão',
            bolaoInfo?.num_apostas || 1, bolaoInfo?.dezenas || 6
          ).catch(() => {})
        }
        notificou = true
      }
    }
  }

  // Participantes de esporte
  const { data: partesEsp } = await supabase
    .from('participantes_esporte')
    .select('id, nome, total, telefone, email, bolao_slug, status')
    .eq('mp_payment_id', paymentId)

  if (partesEsp && partesEsp.length > 0) {
    const pendentes = partesEsp.filter(p => p.status !== 'pago')
    if (pendentes.length > 0) {
      await supabase.from('participantes_esporte').update({ status: 'pago' }).eq('mp_payment_id', paymentId)
      for (const part of pendentes) {
        const [{ data: bolaoEsp }, { data: palpites }] = await Promise.all([
          supabase.from('boloes_esporte').select('nome').eq('slug', part.bolao_slug || '').single(),
          supabase.from('palpites').select('gol_casa, gol_fora, jogos(time_casa, time_fora)').eq('participante_id', part.id),
        ])
        const palp = (palpites || []).map((p: { gol_casa: number; gol_fora: number; jogos: { time_casa: string; time_fora: string } | null }) => ({
          timeCasa: p.jogos?.time_casa || '?',
          timeFora: p.jogos?.time_fora || '?',
          golCasa:  p.gol_casa,
          golFora:  p.gol_fora,
        }))
        notificarPagamentoEsporte(part.nome, bolaoEsp?.nome || 'Bolão Esportivo', Number(part.total), part.telefone, part.id, palp).catch(() => {})
        notificou = true
      }
    }
  }

  // Acréscimo (individual, fora do carrinho)
  if ((!partes || partes.length === 0) && (!partesEsp || partesEsp.length === 0)) {
    const { data: partAcr } = await supabase
      .from('participantes')
      .select('nome, cotas, acrescimo, concurso, telefone, acrescimo_pago')
      .eq('acrescimo_payment_id', paymentId)
      .single()

    if (partAcr && !partAcr.acrescimo_pago) {
      await supabase.from('participantes').update({ acrescimo_pago: true }).eq('acrescimo_payment_id', paymentId)
      notificarPagamento(partAcr.nome, partAcr.cotas, partAcr.concurso, Number(partAcr.acrescimo), partAcr.telefone).catch(() => {})
      notificou = true
    }
  }

  return { ok: true, msg: notificou ? 'confirmado e notificado' : 'atualizado sem notificação' }
}
