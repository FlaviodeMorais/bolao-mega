import { NextResponse } from 'next/server'

const CAZETV_CHANNEL  = 'UCZiYbVptd3PVPf4f6eR6UaQ'
const MOMENTOS_PLAYLIST = 'PLsFWLnYCEXEVNzCnkQE-xOuMc8oLxSleC'

type Video = { id: string; titulo: string; thumb: string; link: string; data: string }

function parseEntries(xml: string, limit = 10): Video[] {
  const videos: Video[] = []
  for (const m of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
    const b = m[1]
    const id     = b.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1] ?? ''
    const titulo = b.match(/<title>([^<]+)<\/title>/)?.[1] ?? ''
    const thumb  = b.match(/thumbnail url="([^"]+)"/)?.[1] ?? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
    const link   = `https://www.youtube.com/watch?v=${id}`
    const pub    = b.match(/<published>([^<]+)<\/published>/)?.[1] ?? ''
    const data   = pub ? new Date(pub).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : ''
    if (id) videos.push({ id, titulo, thumb, link, data })
    if (videos.length >= limit) break
  }
  return videos
}

export async function GET() {
  try {
    const [chanRes, playRes] = await Promise.all([
      fetch(`https://www.youtube.com/feeds/videos.xml?channel_id=${CAZETV_CHANNEL}`, { next: { revalidate: 900 } }),
      fetch(`https://www.youtube.com/feeds/videos.xml?playlist_id=${MOMENTOS_PLAYLIST}`, { next: { revalidate: 900 } }),
    ])

    const [chanXml, playXml] = await Promise.all([chanRes.text(), playRes.text()])

    const todos    = parseEntries(chanXml, 20)
    const momentos = parseEntries(playXml, 10)

    const upper = (t: string) => t.toUpperCase()
    const aoVivo = todos.filter(v =>
      upper(v.titulo).includes('AO VIVO') ||
      upper(v.titulo).includes('PRÉ-JOGO') ||
      upper(v.titulo).includes('PRE-JOGO')
    )

    return NextResponse.json({
      aoVivo:   aoVivo.slice(0, 8),
      momentos: momentos.slice(0, 10),
    })
  } catch {
    return NextResponse.json({ aoVivo: [], momentos: [] })
  }
}
