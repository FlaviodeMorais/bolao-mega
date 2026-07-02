import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verificarToken } from '@/lib/auth'
import { notificarAcertosIndividual } from '@/lib/whatsapp'
import { enviarResultado } from '@/lib/email'

// POST — envia WhatsApp e/ou email com acertos individuais para cada participante pago
// canal: 'wa' | 'email' | 'ambos' (default: 'wa')
export async function POST(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { bolao_slug, concurso, canal = 'wa' } = await req.json()
  if (!bolao_slug || !concurso) {
    return NextResponse.json({ error: 'bolao_slug e concurso são obrigatórios' }, { status: 400 })
  }

  const { data: bolao } = await supabase
    .from('boloes')
    .select('nome, loteria, total_cotas, apostas_data, resultado_conferencia')
    .eq('slug', bolao_slug)
    .single()

  if (!bolao) return NextResponse.json({ error: 'Bolão não encontrado' }, { status: 404 })

  const rc = bolao.resultado_conferencia as {
    status: string
    dezenas_sorteadas?: number[]
    premios_caixa?: { faixa: string; ganhadores: number; valor: number }[]
    apostas_premiadas?: { idx: number; acertos: number }[]
  } | null

  if (!rc?.dezenas_sorteadas?.length) {
    return NextResponse.json({ error: 'Resultado da conferência não disponível. Confira o sorteio primeiro.' }, { status: 409 })
  }

  const apostasData = bolao.apostas_data as { bets?: number[][] } | null
  const apostas: number[][] = apostasData?.bets || []

  if (!apostas.length) {
    return NextResponse.json({ error: 'Apostas não carregadas no bolão.' }, { status: 409 })
  }

  const { data: participantes } = await supabase
    .from('participantes')
    .select('id, nome, telefone, email, cotas')
    .eq('bolao_slug', bolao_slug)
    .eq('concurso', parseInt(concurso))
    .eq('status', 'pago')

  if (!participantes?.length) {
    return NextResponse.json({ error: 'Nenhum participante pago encontrado.' }, { status: 404 })
  }

  const dezenasStr = rc.dezenas_sorteadas!.map(n => String(n).padStart(2, '0'))
  const loteriaLabel = bolao.loteria === 'lotofacil' ? 'Lotofácil' : bolao.loteria === 'quina' ? 'Quina' : 'Mega-Sena'
  const minAcertos = bolao.loteria === 'lotofacil' ? 11 : bolao.loteria === 'quina' ? 2 : 4

  // Prêmio total que o bolão ganhou = soma de (valor da faixa × apostas premiadas nessa faixa)
  // Simplificação: usa o maior valor × total de apostas premiadas (todas na mesma faixa)
  const totalApostasPremiadas = rc.apostas_premiadas?.length ?? 0
  const premioCaixaPrincipal = rc.premios_caixa
    ?.filter(f => f.valor > 0)
    .sort((a, b) => b.valor - a.valor)[0]?.valor ?? 0
  const premioBolaoTotal = premioCaixaPrincipal * totalApostasPremiadas
  const totalCotas = Number(bolao.total_cotas) || 1

  let enviados = 0
  let erros = 0

  await Promise.all(
    participantes.map(async (p) => {
      const cotasP = (p.cotas as number[]) || []
      const minhaApostas = cotasP.map(c => apostas[c - 1]).filter(Boolean)
      const apostasGanhadoras = minhaApostas.filter(ap =>
        ap.filter(n => rc.dezenas_sorteadas!.includes(n)).length >= minAcertos
      )
      const ganhou = apostasGanhadoras.length > 0

      // Prêmio proporcional: (cotas do participante / total de cotas do bolão) * prêmio total
      const premioIndividual = ganhou && premioBolaoTotal > 0
        ? (cotasP.length / totalCotas) * premioBolaoTotal
        : undefined

      if (canal === 'wa' || canal === 'ambos') {
        if (p.telefone) {
          try {
            await notificarAcertosIndividual(p.telefone, p.nome, bolao.nome, parseInt(concurso), rc.dezenas_sorteadas!, apostas, p.cotas as string[])
            enviados++
          } catch { erros++ }
        } else { erros++ }
      }

      if (canal === 'email' || canal === 'ambos') {
        if (p.email) {
          try {
            await enviarResultado(p.email, p.nome, parseInt(concurso), dezenasStr, ganhou, bolao.nome, premioIndividual, loteriaLabel)
            if (canal === 'email') enviados++
          } catch { if (canal === 'email') erros++ }
        } else { if (canal === 'email') erros++ }
      }
    })
  )

  return NextResponse.json({ enviados, erros, total: participantes.length })
}
