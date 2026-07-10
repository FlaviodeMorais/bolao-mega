import { useState } from 'react'
import { getLoteria, type LoteriaId } from '@/lib/loterias'

export interface Bolao {
  id: string; nome: string; slug: string; valor_cota: number
  total_cotas: number; ativo: boolean; dezenas: number; num_apostas: number
  taxa_admin: number; encerrado: boolean; arquivado: boolean; loteria: LoteriaId
  apostas_data?: { bets: number[][]; total_apostas: number } | null
  resultado_conferencia?: Record<string, unknown> | null
}

export function useBoloes() {
  const [boloes, setBoloes]           = useState<Bolao[]>([])
  const [bolaoAtual, setBolaoAtual]   = useState<Bolao | null>(null)
  const [linkCopiado, setLinkCopiado] = useState(false)
  const [renamingId, setRenamingId]   = useState<string | null>(null)
  const [renameVal, setRenameVal]     = useState('')
  const [showCreate, setShowCreate]   = useState(false)
  const [novoNome, setNovoNome]       = useState('')
  const [novoSlug, setNovoSlug]       = useState('')
  const [novaLoteria, setNovaLoteria] = useState<LoteriaId>('mega')
  const [criando, setCriando]         = useState(false)
  const [criarErro, setCriarErro]     = useState('')

  const [showConfig, setShowConfig]   = useState(false)
  const [editDezenas, setEditDezenas] = useState(6)
  const [editApostas, setEditApostas] = useState(1)
  const [editCotas, setEditCotas]     = useState(20)
  const [editTaxa, setEditTaxa]       = useState(0)
  const [salvando, setSalvando]       = useState(false)
  const [configSalva, setConfigSalva] = useState(false)

  const loteriaConfig = getLoteria(bolaoAtual?.loteria)
  const precoCaixa    = loteriaConfig.precos[editDezenas] ?? 0
  const custoApostas  = editApostas * precoCaixa
  const totalBolao    = custoApostas + editTaxa
  const valorPorCota  = editCotas > 0 ? totalBolao / editCotas : 0

  async function carregarBoloes() {
    const res = await fetch('/api/boloes').then(r => r.json())
    const lista: Bolao[] = res.boloes || []
    setBoloes(lista)
    setBolaoAtual(prev => {
      if (!prev) return null
      return lista.find(b => b.id === prev.id) ?? prev
    })
  }

  function aplicarConfigDoBolao(b: Bolao) {
    setEditDezenas(b.dezenas || getLoteria(b.loteria).minDezenas)
    setEditApostas(b.num_apostas || 1)
    setEditCotas(b.total_cotas || 20)
    setEditTaxa(Number(b.taxa_admin) || 0)
    setConfigSalva(false)
    setShowConfig(false)
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

  async function criarBolao() {
    if (!novoNome || !novoSlug) return
    setCriando(true); setCriarErro('')
    const cfg = getLoteria(novaLoteria)
    const res = await fetch('/api/boloes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: novoNome, slug: novoSlug, loteria: novaLoteria, dezenas: cfg.minDezenas }),
    }).then(r => r.json())
    setCriando(false)
    if (res.error) { setCriarErro('❌ ' + res.error); return }
    await carregarBoloes()
    setNovoNome(''); setNovoSlug(''); setShowCreate(false); setCriarErro('')
  }

  async function arquivarBolao(bolaoId: string) {
    await fetch('/api/boloes', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: bolaoId, arquivado: true }),
    })
    setBolaoAtual(null)
    await carregarBoloes()
  }

  async function desarquivarBolao(bolaoId: string) {
    await fetch('/api/boloes', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: bolaoId, arquivado: false }),
    })
    await carregarBoloes()
  }

  async function salvarConfig(bolaoId: string) {
    setSalvando(true)
    const cfg   = getLoteria(bolaoAtual?.loteria)
    const preco = cfg.precos[editDezenas] ?? 0
    const custo = editApostas * preco
    const valor = editCotas > 0 ? parseFloat(((custo + editTaxa) / editCotas).toFixed(2)) : 0
    await fetch('/api/boloes', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: bolaoId, dezenas: editDezenas, num_apostas: editApostas, total_cotas: editCotas, taxa_admin: editTaxa, valor_cota: valor }),
    })
    await carregarBoloes()
    setSalvando(false); setConfigSalva(true)
    setTimeout(() => setConfigSalva(false), 3000)
  }

  return {
    boloes, bolaoAtual, setBolaoAtual,
    linkCopiado,
    renamingId, setRenamingId,
    renameVal, setRenameVal,
    showCreate, setShowCreate,
    novoNome, setNovoNome,
    novoSlug, setNovoSlug,
    novaLoteria, setNovaLoteria,
    criando, criarErro,
    showConfig, setShowConfig,
    editDezenas, setEditDezenas,
    editApostas, setEditApostas,
    editCotas, setEditCotas,
    editTaxa, setEditTaxa,
    salvando, configSalva,
    precoCaixa, custoApostas, totalBolao, valorPorCota,
    setBoloes,
    carregarBoloes, aplicarConfigDoBolao,
    copiarLink, renomearBolao, criarBolao, salvarConfig,
    arquivarBolao, desarquivarBolao,
  }
}
