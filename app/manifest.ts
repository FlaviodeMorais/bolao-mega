import { MetadataRoute } from 'next'
import { getAppSettings } from '@/lib/settings'

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const app = await getAppSettings()
  return {
    name:             `${app.grupo_nome} — ${app.nome}`,
    short_name:       app.nome,
    description:      app.descricao,
    start_url:        '/',
    display:          'standalone',
    background_color: app.cor_fundo,
    theme_color:      app.cor_primaria,
    orientation:      'portrait',
    categories:       ['games', 'finance'],
    icons: [
      { src: '/icon',       sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
