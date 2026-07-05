import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'

// Token de participante (usuário final) — separado do admin_token (lib/auth.ts).
// Usa o mesmo segredo (JWT_SECRET), mas o payload carrega o id do usuário e um
// claim `tipo` para nunca ser confundido com o token de admin.
const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || 'bolao-mega-secret-2026')

export async function gerarTokenUsuario(usuarioId: string): Promise<string> {
  return new SignJWT({ uid: usuarioId, tipo: 'usuario' })
    .setProtectedHeader({ alg: 'HS256' })
    .setExpirationTime('30d')
    .sign(SECRET)
}

export async function verificarTokenUsuario(token: string): Promise<string | null> {
  try {
    const { payload } = await jwtVerify(token, SECRET)
    if (payload.tipo !== 'usuario' || typeof payload.uid !== 'string') return null
    return payload.uid
  } catch {
    return null
  }
}

export async function hashSenha(senha: string): Promise<string> {
  return bcrypt.hash(senha, 10)
}

export async function verificarSenhaUsuario(senha: string, hash: string): Promise<boolean> {
  return bcrypt.compare(senha, hash)
}
