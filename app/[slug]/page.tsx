import { notFound } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import BolaoForm from './BolaoForm'

interface Props { params: { slug: string } }

export async function generateMetadata({ params }: Props) {
  const { data } = await supabase.from('boloes').select('nome').eq('slug', params.slug).single()
  return { title: data ? `${data.nome} — Bolão Mega-Sena` : 'Bolão Mega-Sena' }
}

export default async function BolaoPage({ params }: Props) {
  const { data: bolao } = await supabase
    .from('boloes')
    .select('*')
    .eq('slug', params.slug)
    .eq('ativo', true)
    .single()

  if (!bolao) notFound()

  return <BolaoForm bolaoNome={bolao.nome} bolaoSlug={bolao.slug} valorCota={bolao.valor_cota} totalCotas={bolao.total_cotas} />
}
