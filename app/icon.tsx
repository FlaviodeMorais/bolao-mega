import { ImageResponse } from 'next/og'

export const runtime     = 'edge'
export const size        = { width: 512, height: 512 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{
        width: 512, height: 512,
        background: 'linear-gradient(145deg, #0a0f1e 0%, #0b1e10 100%)',
        display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        borderRadius: 112,
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Glow verde */}
        <div style={{
          position: 'absolute', top: -80, left: -80, width: 360, height: 360,
          background: 'radial-gradient(circle, rgba(0,180,90,0.22) 0%, transparent 70%)',
          borderRadius: '50%', display: 'flex',
        }} />
        {/* Glow dourado */}
        <div style={{
          position: 'absolute', bottom: -60, right: -60, width: 280, height: 280,
          background: 'radial-gradient(circle, rgba(255,184,28,0.16) 0%, transparent 70%)',
          borderRadius: '50%', display: 'flex',
        }} />
        {/* Borda */}
        <div style={{
          position: 'absolute', inset: 10,
          border: '3px solid rgba(0,180,90,0.25)',
          borderRadius: 104, display: 'flex',
        }} />

        {/* Stack BET + */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 0,
        }}>
          <div style={{
            fontFamily: 'sans-serif', fontSize: 150, fontWeight: 900,
            letterSpacing: -8, lineHeight: 1,
            color: '#ffffff', display: 'flex',
          }}>BET</div>
          <div style={{
            fontFamily: 'sans-serif', fontSize: 130, fontWeight: 900,
            lineHeight: 0.8, letterSpacing: -4,
            color: '#00c864', display: 'flex',
          }}>+</div>
        </div>

        {/* Linha decorativa */}
        <div style={{
          position: 'absolute', bottom: 56, left: 156, right: 156, height: 4,
          background: 'rgba(0,180,90,0.45)', borderRadius: 2, display: 'flex',
        }} />
      </div>
    ),
    { ...size }
  )
}
