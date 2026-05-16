import { ImageResponse } from 'next/og'

export const size        = { width: 512, height: 512 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{
        width: 512, height: 512,
        background: 'linear-gradient(145deg, #0D1B2A 0%, #0f2a14 100%)',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        borderRadius: 100,
      }}>
        {/* Green ring */}
        <div style={{
          position: 'absolute', inset: 16,
          border: '6px solid rgba(0,166,81,0.35)',
          borderRadius: 88,
        }} />
        {/* Clover */}
        <div style={{ fontSize: 220, lineHeight: 1, marginBottom: -16 }}>🍀</div>
        {/* Text */}
        <div style={{
          fontFamily: 'sans-serif', fontSize: 68, fontWeight: 900,
          color: '#FFFFFF', letterSpacing: 2, marginTop: 8,
        }}>MEGA</div>
      </div>
    ),
    { ...size }
  )
}
