import { NextResponse } from 'next/server'
import { buscarGrupos } from '@/lib/whatsapp'
import { verificarToken } from '@/lib/auth'
import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }
  const grupos = await buscarGrupos()
  return NextResponse.json({ grupos })
}
