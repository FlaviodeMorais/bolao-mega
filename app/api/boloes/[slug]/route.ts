import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  const { data } = await supabase
    .from('boloes')
    .select('*')
    .eq('slug', params.slug)
    .single()

  if (!data) return NextResponse.json({ error: 'Bolão não encontrado' }, { status: 404 })
  return NextResponse.json({ bolao: data })
}
