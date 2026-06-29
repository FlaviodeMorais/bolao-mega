import { ImageResponse } from 'next/og'

export const runtime     = 'edge'
export const size        = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{
        width: 180, height: 180,
        background: 'linear-gradient(145deg, #0a0f1e 0%, #0d1f0f 60%, #091a1a 100%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        borderRadius: 40,
        position: 'relative',
        overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: -20, left: -20,
          width: 120, height: 120,
          background: 'radial-gradient(circle, rgba(0,200,100,0.18) 0%, transparent 70%)',
          borderRadius: '50%',
        }} />

        <div style={{
          fontFamily: 'sans-serif', fontSize: 52, fontWeight: 900,
          letterSpacing: -2, lineHeight: 1, color: '#fff', display: 'flex',
        }}>BET</div>

        <div style={{
          fontFamily: 'sans-serif', fontSize: 38, fontWeight: 900,
          lineHeight: 0.9,
          background: 'linear-gradient(135deg, #00c864 0%, #FFB81C 100%)',
          backgroundClip: 'text', color: 'transparent', display: 'flex',
        }}>+</div>
      </div>
    ),
    { ...size }
  )
}
