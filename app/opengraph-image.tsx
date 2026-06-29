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

          {/* Borda sutil igual ao ícone */}
          <div style={{
            position: 'absolute', inset: 8,
            border: '1.5px solid rgba(0,200,100,0.14)',
            borderRadius: 34, display: 'flex',
          }} />

          {/* Glow verde atrás do "+" */}
          <div style={{
            position: 'absolute', right: 30, top: '50%',
            width: 180, height: 180, marginTop: -90,
            background: 'radial-gradient(circle, rgba(0,210,100,0.22) 0%, transparent 70%)',
            borderRadius: '50%', display: 'flex',
          }} />

          {/* "Bet +" igual ao ícone */}
          <div style={{
            display: 'flex', alignItems: 'baseline',
            gap: 2, position: 'relative', zIndex: 2,
          }}>
            <div style={{
              fontFamily: 'sans-serif', fontSize: 100, fontWeight: 900,
              letterSpacing: -5, color: '#ffffff', lineHeight: 1, display: 'flex',
            }}>Bet</div>
            <div style={{
              fontFamily: 'sans-serif', fontSize: 120, fontWeight: 900,
              color: '#00d464', lineHeight: 1, display: 'flex', marginBottom: -8,
            }}>+</div>
          </div>
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

          {/* Nome principal: "Bet" normal + "Mais" negrito na mesma linha */}
          <div style={{
            display: 'flex', alignItems: 'baseline', gap: 0, lineHeight: 1,
          }}>
            <span style={{
              fontFamily: 'sans-serif', fontSize: 104, fontWeight: 400,
              letterSpacing: -4, color: '#ffffff', display: 'flex',
            }}>Bet</span>
            <span style={{
              fontFamily: 'sans-serif', fontSize: 108, fontWeight: 900,
              letterSpacing: -2, color: '#00d464', display: 'flex',
            }}>Mais</span>
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


        </div>

      </div>
    ),
    { ...size }
  )
}
