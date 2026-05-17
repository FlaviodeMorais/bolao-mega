import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BolaoForm from './BolaoForm'

// Sempre busca dados frescos do banco — garante que mudanças do admin
// refletem imediatamente para os participantes sem esperar cache do Vercel
export const dynamic = 'force-dynamic'

interface Props { params: { slug: string } }

export async function generateMetadata({ params }: Props) {
  const { data } = await supabase.from('boloes').select('nome').eq('slug', params.slug).single()
  return { title: data ? `${data.nome} — Bolão Mega-Sena` : 'Bolão Mega-Sena' }
}

export default async function BolaoPage({ params }: Props) {
  const { data: bolao } = await supabase
    .from('boloes')
    .select('id, nome, slug, valor_cota, total_cotas, dezenas, num_apostas, taxa_admin')
    .eq('slug', params.slug)
    .eq('ativo', true)
    .single()

  if (!bolao) notFound()

  return (
    <BolaoForm
      bolaoNome={bolao.nome}
      bolaoSlug={bolao.slug}
      valorCota={Number(bolao.valor_cota)}
      totalCotas={Number(bolao.total_cotas)}
      dezenas={Number(bolao.dezenas) || 6}
      numApostas={Number(bolao.num_apostas) || 1}
      taxaAdmin={Number(bolao.taxa_admin) || 0}
    />
  )
}
