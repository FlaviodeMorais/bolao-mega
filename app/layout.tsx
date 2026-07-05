import type { Metadata, Viewport } from 'next'
import './globals.css'
import 'flag-icons/css/flag-icons.min.css'
import { getAppSettings } from '@/lib/settings'
import SwRegistrar from '@/components/SwRegistrar'
import { CartProvider } from '@/components/CartContext'

export async function generateMetadata(): Promise<Metadata> {
  const app = await getAppSettings()
  return {
    title:       `${app.grupo_nome} – ${app.nome}`,
    description: app.descricao,
    appleWebApp: {
      capable:         true,
      statusBarStyle:  'black-translucent',
      title:           app.nome,
    },
  }
}

export async function generateViewport(): Promise<Viewport> {
  const app = await getAppSettings()
  return {
    width:         'device-width',
    initialScale:  1,
    maximumScale:  1,
    themeColor:    app.cor_primaria,
  }
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const app = await getAppSettings()
  return (
    <html lang="pt-BR">
      <head>
        <link rel="icon" href="/icon.png" type="image/png" sizes="512x512" />
        <link rel="shortcut icon" href="/icon.png" type="image/png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
        <link href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" rel="stylesheet" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <style dangerouslySetInnerHTML={{ __html: `:root{--green:${app.cor_primaria};--green-hover:${app.cor_primaria};--navy:${app.cor_fundo};}` }} />
      </head>
      <body>
        <CartProvider>
          {children}
        </CartProvider>
        <SwRegistrar />
      </body>
    </html>
  )
}
