import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verificarToken } from '@/lib/auth'

// POST /api/admin/usuarios/mesclar
// Recebe o registro vencedor (com os campos escolhidos pelo admin) e a lista de
// usuario_ids que serão absorvidos. Atualiza participantes e exclui contas perdedoras.
export async function POST(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const { vencedor, perdedores }: {
    vencedor: { usuario_id: string | null; nome: string; email: string | null; telefone: string; chave_pix: string | null }
    perdedores: Array<{ usuario_id: string | null; email: string | null; telefone: string }>
  } = await req.json()

  if (!vencedor) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 })

  // Garante que o vencedor tem uma conta no Supabase
  let vencedorId = vencedor.usuario_id
  if (!vencedorId) {
    // Nenhum dos registros tem conta ainda — cria uma sem senha (admin enviará convite depois)
    const { data, error } = await supabase.from('usuarios').insert({
      nome:     vencedor.nome,
      email:    vencedor.email || null,
      telefone: vencedor.telefone || null,
      chave_pix: vencedor.chave_pix || null,
      senha_hash: '',
      senha_temporaria: true,
    }).select('id').single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    vencedorId = data.id
  } else {
    // Atualiza os campos escolhidos pelo admin
    await supabase.from('usuarios').update({
      nome:      vencedor.nome,
      email:     vencedor.email || null,
      telefone:  vencedor.telefone || null,
      chave_pix: vencedor.chave_pix || null,
    }).eq('id', vencedorId)
  }

  // Reatribui participantes dos registros perdedores para o vencedor
  for (const p of perdedores) {
    if (!p.usuario_id || p.usuario_id === vencedorId) continue

    await Promise.all([
      supabase.from('participantes').update({ usuario_id: vencedorId })
        .eq('usuario_id', p.usuario_id),
      supabase.from('participantes_esporte').update({ usuario_id: vencedorId })
        .eq('usuario_id', p.usuario_id),
    ])
  }

  // Também atualiza participantes pelo e-mail/telefone (para quem não tinha usuario_id)
  for (const p of perdedores) {
    if (p.usuario_id) continue  // já tratado acima
    const conditions: Promise<unknown>[] = []
    if (p.email) {
      conditions.push(
        supabase.from('participantes').update({ usuario_id: vencedorId }).eq('email', p.email),
        supabase.from('participantes_esporte').update({ usuario_id: vencedorId }).eq('email', p.email),
      )
    }
    if (p.telefone) {
      conditions.push(
        supabase.from('participantes').update({ usuario_id: vencedorId }).eq('telefone', p.telefone),
        supabase.from('participantes_esporte').update({ usuario_id: vencedorId }).eq('telefone', p.telefone),
      )
    }
    await Promise.all(conditions)
  }

  // Remove contas perdedoras
  const idsExcluir = perdedores.map(p => p.usuario_id).filter(Boolean) as string[]
  if (idsExcluir.length) {
    await supabase.from('usuarios').delete().in('id', idsExcluir)
  }

  return NextResponse.json({ ok: true, vencedorId })
}
