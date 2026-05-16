import { ImageResponse } from 'next/og'

export const runtime     = 'edge'
export const size        = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{
        width: 180, height: 180,
        background: 'linear-gradient(145deg, #0D1B2A 0%, #0f2a14 100%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        borderRadius: 36,
      }}>
        <div style={{ fontSize: 90, lineHeight: 1 }}>🍀</div>
        <div style={{
          fontFamily: 'sans-serif', fontSize: 28, fontWeight: 900,
          color: '#00A651', letterSpacing: 1, marginTop: 4,
        }}>MEGA</div>
      </div>
    ),
    { ...size }
  )
}
