import { useState, useRef, useEffect } from 'react'
import { getLoteria } from '@/lib/loterias'

interface Bolao { id: string; slug?: string; loteria?: string; apostas_data?: unknown }

const MIN_ACERTOS: Record<string, number> = { mega: 4, lotofacil: 11, quina: 2 }

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

  // Quando apostas são carregadas, limpa msg de erro de "sem apostas" para não ficar mensagem contraditória
  useEffect(() => {
    if (bolaoAtual?.apostas_data) {
      setConferirMsg(prev => prev.includes('aposta') && prev.startsWith('❌') ? '' : prev)
    }
  }, [(bolaoAtual as { apostas_data?: unknown } | null)?.apostas_data])

  function limparAutoRef() {
    if (autoRef.current) { clearInterval(autoRef.current); autoRef.current = null }
  }

  async function conferirSorteio(silencioso = false) {
    if (!bolaoAtual || !concursoAtivo) return
    // O concurso a conferir é o do proprio bolao (derivado do slug), nao o concurso ativo
    // global da loteria — senao boloes antigos buscam o resultado do sorteio de hoje.
    const concursoDoBolao = bolaoAtual.slug?.match(/^\d+/)?.[0] || concursoAtivo
    if (!silencioso) { setConferindoRes(true); setConferirMsg('') }
    const res = await fetch(
      `/api/admin/conferir-sorteio?bolao_id=${bolaoAtual.id}&concurso=${concursoDoBolao}`
    ).then(r => r.json())
    if (!silencioso) setConferindoRes(false)
    if (res.error) { if (!silencioso) setConferirMsg(`❌ ${res.error}`); return }
    setConferirResult(res)
    const min = MIN_ACERTOS[bolaoAtual.loteria || 'mega'] ?? 4
    const msgs: Record<string, string> = {
      ganhamos:     `🏆 GANHAMOS! ${res.maior_premio} — ${res.total_premiadas} aposta(s) premiada(s)`,
      nao_premiada: `😔 Não premiada — nenhuma aposta com ${min} ou mais acertos`,
      nao_apurado:  res.message || `⏳ Sorteio #${concursoDoBolao} ainda não apurado.`,
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
    const cfg   = getLoteria(bolaoAtual.loteria)
    const maxN  = cfg.totalNumeros
    const drawn = cfg.minDezenas  // minDezenas = dezenas sorteadas pela Caixa (6/5/15)
    const nums  = dezenasInput.trim().split(/[\s,;]+/).map(Number).filter(n => n >= 1 && n <= maxN)
    if (nums.length !== drawn) { setConferirMsg(`❌ Informe exatamente ${drawn} dezenas (1–${maxN}) para ${cfg.label}`); return }
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
    const minM = MIN_ACERTOS[bolaoAtual.loteria || 'mega'] ?? 4
    const msgs: Record<string, string> = {
      ganhamos:     `🏆 GANHAMOS! ${res.maior_premio} — ${res.total_premiadas} aposta(s) premiada(s)`,
      nao_premiada: `😔 Não premiada — nenhuma aposta com ${minM} ou mais acertos`,
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
