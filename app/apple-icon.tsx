import { ImageResponse } from 'next/og'

export const runtime     = 'edge'
export const size        = { width: 180, height: 180 }
export const contentType = 'image/png'

export default async function AppleIcon() {
  const base = process.env.NEXT_PUBLIC_APP_URL
    || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
  const imgSrc = `${base}/bm-circle.png`

  return new ImageResponse(
    (
      <div style={{
        width: 180, height: 180,
        background: '#0a0f1a',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 40, overflow: 'hidden',
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imgSrc} width={170} height={170} style={{ objectFit: 'contain', display: 'flex' }} alt="" />
      </div>
    ),
    { ...size }
  )
}
