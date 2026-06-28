import { ImageResponse } from 'next/og'
import { getAppSettings } from '@/lib/settings'

export const runtime     = 'edge'
export const size        = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OgImage() {
  const app = await getAppSettings()
  const cor = app.cor_primaria

  return new ImageResponse(
    (
      <div style={{
        width: 1200, height: 630,
        background: `linear-gradient(145deg, ${app.cor_fundo} 0%, #091a0e 60%, #0f2a14 100%)`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 80,
        position: 'relative',
      }}>
        <div style={{
          position: 'absolute', left: -100, top: -100,
          width: 500, height: 500,
          background: `radial-gradient(circle, ${cor}33 0%, transparent 70%)`,
          borderRadius: '50%',
        }} />
        <div style={{
          position: 'absolute', right: -80, bottom: -80,
          width: 400, height: 400,
          background: `radial-gradient(circle, ${cor}1f 0%, transparent 70%)`,
          borderRadius: '50%',
        }} />

        <div style={{
          width: 220, height: 220,
          background: `${cor}1f`,
          border: `3px solid ${cor}59`,
          borderRadius: 44,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          marginRight: 60, flexShrink: 0,
        }}>
          <div style={{ fontSize: 110, lineHeight: 1 }}>🍀</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{
            fontFamily: 'sans-serif', fontSize: 24, fontWeight: 700,
            color: cor, letterSpacing: 4, textTransform: 'uppercase',
            marginBottom: 12,
          }}>
            {app.descricao}
          </div>
          <div style={{
            fontFamily: 'sans-serif', fontSize: 80, fontWeight: 900,
            color: '#FFFFFF', letterSpacing: -2, lineHeight: 1,
          }}>
            {app.grupo_nome}
          </div>
          <div style={{
            marginTop: 20,
            fontFamily: 'sans-serif', fontSize: 18,
            color: 'rgba(255,255,255,0.40)',
          }}>
            {app.url.replace('https://', '')}
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
