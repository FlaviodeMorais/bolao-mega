import { useState } from 'react'

export interface Participante {
  id: string; nome: string; cotas: string[]; total: number
  status: string; telefone?: string; criado_em?: string
  acrescimo?: number; acrescimo_pago?: boolean
  [key: string]: unknown
}

interface BolaoRef { id: string; slug: string }

export function useParticipantes(
  bolaoAtual: BolaoRef | null,
  concursoAtivo: string,
  onBoloesChange: () => void,
) {
  // Lista de participantes
  const [partsBolao, setPartsBolao]             = useState<Participante[]>([])
  const [loadingParts, setLoadingParts]         = useState(false)
  const [confirmandoTodos, setConfirmandoTodos] = useState(false)
  const [lembreteMsg, setLembreteMsg]           = useState('')

  // Comprovante
  const [enviandoComp, setEnviandoComp] = useState<string | null>(null)
  const [compMsg, setCompMsg]           = useState('')

  // Seleção para impressão
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())

  // Apostas
  const [uploadingApostas, setUploadingApostas] = useState(false)
  const [apostasMsg, setApostasMsg]             = useState('')
  const [showApostasModal, setShowApostasModal] = useState(false)
  const [apostasTexto, setApostasTexto]         = useState('')

  // Encerramento
  const [showEncerrar, setShowEncerrar] = useState(false)
  const [encerrando, setEncerrando]     = useState(false)
  const [encerrarOk, setEncerrarOk]     = useState<{ acrescimo: number; participantes: number } | null>(null)

  // Derived
  const pagosLista     = partsBolao.filter(p => p.status === 'pago')
  const pendentesLista = partsBolao.filter(p => p.status === 'aguardando')
  const arrecadado     = pagosLista.reduce((s, p) => s + Number(p.total), 0)
  const cotasOcup      = [...new Set(partsBolao.flatMap(p => Array.isArray(p.cotas) ? p.cotas : []))].length

  function limparEstado() {
    setPartsBolao([])
    setShowEncerrar(false)
    setEncerrarOk(null)
    setSelecionados(new Set())
  }

  async function carregarPartsBolao(slug: string, concurso: string) {
    setLoadingParts(true)
    setSelecionados(new Set())
    const res = await fetch(`/api/participantes?concurso=${concurso}&bolao_slug=${slug}`).then(r => r.json())
    setPartsBolao(res.participantes || [])
    setLoadingParts(false)
  }

  async function confirmarPagamento(id: string) {
    await fetch(`/api/participantes/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'pago' }),
    })
    if (bolaoAtual && concursoAtivo) carregarPartsBolao(bolaoAtual.slug, concursoAtivo)
  }

  async function confirmarTodos() {
    const pendentes = partsBolao.filter(p => p.status === 'aguardando')
    if (!pendentes.length) return
    if (!confirm(`Confirmar pagamento de ${pendentes.length} participante(s)?`)) return
    setConfirmandoTodos(true)
    await Promise.all(pendentes.map(p =>
      fetch(`/api/participantes/${p.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'pago' }),
      })
    ))
    if (bolaoAtual && concursoAtivo) await carregarPartsBolao(bolaoAtual.slug, concursoAtivo)
    setConfirmandoTodos(false)
  }

  async function excluir(id: string, nome: string) {
    if (!confirm(`Excluir ${nome}?`)) return
    await fetch(`/api/participantes/${id}`, { method: 'DELETE' })
    if (bolaoAtual && concursoAtivo) carregarPartsBolao(bolaoAtual.slug, concursoAtivo)
  }

  async function confirmarAcrescimo(id: string) {
    await fetch(`/api/participantes/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acrescimo_pago: true }),
    })
    if (bolaoAtual && concursoAtivo) carregarPartsBolao(bolaoAtual.slug, concursoAtivo)
  }

  async function enviarLembrete() {
    setLembreteMsg('Enviando...')
    const res = await fetch('/api/admin/lembrete', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ concurso: parseInt(concursoAtivo), bolao_slug: bolaoAtual?.slug }),
    }).then(r => r.json())
    setLembreteMsg(res.ok ? `✅ Lembrete enviado — ${res.pendentes} pendentes` : '❌ Erro ao enviar')
    setTimeout(() => setLembreteMsg(''), 4000)
  }

  async function enviarComprovante(id: string) {
    if (!bolaoAtual) return
    setEnviandoComp(id); setCompMsg('')
    const res = await fetch('/api/admin/comprovante', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participante_id: id, bolao_slug: bolaoAtual.slug }),
    }).then(r => r.json())
    setEnviandoComp(null)
    setCompMsg(res.ok ? '✅ Comprovante enviado!' : '❌ ' + (res.error || 'Erro ao enviar'))
    setTimeout(() => setCompMsg(''), 4000)
  }

  function toggleSelecionado(id: string) {
    setSelecionados(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function selecionarTodosPagos() {
    setSelecionados(new Set(partsBolao.filter(p => p.status === 'pago').map(p => p.id)))
  }

  function imprimirSelecionados(bolaoSlug: string) {
    const ids = Array.from(selecionados).join(',')
    window.open(`/comprovante?ids=${ids}&bolao=${bolaoSlug}&concurso=${concursoAtivo}`, '_blank')
  }

  async function salvarApostas(bolaoId: string, onRefresh: () => Promise<void>) {
    if (!apostasTexto.trim()) return
    setUploadingApostas(true); setApostasMsg('')
    const res = await fetch('/api/admin/apostas-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: apostasTexto, bolao_id: bolaoId }),
    })
    const data = await res.json()
    setUploadingApostas(false)
    if (res.ok) {
      setApostasMsg(`✅ ${data.total_apostas} apostas carregadas!`)
      setShowApostasModal(false)
      setApostasTexto('')
      await onRefresh()
    } else {
      setApostasMsg(`❌ ${data.error}`)
    }
    setTimeout(() => setApostasMsg(''), 6000)
  }

  async function salvarApostasDirecto(texto: string, bolaoId: string, onRefresh: () => Promise<void>) {
    if (!texto.trim()) return
    setUploadingApostas(true); setApostasMsg('')
    const res = await fetch('/api/admin/apostas-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: texto, bolao_id: bolaoId }),
    })
    const data = await res.json()
    setUploadingApostas(false)
    if (res.ok) {
      setApostasMsg(`✅ ${data.total_apostas} apostas inseridas do gerador!`)
      await onRefresh()
    } else {
      setApostasMsg(`❌ ${data.error}`)
    }
    setTimeout(() => setApostasMsg(''), 6000)
  }

  async function removerApostas(bolaoId: string, onRefresh: () => Promise<void>) {
    if (!confirm('Remover dados das apostas?')) return
    await fetch('/api/admin/apostas-upload', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bolao_id: bolaoId }),
    })
    setApostasMsg('✅ Apostas removidas.')
    setTimeout(() => setApostasMsg(''), 3000)
    await onRefresh()
  }

  async function encerrarBolao(bolaoId: string, bolaoSlug: string) {
    setEncerrando(true)
    const res = await fetch('/api/admin/encerrar-bolao', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bolao_id:   bolaoId,
        bolao_slug: bolaoSlug,
        concurso:   parseInt(concursoAtivo),
      }),
    }).then(r => r.json())
    setEncerrando(false)
    if (res.ok) {
      setShowEncerrar(false)
      setEncerrarOk({ acrescimo: res.acrescimo_por_cota, participantes: res.participantes })
      onBoloesChange()
      await carregarPartsBolao(bolaoSlug, concursoAtivo)
    } else {
      alert('Erro: ' + res.error)
    }
  }

  return {
    partsBolao, loadingParts, confirmandoTodos, lembreteMsg,
    enviandoComp, compMsg,
    selecionados, setSelecionados,
    uploadingApostas, apostasMsg, showApostasModal, setShowApostasModal, apostasTexto, setApostasTexto,
    showEncerrar, setShowEncerrar, encerrando, encerrarOk, setEncerrarOk,
    // Derived
    pagosLista, pendentesLista, arrecadado, cotasOcup,
    // Actions
    limparEstado,
    carregarPartsBolao,
    confirmarPagamento, confirmarTodos, excluir, confirmarAcrescimo,
    enviarLembrete, enviarComprovante,
    toggleSelecionado, selecionarTodosPagos, imprimirSelecionados,
    salvarApostas, salvarApostasDirecto, removerApostas,
    encerrarBolao,
  }
}
