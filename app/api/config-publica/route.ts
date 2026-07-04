import { NextResponse } from 'next/server'
import { getAppSettings, getHomeSettings, getBolaoSettings, getEsporteSettings } from '@/lib/settings'

export const revalidate = 300 // 5 minutos

export async function GET() {
  const [app, home, bolao, esporte] = await Promise.all([
    getAppSettings(),
    getHomeSettings(),
    getBolaoSettings(),
    getEsporteSettings(),
  ])

  return NextResponse.json({
    app: {
      nome:        app.nome,
      tagline:     app.tagline,
      url:         app.url,
      logo_url:    app.logo_url,
      cor_primaria: app.cor_primaria,
      cor_fundo:   app.cor_fundo,
      rodape:      app.rodape,
      grupo_nome:  app.grupo_nome,
      descricao:   app.descricao,
    },
    home,
    bolao,
    esporte: { ...esporte, football_data_key: undefined },
  })
}
