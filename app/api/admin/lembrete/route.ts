import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verificarToken } from '@/lib/auth'
import { notificarLembrete } from '@/lib/whatsapp'
import { enviarLembrete } from '@/lib/email'

export async function POST(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { concurso, bolao_slug } = await req.json()
  if (!concurso) return NextResponse.json({ error: 'Concurso obrigatório' }, { status: 400 })

  let query = supabase
    .from('participantes')
    .select('nome, email, cotas, pix_code, bolao_slug')
    .eq('concurso', concurso)
    .eq('status', 'aguardando')

  if (bolao_slug) query = query.eq('bolao_slug', bolao_slug)

  const { data: pendentes } = await query
  await notificarLembrete(concurso, pendentes?.length || 0)

  if (pendentes?.length) {
    const slugs = Array.from(new Set(pendentes.map(p => p.bolao_slug).filter(Boolean)))
    const { data: boloesInfo } = await supabase
      .from('boloes').select('slug, nome').in('slug', slugs)
    const nomesPorSlug = new Map((boloesInfo || []).map(b => [b.slug, b.nome]))

    await Promise.all(pendentes.filter(p => p.email).map(p =>
      enviarLembrete(
        p.email, p.nome, p.cotas, concurso,
        nomesPorSlug.get(p.bolao_slug) || 'Bolão', p.pix_code
      ).catch(() => {})
    ))
  }

  return NextResponse.json({ ok: true, pendentes: pendentes?.length || 0 })
}
