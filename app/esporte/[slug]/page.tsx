import { supabase } from '@/lib/supabase'
import { notFound } from 'next/navigation'
import dynamic from 'next/dynamic'

const EsporteForm = dynamic(() => import('./EsporteForm'), { ssr: false })

interface Props { params: { slug: string } }

export default async function EsportePage({ params }: Props) {
  const { data: bolao } = await supabase
    .from('boloes_esporte')
    .select('*')
    .eq('slug', params.slug)
    .single()

  if (!bolao) notFound()

  const [{ data: jogos }, { count: totalPagos }] = await Promise.all([
    supabase
      .from('jogos')
      .select('*')
      .eq('bolao_slug', params.slug)
      .order('data_jogo', { ascending: true, nullsFirst: false })
      .order('hora_jogo', { ascending: true, nullsFirst: false })
      .order('ordem', { ascending: true }),
    supabase
      .from('participantes_esporte')
      .select('*', { count: 'exact', head: true })
      .eq('bolao_slug', params.slug)
      .eq('status', 'pago'),
  ])

  return (
    <EsporteForm
      bolao={bolao}
      jogos={jogos || []}
      totalPagos={totalPagos ?? 0}
    />
  )
}

export async function generateMetadata({ params }: Props) {
  const { data: bolao } = await supabase.from('boloes_esporte').select('nome, descricao').eq('slug', params.slug).single()
  return {
    title: bolao?.nome || 'Bolão Esportivo',
    description: bolao?.descricao || 'Palpite nos jogos e concorra a prêmios!',
  }
}
