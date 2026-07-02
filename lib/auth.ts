import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import { supabase } from './supabase'

if (!process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET não configurado — obrigatório definir nas variáveis de ambiente.')
}
const SECRET = new TextEncoder().encode(process.env.JWT_SECRET)

async function getSenhaConfig(): Promise<string> {
  const { data } = await supabase.from('config').select('value').eq('key', 'admin_password').single()
  const senha = data?.value || process.env.ADMIN_PASSWORD_HASH
  if (!senha) {
    throw new Error('Nenhuma senha admin configurada — defina ADMIN_PASSWORD_HASH ou cadastre via troca de senha.')
  }
  return senha
}

export async function verificarSenha(senha: string): Promise<boolean> {
  const stored = await getSenhaConfig()
  if (stored.startsWith('$2b$') || stored.startsWith('$2a$')) {
    return bcrypt.compare(senha, stored)
  }
  return senha === stored
}

export async function alterarSenha(senhaAtual: string, novaSenha: string): Promise<{ ok: boolean; error?: string }> {
  const ok = await verificarSenha(senhaAtual)
  if (!ok) return { ok: false, error: 'Senha atual incorreta.' }
  if (novaSenha.length < 6) return { ok: false, error: 'Nova senha deve ter ao menos 6 caracteres.' }
  const hash = await bcrypt.hash(novaSenha, 10)
  await supabase.from('config').upsert({ key: 'admin_password', value: hash, updated_at: new Date().toISOString() })
  return { ok: true }
}

export async function gerarToken(): Promise<string> {
  return new SignJWT({ admin: true })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('8h')
    .sign(SECRET)
}

export async function verificarToken(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, SECRET)
    return true
  } catch {
    return false
  }
}
