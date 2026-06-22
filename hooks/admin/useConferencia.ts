import { useState, useRef, useEffect } from 'react'

interface Bolao { id: string; apostas_data?: unknown }

export interface ConferirResult {
  status: string
  dezenas_sorteadas: number[]
  resumo: { senas: number; quinas: number; quadras: number }
  maior_premio: string | null
  total_premiadas: number
  apostas_premiadas: { idx: number; dezenas: number[]; acertos: number; premio: string }[]
}

export function useConferencia(
  bolaoAtual: Bolao | null,
  concursoAtivo: string,
  onBoloesChange: () => void,
) {
  const [showConferir, setShowConferir]         = useState(false)
  const [conferindoRes, setConferindoRes]       = useState(false)
  const [conferirMsg, setConferirMsg]           = useState('')
  const [dezenasInput, setDezenasInput]         = useState('')
  const [conferindoManual, setConferindoManual] = useState(false)
  const [conferirResult, setConferirResult]     = useState<ConferirResult | null>(null)
  const autoRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => () => { if (autoRef.current) clearInterval(autoRef.current) }, [])

  function limparAutoRef() {
    if (autoRef.current) { clearInterval(autoRef.current); autoRef.current = null }
  }

  async function conferirSorteio(silencioso = false) {
    if (!bolaoAtual || !concursoAtivo) return
    if (!silencioso) { setConferindoRes(true); setConferirMsg('') }
    const res = await fetch(
      `/api/admin/conferir-sorteio?bolao_id=${bolaoAtual.id}&concurso=${concursoAtivo}`
    ).then(r => r.json())
    if (!silencioso) setConferindoRes(false)
    if (res.error) { if (!silencioso) setConferirMsg(`❌ ${res.error}`); return }
    setConferirResult(res)
    const msgs: Record<string, string> = {
      ganhamos:     `🏆 GANHAMOS! ${res.maior_premio} — ${res.total_premiadas} aposta(s) premiada(s)`,
      nao_premiada: `😔 Não premiada — nenhuma aposta com 4 ou mais acertos`,
      nao_apurado:  res.message || `⏳ Sorteio #${concursoAtivo} ainda não apurado.`,
    }
    setConferirMsg(msgs[res.status] || res.message || `Status: ${res.status}`)

    if (res.status === 'nao_apurado') {
      if (!autoRef.current) {
        autoRef.current = setInterval(() => conferirSorteio(true), 5 * 60 * 1000)
      }
    } else {
      limparAutoRef()
      onBoloesChange()
    }
  }

  async function resetarConferencia() {
    if (!bolaoAtual || !confirm('Resetar conferência do sorteio?')) return
    await fetch('/api/admin/conferir-sorteio', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bolao_id: bolaoAtual.id }),
    })
    setConferirResult(null)
    setConferirMsg('✅ Conferência resetada.')
    limparAutoRef()
    setTimeout(() => setConferirMsg(''), 3000)
  }

  async function conferirManual() {
    if (!bolaoAtual) return
    const nums = dezenasInput.trim().split(/[\s,;]+/).map(Number).filter(n => n >= 1 && n <= 60)
    if (nums.length !== 6) { setConferirMsg('❌ Informe exatamente 6 dezenas (1–60)'); return }
    setConferindoManual(true); setConferirMsg('')
    const res = await fetch('/api/admin/conferir-sorteio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bolao_id: bolaoAtual.id, dezenas_sorteadas: nums }),
    }).then(r => r.json())
    setConferindoManual(false)
    if (res.error) { setConferirMsg(`❌ ${res.error}`); return }
    setConferirResult(res)
    limparAutoRef()
    const msgs: Record<string, string> = {
      ganhamos:     `🏆 GANHAMOS! ${res.maior_premio} — ${res.total_premiadas} aposta(s) premiada(s)`,
      nao_premiada: `😔 Não premiada — nenhuma aposta com 4 ou mais acertos`,
    }
    setConferirMsg(msgs[res.status] || `Status: ${res.status}`)
    onBoloesChange()
  }

  function restaurarResultadoSalvo(rc: Bolao['apostas_data'] | null | undefined) {
    if (!rc || typeof rc !== 'object') { setConferirResult(null); setConferirMsg(''); return }
    const r = rc as Record<string, unknown>
    if (r.status && r.status !== 'nao_apurado') {
      setConferirResult(r as unknown as ConferirResult)
      const msgs: Record<string, string> = {
        ganhamos:     `🏆 GANHAMOS! ${r.maior_premio} — ${r.total_premiadas ?? (r.apostas_premiadas as unknown[])?.length ?? 0} aposta(s) premiada(s)`,
        nao_premiada: '😔 Não premiada — nenhuma aposta com 4 ou mais acertos',
      }
      setConferirMsg(msgs[r.status as string] || '')
    } else {
      setConferirResult(null); setConferirMsg('')
    }
  }

  return {
    showConferir, setShowConferir,
    conferindoRes, conferirMsg, setConferirMsg,
    dezenasInput, setDezenasInput,
    conferindoManual,
    conferirResult, setConferirResult,
    conferirSorteio, resetarConferencia, conferirManual,
    restaurarResultadoSalvo,
    limparAutoRef,
  }
}
