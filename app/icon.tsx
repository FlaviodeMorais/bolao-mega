import { ImageResponse } from 'next/og'

export const size = { width: 512, height: 512 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 512, height: 512,
          background: 'linear-gradient(135deg, #0D1B2A 0%, #132032 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          borderRadius: 100,
        }}
      >
        <div style={{
          fontSize: 280, lineHeight: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          🍀
        </div>
      </div>
    ),
    { ...size }
  )
}
