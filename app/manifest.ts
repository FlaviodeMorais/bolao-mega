import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Grupo Mega 💯 — Bolão Mega-Sena',
    short_name: 'Mega Bolão',
    description: 'Bolão da Mega-Sena — Grupo Fechado',
    start_url: '/',
    display: 'standalone',
    background_color: '#0D1B2A',
    theme_color: '#00A651',
    orientation: 'portrait',
    categories: ['games', 'finance'],
    icons: [
      { src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png', purpose: 'any maskable' },
    ],
  }
}
