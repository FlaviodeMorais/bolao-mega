'use client'
import { useState, useEffect, useCallback, useRef } from 'react'
import styles from './admin.module.css'
import EsporteAdmin from './EsporteAdmin'
import AdminHeader from '@/components/admin/AdminHeader'
import AdminLogin from '@/components/admin/AdminLogin'
import AdminStats from '@/components/admin/AdminStats'
import AdminSenha from '@/components/admin/AdminSenha'
import BolaoList from '@/components/admin/BolaoList'
import ConcursoPanel from '@/components/admin/ConcursoPanel'
import KpiDashboard from '@/components/admin/KpiDashboard'
import HistoricoPanel from '@/components/admin/HistoricoPanel'
import BolaoDetailPanel from '@/components/admin/BolaoDetailPanel'

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
              <BolaoDetailPanel
                bolao={bolaoAtual}
                concursoAtivo={concursoAtivo}
                partsBolao={partsBolao}
                pagosLista={pagosLista}
                pendentesLista={pendentesLista}
                cotasLivres={cotasLivres}
                arrecadado={arrecadado}
                loadingParts={loadingParts}
                confirmandoTodos={confirmandoTodos}
                selecionados={selecionados}
                enviandoComp={enviandoComp}
                lembreteMsg={lembreteMsg}
                compMsg={compMsg}
                apostasMsg={apostasMsg}
                showApostasModal={showApostasModal}
                apostasTexto={apostasTexto}
                uploadingApostas={uploadingApostas}
                showConferir={showConferir}
                conferirResult={conferirResult}
                conferirMsg={conferirMsg}
                conferindoRes={conferindoRes}
                conferindoManual={conferindoManual}
                dezenasInput={dezenasInput}
                showEncerrar={showEncerrar}
                encerrando={encerrando}
                encerrarOk={encerrarOk}
                showConfig={showConfig}
                editDezenas={editDezenas}
                editApostas={editApostas}
                editCotas={editCotas}
                editTaxa={editTaxa}
                precoCaixa={precoCaixa}
                custoApostas={custoApostas}
                totalBolao={totalBolao}
                valorPorCota={valorPorCota}
                configSalva={configSalva}
                salvando={salvando}
                formatTel={formatTel}
                whatsappUrl={whatsappUrl}
                onFechar={fecharBolao}
                onAtualizarParts={() => carregarPartsBolao(bolaoAtual.slug, concursoAtivo)}
                onConfirmarTodos={confirmarTodos}
                onEnviarLembrete={enviarLembrete}
                onToggleSelecionado={toggleSelecionado}
                onSelecionarTodosPagos={selecionarTodosPagos}
                onLimparSelecao={() => setSelecionados(new Set())}
                onImprimirSelecionados={imprimirSelecionados}
                onEnviarComprovante={enviarComprovante}
                onConfirmarPagamento={confirmarPagamento}
                onConfirmarAcrescimo={confirmarAcrescimo}
                onExcluir={excluir}
                onOpenApostas={() => setShowApostasModal(true)}
                onCloseApostas={() => { setShowApostasModal(false); setApostasTexto('') }}
                onApostasTextoChange={setApostasTexto}
                onSalvarApostas={salvarApostas}
                onRemoverApostas={removerApostas}
                onToggleConferir={() => { setShowConferir(v => !v); setConferirMsg('') }}
                onConferirSorteio={() => conferirSorteio()}
                onConferirManual={conferirManual}
                onResetarConferencia={resetarConferencia}
                onDezenasInputChange={setDezenasInput}
                onToggleEncerrar={() => { setShowEncerrar(v => !v); setEncerrarOk(null) }}
                onEncerrarBolao={encerrarBolao}
                onToggleConfig={() => setShowConfig(v => !v)}
                onEditDezenasChange={setEditDezenas}
                onEditApostasChange={setEditApostas}
                onEditCotasChange={setEditCotas}
                onEditTaxaChange={setEditTaxa}
                onSalvarConfig={salvarConfig}
              />

            ) : (
              <ConcursoPanel
                proximos={proximos}
                concursoAtivo={concursoAtivo}
                loadingCaixa={loadingCaixa}
                editDatas={editDatas}
                onEditData={(num, val) => setEditDatas(prev => ({ ...prev, [num]: val }))}
                onBuscarCaixa={buscarCaixa}
                onSelecionar={selecionarConcurso}
              />
            )}
          </div>
        </div>

        {/* ── KPI DASHBOARD ── */}
        <KpiDashboard
          showKpi={showKpi}
          loadingKpi={loadingKpi}
          kpiGeral={kpiGeral}
          kpiConcursos={kpiConcursos}
          kpiFreq={kpiFreq}
          kpiGasto={kpiGasto}
          kpiCotas={kpiCotas}
          kpiAba={kpiAba}
          onCarregar={carregarKpis}
          onAbaChange={setKpiAba}
          whatsappUrl={whatsappUrl}
        />

        {/* ── HISTÓRICO ── */}
        <HistoricoPanel
          modo={modoHistorico}
          loadingHist={loadingHist}
          showHistorico={showHistorico}
          historico={historico}
          histParticipantes={histParticipantes}
          histBusca={histBusca}
          histFiltroSlug={histFiltroSlug}
          histFiltroConc={histFiltroConc}
          msgConvite={msgConvite}
          boloes={boloes}
          onModoChange={setModoHistorico}
          onCarregarResumo={carregarHistorico}
          onCarregarParticipantes={carregarHistParticipantes}
          onBuscaChange={setHistBusca}
          onFiltroSlugChange={setHistFiltroSlug}
          onFiltroConcChange={setHistFiltroConc}
          onMsgConviteChange={setMsgConvite}
          onEnviarConvite={enviarConviteNovoBolao}
          formatTel={formatTel}
          whatsappUrl={whatsappUrl}
        />

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
