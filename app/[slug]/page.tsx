import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BolaoForm from './BolaoForm'
import { getLoteria } from '@/lib/loterias'

// Sempre busca dados frescos do banco — garante que mudanças do admin
// refletem imediatamente para os participantes sem esperar cache do Vercel
export const dynamic = 'force-dynamic'

interface Props { params: { slug: string } }

export async function generateMetadata({ params }: Props) {
  const { data } = await supabase.from('boloes').select('nome, loteria').eq('slug', params.slug).single()
  const label = getLoteria(data?.loteria).label
  return { title: data ? `${data.nome} — Bolão ${label}` : 'Bolão Loterias' }
}

export default async function BolaoPage({ params }: Props) {
  const { data: bolao } = await supabase
    .from('boloes')
    .select('*')
    .eq('slug', params.slug)
    .eq('ativo', true)
    .single()

  if (!bolao) notFound()

  return (
    <BolaoForm
      bolaoNome={bolao.nome}
      bolaoSlug={bolao.slug}
      loteria={bolao.loteria || 'mega'}
      valorCota={Number(bolao.valor_cota)}
      totalCotas={Number(bolao.total_cotas)}
      dezenas={Number(bolao.dezenas) || 6}
      numApostas={Number(bolao.num_apostas) || 1}
      taxaAdmin={Number(bolao.taxa_admin) || 0}
      encerrado={bolao.encerrado || false}
    />
  )
}
