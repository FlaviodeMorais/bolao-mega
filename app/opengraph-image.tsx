import { ImageResponse } from 'next/og'
import { getAppSettings } from '@/lib/settings'

export const runtime     = 'edge'
export const size        = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OgImage() {
  const app = await getAppSettings()

  return new ImageResponse(
    (
      <div style={{
        width: 1200, height: 630,
        background: 'linear-gradient(145deg, #0a0f1e 0%, #0d1f0f 55%, #091a1a 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 80px',
        position: 'relative',
        overflow: 'hidden',
      }}>

        {/* Glows de fundo */}
        <div style={{
          position: 'absolute', top: -120, left: -80,
          width: 500, height: 500,
          background: 'radial-gradient(circle, rgba(0,200,100,0.15) 0%, transparent 70%)',
          borderRadius: '50%',
        }} />
        <div style={{
          position: 'absolute', bottom: -100, right: -60,
          width: 420, height: 420,
          background: 'radial-gradient(circle, rgba(255,184,28,0.10) 0%, transparent 70%)',
          borderRadius: '50%',
        }} />

        {/* Ícone "Bet+" */}
        <div style={{
          width: 220, height: 220,
          background: 'linear-gradient(145deg, #0f1a2e 0%, #0d1f0f 100%)',
          border: '2px solid rgba(0,200,100,0.3)',
          borderRadius: 48,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          marginRight: 64, flexShrink: 0,
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            fontFamily: 'sans-serif', fontSize: 68, fontWeight: 900,
            letterSpacing: -3, lineHeight: 1, color: '#fff', display: 'flex',
          }}>BET</div>
          <div style={{
            fontFamily: 'sans-serif', fontSize: 52, fontWeight: 900,
            lineHeight: 0.85,
            background: 'linear-gradient(135deg, #00c864 0%, #FFB81C 100%)',
            backgroundClip: 'text', color: 'transparent', display: 'flex',
          }}>+</div>
        </div>

        {/* Textos */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{
            fontFamily: 'sans-serif', fontSize: 20, fontWeight: 700,
            color: '#00c864', letterSpacing: 4, textTransform: 'uppercase',
            marginBottom: 16,
          }}>
            {app.descricao || 'Bolões de Loteria & Esportes'}
          </div>
          <div style={{
            fontFamily: 'sans-serif', fontSize: 88, fontWeight: 900,
            letterSpacing: -3, lineHeight: 1,
            color: '#ffffff', display: 'flex',
          }}>
            {app.nome || 'BetMais'}
          </div>
          <div style={{
            marginTop: 18, display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              width: 40, height: 3,
              background: 'linear-gradient(90deg, #00c864, #FFB81C)',
              borderRadius: 2,
            }} />
            <div style={{
              fontFamily: 'sans-serif', fontSize: 18,
              color: 'rgba(255,255,255,0.35)',
            }}>
              {app.url?.replace('https://', '') || 'betmais.com.br'}
            </div>
          </div>
        </div>

      </div>
    ),
    { ...size }
  )
}
