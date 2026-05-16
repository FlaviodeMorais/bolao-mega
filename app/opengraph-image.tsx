import { ImageResponse } from 'next/og'

export const runtime     = 'edge'
export const size        = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return new ImageResponse(
    (
      <div style={{
        width: 1200, height: 630,
        background: 'linear-gradient(145deg, #0D1B2A 0%, #091a0e 60%, #0f2a14 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 80,
        position: 'relative',
      }}>
        {/* Green glow left */}
        <div style={{
          position: 'absolute', left: -100, top: -100,
          width: 500, height: 500,
          background: 'radial-gradient(circle, rgba(0,166,81,0.20) 0%, transparent 70%)',
          borderRadius: '50%',
        }} />
        {/* Green glow right */}
        <div style={{
          position: 'absolute', right: -80, bottom: -80,
          width: 400, height: 400,
          background: 'radial-gradient(circle, rgba(0,166,81,0.12) 0%, transparent 70%)',
          borderRadius: '50%',
        }} />

        {/* Left: icon */}
        <div style={{
          width: 220, height: 220,
          background: 'rgba(0,166,81,0.12)',
          border: '3px solid rgba(0,166,81,0.35)',
          borderRadius: 44,
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          marginRight: 60, flexShrink: 0,
        }}>
          <div style={{ fontSize: 110, lineHeight: 1 }}>🍀</div>
        </div>

        {/* Right: text */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <div style={{
            fontFamily: 'sans-serif', fontSize: 24, fontWeight: 700,
            color: '#00A651', letterSpacing: 4, textTransform: 'uppercase',
            marginBottom: 12,
          }}>
            Bolão da Mega-Sena
          </div>
          <div style={{
            fontFamily: 'sans-serif', fontSize: 80, fontWeight: 900,
            color: '#FFFFFF', letterSpacing: -2, lineHeight: 1,
          }}>
            GRUPO<br/>MEGA 💯
          </div>
          <div style={{
            marginTop: 24,
            display: 'flex', alignItems: 'center', gap: 12,
          }}>
            <div style={{
              background: 'rgba(0,166,81,0.15)',
              border: '1px solid rgba(0,166,81,0.35)',
              borderRadius: 100, padding: '8px 20px',
              fontFamily: 'sans-serif', fontSize: 18, fontWeight: 600,
              color: '#00A651',
            }}>20 cotas · R$ 30,00</div>
            <div style={{
              background: 'rgba(0,166,81,0.15)',
              border: '1px solid rgba(0,166,81,0.35)',
              borderRadius: 100, padding: '8px 20px',
              fontFamily: 'sans-serif', fontSize: 18, fontWeight: 600,
              color: '#00A651',
            }}>3 sorteios/semana</div>
          </div>
          <div style={{
            marginTop: 20,
            fontFamily: 'sans-serif', fontSize: 18,
            color: 'rgba(255,255,255,0.40)',
          }}>
            bolao-mega-zeta.vercel.app
          </div>
        </div>
      </div>
    ),
    { ...size }
  )
}
