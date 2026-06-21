import { NextResponse } from 'next/server'

const CAZETV_CHANNEL = 'UCZiYbVptd3PVPf4f6eR6UaQ'

export async function GET() {
  try {
    const res = await fetch(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${CAZETV_CHANNEL}`,
      { next: { revalidate: 900 } } // cache 15 min
    )
    const xml = await res.text()

    const videos: { id: string; titulo: string; thumb: string; link: string; data: string }[] = []
    const entries = xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)

    for (const m of entries) {
      const block = m[1]
      const id    = block.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1] ?? ''
      const titulo = block.match(/<title>([^<]+)<\/title>/)?.[1] ?? ''
      const thumb  = block.match(/thumbnail url="([^"]+)"/)?.[1] ?? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
      const link   = `https://www.youtube.com/watch?v=${id}`
      const pub    = block.match(/<published>([^<]+)<\/published>/)?.[1] ?? ''
      const data   = pub ? new Date(pub).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : ''

      if (id) videos.push({ id, titulo, thumb, link, data })
      if (videos.length >= 8) break
    }

    return NextResponse.json({ videos })
  } catch {
    return NextResponse.json({ videos: [] })
  }
}
