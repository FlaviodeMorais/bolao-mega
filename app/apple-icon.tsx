import { ImageResponse } from 'next/og'

export const runtime     = 'edge'
export const size        = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div style={{
        width: 180, height: 180,
        background: 'linear-gradient(150deg, #06090f 0%, #081508 60%, #06090f 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 40, overflow: 'hidden', position: 'relative',
      }}>
        <div style={{
          position: 'absolute', right: 10, top: '50%',
          width: 100, height: 100, marginTop: -50,
          background: 'radial-gradient(circle, rgba(0,210,100,0.22) 0%, transparent 70%)',
          borderRadius: '50%', display: 'flex',
        }} />
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 2, position: 'relative', zIndex: 2 }}>
          <div style={{
            fontFamily: 'sans-serif', fontSize: 58, fontWeight: 900,
            letterSpacing: -3, color: '#fff', lineHeight: 1, display: 'flex',
          }}>Bet</div>
          <div style={{
            fontFamily: 'sans-serif', fontSize: 70, fontWeight: 900,
            color: '#00d464', lineHeight: 1, display: 'flex', marginBottom: -4,
          }}>+</div>
        </div>
      </div>
    ),
    { ...size }
  )
}
