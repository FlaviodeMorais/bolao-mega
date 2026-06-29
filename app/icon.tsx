import { ImageResponse } from 'next/og'

export const runtime     = 'edge'
export const size        = { width: 512, height: 512 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{
        width: 512, height: 512,
        background: 'linear-gradient(150deg, #06090f 0%, #081508 60%, #06090f 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 108,
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', right: 60, top: '50%',
          width: 260, height: 260, marginTop: -130,
          background: 'radial-gradient(circle, rgba(0,210,100,0.22) 0%, transparent 70%)',
          borderRadius: '50%', display: 'flex',
        }} />
        <div style={{
          position: 'absolute', inset: 14,
          border: '1.5px solid rgba(0,200,100,0.14)',
          borderRadius: 96, display: 'flex',
        }} />
        <div style={{
          display: 'flex', alignItems: 'baseline',
          gap: 4, position: 'relative', zIndex: 2,
        }}>
          <div style={{
            fontFamily: 'sans-serif', fontSize: 164, fontWeight: 900, letterSpacing: -6,
            color: '#ffffff', lineHeight: 1, display: 'flex',
          }}>Bet</div>
          <div style={{
            fontFamily: 'sans-serif', fontSize: 196, fontWeight: 900, letterSpacing: -4,
            color: '#00d464', lineHeight: 1, display: 'flex', marginBottom: -10,
          }}>+</div>
        </div>
      </div>
    ),
    { ...size }
  )
}
