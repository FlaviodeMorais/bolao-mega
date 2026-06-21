import { NextRequest, NextResponse } from 'next/server'
import { verificarToken } from '@/lib/auth'
import { enviarPixEmail } from '@/lib/email'

export async function GET(req: NextRequest) {
  const token = req.cookies.get('admin_token')?.value
  if (!token || !(await verificarToken(token))) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })

  const resultado = await enviarPixEmail(
    process.env.EMAIL_GMAIL_USER || '',
    'FLAVIO TESTE',
    25.00,
    '00020126580014br.gov.bcb.pix0136123e4567-e12b-12d1-a456-426614174000520400005303986540525.005802BR5913Bolao Mega6009SAO PAULO62070503***630445C2',
    'Bolão Mega-Sena — Teste',
    ['01', '05', '12']
  )

  return NextResponse.json(resultado)
}
