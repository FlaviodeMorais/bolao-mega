import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verificarToken } from '@/lib/auth'
import { notificarAcertosIndividual } from '@/lib/whatsapp'
import { enviarResultado } from '@/lib/email'

// Normaliza o nome da faixa para comparação (Caixa usa nomes diferentes dos nossos labels)
// Ex: "11 acertos" → "11", "ONZE" → "11", "Duque" → "dupla", "DUPLA" → "dupla"
function normFaixa(f: string): string {
  const s = f.toLowerCase().trim()
  // Lotofácil: "11 acertos", "12 acertos"...
  const m = s.match(/^(\d+)\s*acertos?$/)
  if (m) return m[1]
  // Nossos labels: "11 PONTOS", "12 PONTOS"...
  const m2 = s.match(/^(\d+)\s*pontos?$/)
  if (m2) return m2[1]
  // Nomes por extenso em português (Caixa ou nós)
  const num: Record<string, string> = {
    onze: '11', doze: '12', treze: '13', quatorze: '14', quinze: '15',
    duque: 'dupla', dupla: 'dupla', terno: 'terno',
    quadra: 'quadra', quina: 'quina', sena: 'sena',
  }
  return num[s] ?? s
}

// Calcula o prêmio total do bolão com base nas apostas premiadas e nos prêmios da Caixa
function calcPremioTotal(
  apostasPremiadas: { acertos: number; premio: string }[],
  premiosCaixa: { faixa: string; valor: number }[]
): number {
  const valorPorFaixa = new Map<string, number>()
  for (const p of premiosCaixa) {
    if (p.valor > 0) valorPorFaixa.set(normFaixa(p.faixa), p.valor)
  }
  let total = 0
  for (const a of apostasPremiadas) {
    const key = normFaixa(a.premio)
    const val = valorPorFaixa.get(key) ?? 0
    total += val
  }
  return total
}

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
    apostas_premiadas?: { idx: number; acertos: number; premio: string }[]
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

  // premioPerCota = soma dos prêmios das apostas premiadas ÷ total de cotas
  const apostasPremiadas = rc.apostas_premiadas ?? []
  const premioTotal = rc.premios_caixa ? calcPremioTotal(apostasPremiadas, rc.premios_caixa) : 0
  const premioPerCota = premioTotal / (Number(bolao.total_cotas) || 1)

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

      // Prêmio individual = cotas do participante × prêmio por cota
      const premioIndividual = ganhou && premioPerCota > 0
        ? cotasP.length * premioPerCota
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
