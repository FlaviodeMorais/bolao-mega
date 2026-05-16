import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'GRUPO MEGA 💯 – Bolão Mega-Sena',
  description: 'Sistema de bolão da Mega-Sena',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet" />
      </head>
      <body>{children}</body>
    </html>
  )
}
