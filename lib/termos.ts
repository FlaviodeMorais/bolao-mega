export interface TermoItem {
  icon: string
  titulo: string
  texto: string
  destaque?: boolean
}

// Versão atual dos Termos de Participação. Incrementar TERMOS_VERSAO ao editar
// o conteúdo abaixo permite (no futuro) identificar usuários com aceite desatualizado
// e solicitar novo aceite.
export const TERMOS_VERSAO = 1

export const TERMOS_PARTICIPACAO: TermoItem[] = [
  { icon: '⚠️', titulo: 'Bolão particular — não oficial', texto: 'Os bolões são organizados de forma particular e independente, sem qualquer vínculo com a Caixa Econômica Federal ou outras entidades oficiais. A aposta é realizada pelo administrador em nome do grupo.', destaque: true },
  { icon: '🎰', titulo: 'Como funciona', texto: 'Cada cota representa uma fração proporcional das apostas realizadas. O prêmio líquido (após dedução da taxa de administração) é dividido proporcionalmente ao número de cotas de cada participante em relação ao total de cotas vendidas.' },
  { icon: '💳', titulo: 'Pagamento via PIX', texto: 'Após selecionar suas cotas ou palpites, você receberá um código PIX para pagamento. Sua inscrição só é confirmada após a validação do pagamento pelo administrador. Pagamentos não confirmados até o fechamento do bolão serão cancelados.' },
  { icon: '🔄', titulo: 'Cotas não vendidas', texto: 'Se um bolão encerrar com cotas não vendidas, o valor arrecadado proporcional a essas cotas será rateado entre os participantes com pagamento confirmado, via PIX complementar.' },
  { icon: '🏆', titulo: 'Premiação e prazo', texto: 'Em caso de prêmio, o administrador tem até 90 dias após o sorteio para resgatar o valor junto à Caixa Econômica Federal. Após dedução da taxa de administração, o saldo é distribuído proporcionalmente entre os participantes.' },
  { icon: '❌', titulo: 'Cancelamento e reembolso', texto: 'Não há reembolso após confirmação do pagamento, salvo cancelamento do bolão pelo administrador antes do sorteio. Em caso de cancelamento, o valor integral pago será devolvido via PIX.' },
]
