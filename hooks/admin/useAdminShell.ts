import { useEffect, useState } from 'react'

/**
 * Branding do app (nome/grupo) para o header do admin, lido de /api/config-publica.
 * Saúde da conexão WhatsApp (polling a cada 30s), exibida no AdminHeader.
 */
export function useAdminBranding() {
  const [grupoNome, setGrupoNome] = useState('BOLÃO 💯')
  const [appNome, setAppNome]     = useState('Bolões')

  useEffect(() => {
    fetch('/api/config-publica').then(r => r.json()).then(d => {
      if (d?.app?.grupo_nome) setGrupoNome(d.app.grupo_nome)
      if (d?.app?.nome)       setAppNome(d.app.nome)
    }).catch(() => {})
  }, [])

  return { grupoNome, appNome }
}

export function useWhatsappHealth(ativo: boolean) {
  const [waStatus, setWaStatus] = useState<'ok' | 'erro' | ''>('')
  const [waMsg, setWaMsg]       = useState('')

  useEffect(() => {
    if (!ativo) return
    const checarWA = () => fetch('/api/whatsapp/health').then(r => r.json())
      .then(d => { setWaStatus(d.connected ? 'ok' : 'erro'); setWaMsg(d.msg || '') })
      .catch(() => { setWaStatus('erro'); setWaMsg('Sem resposta do Whapi') })
    checarWA()
    const id = setInterval(checarWA, 30000)
    return () => clearInterval(id)
  }, [ativo])

  return { waStatus, waMsg }
}
