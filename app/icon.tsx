import { ImageResponse } from 'next/og'

export const runtime     = 'edge'
export const size        = { width: 512, height: 512 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{
        width: 512, height: 512,
        background: 'linear-gradient(145deg, #0a0f1e 0%, #0d1f0f 60%, #091a1a 100%)',
        display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        borderRadius: 112,
        position: 'relative',
        overflow: 'hidden',
      }}>

        {/* Glow fundo verde */}
        <div style={{
          position: 'absolute', top: -60, left: -60,
          width: 320, height: 320,
          background: 'radial-gradient(circle, rgba(0,200,100,0.18) 0%, transparent 70%)',
          borderRadius: '50%',
        }} />
        {/* Glow fundo dourado */}
        <div style={{
          position: 'absolute', bottom: -40, right: -40,
          width: 260, height: 260,
          background: 'radial-gradient(circle, rgba(255,184,28,0.12) 0%, transparent 70%)',
          borderRadius: '50%',
        }} />

        {/* Borda externa sutil */}
        <div style={{
          position: 'absolute', inset: 0,
          border: '2px solid rgba(0,200,100,0.2)',
          borderRadius: 112,
        }} />

        {/* Conteúdo central */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 0,
        }}>

          {/* "BET" */}
          <div style={{
            fontFamily: 'sans-serif',
            fontSize: 148,
            fontWeight: 900,
            letterSpacing: -6,
            lineHeight: 1,
            color: '#ffffff',
            display: 'flex',
          }}>
            BET
          </div>

          {/* "+" grande em destaque dourado-verde */}
          <div style={{
            fontFamily: 'sans-serif',
            fontSize: 108,
            fontWeight: 900,
            lineHeight: 0.85,
            letterSpacing: -2,
            background: 'linear-gradient(135deg, #00c864 0%, #FFB81C 100%)',
            backgroundClip: 'text',
            color: 'transparent',
            display: 'flex',
          }}>
            +
          </div>

        </div>

        {/* Linha decorativa inferior */}
        <div style={{
          position: 'absolute', bottom: 52, left: '50%',
          width: 160, height: 3,
          background: 'linear-gradient(90deg, transparent, rgba(0,200,100,0.6), rgba(255,184,28,0.6), transparent)',
          transform: 'translateX(-50%)',
          borderRadius: 2,
        }} />

      </div>
    ),
    { ...size }
  )
}
