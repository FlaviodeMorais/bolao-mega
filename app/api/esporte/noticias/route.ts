import { NextResponse } from 'next/server'

const CAZETV_CHANNEL = 'UCZiYbVptd3PVPf4f6eR6UaQ'

type Video = { id: string; titulo: string; thumb: string; link: string; data: string }

export async function GET() {
  try {
    const res = await fetch(
      `https://www.youtube.com/feeds/videos.xml?channel_id=${CAZETV_CHANNEL}`,
      { next: { revalidate: 900 } }
    )
    const xml = await res.text()

    const todos: Video[] = []
    for (const m of xml.matchAll(/<entry>([\s\S]*?)<\/entry>/g)) {
      const b = m[1]
      const id     = b.match(/<yt:videoId>([^<]+)<\/yt:videoId>/)?.[1] ?? ''
      const titulo = b.match(/<title>([^<]+)<\/title>/)?.[1] ?? ''
      const thumb  = b.match(/thumbnail url="([^"]+)"/)?.[1] ?? `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
      const link   = `https://www.youtube.com/watch?v=${id}`
      const pub    = b.match(/<published>([^<]+)<\/published>/)?.[1] ?? ''
      const data   = pub ? new Date(pub).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : ''
      if (id) todos.push({ id, titulo, thumb, link, data })
    }

    const upper = (t: string) => t.toUpperCase()
    const aoVivo    = todos.filter(v => upper(v.titulo).includes('AO VIVO') || upper(v.titulo).includes('PRÉ-JOGO') || upper(v.titulo).includes('PRE-JOGO'))
    const momentos  = todos.filter(v => upper(v.titulo).includes('MELHORES MOMENTOS') || upper(v.titulo).includes('JOGO COMPLETO'))
    const outros    = todos.filter(v => !aoVivo.includes(v) && !momentos.includes(v))

    return NextResponse.json({
      aoVivo:   aoVivo.slice(0, 8),
      momentos: momentos.slice(0, 8),
      outros:   outros.slice(0, 8),
    })
  } catch {
    return NextResponse.json({ aoVivo: [], momentos: [], outros: [] })
  }
}
