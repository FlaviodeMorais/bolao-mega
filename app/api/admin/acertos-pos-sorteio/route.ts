import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verificarToken } from '@/lib/auth'
import { notificarAcertosIndividual } from '@/lib/whatsapp'
import { enviarResultado } from '@/lib/email'

function normFaixa(f: string): string {
  const s = f.toLowerCase().trim()
  const mAcertos = s.match(/^(\d+)\s*acertos?$/)
  if (mAcertos) return `${mAcertos[1]} acertos`
  const mPontos = s.match(/^(\d+)\s*pontos?$/)
  if (mPontos) return `${mPontos[1]} acertos`
  const legado: Record<string, string> = {
    dupla: '2 acertos', terno: '3 acertos', quadra: '4 acertos', quina: '5 acertos', sena: '6 acertos',
    duque: '2 acertos',
    onze: '11 acertos', doze: '12 acertos', treze: '13 acertos', quatorze: '14 acertos', quinze: '15 acertos',
  }
  return legado[s] ?? s
}

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
    total += valorPorFaixa.get(normFaixa(a.premio)) ?? 0
  }
  return total
}

// POST — envia WhatsApp e/ou email com acertos individuais
// canal: 'wa' | 'email' (default: 'wa')
export async function POST(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { bolao_slug, concurso, canal = 'wa', participante_id } = await req.json()
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

  const apostas: number[][] = (bolao.apostas_data as { bets?: number[][] } | null)?.bets || []
  if (!apostas.length) {
    return NextResponse.json({ error: 'Apostas não carregadas no bolão.' }, { status: 409 })
  }

  let partQuery = supabase
    .from('participantes')
    .select('id, nome, telefone, email, cotas')
    .eq('status', 'pago')

  if (participante_id) {
    partQuery = partQuery.eq('id', participante_id)
  } else {
    partQuery = partQuery.eq('bolao_slug', bolao_slug).eq('concurso', parseInt(concurso))
  }

  const { data: participantes } = await partQuery
  if (!participantes?.length) {
    return NextResponse.json({ error: 'Nenhum participante pago encontrado.' }, { status: 404 })
  }

  const dezenasStr = rc.dezenas_sorteadas!.map(n => String(n).padStart(2, '0'))
  const loteriaLabel = bolao.loteria === 'lotofacil' ? 'Lotofácil' : bolao.loteria === 'quina' ? 'Quina' : 'Mega-Sena'
  const minAcertos = bolao.loteria === 'lotofacil' ? 11 : bolao.loteria === 'quina' ? 2 : 4

  const premioTotal = rc.premios_caixa ? calcPremioTotal(rc.apostas_premiadas ?? [], rc.premios_caixa) : 0
  const premioPerCota = premioTotal / (Number(bolao.total_cotas) || 1)

  let enviados = 0
  let erros = 0

  await Promise.all(
    participantes.map(async (p) => {
      const cotasP = (p.cotas as number[]) || []
      const minhaApostas = cotasP.map(c => apostas[c - 1]).filter(Boolean)
      const ganhou = minhaApostas.some(ap =>
        ap.filter(n => rc.dezenas_sorteadas!.includes(n)).length >= minAcertos
      )
      const premioIndividual = ganhou && premioPerCota > 0 ? cotasP.length * premioPerCota : undefined

      if (canal === 'wa') {
        if (p.telefone) {
          notificarAcertosIndividual(p.telefone, p.nome, bolao.nome, parseInt(concurso), rc.dezenas_sorteadas!, apostas, p.cotas as string[]).catch(() => {})
        }
        if (p.email) {
          try {
            await enviarResultado(p.email, p.nome, parseInt(concurso), dezenasStr, ganhou, bolao.nome, premioIndividual, loteriaLabel, premioTotal, premioPerCota)
            enviados++
          } catch { erros++ }
        } else { erros++ }
      } else if (canal === 'email') {
        if (p.email) {
          try {
            await enviarResultado(p.email, p.nome, parseInt(concurso), dezenasStr, ganhou, bolao.nome, premioIndividual, loteriaLabel, premioTotal, premioPerCota)
            enviados++
          } catch { erros++ }
        } else { erros++ }
      }
    })
  )

  return NextResponse.json({ enviados, erros, total: participantes.length })
}
