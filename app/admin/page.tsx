'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import styles from './admin.module.css'
import EsporteAdmin from './EsporteAdmin'
import AdminHeader from '@/components/admin/AdminHeader'
import AdminLogin from '@/components/admin/AdminLogin'
import AdminStats from '@/components/admin/AdminStats'
import AdminSenha from '@/components/admin/AdminSenha'
import BolaoList from '@/components/admin/BolaoList'

interface Participante {
  id: string; nome: string; cotas: string[]; total: number
  status: string; telefone?: string; criado_em?: string
  acrescimo?: number; acrescimo_pago?: boolean
}
interface Concurso    { num: number; data: string; premio: string }
interface Bolao       {
  id: string; nome: string; slug: string; valor_cota: number
  total_cotas: number; ativo: boolean; dezenas: number; num_apostas: number
  taxa_admin: number; encerrado: boolean
  apostas_data?: { bets: number[][]; total_apostas: number } | null
  resultado_conferencia?: {
    status: string
    dezenas_sorteadas?: number[]
    dezenas_por_aposta?: number
    resumo?: { senas: number; quinas: number; quadras: number }
    maior_premio?: string | null
    total_premiadas?: number
    apostas_premiadas?: { idx: number; dezenas: number[]; acertos: number; premio: string }[]
    apostas_invalidas?: number
  } | null
}
interface HistoricoItem {
  concurso: number; bolao_slug: string | null; bolao_nome: string
  total: number; pagos: number; pendentes: number; cancelados: number; arrecadado: number
}
interface HistoricoParticipante {
  id: string; nome: string; telefone?: string; cotas: string[]
  total: number; status: string; concurso: number
  bolao_slug: string | null; bolao_nome: string
  acrescimo?: number | null; acrescimo_pago?: boolean
  created_at: string
}

const CAIXA_PRECOS: Record<number, number> = {
  6: 6, 7: 42, 8: 168, 9: 504, 10: 1260,
  11: 2772, 12: 5544, 13: 10296, 14: 18018, 15: 30030,
  16: 48048, 17: 74256, 18: 111384, 19: 162792, 20: 232560,
}

function formatTel(tel?: string): string {
  if (!tel) return '—'
  const n = tel.replace(/\D/g, '').replace(/^55/, '')
  if (n.length === 11) return `(${n.slice(0,2)}) ${n.slice(2,7)}-${n.slice(7)}`
  if (n.length === 10) return `(${n.slice(0,2)}) ${n.slice(2,6)}-${n.slice(6)}`
  return tel
}

function whatsappUrl(tel?: string): string {
  if (!tel) return ''
  const n = tel.replace(/\D/g, '')
  const num = n.startsWith('55') ? n : `55${n}`
  return `https://wa.me/${num}`
}

