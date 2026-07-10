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
      nome:     vencedor.nome.trim().toUpperCase(),
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
      nome:      vencedor.nome.trim().toUpperCase(),
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

  function telVariants(t: string): string[] {
    const d = (t || '').replace(/\D/g, '')
    if (!d) return []
    const base = d.startsWith('55') ? d.slice(2) : d
    // Gera variantes comuns encontradas no banco: sem DDI, com DDI, com +55
    return [base, `55${base}`, `+55${base}`, `+55 ${base}`].filter(Boolean)
  }

  // Atualiza participantes pelo e-mail/telefone (cobre quem não tinha usuario_id e variantes de formato)
  for (const p of [...perdedores, vencedor]) {
    const conditions: PromiseLike<unknown>[] = []
    if (p.email) {
      conditions.push(
        supabase.from('participantes').update({ usuario_id: vencedorId }).eq('email', p.email).is('usuario_id', null).then(),
        supabase.from('participantes_esporte').update({ usuario_id: vencedorId }).eq('email', p.email).is('usuario_id', null).then(),
      )
    }
    for (const v of telVariants(p.telefone || '')) {
      conditions.push(
        supabase.from('participantes').update({ usuario_id: vencedorId }).eq('telefone', v).is('usuario_id', null).then(),
        supabase.from('participantes_esporte').update({ usuario_id: vencedorId }).eq('telefone', v).is('usuario_id', null).then(),
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
