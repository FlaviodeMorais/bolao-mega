import { ImageResponse } from 'next/og'

export const runtime     = 'edge'
export const size        = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{
        width: 180, height: 180,
        background: 'linear-gradient(145deg, #0a0f1e 0%, #0b1e10 100%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        borderRadius: 40, overflow: 'hidden', position: 'relative',
      }}>
        <div style={{
          position: 'absolute', top: -30, left: -30, width: 130, height: 130,
          background: 'radial-gradient(circle, rgba(0,180,90,0.22) 0%, transparent 70%)',
          borderRadius: '50%', display: 'flex',
        }} />
        <div style={{
          fontFamily: 'sans-serif', fontSize: 58, fontWeight: 900,
          letterSpacing: -3, lineHeight: 1, color: '#fff', display: 'flex',
        }}>BET</div>
        <div style={{
          fontFamily: 'sans-serif', fontSize: 50, fontWeight: 900,
          lineHeight: 0.85, color: '#00c864', display: 'flex',
        }}>+</div>
      </div>
    ),
    { ...size }
  )
}