export default function AdminPage() {
  const [logado, setLogado]   = useState(false)
  const [senha, setSenha]     = useState('')
  const [errLogin, setErrLogin] = useState('')

  // Bolões
  const [boloes, setBoloes]         = useState<Bolao[]>([])
  const [bolaoAtual, setBolaoAtual] = useState<Bolao | null>(null)
  const [linkCopiado, setLinkCopiado]   = useState(false)
  const [renamingId, setRenamingId]     = useState<string | null>(null)
  const [renameVal, setRenameVal]       = useState('')
  const [showCreate, setShowCreate]     = useState(false)
  const [novoNome, setNovoNome]     = useState('')
  const [novoSlug, setNovoSlug]     = useState('')
  const [criando, setCriando]       = useState(false)
  const [criarErro, setCriarErro]   = useState('')

  // Concurso
  const [concursoAtivo, setConcursoAtivo] = useState('')
  const [dataAtiva, setDataAtiva]         = useState('')
  const [premioAtivo, setPremioAtivo]     = useState('')
  const [proximos, setProximos]           = useState<Concurso[]>([])
  const [loadingCaixa, setLoadingCaixa]   = useState(false)

  // Participantes do bolão selecionado
  const [partsBolao, setPartsBolao]           = useState<Participante[]>([])
  const [loadingParts, setLoadingParts]       = useState(false)
  const [confirmandoTodos, setConfirmandoTodos] = useState(false)
  const [lembreteMsg, setLembreteMsg]         = useState('')

  // Encerramento
  const [showEncerrar, setShowEncerrar]   = useState(false)
  const [encerrando, setEncerrando]       = useState(false)
  const [encerrarOk, setEncerrarOk]       = useState<{acrescimo: number, participantes: number} | null>(null)

  // WhatsApp health
  const [waStatus, setWaStatus] = useState<'ok'|'erro'|''>('')
  const [waMsg, setWaMsg]       = useState('')

  // Comprovante
  const [enviandoComp, setEnviandoComp]         = useState<string | null>(null)
  const [compMsg, setCompMsg]                   = useState('')

  // Seleção para impressão
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())

  // Upload apostas
  const [uploadingApostas, setUploadingApostas] = useState(false)
  const [apostasMsg, setApostasMsg]             = useState('')
  const [showApostasModal, setShowApostasModal]   = useState(false)
  const [apostasTexto, setApostasTexto]           = useState('')

  async function salvarApostas() {
    if (!bolaoAtual || !apostasTexto.trim()) return
    setUploadingApostas(true); setApostasMsg('')
    const res = await fetch('/api/admin/apostas-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: apostasTexto, bolao_id: bolaoAtual.id }),
    })
    const data = await res.json()
    setUploadingApostas(false)
    if (res.ok) {
      setApostasMsg(`✅ ${data.total_apostas} apostas carregadas!`)
      setShowApostasModal(false)
      setApostasTexto('')
      await carregarBoloes() // atualiza bolaoAtual com apostas_data novo
    } else {
      setApostasMsg(`❌ ${data.error}`)
    }
    setTimeout(() => setApostasMsg(''), 6000)
  }

  async function removerApostas() {
    if (!bolaoAtual || !confirm('Remover dados das apostas?')) return
    await fetch('/api/admin/apostas-upload', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bolao_id: bolaoAtual.id }),
    })
    setApostasMsg('✅ Apostas removidas.')
    setTimeout(() => setApostasMsg(''), 3000)
    await carregarBoloes() // atualiza bolaoAtual sem apostas_data
  }

  function toggleSelecionado(id: string) {
    setSelecionados(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function selecionarTodosPagos() {
    const pagos = partsBolao.filter(p => p.status === 'pago').map(p => p.id)
    setSelecionados(new Set(pagos))
  }

  function imprimirSelecionados() {
    const ids    = Array.from(selecionados).join(',')
    const bolao  = bolaoAtual?.slug || ''
    const conc   = concursoAtivo || ''
    window.open(`/comprovante?ids=${ids}&bolao=${bolao}&concurso=${conc}`, '_blank')
  }

  // Resultado do sorteio


  // Conferência do sorteio
  const [showConferir, setShowConferir]         = useState(false)
  const [conferindoRes, setConferindoRes]       = useState(false)
  const [conferirMsg, setConferirMsg]           = useState('')
  const [dezenasInput, setDezenasInput]         = useState('')
  const [conferindoManual, setConferindoManual] = useState(false)
  const [conferirResult, setConferirResult]     = useState<{
    status: string; dezenas_sorteadas: number[];
    resumo: { senas: number; quinas: number; quadras: number };
    maior_premio: string | null; total_premiadas: number;
    apostas_premiadas: { idx: number; dezenas: number[]; acertos: number; premio: string }[]
  } | null>(null)
  const conferirAutoRef = useRef<ReturnType<typeof setInterval> | null>(null)

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

    // Auto-sync: quando ainda não apurado, recheck a cada 5 minutos
    if (res.status === 'nao_apurado') {
      if (!conferirAutoRef.current) {
        conferirAutoRef.current = setInterval(() => conferirSorteio(true), 5 * 60 * 1000)
      }
    } else {
      if (conferirAutoRef.current) { clearInterval(conferirAutoRef.current); conferirAutoRef.current = null }
      // Resultado final — sincroniza card do bolão (badge) com o que foi salvo no banco
      carregarBoloes()
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
    if (conferirAutoRef.current) { clearInterval(conferirAutoRef.current); conferirAutoRef.current = null }
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
    if (conferirAutoRef.current) { clearInterval(conferirAutoRef.current); conferirAutoRef.current = null }
    const msgs: Record<string, string> = {
      ganhamos:     `🏆 GANHAMOS! ${res.maior_premio} — ${res.total_premiadas} aposta(s) premiada(s)`,
      nao_premiada: `😔 Não premiada — nenhuma aposta com 4 ou mais acertos`,
    }
    setConferirMsg(msgs[res.status] || `Status: ${res.status}`)
    carregarBoloes()
  }

  useEffect(() => () => { if (conferirAutoRef.current) clearInterval(conferirAutoRef.current) }, [])

  // Configurador
  const [showConfig, setShowConfig]   = useState(false)
  const [editDezenas, setEditDezenas] = useState(6)
  const [editApostas, setEditApostas] = useState(1)
  const [editDatas, setEditDatas]     = useState<Record<number, string>>({})
  const [editCotas, setEditCotas]     = useState(20)
  const [editTaxa, setEditTaxa]       = useState(0)
  const [salvando, setSalvando]       = useState(false)
  const [configSalva, setConfigSalva] = useState(false)

  // Histórico
  const [historico, setHistorico]               = useState<HistoricoItem[]>([])
  const [showHistorico, setShowHistorico]       = useState(false)
  const [modoHistorico, setModoHistorico]       = useState<'resumo'|'participantes'>('resumo')
  const [histParticipantes, setHistParticipantes] = useState<HistoricoParticipante[]>([])
  const [histFiltroConc, setHistFiltroConc]     = useState('')
  const [histFiltroSlug, setHistFiltroSlug]     = useState('')
  const [histBusca, setHistBusca]               = useState('')
  const [loadingHist, setLoadingHist]           = useState(false)
  const [msgConvite, setMsgConvite]             = useState('')

  // KPIs
  interface KpiVisaoGeral {
    totalArrecadado: number; totalParticipantes: number; ticketMedio: number
    taxaConversao: number; totalCotas: number; totalPagos: number
    totalPendentes: number; totalConcursos: number; taxaRetencao: number
  }
  interface KpiConcurso { concurso: number; arrecadado: number; pagos: number; total: number }
  interface KpiPart { nome: string; telefone?: string; concursos: number; totalGasto: number; totalCotas: number; pagamentos: number }
  interface KpiCota  { cota: string; count: number }
  const [showKpi, setShowKpi]               = useState(false)
  const [loadingKpi, setLoadingKpi]         = useState(false)
  const [kpiGeral, setKpiGeral]             = useState<KpiVisaoGeral | null>(null)
  const [kpiConcursos, setKpiConcursos]     = useState<KpiConcurso[]>([])
  const [kpiFreq, setKpiFreq]               = useState<KpiPart[]>([])
  const [kpiGasto, setKpiGasto]             = useState<KpiPart[]>([])
  const [kpiCotas, setKpiCotas]             = useState<KpiCota[]>([])
  const [kpiAba, setKpiAba]                 = useState<'freq'|'gasto'|'cotas'>('freq')

  async function carregarKpis() {
    setLoadingKpi(true)
    const d = await fetch('/api/admin/kpis').then(r => r.json())
    setKpiGeral(d.visaoGeral)
    setKpiConcursos(d.porConcurso || [])
    setKpiFreq(d.topFrequencia || [])
    setKpiGasto(d.topGasto || [])
    setKpiCotas(d.cotasPopulares || [])
    setLoadingKpi(false)
    setShowKpi(true)
  }

  // ── AUTH ──────────────────────────────────────────────────────
  async function login() {
    const res = await fetch('/api/auth', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senha }),
    })
    if (res.ok) { setLogado(true); setErrLogin(''); carregarInicio() }
    else setErrLogin('Senha incorreta.')
  }

  // ── DADOS ─────────────────────────────────────────────────────
  async function carregarBoloes() {
    const res = await fetch('/api/boloes').then(r => r.json())
    const lista = res.boloes || []
    setBoloes(lista)
    // Atualiza bolaoAtual com dados frescos (apostas_data, resultado_conferencia, etc.)
    if (bolaoAtual) {
      const atualizado = lista.find((b: Bolao) => b.id === bolaoAtual.id)
      if (atualizado) setBolaoAtual(atualizado)
    }
  }

  const carregarInicio = useCallback(async () => {
    const [b, ca] = await Promise.all([
      fetch('/api/boloes').then(r => r.json()),
      fetch('/api/concurso-ativo').then(r => r.json()),
    ])
    setBoloes(b.boloes || [])
    setConcursoAtivo(ca.concurso || '')
    setDataAtiva(ca.data || '')
    setPremioAtivo(ca.premio || '')
  }, [])

  useEffect(() => { if (logado) carregarInicio() }, [logado, carregarInicio])

  useEffect(() => {
    if (!logado) return
    const checarWA = () => fetch('/api/whatsapp/health').then(r => r.json())
      .then(d => { setWaStatus(d.connected ? 'ok' : 'erro'); setWaMsg(d.msg || '') })
      .catch(() => { setWaStatus('erro'); setWaMsg('Sem resposta do Whapi') })
    checarWA()
    const id = setInterval(checarWA, 30000)
    return () => clearInterval(id)
  }, [logado])

  async function carregarPartsBolao(slug: string, concurso: string) {
    setLoadingParts(true)
    setSelecionados(new Set())
    const res = await fetch(`/api/participantes?concurso=${concurso}&bolao_slug=${slug}`).then(r => r.json())
    setPartsBolao(res.participantes || [])
    setLoadingParts(false)
  }

  // ── BOLÕES ────────────────────────────────────────────────────
  function selecionarBolao(b: Bolao) {
    setBolaoAtual(b)
    setEditDezenas(b.dezenas || 6)
    setEditApostas(b.num_apostas || 1)
    setEditCotas(b.total_cotas || 20)
    setEditTaxa(Number(b.taxa_admin) || 0)
    setConfigSalva(false)
    setShowConfig(false)
    setPartsBolao([])
    if (conferirAutoRef.current) { clearInterval(conferirAutoRef.current); conferirAutoRef.current = null }

    // Restaura resultado salvo no banco ao trocar de bolão
    const rc = b.resultado_conferencia
    if (rc && rc.status !== 'nao_apurado') {
      setConferirResult(rc as Parameters<typeof setConferirResult>[0])
      const msgs: Record<string, string> = {
        ganhamos:     `🏆 GANHAMOS! ${rc.maior_premio} — ${rc.total_premiadas ?? rc.apostas_premiadas?.length ?? 0} aposta(s) premiada(s)`,
        nao_premiada: '😔 Não premiada — nenhuma aposta com 4 ou mais acertos',
      }
      setConferirMsg(msgs[rc.status] || '')
    } else {
      setConferirResult(null)
      setConferirMsg('')
    }

    if (concursoAtivo) carregarPartsBolao(b.slug, concursoAtivo)
  }

  function fecharBolao() {
    setBolaoAtual(null); setPartsBolao([])
    setShowConfig(false); setConfigSalva(false)
    setShowEncerrar(false); setEncerrarOk(null)
  }

  async function encerrarBolao() {
    if (!bolaoAtual) return
    setEncerrando(true)
    const res = await fetch('/api/admin/encerrar-bolao', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        bolao_id:   bolaoAtual.id,
        bolao_slug: bolaoAtual.slug,
        concurso:   parseInt(concursoAtivo),
      }),
    }).then(r => r.json())
    setEncerrando(false)
    if (res.ok) {
      setShowEncerrar(false)
      setEncerrarOk({ acrescimo: res.acrescimo, participantes: res.participantes })
      await carregarBoloes()
      await carregarPartsBolao(bolaoAtual.slug, concursoAtivo)
    } else {
      alert('Erro: ' + res.error)
    }
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

  async function confirmarAcrescimo(id: string) {
    await fetch(`/api/participantes/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acrescimo_pago: true }),
    })
    if (bolaoAtual && concursoAtivo) carregarPartsBolao(bolaoAtual.slug, concursoAtivo)
  }

  function copiarLink(slug: string) {
    navigator.clipboard.writeText(`${window.location.origin}/${slug}`)
      .then(() => { setLinkCopiado(true); setTimeout(() => setLinkCopiado(false), 2000) })
  }

  async function renomearBolao(id: string) {
    const nome = renameVal.trim()
    if (!nome) return
    const res = await fetch('/api/boloes', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, nome }),
    }).then(r => r.json())
    if (res.error) { alert('❌ ' + res.error); return }
    setRenamingId(null)
    await carregarBoloes()
  }

  async function cancelarBolao(b: Bolao) {
    const acao = b.ativo ? 'cancelar' : 'reativar'
    if (!confirm(`Deseja ${acao} o bolão "${b.nome}"?`)) return
    await fetch('/api/boloes', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: b.id, ativo: !b.ativo }),
    })
    await carregarBoloes()
    if (bolaoAtual?.id === b.id) fecharBolao()
  }

  async function excluirBolao(b: Bolao, force = false) {
    const aviso = force
      ? `⚠️ ATENÇÃO: Excluir "${b.nome}" junto com TODOS os participantes e histórico?\n\nEsta ação é irreversível.`
      : `Excluir permanentemente "${b.nome}"?\n\nEsta ação não pode ser desfeita.`
    if (!confirm(aviso)) return

    const res = await fetch('/api/boloes', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: b.id, force }),
    }).then(r => r.json())

    if (res.error && res.count > 0 && !force) {
      // Oferece exclusão forçada com aviso extra
      const confirmarForce = confirm(
        `❌ Este bolão tem ${res.count} participante(s) no histórico.\n\n` +
        `Deseja excluir o bolão E todos os participantes permanentemente?\n\n` +
        `(Isso remove o histórico completo deste bolão)`
      )
      if (confirmarForce) excluirBolao(b, true)
      return
    }

    if (res.error) { alert('❌ ' + res.error); return }
    await carregarBoloes()
    if (bolaoAtual?.id === b.id) fecharBolao()
  }

  async function criarBolao() {
    if (!novoNome || !novoSlug) return
    setCriando(true); setCriarErro('')
    const res = await fetch('/api/boloes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: novoNome, slug: novoSlug }),
    }).then(r => r.json())
    setCriando(false)
    if (res.error) { setCriarErro('❌ ' + res.error); return }
    await carregarBoloes()
    setNovoNome(''); setNovoSlug(''); setShowCreate(false); setCriarErro('')
  }

  // ── PARTICIPANTES ─────────────────────────────────────────────
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

  async function enviarLembrete() {
    setLembreteMsg('Enviando...')
    const res = await fetch('/api/admin/lembrete', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ concurso: parseInt(concursoAtivo), bolao_slug: bolaoAtual?.slug }),
    }).then(r => r.json())
    setLembreteMsg(res.ok ? `✅ Lembrete enviado — ${res.pendentes} pendentes` : '❌ Erro ao enviar')
    setTimeout(() => setLembreteMsg(''), 4000)
  }

  // ── CONFIGURADOR ──────────────────────────────────────────────
  async function salvarConfig() {
    if (!bolaoAtual) return
    setSalvando(true)
    const preco = CAIXA_PRECOS[editDezenas] ?? 6
    const custo = editApostas * preco
    const valor = editCotas > 0 ? parseFloat(((custo + editTaxa) / editCotas).toFixed(2)) : 0
    await fetch('/api/boloes', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: bolaoAtual.id, dezenas: editDezenas, num_apostas: editApostas,
        total_cotas: editCotas, taxa_admin: editTaxa, valor_cota: valor,
      }),
    })
    await carregarBoloes()
    setSalvando(false); setConfigSalva(true)
    setTimeout(() => setConfigSalva(false), 3000)
  }

  // ── CONCURSO ──────────────────────────────────────────────────
  async function buscarCaixa() {
    setLoadingCaixa(true)
    try {
      const API = 'https://servicebus2.caixa.gov.br/portaldeloterias/api/megasena'
      let data: Record<string, unknown>
      try { data = await fetch(API).then(r => r.json()) }
      catch {
        const w = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(API)}`).then(r => r.json())
        data = JSON.parse(w.contents as string)
      }
      const ultimo   = parseInt(String(data.numero || data.numeroConcurso || 0))
      const proxData = String(data.dataProximoConcurso || '')
      const premioVal = data.valorEstimadoProximoConcurso as number
      const d1 = parseBRDate(proxData)
      const d2 = d1 ? nextDrawDate(d1) : null
      const d3 = d2 ? nextDrawDate(d2) : null
      setProximos([
        { num: ultimo+1, data: formatData(d1), premio: premioVal ? formatPremio(premioVal) : '—' },
        { num: ultimo+2, data: formatData(d2), premio: 'Acumulando' },
        { num: ultimo+3, data: formatData(d3), premio: 'Acumulando' },
      ])
    } finally { setLoadingCaixa(false) }
  }

  async function selecionarConcurso(c: Concurso) {
    await fetch('/api/concurso-ativo', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ concurso: c.num, data: c.data, premio: c.premio }),
    })
    setConcursoAtivo(String(c.num)); setDataAtiva(c.data); setPremioAtivo(c.premio)
    if (bolaoAtual) carregarPartsBolao(bolaoAtual.slug, String(c.num))
  }

  async function carregarHistorico() {
    setLoadingHist(true)
    const res = await fetch('/api/historico').then(r => r.json())
    setHistorico(res.historico || [])
    setShowHistorico(true); setLoadingHist(false)
  }

  async function carregarHistParticipantes() {
    setLoadingHist(true)
    const params = new URLSearchParams({ detalhes: '1' })
    if (histFiltroConc) params.set('concurso', histFiltroConc)
    if (histFiltroSlug) params.set('bolao', histFiltroSlug)
    const res = await fetch(`/api/historico?${params}`).then(r => r.json())
    setHistParticipantes(res.participantes || [])
    setLoadingHist(false)
  }

  async function enviarConviteNovoBolao(tel: string, nome: string) {
    if (!tel) return
    const n = tel.replace(/\D/g, '')
    const num = n.startsWith('55') ? n : `55${n}`
    const bolaoAtivo = boloes.find(b => b.ativo)
    const origem = typeof window !== 'undefined' ? window.location.origin : ''
    const link = bolaoAtivo ? `${origem}/${bolaoAtivo.slug}` : origem
    const trevo = '\u{1F340}'
    const msg = msgConvite ||
      `${trevo} Olá ${nome}! Temos um novo bolão disponível para o concurso #${concursoAtivo}.\n\nAcesse: ${link}\n\nBoa sorte!`
    window.open(`https://wa.me/${num}?text=${encodeURIComponent(msg)}`, '_blank')
  }

  // ── COMPUTED ──────────────────────────────────────────────────
  const pagosLista    = partsBolao.filter(p => p.status === 'pago')
  const pendentesLista = partsBolao.filter(p => p.status === 'aguardando')
  const arrecadado    = pagosLista.reduce((s, p) => s + Number(p.total), 0)
  const cotasOcup     = [...new Set(partsBolao.flatMap(p => Array.isArray(p.cotas) ? p.cotas : []))].length
  const cotasLivres   = (bolaoAtual?.total_cotas || 20) - cotasOcup

  const precoCaixa   = CAIXA_PRECOS[editDezenas] ?? 6
  const custoApostas = editApostas * precoCaixa
  const totalBolao   = custoApostas + editTaxa
  const valorPorCota = editCotas > 0 ? totalBolao / editCotas : 0

  // ── LOGIN ─────────────────────────────────────────────────────
  if (!logado) return (
    <AdminLogin
      senha={senha}
      errLogin={errLogin}
      onSenhaChange={setSenha}
      onLogin={login}
    />
  )

  // ── MAIN ──────────────────────────────────────────────────────
  return (
    <div className={styles.wrap}>
      <AdminHeader
        concursoAtivo={concursoAtivo}
        waStatus={waStatus}
        waMsg={waMsg}
      />

      <div className={styles.content}>

        {/* ── STATS ── */}
        <AdminStats
          bolaoAtual={bolaoAtual}
          pagosLista={pagosLista}
          pendentesLista={pendentesLista}
          arrecadado={arrecadado}
          concursoAtivo={concursoAtivo}
          dataAtiva={dataAtiva}
          premioAtivo={premioAtivo}
          boloesAtivosCount={boloes.filter(b => b.ativo).length}
        />

        {/* ── GRID PRINCIPAL ── */}
        <div className={styles.adminGrid}>

          {/* ── ESQUERDA: BOLÕES ── */}
          <div className={styles.leftPanel}>
            <BolaoList
              boloes={boloes}
              bolaoAtualId={bolaoAtual?.id ?? null}
              linkCopiado={linkCopiado}
              renamingId={renamingId}
              renameVal={renameVal}
              onRenameValChange={setRenameVal}
              showCreate={showCreate}
              novoNome={novoNome}
              novoSlug={novoSlug}
              criando={criando}
              criarErro={criarErro}
              onNovoNomeChange={setNovoNome}
              onNovoSlugChange={setNovoSlug}
              onShowCreateToggle={v => { setShowCreate(v); if (!v) { setNovoNome(''); setNovoSlug(''); setCriarErro('') } }}
              actions={{
                onSelecionar: selecionarBolao,
                onCopiarLink: copiarLink,
                onCancelar: cancelarBolao,
                onExcluir: excluirBolao,
                onRenomear: id => { setRenamingId(id); setRenameVal(boloes.find(b => b.id === id)?.nome ?? '') },
                onRenomearConfirm: renomearBolao,
                onRenomearCancel: () => setRenamingId(null),
                onCriar: criarBolao,
              }}
            />
          </div>

          {/* ── DIREITA: DETALHE DO BOLÃO ou CONCURSOS ── */}
          <div className={styles.rightPanel}>
            {bolaoAtual ? (

              /* ── DETALHE DO BOLÃO ── */
              <div className={styles.panel}>

                {/* Header */}
                <div className={styles.detHeader}>
                  <div>
                    <div className={styles.detNome}>{bolaoAtual.nome}</div>
                    <div className={styles.detSub}>
                      #{concursoAtivo || '?'} · {typeof window !== 'undefined' ? window.location.host : ''}/<wbr/>{bolaoAtual.slug}
                    </div>
                  </div>
                  <button type="button" className={styles.btnFechar} onClick={fecharBolao} title="Fechar">✕</button>
                </div>

                {/* Stats do bolão */}
                <div className={styles.detStatsRow}>
                  <div className={styles.detStat}>
                    <div className={styles.detStatVal}>{cotasLivres}/{bolaoAtual.total_cotas || 20}</div>
                    <div className={styles.detStatLbl}>Cotas Livres</div>
                  </div>
                  <div className={styles.detStat}>
                    <div className={styles.detStatVal}>{pagosLista.length}</div>
                    <div className={styles.detStatLbl}>Pagos</div>
                  </div>
                  <div className={`${styles.detStat} ${pendentesLista.length > 0 ? styles.detStatWarn : ''}`}>
                    <div className={styles.detStatVal}>{pendentesLista.length}</div>
                    <div className={styles.detStatLbl}>Pendentes</div>
                  </div>
                  <div className={styles.detStat}>
                    <div className={styles.detStatVal}>R$ {arrecadado.toFixed(2).replace('.',',')}</div>
                    <div className={styles.detStatLbl}>Arrecadado</div>
                  </div>
                </div>

                {/* Ações rápidas */}
                <div className={styles.detActions}>
                  <button type="button" className={styles.btnLoad}
                    onClick={() => carregarPartsBolao(bolaoAtual.slug, concursoAtivo)}
                    disabled={loadingParts}>
                    {loadingParts ? '⟳' : '🔄'} Atualizar
                  </button>
                  {pendentesLista.length > 0 && (
                    <button type="button" className={styles.btnConfirmAll}
                      onClick={confirmarTodos} disabled={confirmandoTodos}>
                      {confirmandoTodos ? 'Confirmando...' : `✔ Confirmar todos (${pendentesLista.length})`}
                    </button>
                  )}
                  <button type="button" className={styles.btnWhatsapp} onClick={enviarLembrete}>
                    📱 Lembrete
                  </button>
                  <button type="button" className={styles.btnConferir}
                    onClick={() => { setShowConferir(!showConferir); setConferirMsg('') }}>
                    🔍 Conferir
                  </button>
                  {/* Apostas */}
                  <button type="button" className={styles.btnUploadApostas}
                    onClick={() => setShowApostasModal(true)}
                    title="Colar texto das apostas">
                    {bolaoAtual?.apostas_data ? '📊 Apostas ✅' : '📊 Carregar Apostas'}
                  </button>
                  {bolaoAtual?.apostas_data && (
                    <button type="button" className={styles.btnRemoverApostas} onClick={removerApostas} title="Remover apostas">✕</button>
                  )}
                </div>
                {apostasMsg && <div className={styles.lembreteMsg}>{apostasMsg}</div>}

                {/* Modal apostas */}
                {showApostasModal && (
                  <div className={styles.apostasModal}>
                    <div className={styles.apostasModalBox}>
                      <div className={styles.apostasModalTitle}>📊 Carregar Apostas</div>
                      <p className={styles.apostasModalDesc}>
                        Cole abaixo o texto com os números das apostas.<br />
                        Formato aceito: <strong>{bolaoAtual?.dezenas ?? 6} números por linha</strong>, separados por espaço — ex:{' '}
                        <code>{Array.from({length: bolaoAtual?.dezenas ?? 6}, (_, i) => String(i + 1).padStart(2, '0')).join(' ')}</code>
                      </p>
                      <textarea
                        className={styles.apostasTextarea}
                        placeholder="Cole aqui os números das apostas..."
                        value={apostasTexto}
                        onChange={e => setApostasTexto(e.target.value)}
                        rows={8}
                      />
                      <div className={styles.apostasModalActions}>
                        <button type="button" className={styles.btnLoad}
                          onClick={() => { setShowApostasModal(false); setApostasTexto('') }}>
                          Cancelar
                        </button>
                        <button type="button" className={styles.btnConfirmAll}
                          onClick={salvarApostas} disabled={uploadingApostas || !apostasTexto.trim()}>
                          {uploadingApostas ? '⟳ Processando...' : '✔ Confirmar'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Panel conferência do sorteio — automático via API Caixa */}
                {showConferir && (
                  <div className={styles.resultadoPanel}>
                    <div className={styles.resultadoTitle}>🔍 Conferir Resultado — Concurso #{concursoAtivo}</div>
                    {bolaoAtual.apostas_data ? (
                      <p className={styles.resultadoInfo}>
                        ✅ {bolaoAtual.apostas_data.total_apostas} apostas carregadas · O resultado será buscado automaticamente na Caixa.
                      </p>
                    ) : (
                      <p className={styles.resultadoInfo}>
                        ⚠️ Nenhuma aposta carregada. Use &quot;📊 Carregar Apostas&quot; primeiro.
                      </p>
                    )}
                    <div className={styles.resultadoBtns}>
                      {/* Oculta busca quando já há resultado final para evitar sobrescrever */}
                      {(!conferirResult || conferirResult.status === 'nao_apurado') && (
                        <button type="button" className={styles.btnGanhou}
                          onClick={() => conferirSorteio()}
                          disabled={conferindoRes || !bolaoAtual.apostas_data}>
                          {conferindoRes ? '⟳ Buscando na Caixa...' : '🔍 Buscar e Conferir'}
                        </button>
                      )}
                      {conferirResult && conferirResult.status !== 'nao_apurado' && (
                        <button type="button" className={styles.btnNaoGanhou} onClick={resetarConferencia}>
                          ↺ Resetar resultado
                        </button>
                      )}
                    </div>
                    {conferirResult?.dezenas_sorteadas && (
                      <div className={styles.conferirDezenas}>
                        <span className={styles.conferirResumoTitle}>Dezenas sorteadas:</span>
                        <div className={styles.conferirDezGrid}>
                          {conferirResult.dezenas_sorteadas.map((n: number) => (
                            <span key={n} className={styles.conferirDezBall}>{String(n).padStart(2,'0')}</span>
                          ))}
                        </div>
                      </div>
                    )}
                    {conferirMsg && (
                      <div className={conferirResult?.status === 'ganhamos' ? styles.resultadoMsgBox : styles.resultadoInfo}>
                        {conferirMsg}
                      </div>
                    )}
                    {/* Entrada manual — usada quando API Caixa não responde (ex: Vercel fora do Brasil) */}
                    {(!conferirResult || conferirResult.status === 'nao_apurado') && bolaoAtual.apostas_data && (
                      <div className={styles.manualEntry}>
                        <div className={styles.manualLabel}>Inserir dezenas manualmente:</div>
                        <div className={styles.manualRow}>
                          <input
                            type="text"
                            className={styles.manualInput}
                            placeholder="Ex: 03 30 33 35 45 47"
                            value={dezenasInput}
                            onChange={e => setDezenasInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && conferirManual()}
                          />
                          <button type="button" className={styles.btnGanhou}
                            onClick={conferirManual}
                            disabled={conferindoManual || !dezenasInput.trim()}>
                            {conferindoManual ? '⟳' : '✓ Conferir'}
                          </button>
                        </div>
                      </div>
                    )}
                    {conferirResult && conferirResult.total_premiadas > 0 && (
                      <div className={styles.conferirResumo}>
                        <div className={styles.conferirResumoTitle}>Apostas premiadas:</div>
                        {(['SENA','QUINA','QUADRA'] as const).map(p => {
                          const key = p === 'SENA' ? 'senas' : p === 'QUINA' ? 'quinas' : 'quadras'
                          const count = conferirResult.resumo[key as keyof typeof conferirResult.resumo]
                          return count > 0 ? (
                            <div key={p} className={styles.conferirPremio}>
                              {p === 'SENA' ? '🥇' : p === 'QUINA' ? '🥈' : '🥉'} {p}: {count} aposta{count !== 1 ? 's' : ''}
                            </div>
                          ) : null
                        })}
                        <div className={styles.conferirApostas}>
                          {conferirResult.apostas_premiadas.slice(0,10).map(a => (
                            <div key={a.idx} className={styles.conferirAposta}>
                              <span className={styles.conferirIdx}>#{a.idx}</span>
                              <span className={styles.conferirDez}>{a.dezenas.map((n: number) => String(n).padStart(2,'0')).join(' ')}</span>
                              <span className={styles.conferirPremioTag}>{a.acertos}✓ {a.premio}</span>
                            </div>
                          ))}
                          {conferirResult.apostas_premiadas.length > 10 && (
                            <div className={styles.conferirInfo}>…e mais {conferirResult.apostas_premiadas.length - 10} apostas premiadas</div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {!bolaoAtual.encerrado && cotasLivres > 0 && pagosLista.length > 0 && (
                  <button type="button" className={styles.btnEncerrar}
                    onClick={() => { setShowEncerrar(!showEncerrar); setEncerrarOk(null) }}>
                    ⛔ Encerrar Bolão
                  </button>
                )}
                {lembreteMsg && <div className={styles.lembreteMsg}>{lembreteMsg}</div>}
                {compMsg && <div className={styles.lembreteMsg}>{compMsg}</div>}

                {/* Banner encerrado */}
                {bolaoAtual.encerrado && (
                  <div className={styles.encerradoBanner}>
                    ⛔ Bolão encerrado — complemento de pagamento enviado via WhatsApp
                  </div>
                )}

                {/* Encerramento confirmado */}
                {encerrarOk && (
                  <div className={styles.encerrarSucesso}>
                    ✅ Encerrado com sucesso!&nbsp;
                    Acréscimo de <strong>R$ {encerrarOk.acrescimo.toFixed(2).replace('.',',')}</strong>&nbsp;
                    enviado para {encerrarOk.participantes} participante(s) via WhatsApp.
                  </div>
                )}

                {/* Painel de confirmação de encerramento */}
                {showEncerrar && !bolaoAtual.encerrado && (
                  <div className={styles.encerrarPanel}>
                    <div className={styles.encerrarTitle}>⚠️ Encerrar Bolão com Rateio</div>
                    <div className={styles.encerrarCalc}>
                      <div className={styles.encerrarRow}>
                        <span>Cotas não vendidas</span>
                        <span>{cotasLivres} de {bolaoAtual.total_cotas || 20}</span>
                      </div>
                      <div className={styles.encerrarRow}>
                        <span>Valor das cotas restantes</span>
                        <span>R$ {(cotasLivres * Number(bolaoAtual.valor_cota)).toFixed(2).replace('.',',')}</span>
                      </div>
                      <div className={styles.encerrarRow}>
                        <span>Participantes pagos</span>
                        <span>{pagosLista.length}</span>
                      </div>
                      <div className={`${styles.encerrarRow} ${styles.encerrarDestaque}`}>
                        <span>Acréscimo por participante</span>
                        <span>R$ {pagosLista.length > 0
                          ? ((cotasLivres * Number(bolaoAtual.valor_cota)) / pagosLista.length).toFixed(2).replace('.',',')
                          : '0,00'}
                        </span>
                      </div>
                    </div>
                    <div className={styles.encerrarInfo}>
                      ✅ Cada participante receberá um PIX com o complemento via WhatsApp.<br/>
                      ✅ O bolão será marcado como encerrado.<br/>
                      ⛔ Novos cadastros serão bloqueados.
                    </div>
                    <div className={styles.encerrarActions}>
                      <button type="button" className={styles.btnEncerrarConfirm}
                        onClick={encerrarBolao} disabled={encerrando}>
                        {encerrando ? '⟳ Processando...' : '⛔ Confirmar Encerramento'}
                      </button>
                      <button type="button" className={styles.btnLoad}
                        onClick={() => setShowEncerrar(false)}>Cancelar</button>
                    </div>
                  </div>
                )}

                {/* Lista de participantes */}
                <div className={styles.partSectionHeader}>
                  <div className={styles.partSectionTitle}>
                    👥 Participantes — {partsBolao.length} cadastrado{partsBolao.length !== 1 ? 's' : ''}
                  </div>
                  {partsBolao.some(p => p.status === 'pago') && (
                    <button type="button" className={styles.btnSelAll}
                      onClick={selecionarTodosPagos}
                      title="Selecionar todos os participantes pagos">
                      ☑ Selecionar pagos
                    </button>
                  )}
                </div>

                {/* Barra de seleção */}
                {selecionados.size > 0 && (
                  <div className={styles.selecaoBar}>
                    <span className={styles.selecaoCount}>
                      {selecionados.size} selecionado{selecionados.size !== 1 ? 's' : ''}
                    </span>
                    <button type="button" className={styles.btnImprimirSel}
                      onClick={imprimirSelecionados}>
                      🖨️ Imprimir / PDF
                    </button>
                    <button type="button" className={styles.btnLimparSel}
                      onClick={() => setSelecionados(new Set())}>
                      ✕ Limpar seleção
                    </button>
                  </div>
                )}

                {loadingParts ? (
                  <div className={styles.empty}>Carregando...</div>
                ) : partsBolao.length === 0 ? (
                  <div className={styles.empty}>Nenhum participante neste bolão para o concurso #{concursoAtivo || '?'}</div>
                ) : partsBolao.map(p => (
                  <div key={p.id} className={`${styles.partCard} ${p.status === 'pago' ? styles.partCardPago : p.status === 'cancelado' ? styles.partCardCancel : ''} ${selecionados.has(p.id) ? styles.partCardSelecionado : ''}`}>
                    {p.status === 'pago' && (
                      <input
                        type="checkbox"
                        className={styles.partCardCheck}
                        checked={selecionados.has(p.id)}
                        onChange={() => toggleSelecionado(p.id)}
                        title="Selecionar para imprimir"
                      />
                    )}
                    <div className={styles.partCardLeft}>
                      <div className={styles.partCardNome}>{p.nome}</div>
                      <div className={styles.partCardTel}>
                        {p.telefone ? (
                          <a href={whatsappUrl(p.telefone)} target="_blank" rel="noopener noreferrer"
                             title={`Abrir WhatsApp — ${formatTel(p.telefone)}`}
                             className={styles.whatsappLink}>
                            📱 {formatTel(p.telefone)}
                          </a>
                        ) : '—'}
                      </div>
                      <div className={styles.partCardInfo}>
                        <span className={styles.partCardCotas}>
                          🎟️ {Array.isArray(p.cotas) ? p.cotas.join(', ') : p.cotas}
                        </span>
                        <span className={styles.partCardTotal}>
                          R$ {Number(p.total).toFixed(2).replace('.',',')}
                        </span>
                      </div>
                    </div>
                    <div className={styles.partCardRight}>
                      <div className={styles.partCardStatusCol}>
                        {/* Comprovante */}
                        {p.status === 'pago' && (
                          <button type="button" className={styles.btnImprimir}
                            onClick={() => window.open(`/comprovante?id=${p.id}`, '_blank')}
                            title="Imprimir comprovante">
                            🖨️
                          </button>
                        )}
                        {p.status === 'pago' && p.telefone && (
                          <button type="button" className={styles.btnComprovante}
                            onClick={() => enviarComprovante(p.id)}
                            disabled={enviandoComp === p.id}
                            title="Enviar comprovante via WhatsApp">
                            {enviandoComp === p.id ? '⟳' : '📋'}
                          </button>
                        )}
                        {/* Status principal */}
                        {p.status === 'pago'
                          ? <span className={styles.statusPago}>✅ Pago</span>
                          : p.status === 'cancelado'
                            ? <span className={styles.statusCancel}>✕ Excluído</span>
                            : <>
                                <span className={styles.statusPend}>⏳ Pendente</span>
                                <button type="button" className={styles.btnConfirm}
                                  onClick={() => confirmarPagamento(p.id)}>✔ Pago</button>
                              </>
                        }
                        {/* Acréscimo */}
                        {p.acrescimo != null && (
                          <div className={styles.acrescimoRow}>
                            <span className={styles.acrescimoLbl}>
                              +R$ {Number(p.acrescimo).toFixed(2).replace('.',',')} complemento
                            </span>
                            {p.acrescimo_pago
                              ? <span className={styles.statusPago}>✅ Pago</span>
                              : <>
                                  <span className={styles.statusPend}>⏳</span>
                                  <button type="button" className={styles.btnConfirm}
                                    onClick={() => confirmarAcrescimo(p.id)}>✔ Confirmar</button>
                                </>
                            }
                          </div>
                        )}
                      </div>
                      {p.status !== 'cancelado' && (
                        <button type="button" className={styles.btnExcluir}
                          onClick={() => excluir(p.id, p.nome)}>✕</button>
                      )}
                    </div>
                  </div>
                ))}

                {/* Configurador colapsável */}
                <button type="button" className={styles.configToggle} onClick={() => setShowConfig(!showConfig)}>
                  ⚙️ Configurar Bolão <span>{showConfig ? '▲' : '▼'}</span>
                </button>

                {showConfig && (
                  <div className={styles.configurador}>
                    <div className={styles.configGrid3}>
                      <div className={styles.configField}>
                        <label className={styles.configLabel}>Dezenas / Aposta</label>
                        <select className={styles.configSelect} value={editDezenas}
                          title="Dezenas por aposta" onChange={e => setEditDezenas(Number(e.target.value))}>
                          {Object.entries(CAIXA_PRECOS).map(([d, p]) => (
                            <option key={d} value={d}>{d} dez — R$ {p.toLocaleString('pt-BR')},00</option>
                          ))}
                        </select>
                      </div>
                      <div className={styles.configField}>
                        <label className={styles.configLabel}>Apostas</label>
                        <input type="number" min={1} max={999} className={styles.configInput}
                          title="Apostas no bolão" placeholder="Ex: 100"
                          value={editApostas} onChange={e => setEditApostas(Math.max(1, Number(e.target.value)))} />
                      </div>
                      <div className={styles.configField}>
                        <label className={styles.configLabel}>Total de Cotas</label>
                        <input type="number" min={1} max={200} className={styles.configInput}
                          title="Total de cotas" placeholder="Ex: 20"
                          value={editCotas} onChange={e => setEditCotas(Math.max(1, Number(e.target.value)))} />
                      </div>
                    </div>
                    <div className={styles.configFieldNarrow}>
                      <label className={styles.configLabel}>Taxa de Administração (R$)</label>
                      <input type="number" min={0} step={0.01} className={styles.configInput}
                        title="Taxa admin" placeholder="0,00"
                        value={editTaxa} onChange={e => setEditTaxa(Math.max(0, Number(e.target.value)))} />
                    </div>
                    <div className={styles.configCalc}>
                      <div className={styles.calcRow}>
                        <span>Preço Caixa — {editDezenas} dezenas</span>
                        <span>R$ {precoCaixa.toLocaleString('pt-BR')},00 / aposta</span>
                      </div>
                      <div className={styles.calcRow}>
                        <span>{editApostas} × R$ {precoCaixa.toLocaleString('pt-BR')},00</span>
                        <span>R$ {custoApostas.toLocaleString('pt-BR', {minimumFractionDigits:2})}</span>
                      </div>
                      {editTaxa > 0 && (
                        <div className={styles.calcRow}>
                          <span>Taxa de administração</span>
                          <span>+ R$ {editTaxa.toLocaleString('pt-BR', {minimumFractionDigits:2})}</span>
                        </div>
                      )}
                      <div className={`${styles.calcRow} ${styles.calcSeparator}`}>
                        <span>Total do bolão</span>
                        <span>R$ {totalBolao.toLocaleString('pt-BR', {minimumFractionDigits:2})}</span>
                      </div>
                      <div className={`${styles.calcRow} ${styles.calcDestaque}`}>
                        <span>Valor por cota ({editCotas} cotas)</span>
                        <span>R$ {valorPorCota.toLocaleString('pt-BR', {minimumFractionDigits:2})}</span>
                      </div>
                    </div>
                    {configSalva && <div className={styles.configOk}>✅ Configuração salva!</div>}
                    <button type="button" className={styles.btnCreate} onClick={salvarConfig} disabled={salvando}>
                      {salvando ? 'Salvando...' : '💾 Salvar Configuração'}
                    </button>
                  </div>
                )}
              </div>

            ) : (

              /* ── PRÓXIMOS CONCURSOS ── */
              <div className={styles.panel}>
                <div className={styles.panelTitle}>🎲 Próximos Concursos</div>
                <div className={styles.helpBox}>
                  <p>Selecione um bolão à esquerda para gerenciar participantes.</p>
                  <p>Aqui você também pode definir qual concurso está ativo para as inscrições.</p>
                </div>
                <button type="button" className={styles.btnLoad} onClick={buscarCaixa} disabled={loadingCaixa}>
                  {loadingCaixa ? '⟳ Carregando...' : '🔄 Buscar na Caixa'}
                </button>
                {proximos.length > 0 && (
                  <p className={styles.ccAvisoData}>
                    ⚠️ Data calculada = encerramento das apostas. Edite para a data/hora real do sorteio antes de selecionar.
                  </p>
                )}
                {proximos.map(c => {
                  const dataEditada = editDatas[c.num] ?? c.data
                  return (
                    <div key={c.num} className={`${styles.concursoCard} ${String(c.num) === concursoAtivo ? styles.ativo : ''}`}>
                      <div className={styles.ccBody}>
                        <div className={styles.ccNum}>#{c.num}</div>
                        <div className={styles.ccEncerramento}>
                          Encerramento apostas: {c.data}
                        </div>
                        <div className={styles.ccSorteioLabel}>Data/hora do sorteio:</div>
                        <input
                          type="text"
                          className={styles.ccSorteioInput}
                          placeholder="Ex: 24/05 · Dom · 11h00"
                          value={dataEditada}
                          onChange={e => setEditDatas(prev => ({...prev, [c.num]: e.target.value}))}
                        />
                        <div className={styles.ccPremio}>{c.premio}</div>
                      </div>
                      <button type="button"
                        className={`${styles.btnSel} ${String(c.num) === concursoAtivo ? styles.btnSelAtivo : ''}`}
                        onClick={() => selecionarConcurso({ ...c, data: dataEditada })}>
                        {String(c.num) === concursoAtivo ? '✔ Ativo' : 'Selecionar'}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── KPI DASHBOARD ── */}
        <div className={styles.panel}>
          <div className={styles.histHeader}>
            <div>
              <div className={styles.panelTitle}>📊 Insights & KPIs</div>
              <div className={styles.histSubtitle}>Análise de desempenho dos bolões</div>
            </div>
            <button type="button" className={styles.btnAcao} onClick={carregarKpis} disabled={loadingKpi}>
              {loadingKpi ? 'Carregando…' : showKpi ? '↻ Atualizar' : 'Ver Insights'}
            </button>
          </div>

          {showKpi && kpiGeral && (
            <div className={styles.kpiWrap}>

              {/* Cards de visão geral */}
              <div className={styles.kpiCards}>
                <div className={styles.kpiCard}>
                  <div className={styles.kpiCardLabel}>Total arrecadado</div>
                  <div className={styles.kpiCardVal}>R$ {kpiGeral.totalArrecadado.toFixed(2).replace('.',',')}</div>
                  <div className={styles.kpiCardSub}>{kpiGeral.totalConcursos} concursos</div>
                </div>
                <div className={styles.kpiCard}>
                  <div className={styles.kpiCardLabel}>Participantes únicos</div>
                  <div className={styles.kpiCardVal}>{kpiGeral.totalParticipantes}</div>
                  <div className={styles.kpiCardSub}>{kpiGeral.totalCotas} cotas no total</div>
                </div>
                <div className={styles.kpiCard}>
                  <div className={styles.kpiCardLabel}>Ticket médio</div>
                  <div className={styles.kpiCardVal}>R$ {kpiGeral.ticketMedio.toFixed(2).replace('.',',')}</div>
                  <div className={styles.kpiCardSub}>por participação paga</div>
                </div>
                <div className={`${styles.kpiCard} ${kpiGeral.taxaConversao >= 70 ? styles.kpiCardGreen : kpiGeral.taxaConversao >= 40 ? styles.kpiCardYellow : styles.kpiCardRed}`}>
                  <div className={styles.kpiCardLabel}>Taxa de pagamento</div>
                  <div className={styles.kpiCardVal}>{kpiGeral.taxaConversao.toFixed(0)}%</div>
                  <div className={styles.kpiCardSub}>{kpiGeral.totalPagos} pagos · {kpiGeral.totalPendentes} pendentes</div>
                </div>
                <div className={styles.kpiCard}>
                  <div className={styles.kpiCardLabel}>Retenção</div>
                  <div className={styles.kpiCardVal}>{kpiGeral.taxaRetencao.toFixed(0)}%</div>
                  <div className={styles.kpiCardSub}>voltam no próximo concurso</div>
                </div>
              </div>

              {/* Arrecadação por concurso */}
              {kpiConcursos.length > 0 && (
                <div className={styles.kpiSection}>
                  <div className={styles.kpiSectionTitle}>Arrecadação por concurso</div>
                  <div className={styles.kpiBarChart}>
                    {(() => {
                      const max = Math.max(...kpiConcursos.map(c => c.arrecadado), 1)
                      return kpiConcursos.map(c => (
                        <div key={c.concurso} className={styles.kpiBarRow}>
                          <div className={styles.kpiBarLabel}>#{c.concurso}</div>
                          <div className={styles.kpiBarTrack}>
                            <div className={styles.kpiBarFill} style={{ width: `${(c.arrecadado / max) * 100}%` }} />
                          </div>
                          <div className={styles.kpiBarVal}>R$ {c.arrecadado.toFixed(0).replace(/\B(?=(\d{3})+(?!\d))/g, '.')}</div>
                          <div className={styles.kpiBarSub}>{c.pagos}/{c.total}</div>
                        </div>
                      ))
                    })()}
                  </div>
                </div>
              )}

              {/* Tabs: Top participantes / Cotas */}
              <div className={styles.kpiSection}>
                <div className={styles.histSegmentado} style={{ marginBottom: 16 }}>
                  <button type="button" className={kpiAba === 'freq' ? styles.histSegAtivo : styles.histSegBtn} onClick={() => setKpiAba('freq')}>Mais fiéis</button>
                  <button type="button" className={kpiAba === 'gasto' ? styles.histSegAtivo : styles.histSegBtn} onClick={() => setKpiAba('gasto')}>Maior gasto</button>
                  <button type="button" className={kpiAba === 'cotas' ? styles.histSegAtivo : styles.histSegBtn} onClick={() => setKpiAba('cotas')}>Cotas populares</button>
                </div>

                {kpiAba !== 'cotas' && (
                  <div className={styles.kpiRanking}>
                    {(kpiAba === 'freq' ? kpiFreq : kpiGasto).map((p, i) => (
                      <div key={p.telefone || p.nome} className={styles.kpiRankRow}>
                        <div className={`${styles.kpiRankPos} ${i === 0 ? styles.kpiRankGold : i === 1 ? styles.kpiRankSilver : i === 2 ? styles.kpiRankBronze : ''}`}>{i + 1}</div>
                        <div className={styles.kpiRankInfo}>
                          <div className={styles.kpiRankNome}>{p.nome}</div>
                          <div className={styles.kpiRankMeta}>
                            {p.telefone && <a href={whatsappUrl(p.telefone)} target="_blank" rel="noopener noreferrer" className={styles.crmTelBtn}>📱</a>}
                            <span>{p.concursos} concurso{p.concursos !== 1 ? 's' : ''}</span>
                            <span>·</span>
                            <span>{p.totalCotas} cota{p.totalCotas !== 1 ? 's' : ''}</span>
                          </div>
                        </div>
                        <div className={styles.kpiRankVal}>R$ {p.totalGasto.toFixed(2).replace('.',',')}</div>
                      </div>
                    ))}
                  </div>
                )}

                {kpiAba === 'cotas' && (
                  <div className={styles.kpiBarChart}>
                    {(() => {
                      const max = Math.max(...kpiCotas.map(c => c.count), 1)
                      return kpiCotas.map(c => (
                        <div key={c.cota} className={styles.kpiBarRow}>
                          <div className={styles.kpiBarLabel}>Nº {c.cota}</div>
                          <div className={styles.kpiBarTrack}>
                            <div className={styles.kpiBarFill} style={{ width: `${(c.count / max) * 100}%` }} />
                          </div>
                          <div className={styles.kpiBarVal}>{c.count}×</div>
                        </div>
                      ))
                    })()}
                  </div>
                )}
              </div>

            </div>
          )}
        </div>

        {/* ── HISTÓRICO ── */}
        <div className={styles.panel}>
          {/* Cabeçalho + toggle */}
          <div className={styles.histHeader}>
            <div>
              <div className={styles.panelTitle}>Histórico</div>
              <div className={styles.histSubtitle}>
                {modoHistorico === 'resumo' ? 'Resumo por concurso' : `${histParticipantes.length > 0 ? histParticipantes.length + ' participantes' : 'Base de contatos'}`}
              </div>
            </div>
            <div className={styles.histSegmentado}>
              <button type="button"
                className={modoHistorico === 'resumo' ? styles.histSegAtivo : styles.histSegBtn}
                onClick={() => { setModoHistorico('resumo'); carregarHistorico() }}>
                Resumo
              </button>
              <button type="button"
                className={modoHistorico === 'participantes' ? styles.histSegAtivo : styles.histSegBtn}
                onClick={() => { setModoHistorico('participantes'); carregarHistParticipantes() }}>
                Participantes
              </button>
            </div>
          </div>

          {loadingHist && <div className={styles.empty}>Carregando...</div>}

          {/* ── MODO RESUMO ── */}
          {!loadingHist && modoHistorico === 'resumo' && (
            <>
              <button type="button" className={styles.btnLoad} onClick={carregarHistorico} style={{ marginBottom: 14 }}>
                Carregar histórico
              </button>
              {showHistorico && (
                historico.length === 0
                  ? <div className={styles.empty}>Nenhum histórico encontrado</div>
                  : <div className={styles.histTableWrap}><table className={styles.histTable}>
                      <thead>
                        <tr>
                          <th>Concurso</th><th>Bolão</th>
                          <th>Pagos</th><th>Pend.</th><th>Canc.</th><th>Arrecadado</th>
                        </tr>
                      </thead>
                      {historico.map((h, i) => {
                        const prev = i > 0 ? historico[i - 1].concurso : null
                        const novo = h.concurso !== prev
                        const rowKey = `${h.concurso}-${h.bolao_slug || 'main'}`
                        return (
                          <tbody key={rowKey}>
                            {novo && i > 0 && <tr className={styles.histSep}><td colSpan={6} /></tr>}
                            <tr className={novo ? styles.histRowFirst : styles.histRowSub}>
                              <td>{novo ? `#${h.concurso}` : ''}</td>
                              <td>
                                <div className={styles.histBolaoNome}>{h.bolao_nome}</div>
                                {h.bolao_slug && <div className={styles.histBolaoSlug}>/{h.bolao_slug}</div>}
                              </td>
                              <td className={styles.histPago}>{h.pagos}</td>
                              <td className={h.pendentes > 0 ? styles.histPend : ''}>{h.pendentes || '—'}</td>
                              <td className={h.cancelados > 0 ? styles.histCancel : ''}>{h.cancelados || '—'}</td>
                              <td className={styles.histValor}>R$ {h.arrecadado.toFixed(2).replace('.', ',')}</td>
                            </tr>
                          </tbody>
                        )
                      })}
                    </table></div>
              )}
            </>
          )}

          {/* ── MODO PARTICIPANTES ── */}
          {!loadingHist && modoHistorico === 'participantes' && (() => {
            const busca = histBusca.toLowerCase()
            const lista = histParticipantes.filter(p =>
              !busca || p.nome.toLowerCase().includes(busca) || (p.telefone || '').includes(busca)
            )
            const comTel = lista.filter(p => p.telefone).length
            return (
              <>
                {/* Barra de filtros */}
                <div className={styles.crmFiltros}>
                  <div className={styles.crmBuscaWrap}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
                    <input className={styles.crmBusca} placeholder="Buscar por nome ou telefone"
                      value={histBusca} onChange={e => setHistBusca(e.target.value)} />
                  </div>
                  <select className={styles.crmSelect}
                    value={histFiltroSlug} onChange={e => { setHistFiltroSlug(e.target.value); }}>
                    <option value="">Todos os bolões</option>
                    {boloes.map(b => <option key={b.slug} value={b.slug}>{b.nome}</option>)}
                  </select>
                  <input className={styles.crmInputConc} placeholder="Concurso"
                    value={histFiltroConc} onChange={e => setHistFiltroConc(e.target.value)} />
                  <button type="button" className={styles.crmBtnFiltrar} onClick={carregarHistParticipantes}>
                    Filtrar
                  </button>
                </div>

                {/* Stats rápidas */}
                {lista.length > 0 && (
                  <div className={styles.crmStats}>
                    <div className={styles.crmStat}>
                      <span className={styles.crmStatNum}>{lista.length}</span>
                      <span className={styles.crmStatLabel}>participantes</span>
                    </div>
                    <div className={styles.crmStatDiv} />
                    <div className={styles.crmStat}>
                      <span className={styles.crmStatNum}>{comTel}</span>
                      <span className={styles.crmStatLabel}>com WhatsApp</span>
                    </div>
                    <div className={styles.crmStatDiv} />
                    <div className={styles.crmStat}>
                      <span className={`${styles.crmStatNum} ${styles.crmStatGreen}`}>
                        R$ {lista.filter(p => p.status === 'pago').reduce((s, p) => s + Number(p.total), 0).toFixed(2).replace('.', ',')}
                      </span>
                      <span className={styles.crmStatLabel}>arrecadado</span>
                    </div>
                    {comTel > 0 && (
                      <>
                        <div className={styles.crmStatDiv} />
                        <button type="button" className={styles.crmBtnMassivo}
                          onClick={() => {
                            const comTelefone = lista.filter(p => p.telefone)
                            if (comTelefone.length === 0) return
                            if (!confirm(`Abrir WhatsApp para ${comTelefone.length} contatos?`)) return
                            comTelefone.forEach((p, i) => {
                              setTimeout(() => enviarConviteNovoBolao(p.telefone!, p.nome), i * 600)
                            })
                          }}>
                          Enviar convite para todos ({comTel})
                        </button>
                      </>
                    )}
                  </div>
                )}

                {/* Modelo de mensagem */}
                {lista.length > 0 && (
                  <div className={styles.crmMsgArea}>
                    <label className={styles.crmMsgLabel}>Mensagem de convite personalizada</label>
                    <textarea className={styles.crmMsgTextarea} rows={2}
                      placeholder={`🍀 Olá {nome}! Temos um novo bolão disponível. Participe: {link}`}
                      value={msgConvite} onChange={e => setMsgConvite(e.target.value)} />
                  </div>
                )}

                {/* Lista */}
                {lista.length === 0
                  ? <div className={styles.empty}>Nenhum participante encontrado</div>
                  : <div className={styles.crmLista}>
                      {lista.map(p => (
                        <div key={p.id} className={styles.crmCard}>
                          {/* Indicador lateral de status */}
                          <div className={`${styles.crmCardBar} ${p.status === 'pago' ? styles.crmBarPago : p.status === 'cancelado' ? styles.crmBarCancel : styles.crmBarPend}`} />

                          <div className={styles.crmCardBody}>
                            {/* Linha 1: nome + valor */}
                            <div className={styles.crmCardTop}>
                              <span className={styles.crmNome}>{p.nome}</span>
                              <span className={styles.crmValor}>R$ {Number(p.total).toFixed(2).replace('.', ',')}</span>
                            </div>

                            {/* Linha 2: concurso · bolão · cotas · status */}
                            <div className={styles.crmCardMeta}>
                              <span className={styles.crmTag}># {p.concurso}</span>
                              <span className={styles.crmTagNeutro}>{p.bolao_nome}</span>
                              {Array.isArray(p.cotas) && p.cotas.length > 0 && (
                                <span className={styles.crmTagNeutro}>
                                  {p.cotas.length} cota{p.cotas.length !== 1 ? 's' : ''}
                                </span>
                              )}
                              <span className={`${styles.crmStatus} ${p.status === 'pago' ? styles.crmStatusPago : p.status === 'cancelado' ? styles.crmStatusCancel : styles.crmStatusPend}`}>
                                {p.status === 'pago' ? 'Pago' : p.status === 'cancelado' ? 'Cancelado' : 'Pendente'}
                              </span>
                            </div>

                            {/* Linha 3: telefone + ações */}
                            {p.telefone && (
                              <div className={styles.crmCardAcoes}>
                                <a href={whatsappUrl(p.telefone)} target="_blank" rel="noopener noreferrer"
                                  className={styles.crmTelBtn}>
                                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M5.337 7.407a12 12 0 1 0 11.29 0A12 12 0 0 0 5.337 7.407z" fill="none" stroke="currentColor" strokeWidth="1.5" opacity=".3"/></svg>
                                  {formatTel(p.telefone)}
                                </a>
                                <button type="button" className={styles.crmAcaoBtnWA}
                                  onClick={() => enviarConviteNovoBolao(p.telefone!, p.nome)}>
                                  Convidar
                                </button>
                                {p.status === 'pago' && (
                                  <button type="button" className={styles.crmAcaoBtnComp}
                                    onClick={() => {
                                      const url = `/comprovante?id=${p.id}&pub=1&bolao=${p.bolao_slug || ''}&concurso=${p.concurso}`
                                      window.open(url, '_blank')
                                    }}>
                                    Ver comprovante
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                }
              </>
            )
          })()}
        </div>

        {/* ── BOLÕES ESPORTIVOS ── */}
        <EsporteAdmin />

        {/* ── SEGURANÇA ── */}
        <AdminSenha />

      </div>
    </div>
  )
}

function parseBRDate(str: string): Date | null {
  if (!str) return null
  const [d, m, y] = str.split('/').map(Number)
  return new Date(y, m - 1, d)
}
function nextDrawDate(d: Date): Date {
  const dia = d.getDay()
  const add = dia === 2 ? 2 : dia === 4 ? 2 : dia === 6 ? 3 : 1
  const n = new Date(d); n.setDate(n.getDate() + add); return n
}
function formatData(d: Date | null): string {
  if (!d) return '—'
  const dias = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']
  return `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')} · ${dias[d.getDay()]}`
}
function formatPremio(v: number): string {
  if (v >= 1e9) return `R$ ${(v/1e9).toFixed(1).replace('.',',')} bi`
  if (v >= 1e6) return `R$ ${(v/1e6).toFixed(1).replace('.',',')} mi`
  return `R$ ${v.toLocaleString('pt-BR')}`
}
