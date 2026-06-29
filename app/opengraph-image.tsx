import { ImageResponse } from 'next/og'
import { getAppSettings } from '@/lib/settings'

export const runtime     = 'edge'
export const size        = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default async function OgImage() {
  const app = await getAppSettings()
  const nome = app.nome || 'BetMais'
  const desc = app.descricao || 'Loterias, Brasileirão, Copa, e muito mais!'

  return new ImageResponse(
    (
      <div style={{
        width: 1200, height: 630,
        background: 'linear-gradient(160deg, #05080f 0%, #071510 45%, #050d1a 100%)',
        display: 'flex',
        position: 'relative', overflow: 'hidden',
      }}>

        {/* Grid de pontos */}
        {[0,1,2,3,4,5,6,7,8].map(row =>
          [0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15].map(col => (
            <div key={`${row}-${col}`} style={{
              position: 'absolute',
              left: col * 80 + 20, top: row * 80 + 20,
              width: 2, height: 2, borderRadius: '50%',
              background: 'rgba(0,200,100,0.1)',
              display: 'flex',
            }} />
          ))
        )}

        {/* Glow esquerdo grande */}
        <div style={{
          position: 'absolute', left: -100, top: -80,
          width: 600, height: 600,
          background: 'radial-gradient(circle, rgba(0,200,100,0.12) 0%, transparent 65%)',
          borderRadius: '50%', display: 'flex',
        }} />

        {/* Glow direito dourado */}
        <div style={{
          position: 'absolute', right: -80, bottom: -60,
          width: 500, height: 500,
          background: 'radial-gradient(circle, rgba(255,184,28,0.10) 0%, transparent 65%)',
          borderRadius: '50%', display: 'flex',
        }} />

        {/* Linha vertical separadora */}
        <div style={{
          position: 'absolute', left: 420, top: 60, bottom: 60,
          width: 1, background: 'linear-gradient(180deg, transparent, rgba(0,200,100,0.3), rgba(255,184,28,0.2), transparent)',
          display: 'flex',
        }} />

        {/* ── LADO ESQUERDO: Emblema ── */}
        <div style={{
          width: 420, height: 630,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          flexDirection: 'column', gap: 0,
          position: 'relative',
        }}>

          {/* Anel externo */}
          <div style={{
            position: 'absolute',
            width: 280, height: 280,
            border: '1px solid rgba(0,200,100,0.2)',
            borderRadius: '50%', display: 'flex',
          }} />
          <div style={{
            position: 'absolute',
            width: 250, height: 250,
            border: '1px solid rgba(255,184,28,0.1)',
            borderRadius: '50%', display: 'flex',
          }} />

          {/* Glow central */}
          <div style={{
            position: 'absolute',
            width: 240, height: 240,
            background: 'radial-gradient(circle, rgba(0,200,100,0.15) 0%, transparent 70%)',
            borderRadius: '50%', display: 'flex',
          }} />

          {/* Texto central do emblema */}
          <div style={{
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', gap: 0, position: 'relative', zIndex: 2,
          }}>
            <div style={{
              fontFamily: 'sans-serif', fontSize: 96, fontWeight: 900,
              letterSpacing: -4, color: '#f0f8ff', lineHeight: 1, display: 'flex',
            }}>BET</div>
            <div style={{
              width: 140, height: 2, marginTop: -2, marginBottom: 4,
              background: 'linear-gradient(90deg, transparent, #00c864, #FFB81C, transparent)',
              display: 'flex',
            }} />
            <div style={{
              fontFamily: 'sans-serif', fontSize: 32, fontWeight: 900,
              letterSpacing: 14, color: '#00c864', lineHeight: 1, display: 'flex',
            }}>MAIS</div>
          </div>

          {/* Bolinhas decorativas ao redor */}
          {[
            { angle: 30,  r: 145 }, { angle: 150, r: 145 },
            { angle: 210, r: 145 }, { angle: 330, r: 145 },
          ].map((b, i) => {
            const x = 210 + Math.cos(b.angle * Math.PI / 180) * b.r
            const y = 315 + Math.sin(b.angle * Math.PI / 180) * b.r
            return (
              <div key={i} style={{
                position: 'absolute', left: x - 10, top: y - 10,
                width: 20, height: 20, borderRadius: '50%',
                border: '2px solid rgba(0,200,100,0.25)',
                display: 'flex',
              }} />
            )
          })}
        </div>

        {/* ── LADO DIREITO: Tipografia ── */}
        <div style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          justifyContent: 'center', padding: '0 70px 0 50px',
          gap: 0,
        }}>

          {/* Tag label */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20,
          }}>
            <div style={{
              width: 32, height: 2,
              background: 'linear-gradient(90deg, #00c864, #FFB81C)',
              display: 'flex',
            }} />
            <div style={{
              fontFamily: 'sans-serif', fontSize: 13, fontWeight: 700,
              color: '#00c864', letterSpacing: 4, textTransform: 'uppercase',
              display: 'flex',
            }}>Bolões</div>
          </div>

          {/* Nome principal */}
          <div style={{
            fontFamily: 'sans-serif', fontSize: 90, fontWeight: 900,
            letterSpacing: -4, color: '#ffffff', lineHeight: 0.95,
            display: 'flex', flexDirection: 'column',
          }}>
            <span style={{ display: 'flex' }}>Bet</span>
            <span style={{ color: '#00c864', display: 'flex' }}>Mais</span>
          </div>

          {/* Linha decorativa */}
          <div style={{
            width: '100%', height: 1, margin: '28px 0',
            background: 'rgba(255,255,255,0.06)', display: 'flex',
          }} />

          {/* Descrição */}
          <div style={{
            fontFamily: 'sans-serif', fontSize: 20, fontWeight: 500,
            color: 'rgba(255,255,255,0.45)', lineHeight: 1.5,
            display: 'flex',
          }}>
            {desc}
          </div>

          {/* Números loteria decorativos */}
          <div style={{
            display: 'flex', gap: 12, marginTop: 32,
          }}>
            {[13, 27, 42, 55, 61, '+'].map((n, i) => (
              <div key={i} style={{
                width: 44, height: 44, borderRadius: '50%',
                border: `2px solid ${i === 5 ? 'rgba(0,200,100,0.5)' : 'rgba(255,255,255,0.1)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontFamily: 'sans-serif', fontSize: 14, fontWeight: 800,
                color: i === 5 ? '#00c864' : 'rgba(255,255,255,0.3)',
              }}>{n}</div>
            ))}
          </div>

        </div>

      </div>
    ),
    { ...size }
  )
}
