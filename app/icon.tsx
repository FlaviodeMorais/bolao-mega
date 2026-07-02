import { ImageResponse } from 'next/og'

export const runtime     = 'edge'
export const size        = { width: 512, height: 512 }
export const contentType = 'image/png'

export default async function Icon() {
  const base = process.env.VERCEL_URL
    ? `https://${process.env.VERCEL_URL}`
    : 'http://localhost:3000'
  const imgSrc = `${base}/bm-circle.png`

  return new ImageResponse(
    (
      <div style={{
        width: 512, height: 512,
        background: '#000000',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        borderRadius: 108, overflow: 'hidden',
        position: 'relative',
      }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imgSrc} width={512} height={512} style={{ objectFit: 'contain', display: 'flex' }} alt="" />
      </div>
    ),
    { ...size }
  )
}
