import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const url = 'https://news.google.com/rss/search?q=Copa+do+Mundo+FIFA+2026&hl=pt-BR&gl=BR&ceid=BR:pt-419'
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      next: { revalidate: 1800 }, // cache 30 min
    })
    const xml = await res.text()

    const items: { titulo: string; link: string; fonte: string; data: string }[] = []
    const itemMatches = xml.matchAll(/<item>([\s\S]*?)<\/item>/g)

    for (const m of itemMatches) {
      const block = m[1]
      const titulo = block.match(/<title>([\s\S]*?)<\/title>/)?.[1]?.replace(/<!\[CDATA\[(.*?)\]\]>/, '$1').trim() ?? ''
      const link   = block.match(/<link>([\s\S]*?)<\/link>/)?.[1]?.trim() ?? ''
      const pub    = block.match(/<pubDate>([\s\S]*?)<\/pubDate>/)?.[1]?.trim() ?? ''

      // Extrai a fonte do título (padrão Google News: "Título - Fonte")
      const partes = titulo.split(' - ')
      const fonte  = partes.length > 1 ? partes[partes.length - 1] : ''
      const tituloLimpo = partes.slice(0, -1).join(' - ')

      // Data legível
      const data = pub ? new Date(pub).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : ''

      if (tituloLimpo) items.push({ titulo: tituloLimpo, link, fonte, data })
      if (items.length >= 8) break
    }

    return NextResponse.json({ noticias: items })
  } catch {
    return NextResponse.json({ noticias: [] })
  }
}
