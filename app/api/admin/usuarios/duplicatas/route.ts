import { NextRequest, NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verificarToken } from '@/lib/auth'

function normTel(t: string) { return (t || '').replace(/\D/g, '').replace(/^55/, '') }
function normEmail(e: string) { return (e || '').toLowerCase().trim() }

// Normaliza nome: remove acentos, minúsculo, remove stop words, ordena tokens
function normNome(n: string): string {
  const stops = new Set(['de', 'da', 'do', 'dos', 'das', 'e', 'a', 'o', 'em', 'no', 'na'])
  return (n || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 1 && !stops.has(w))
    .sort()
    .join(' ')
}

// Levenshtein distance simples (para nomes curtos)
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  const dp: number[][] = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i-1] === b[j-1] ? dp[i-1][j-1] : 1 + Math.min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1])
  return dp[m][n]
}

function nomeSimilar(a: string, b: string): boolean {
  const na = normNome(a), nb = normNome(b)
  if (!na || !nb) return false
  if (na === nb) return true
  // Permite diferença de até 2 caracteres em nomes com 8+ caracteres
  const maxLen = Math.max(na.length, nb.length)
  return maxLen >= 8 && levenshtein(na, nb) <= 2
}

export async function GET(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const [{ data: partLot }, { data: partEsp }, { data: usuarios }] = await Promise.all([
    supabase.from('participantes').select('nome, email, telefone, usuario_id, created_at'),
    supabase.from('participantes_esporte').select('nome, email, telefone, usuario_id, created_at'),
    supabase.from('usuarios').select('id, nome, email, telefone, chave_pix, senha_temporaria, criado_em'),
  ])

  // Deduplica participantes por chave (email ou tel)
  type P = { nome: string; email: string | null; telefone: string; usuario_id: string | null; created_at: string }
  const todos: P[] = [...((partLot || []) as P[]), ...((partEsp || []) as P[])]
    .sort((a, b) => (b.created_at || '').localeCompare(a.created_at || ''))

  const vistoChave = new Set<string>()
  const unicos: { nome: string; email: string | null; telefone: string; usuario_id: string | null }[] = []
  for (const p of todos) {
    const email = normEmail(p.email || '')
    const tel   = normTel(p.telefone || '')
    const chave = email || tel
    if (!chave || vistoChave.has(chave)) continue
    vistoChave.add(chave)
    unicos.push({ nome: p.nome, email: email || null, telefone: p.telefone, usuario_id: p.usuario_id })
  }

  // Adiciona usuários que não aparecem em participantes
  const contasPorEmail = new Map((usuarios || []).filter(u => u.email).map(u => [normEmail(u.email), u]))
  const contasPorTel   = new Map((usuarios || []).filter(u => u.telefone).map(u => [normTel(u.telefone), u]))
  for (const u of usuarios || []) {
    const email = normEmail(u.email || '')
    const tel   = normTel(u.telefone || '')
    const chave = email || tel
    if (chave && !vistoChave.has(chave)) {
      vistoChave.add(chave)
      unicos.push({ nome: u.nome, email: u.email || null, telefone: u.telefone, usuario_id: u.id })
    }
  }

  // Detecta grupos de duplicatas
  type Registro = { nome: string; email: string | null; telefone: string; usuario_id: string | null }
  const grupos: Registro[][] = []
  const agrupado = new Set<number>()

  for (let i = 0; i < unicos.length; i++) {
    if (agrupado.has(i)) continue
    const grupo: Registro[] = [unicos[i]]
    const ti = normTel(unicos[i].telefone || '')
    const ei = normEmail(unicos[i].email || '')

    for (let j = i + 1; j < unicos.length; j++) {
      if (agrupado.has(j)) continue
      const tj = normTel(unicos[j].telefone || '')
      const ej = normEmail(unicos[j].email || '')

      const mesmaTel   = ti && tj && ti === tj
      const mesmoEmail = ei && ej && ei === ej
      const nomeProx   = nomeSimilar(unicos[i].nome, unicos[j].nome)
      const campoComum = (ti && tj && ti === tj) || (ei && ej && ei === ej)

      if (mesmaTel || mesmoEmail || (nomeProx && campoComum)) {
        grupo.push(unicos[j])
        agrupado.add(j)
      }
    }

    if (grupo.length > 1) {
      agrupado.add(i)
      // Enriquece com dados da conta se existir
      grupos.push(grupo.map(r => {
        const conta = (r.email && contasPorEmail.get(normEmail(r.email)))
                   || (r.telefone && contasPorTel.get(normTel(r.telefone)))
                   || null
        return {
          nome:             conta?.nome      || r.nome,
          email:            conta?.email     || r.email,
          telefone:         conta?.telefone  || r.telefone,
          chave_pix:        conta?.chave_pix || null,
          usuario_id:       conta?.id        || r.usuario_id || null,
          senha_temporaria: conta?.senha_temporaria || false,
        } as Registro & { chave_pix: string | null; senha_temporaria: boolean }
      }))
    }
  }

  return NextResponse.json({ grupos })
}
