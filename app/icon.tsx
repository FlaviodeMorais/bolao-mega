import { ImageResponse } from 'next/og'

export const runtime     = 'edge'
export const size        = { width: 512, height: 512 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div style={{
        width: 512, height: 512,
        background: 'linear-gradient(160deg, #050d18 0%, #061a10 50%, #050d18 100%)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 108,
        position: 'relative', overflow: 'hidden',
      }}>

        {/* Grid de pontos no fundo */}
        {[0,1,2,3,4,5,6,7].map(row => (
          [0,1,2,3,4,5,6,7].map(col => (
            <div key={`${row}-${col}`} style={{
              position: 'absolute',
              left: col * 68 + 16, top: row * 68 + 16,
              width: 3, height: 3, borderRadius: '50%',
              background: 'rgba(0,200,100,0.12)',
              display: 'flex',
            }} />
          ))
        ))}

        {/* Halo externo verde */}
        <div style={{
          position: 'absolute', inset: 18,
          border: '2px solid rgba(0,200,100,0.15)',
          borderRadius: 92, display: 'flex',
        }} />

        {/* Anel dourado */}
        <div style={{
          position: 'absolute', inset: 30,
          border: '1px solid rgba(255,184,28,0.12)',
          borderRadius: 82, display: 'flex',
        }} />

        {/* Glow central verde */}
        <div style={{
          position: 'absolute',
          width: 280, height: 280,
          background: 'radial-gradient(circle, rgba(0,200,100,0.18) 0%, rgba(0,200,100,0.06) 50%, transparent 70%)',
          borderRadius: '50%', display: 'flex',
        }} />

        {/* Glow inferior dourado */}
        <div style={{
          position: 'absolute', bottom: -20, right: 60,
          width: 200, height: 200,
          background: 'radial-gradient(circle, rgba(255,184,28,0.14) 0%, transparent 70%)',
          borderRadius: '50%', display: 'flex',
        }} />

        {/* Conteúdo central */}
        <div style={{
          display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          position: 'relative', zIndex: 10,
          gap: 0,
        }}>

          {/* "BET" */}
          <div style={{
            fontFamily: 'sans-serif', fontSize: 136,
            fontWeight: 900, letterSpacing: -5,
            color: '#f0f8ff', lineHeight: 1,
            display: 'flex',
            textShadow: '0 0 40px rgba(0,200,100,0.3)',
          }}>BET</div>

          {/* Linha separadora com glow */}
          <div style={{
            width: 200, height: 2, marginTop: -4, marginBottom: 2,
            background: 'linear-gradient(90deg, transparent 0%, #00c864 30%, #FFB81C 70%, transparent 100%)',
            display: 'flex',
          }} />

          {/* "MAIS" pequeno abaixo */}
          <div style={{
            fontFamily: 'sans-serif', fontSize: 44,
            fontWeight: 900, letterSpacing: 18,
            color: '#00c864', lineHeight: 1,
            display: 'flex',
          }}>MAIS</div>

        </div>

        {/* Símbolo "+" grande decorativo semi-transparente */}
        <div style={{
          position: 'absolute', right: 28, top: 28,
          fontFamily: 'sans-serif', fontSize: 68, fontWeight: 900,
          color: 'rgba(0,200,100,0.2)', lineHeight: 1,
          display: 'flex',
        }}>+</div>

        {/* Bolinhas de loteria decorativas */}
        {[
          { left: 38, top: 380, size: 22, opacity: 0.25 },
          { left: 72, top: 360, size: 16, opacity: 0.15 },
          { left: 430, top: 390, size: 20, opacity: 0.22 },
          { left: 460, top: 368, size: 14, opacity: 0.13 },
        ].map((b, i) => (
          <div key={i} style={{
            position: 'absolute', left: b.left, top: b.top,
            width: b.size, height: b.size, borderRadius: '50%',
            border: `2px solid rgba(0,200,100,${b.opacity})`,
            display: 'flex',
          }} />
        ))}

      </div>
    ),
    { ...size }
  )
}
