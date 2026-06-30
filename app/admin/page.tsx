'use client'
import { useState, useEffect, useCallback } from 'react'
import { useKpis } from '@/hooks/admin/useKpis'
import { useHistorico } from '@/hooks/admin/useHistorico'
import { useConferencia } from '@/hooks/admin/useConferencia'
import { useBoloes } from '@/hooks/admin/useBoloes'
import { useConcurso } from '@/hooks/admin/useConcurso'
import { useParticipantes } from '@/hooks/admin/useParticipantes'
import { useAdminBranding, useWhatsappHealth } from '@/hooks/admin/useAdminShell'
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
import IngerirHistorico from '@/components/admin/IngerirHistorico'
import AdminSettings from '@/components/admin/AdminSettings'

import type { Bolao } from '@/hooks/admin/useBoloes'
import type { Concurso } from '@/hooks/admin/useConcurso'
import type { BolaoDetailPanelProps } from '@/components/admin/bolao-detail/types'

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
  const [logado, setLogado]     = useState(false)
  const [senha, setSenha]       = useState('')
  const [errLogin, setErrLogin] = useState('')
  const { grupoNome, appNome }  = useAdminBranding()
  const { waStatus, waMsg }     = useWhatsappHealth(logado)

  // ── Hooks de domínio ─────────────────────────────────────────
  const boloes   = useBoloes()
  const concurso = useConcurso()
  const parts    = useParticipantes(boloes.bolaoAtual, concurso.concursoAtivo, boloes.carregarBoloes)
  const conf     = useConferencia(boloes.bolaoAtual, concurso.concursoAtivo, boloes.carregarBoloes)
  const hist     = useHistorico(boloes.boloes, concurso.concursoAtivo)
  const kpis     = useKpis()

  // ── Aliases (mantêm JSX sem alteração) ───────────────────────
  const { bolaoAtual, carregarBoloes } = boloes
  const { concursoAtivo, dataAtiva, premioAtivo } = concurso
  const { partsBolao, pagosLista, pendentesLista, arrecadado, cotasOcup } = parts
  const cotasLivres = (bolaoAtual?.total_cotas || 20) - cotasOcup

  // BolaoList
  const { linkCopiado, renamingId, setRenamingId, renameVal, setRenameVal,
          showCreate, setShowCreate, novoNome, setNovoNome, novoSlug, setNovoSlug,
          novaLoteria, setNovaLoteria, criando, criarErro } = boloes
  const copiarLink     = boloes.copiarLink
  const renomearBolao  = boloes.renomearBolao
  const criarBolao     = boloes.criarBolao

  // ConcursoPanel
  const { loteriaPanel, mudarLoteria, proximos, setProximos, loadingCaixa, editDatas, setEditDatas, buscarCaixa } = concurso

  // BolaoDetailPanel — participantes
  const { loadingParts, confirmandoTodos, selecionados, enviandoComp,
          lembreteMsg, compMsg, apostasMsg,
          showApostasModal, setShowApostasModal, apostasTexto, setApostasTexto,
          uploadingApostas,
          showEncerrar, setShowEncerrar, encerrando, encerrarOk, setEncerrarOk } = parts
  const carregarPartsBolao = parts.carregarPartsBolao
  const confirmarTodos    = parts.confirmarTodos
  const enviarLembrete    = parts.enviarLembrete
  const toggleSelecionado = parts.toggleSelecionado
  const selecionarTodosPagos   = parts.selecionarTodosPagos
  const imprimirSelecionados   = () => parts.imprimirSelecionados(bolaoAtual?.slug || '')
  const enviarComprovante      = parts.enviarComprovante
  const confirmarPagamento     = parts.confirmarPagamento
  const confirmarAcrescimo     = parts.confirmarAcrescimo
  const excluir                = parts.excluir
  const salvarApostas  = () => bolaoAtual && parts.salvarApostas(bolaoAtual.id, carregarBoloes)
  const removerApostas = () => bolaoAtual && parts.removerApostas(bolaoAtual.id, carregarBoloes)
  const inserirApostasGeradas = (texto: string) => {
    if (!bolaoAtual) return
    setApostasTexto(texto)
    setShowApostasModal(true)
  }
  const encerrarBolao  = () => bolaoAtual && parts.encerrarBolao(bolaoAtual.id, bolaoAtual.slug)

  // BolaoDetailPanel — conferência
  const { showConferir, setShowConferir, conferindoRes, conferirMsg, setConferirMsg,
          dezenasInput, setDezenasInput, conferindoManual,
          conferirResult, setConferirResult,
          conferirSorteio, resetarConferencia, conferirManual } = conf

  const [enviarAcertosMsg, setEnviarAcertosMsg] = useState('')
  const enviarAcertos = async () => {
    if (!bolaoAtual || !concursoAtivo) return
    setEnviarAcertosMsg('Enviando...')
    try {
      const r = await fetch('/api/admin/acertos-pos-sorteio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bolao_slug: bolaoAtual.slug, concurso: concursoAtivo }),
      })
      const d = await r.json()
      if (r.ok) setEnviarAcertosMsg(`✅ Enviado para ${d.enviados} participante(s)${d.erros > 0 ? ` (${d.erros} sem telefone)` : ''}`)
      else setEnviarAcertosMsg(`❌ ${d.error}`)
    } catch {
      setEnviarAcertosMsg('❌ Erro ao enviar')
    }
  }

  // BolaoDetailPanel — config
  const { showConfig, setShowConfig, editDezenas, setEditDezenas,
          editApostas, setEditApostas, editCotas, setEditCotas,
          editTaxa, setEditTaxa, salvando, configSalva,
          precoCaixa, custoApostas, totalBolao, valorPorCota } = boloes
  const salvarConfig = () => bolaoAtual && boloes.salvarConfig(bolaoAtual.id)

  // HistoricoPanel
  const { historico, showHistorico, modoHistorico, setModoHistorico,
          histParticipantes, histFiltroConc, setHistFiltroConc,
          histFiltroSlug, setHistFiltroSlug, histBusca, setHistBusca,
          loadingHist, msgConvite, setMsgConvite,
          carregarHistorico, carregarHistParticipantes, enviarConviteNovoBolao } = hist

  // KpiDashboard
  const { showKpi, loadingKpi, kpiGeral, kpiConcursos, kpiFreq,
          kpiGasto, kpiCotas, kpiAba, carregarKpis, setKpiAba } = kpis

  // ── AUTH ──────────────────────────────────────────────────────
  async function login() {
    const res = await fetch('/api/auth', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senha }),
    })
    if (res.ok) { setLogado(true); setErrLogin(''); carregarInicio() }
    else setErrLogin('Senha incorreta.')
  }

  // ── INICIALIZAÇÃO ─────────────────────────────────────────────
  const carregarInicio = useCallback(async () => {
    const [b, ca] = await Promise.all([
      fetch('/api/boloes').then(r => r.json()),
      fetch('/api/concurso-ativo').then(r => r.json()),
    ])
    boloes.setBoloes(b.boloes || []) // setBoloes do useBoloes
    concurso.setFromApi(ca.concurso || '', ca.data || '', ca.premio || '') // setFromApi do useConcurso
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { if (logado) carregarInicio() }, [logado, carregarInicio])

  // ── ORQUESTRAÇÃO: bolão + participantes + conferência ─────────
  function selecionarBolao(b: Bolao) {
    boloes.setBolaoAtual(b)
    boloes.aplicarConfigDoBolao(b)
    conf.limparAutoRef()
    conf.restaurarResultadoSalvo(b.resultado_conferencia)
    if (concursoAtivo) parts.carregarPartsBolao(b.slug, concursoAtivo)
  }

  function fecharBolao() {
    boloes.setBolaoAtual(null)
    boloes.setShowConfig(false)
    parts.limparEstado()
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
      const ok = confirm(
        `❌ Este bolão tem ${res.count} participante(s) no histórico.\n\n` +
        `Deseja excluir o bolão E todos os participantes permanentemente?\n\n` +
        `(Isso remove o histórico completo deste bolão)`
      )
      if (ok) excluirBolao(b, true)
      return
    }
    if (res.error) { alert('❌ ' + res.error); return }
    await carregarBoloes()
    if (bolaoAtual?.id === b.id) fecharBolao()
  }

  async function selecionarConcurso(c: { num: number; data: string; premio: string }) {
    await concurso.selecionarConcurso(c)
    if (bolaoAtual) parts.carregarPartsBolao(bolaoAtual.slug, String(c.num))
  }

  // ── Props consolidadas do BolaoDetailPanel ─────────────────────
  const bolaoDetailProps: BolaoDetailPanelProps | null = bolaoAtual ? {
    bolao: bolaoAtual,
    concursoAtivo,
    partsBolao,
    pagosLista,
    pendentesLista,
    cotasLivres,
    arrecadado,
    loadingParts,
    confirmandoTodos,
    selecionados,
    enviandoComp,
    lembreteMsg,
    compMsg,
    apostasMsg,
    showApostasModal,
    apostasTexto,
    uploadingApostas,
    showConferir,
    conferirResult,
    conferirMsg,
    conferindoRes,
    conferindoManual,
    dezenasInput,
    showEncerrar,
    encerrando,
    encerrarOk,
    showConfig,
    editDezenas,
    editApostas,
    editCotas,
    editTaxa,
    precoCaixa,
    custoApostas,
    totalBolao,
    valorPorCota,
    configSalva,
    salvando,
    formatTel,
    whatsappUrl,
    onFechar: fecharBolao,
    onAtualizarParts: () => carregarPartsBolao(bolaoAtual.slug, concursoAtivo),
    onConfirmarTodos: confirmarTodos,
    onEnviarLembrete: enviarLembrete,
    onToggleSelecionado: toggleSelecionado,
    onSelecionarTodosPagos: selecionarTodosPagos,
    onLimparSelecao: () => parts.setSelecionados(new Set()),
    onImprimirSelecionados: imprimirSelecionados,
    onEnviarComprovante: enviarComprovante,
    onConfirmarPagamento: confirmarPagamento,
    onConfirmarAcrescimo: confirmarAcrescimo,
    onExcluir: excluir,
    onOpenApostas: () => setShowApostasModal(true),
    onCloseApostas: () => { setShowApostasModal(false); setApostasTexto('') },
    onApostasTextoChange: setApostasTexto,
    onSalvarApostas: salvarApostas,
    onRemoverApostas: removerApostas,
    onToggleConferir: () => { setShowConferir(v => !v); setConferirMsg('') },
    onConferirSorteio: () => conferirSorteio(),
    onConferirManual: conferirManual,
    onResetarConferencia: resetarConferencia,
    onDezenasInputChange: setDezenasInput,
    onEnviarAcertos: enviarAcertos,
    enviarAcertosMsg,
    onToggleEncerrar: () => { setShowEncerrar(v => !v); setEncerrarOk(null) },
    onEncerrarBolao: encerrarBolao,
    onToggleConfig: () => setShowConfig(v => !v),
    onEditDezenasChange: setEditDezenas,
    onEditApostasChange: setEditApostas,
    onEditCotasChange: setEditCotas,
    onEditTaxaChange: setEditTaxa,
    onSalvarConfig: salvarConfig,
    onInserirApostasGeradas: inserirApostasGeradas,
  } : null



  // ── LOGIN ─────────────────────────────────────────────────────
  if (!logado) return (
    <AdminLogin
      senha={senha}
      errLogin={errLogin}
      onSenhaChange={setSenha}
      onLogin={login}
      grupoNome={grupoNome}
    />
  )

  // ── MAIN ──────────────────────────────────────────────────────
  return (
    <div className={styles.wrap}>
      <AdminHeader
        concursoAtivo={concursoAtivo}
        waStatus={waStatus}
        waMsg={waMsg}
        appNome={appNome}
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
          boloesAtivosCount={boloes.boloes.filter(b => b.ativo).length}
        />

        {/* ── GRID PRINCIPAL ── */}
        <div className={styles.adminGrid}>

          {/* ── ESQUERDA: BOLÕES ── */}
          <div className={styles.leftPanel}>
            <BolaoList
              boloes={boloes.boloes}
              bolaoAtualId={bolaoAtual?.id ?? null}
              linkCopiado={linkCopiado}
              renamingId={renamingId}
              renameVal={renameVal}
              onRenameValChange={setRenameVal}
              showCreate={showCreate}
              novoNome={novoNome}
              novoSlug={novoSlug}
              novaLoteria={novaLoteria}
              criando={criando}
              criarErro={criarErro}
              onNovoNomeChange={setNovoNome}
              onNovoSlugChange={setNovoSlug}
              onNovaLoteriaChange={v => { setNovaLoteria(v); setProximos([]) }}
              onShowCreateToggle={v => { setShowCreate(v); if (!v) { setNovoNome(''); setNovoSlug(''); setNovaLoteria('mega') } }}
              actions={{
                onSelecionar: selecionarBolao,
                onCopiarLink: copiarLink,
                onCancelar: cancelarBolao,
                onExcluir: excluirBolao,
                onRenomear: id => { setRenamingId(id); setRenameVal(boloes.boloes.find(b => b.id === id)?.nome ?? '') },
                onRenomearConfirm: renomearBolao,
                onRenomearCancel: () => setRenamingId(null),
                onCriar: criarBolao,
              }}
            />
          </div>

          {/* ── DIREITA: DETALHE DO BOLÃO ou CONCURSOS ── */}
          <div className={styles.rightPanel}>
            {bolaoDetailProps ? (

              /* ── DETALHE DO BOLÃO ── */
              <BolaoDetailPanel {...bolaoDetailProps} />

            ) : (
              <ConcursoPanel
                proximos={proximos}
                concursoAtivo={concursoAtivo}
                loadingCaixa={loadingCaixa}
                editDatas={editDatas}
                loteriaAtual={loteriaPanel}
                onMudarLoteria={mudarLoteria}
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
          boloes={boloes.boloes}
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

        {/* ── FERRAMENTAS ── */}
        <IngerirHistorico />

        {/* ── CONFIGURAÇÕES WHITE-LABEL ── */}
        <AdminSettings />

        {/* ── SEGURANÇA ── */}
        <AdminSenha />

      </div>
    </div>
  )
}
