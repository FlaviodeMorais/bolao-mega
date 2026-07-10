import { ImageResponse } from 'next/og'
import { getAppSettings } from '@/lib/settings'

export const runtime     = 'edge'
export const size        = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OgImage() {
  const app = await getAppSettings()
  const nome = app.nome || 'BetMais'
  const desc = app.descricao || 'Loterias, Brasileirão, Copa, e muito mais!'

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')

  // Carrega o ícone circular como base64
  const iconData = await fetch(`${baseUrl}/bm-circle.png`)
    .then(r => r.arrayBuffer())
    .then(buf => `data:image/png;base64,${Buffer.from(buf).toString('base64')}`)
    .catch(() => null)

  return new ImageResponse(
    (
      <div style={{
        width: 1200, height: 630,
        background: 'linear-gradient(160deg, #05080f 0%, #071510 45%, #050d1a 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: 0,
        position: 'relative',
        overflow: 'hidden',
      }}>

        {/* Glow verde centralizado atrás do ícone */}
        <div style={{
          position: 'absolute',
          width: 700, height: 700,
          background: 'radial-gradient(circle, rgba(0,200,100,0.15) 0%, transparent 65%)',
          borderRadius: '50%', display: 'flex',
        }} />

        {/* Ícone circular */}
        {iconData && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={iconData}
            width={280}
            height={280}
            style={{ borderRadius: '50%', marginBottom: 36 }}
            alt={nome}
          />
        )}

        {/* Nome */}
        <div style={{
          fontFamily: 'sans-serif', fontSize: 72, fontWeight: 900,
          color: '#ffffff', letterSpacing: -2, lineHeight: 1,
          display: 'flex', marginBottom: 16,
        }}>
          {nome}
        </div>

        {/* Descrição */}
        <div style={{
          fontFamily: 'sans-serif', fontSize: 24, fontWeight: 400,
          color: 'rgba(255,255,255,0.45)', display: 'flex',
        }}>
          {desc}
        </div>

      </div>
    ),
    { ...size }
  )
}
