'use client'
import { useState, useEffect, useMemo } from 'react'
import styles from './admin.module.css'
import BolaoEsporteEditor from '@/components/admin/BolaoEsporteEditor'
import { getCompeticao } from '@/lib/competicoes'

// ── Tipos ────────────────────────────────────────────────────────────────────
interface BolaoEsporte {
  id: string; slug: string; nome: string; competicao: string; fonte?: string
  valor_cota: number; taxa_admin: number; total_cotas: number
  ativo: boolean; encerrado: boolean
}
interface Jogo {
  id: string; time_casa: string; time_fora: string
  bandeira_casa?: string; bandeira_fora?: string
  data_jogo?: string; hora_jogo?: string
  fase: string; grupo?: string; ordem: number
  gol_casa?: number | null; gol_fora?: number | null; encerrado: boolean
}
interface RankingPart { id: string; nome: string; pontos_total: number }
interface Participante {
  id: string; nome: string; telefone: string; email?: string
  total: number; status: 'aguardando'|'pago'|'cancelado'
  created_at: string; pontos_total?: number
}

// ── Helpers para parsear dados brutos da FIFA (replicados do backend) ────────
interface FifaTeam { TeamName?: Array<{ Description: string }>; ShortClubName?: string; Abbreviation?: string; IdCountry?: string }
interface FifaLocale { Locale: string; Description: string }
interface FifaMatch { IdMatch: string; Date: string; Home: FifaTeam; Away: FifaTeam; IdGroup: string; MatchNumber: number; StageName?: FifaLocale[]; GroupName?: FifaLocale[] }

const FIFA_TO_ISO: Record<string, string> = {
  BRA:'br', ARG:'ar', URU:'uy', COL:'co', CHI:'cl', PAR:'py', BOL:'bo', ECU:'ec', PER:'pe', VEN:'ve',
  MEX:'mx', USA:'us', CAN:'ca', CRC:'cr', PAN:'pa', HON:'hn', SLV:'sv', JAM:'jm', TRI:'tt',
  GER:'de', FRA:'fr', ESP:'es', POR:'pt', ENG:'gb-eng', ITA:'it', NED:'nl', BEL:'be',
  CRO:'hr', SRB:'rs', POL:'pl', DEN:'dk', SUI:'ch', AUT:'at', UKR:'ua', HUN:'hu',
  CZE:'cz', SVK:'sk', ALB:'al', SVN:'si', TUR:'tr', ROU:'ro', GEO:'ge', GRE:'gr',
  SCO:'gb-sct', WAL:'gb-wls', KOR:'kr', JPN:'jp', PRK:'kp', KSA:'sa', AUS:'au',
  IRN:'ir', IRQ:'iq', QAT:'qa', CHN:'cn', IDN:'id', NZL:'nz', PHI:'ph', IND:'in',
  MAR:'ma', SEN:'sn', GHA:'gh', CMR:'cm', TUN:'tn', EGY:'eg', NGA:'ng', MLI:'ml',
  CPV:'cv', CIV:'ci', RSA:'za', ANG:'ao', ZAM:'zm', BIH:'ba', ISL:'is', FIN:'fi', NOR:'no', SWE:'se',
  ALG:'dz', NIG:'ne', MOZ:'mz', TAN:'tz', BEN:'bj', GUI:'gn', COD:'cd', CUW:'cw', HAI:'ht', JOR:'jo', UZB:'uz',
}

const FASE_ORDEM: Record<string, number> = {
  'Fase de Grupos': 1, 'Segundas de final': 2, 'Oitavas de final': 3,
  'Quartas de final': 4, 'Semifinal': 5, 'Decisão do 3º lugar': 6, 'Final': 7,
}

function getNome(team: FifaTeam): string {
  if (Array.isArray(team?.TeamName) && team.TeamName.length > 0) return team.TeamName[0].Description || ''
  return team?.ShortClubName || team?.Abbreviation || ''
}
function getFasePtBR(stageName?: FifaLocale[]): string {
  if (!stageName) return 'Fase de Grupos'
  const pt = stageName.find(s => s.Locale === 'pt-BR')?.Description || stageName[0]?.Description || ''
  if (pt.toLowerCase().includes('primeira') || pt.toLowerCase().includes('grupo')) return 'Fase de Grupos'
  return pt || 'Fase de Grupos'
}
function getGrupoPtBR(groupName?: FifaLocale[]): string | null {
  if (!groupName || groupName.length === 0) return null
  return groupName.find(s => s.Locale === 'pt-BR')?.Description || groupName[0]?.Description || null
}
function parseFifaDate(dateStr: string): { data: string; hora: string } {
  if (!dateStr) return { data: '', hora: '' }
  const d = new Date(dateStr)
  const br = new Date(d.getTime() - 3 * 60 * 60 * 1000)
  return { data: br.toISOString().slice(0, 10), hora: br.toISOString().slice(11, 16) }
}

// Jogo processado para exibição no seletor
interface JogoPreview {
  id: string
  nomeCasa: string; nomeFora: string
  isoCasa: string; isoFora: string
  data: string; hora: string
  fase: string; grupo: string | null
  ordem: number
  raw: FifaMatch  // mantém o dado bruto para enviar ao backend
}

function processarFifaMatch(j: FifaMatch): JogoPreview | null {
  const nomeCasa = getNome(j.Home)
  const nomeFora = getNome(j.Away)
  if (!nomeCasa || !nomeFora) return null
  const { data, hora } = parseFifaDate(j.Date)
  const fase = getFasePtBR(j.StageName)
  return {
    id: j.IdMatch,
    nomeCasa, nomeFora,
    isoCasa: FIFA_TO_ISO[j.Home?.IdCountry || ''] || '',
    isoFora: FIFA_TO_ISO[j.Away?.IdCountry || ''] || '',
    data, hora, fase,
    grupo: getGrupoPtBR(j.GroupName),
    ordem: (FASE_ORDEM[fase] || 1) * 1000 + (j.MatchNumber || 0),
    raw: j,
  }
}

function formatData(d?: string) {
  if (!d) return ''
  const [, m, day] = d.split('-')
  return `${day}/${m}`
}

// ── Seletor de Jogos FIFA ─────────────────────────────────────────────────────
interface SeletorProps {
  jogosDisponiveis: JogoPreview[]
  onConfirmar: (selecionados: FifaMatch[]) => void
  onFechar: () => void
}

function SeletorJogosFifa({ jogosDisponiveis, onConfirmar, onFechar }: SeletorProps) {
  const [sel, setSel]         = useState<Set<string>>(() => new Set(jogosDisponiveis.map(j => j.id)))
  const [filtro, setFiltro]   = useState('')

  const fases = useMemo(() => {
    const grupos: Record<string, JogoPreview[]> = {}
    for (const j of jogosDisponiveis) {
      if (!grupos[j.fase]) grupos[j.fase] = []
      grupos[j.fase].push(j)
    }
    return Object.entries(grupos).sort((a, b) => (FASE_ORDEM[a[0]] || 9) - (FASE_ORDEM[b[0]] || 9))
  }, [jogosDisponiveis])

  const filtrado = useMemo(() => {
    const q = filtro.toLowerCase()
    if (!q) return jogosDisponiveis
    return jogosDisponiveis.filter(j =>
      j.nomeCasa.toLowerCase().includes(q) ||
      j.nomeFora.toLowerCase().includes(q) ||
      j.fase.toLowerCase().includes(q) ||
      (j.grupo || '').toLowerCase().includes(q)
    )
  }, [jogosDisponiveis, filtro])

  function toggleJogo(id: string) {
    setSel(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  function toggleFase(fase: string, marcar: boolean) {
    setSel(prev => {
      const n = new Set(prev)
      jogosDisponiveis.filter(j => j.fase === fase).forEach(j => marcar ? n.add(j.id) : n.delete(j.id))
      return n
    })
  }
  function toggleTodos(marcar: boolean) {
    setSel(marcar ? new Set(jogosDisponiveis.map(j => j.id)) : new Set())
  }

  function confirmar() {
    const ids = sel
    onConfirmar(jogosDisponiveis.filter(j => ids.has(j.id)).map(j => j.raw))
  }

  const jogosFiltradosPorFase = useMemo(() => {
    const q = filtro.toLowerCase()
    if (!q) return fases
    return fases.map(([fase, jogos]) => [fase, jogos.filter(j =>
      j.nomeCasa.toLowerCase().includes(q) || j.nomeFora.toLowerCase().includes(q) ||
      (j.grupo || '').toLowerCase().includes(q)
    )] as [string, JogoPreview[]]).filter(([, jogos]) => jogos.length > 0)
  }, [fases, filtro])

  return (
    <div className={styles.fifaModal} onClick={e => { if (e.target === e.currentTarget) onFechar() }}>
      <div className={styles.fifaSheet}>
        <div className={styles.fifaSheetHeader}>
          <div className={styles.fifaSheetTitle}>
            <span>🌐 Selecionar Jogos — {jogosDisponiveis.length} disponíveis</span>
            <button type="button" onClick={onFechar} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94A3B8' }}>✕</button>
          </div>
          <div className={styles.fifaSheetControls}>
            <input
              className={styles.fifaSearchInput}
              placeholder="Filtrar por time, fase ou grupo…"
              value={filtro}
              onChange={e => setFiltro(e.target.value)}
            />
            <button type="button" className={styles.fifaBtnSmall} onClick={() => toggleTodos(true)}>✓ Todos</button>
            <button type="button" className={styles.fifaBtnSmall} onClick={() => toggleTodos(false)}>✗ Nenhum</button>
          </div>
        </div>

        <div className={styles.fifaSheetBody}>
          {jogosFiltradosPorFase.map(([fase, jogos]) => (
            <div key={fase} className={styles.fifaFaseGroup}>
              <div className={styles.fifaFaseHeader}>
                <span className={styles.fifaFaseTitle}>{fase} ({jogos.length})</span>
                <div className={styles.fifaFaseBtns}>
                  <button type="button" className={styles.fifaBtnSmall} onClick={() => toggleFase(fase, true)}>✓ todos</button>
                  <button type="button" className={styles.fifaBtnSmall} onClick={() => toggleFase(fase, false)}>✗ nenhum</button>
                </div>
              </div>
              {jogos.map(j => (
                <label key={j.id} className={styles.fifaJogoCheck}>
                  <input type="checkbox" checked={sel.has(j.id)} onChange={() => toggleJogo(j.id)} />
                  <div className={styles.fifaJogoTxt}>
                    <div className={styles.fifaJogoNomes}>
                      {j.isoCasa && <span className={`fi fi-${j.isoCasa}`} style={{ marginRight: 4 }} />}
                      {j.nomeCasa}
                      <span style={{ color: '#94A3B8', margin: '0 6px', fontSize: 11 }}>×</span>
                      {j.nomeFora}
                      {j.isoFora && <span className={`fi fi-${j.isoFora}`} style={{ marginLeft: 4 }} />}
                    </div>
                    <div className={styles.fifaJogoData}>
                      {j.grupo ? `Grupo ${j.grupo} · ` : ''}
                      {j.data ? `${formatData(j.data)} ${j.hora}` : 'Data a definir'}
                    </div>
                  </div>
                </label>
              ))}
            </div>
          ))}
          {filtrado.length === 0 && <div style={{ color: '#94A3B8', padding: '24px 0', textAlign: 'center', fontSize: 13 }}>Nenhum jogo encontrado para &ldquo;{filtro}&rdquo;</div>}
        </div>

        <div className={styles.fifaSheetFooter}>
          <span className={styles.fifaCount}>{sel.size} jogo{sel.size !== 1 ? 's' : ''} selecionado{sel.size !== 1 ? 's' : ''}</span>
          <button type="button" className={styles.fifaBtnSmall} onClick={onFechar}>Cancelar</button>
          <button type="button" className={styles.btnFifaImport} onClick={confirmar} disabled={sel.size === 0}>
            ✅ Importar {sel.size > 0 ? sel.size : ''} jogo{sel.size !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function EsporteAdmin() {
  const [boloes, setBoloes]               = useState<BolaoEsporte[]>([])
  const [bolaoSel, setBolaoSel]           = useState<BolaoEsporte | null>(null)
  const [jogos, setJogos]                 = useState<Jogo[]>([])
  const [ranking, setRanking]             = useState<RankingPart[]>([])
  const [participantes, setParticipantes] = useState<Participante[]>([])
  const [show, setShow]                   = useState(true)
  const [aba, setAba]                     = useState<'jogos'|'participantes'|'ranking'|'novo'>('jogos')
  const [editorAberto, setEditorAberto]   = useState<'novo'|'editar'|null>(null)

  // Form novo jogo
  const [jCasa, setJCasa]   = useState('')
  const [jFora, setJFora]   = useState('')
  const [jBCasa, setJBCasa] = useState('')
  const [jBFora, setJBFora] = useState('')
  const [jData, setJData]   = useState('')
  const [jHora, setJHora]   = useState('')
  const [jFase, setJFase]   = useState('Fase de Grupos')
  const [jGrupo, setJGrupo] = useState('')
  const [addingJ, setAddingJ] = useState(false)

  // Importação / seletor
  const [importMsg, setImportMsg]         = useState('')
  const [importando, setImportando]       = useState(false)
  const [buscandoFifa, setBuscandoFifa]   = useState(false)
  const [jogosPreview, setJogosPreview]   = useState<JogoPreview[] | null>(null)

  // Editar bolão
  const [editNome, setEditNome]   = useState('')
  const [editValor, setEditValor] = useState('')
  const [editTaxa, setEditTaxa]   = useState('')
  const [editAtivo, setEditAtivo] = useState(true)
  const [salvando, setSalvando]   = useState(false)
  const [editMsg, setEditMsg]     = useState('')

  // Resultado
  const [resId, setResId]   = useState('')
  const [resGC, setResGC]   = useState('')
  const [resGF, setResGF]   = useState('')
  const [savingR, setSavingR] = useState(false)
  const [resMsg, setResMsg]   = useState('')

  async function carregar() {
    const d = await fetch('/api/esporte/boloes').then(r => r.json())
    setBoloes(d.boloes || [])
  }

  async function selBolao(b: BolaoEsporte) {
    setBolaoSel(b)
    setEditNome(b.nome); setEditValor(String(b.valor_cota)); setEditTaxa(String(b.taxa_admin)); setEditAtivo(b.ativo)
    setAba('jogos'); setResId('')
    const [jd, rd, pd] = await Promise.all([
      fetch(`/api/esporte/jogos?bolao=${b.slug}`).then(r => r.json()),
      fetch(`/api/esporte/ranking?bolao=${b.slug}`).then(r => r.json()),
      fetch(`/api/esporte/participantes?bolao=${b.slug}&admin=1`).then(r => r.json()),
    ])
    setJogos(jd.jogos || [])
    setRanking(rd.ranking || [])
    setParticipantes(pd.participantes || [])
  }

  useEffect(() => { if (show) carregar() }, [show])


  async function excluirBolao() {
    if (!bolaoSel) return
    if (!confirm(`Excluir "${bolaoSel.nome}" e TODOS os seus jogos? Esta ação não pode ser desfeita.`)) return
    await fetch('/api/esporte/boloes', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ slug: bolaoSel.slug }) })
    setBolaoSel(null); await carregar()
  }

  async function addJogo() {
    if (!bolaoSel || !jCasa || !jFora) return
    setAddingJ(true)
    await fetch('/api/esporte/jogos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bolao_slug: bolaoSel.slug, time_casa: jCasa, time_fora: jFora, bandeira_casa: jBCasa || null, bandeira_fora: jBFora || null, data_jogo: jData || null, hora_jogo: jHora || null, fase: jFase, grupo: jGrupo || null, ordem: jogos.length + 1 }),
    })
    setAddingJ(false)
    setJCasa(''); setJFora(''); setJBCasa(''); setJBFora(''); setJData(''); setJHora(''); setJGrupo('')
    if (bolaoSel) await selBolao(bolaoSel)
  }

  // Passo 1: busca agenda na FIFA e abre o seletor
  async function abrirSeletor() {
    if (!bolaoSel) return
    setBuscandoFifa(true); setImportMsg('Conectando à API da FIFA…')
    try {
      const params = new URLSearchParams({ idCompetition: '17', idSeason: '285023', count: '200', language: 'pt' })
      const r = await fetch(`https://api.fifa.com/api/v3/calendar/matches?${params}`)
      if (!r.ok) throw new Error(`FIFA API retornou ${r.status}`)
      const d = await r.json()
      const agora = new Date()
      const futuros = (d.Results || [] as FifaMatch[])
        .filter((j: FifaMatch) => j.Date && new Date(j.Date) > agora)
        .map(processarFifaMatch)
        .filter((j: JogoPreview | null): j is JogoPreview => j !== null)
        .sort((a: JogoPreview, b: JogoPreview) => a.ordem - b.ordem)
      setImportMsg('')
      setJogosPreview(futuros)
    } catch (e) {
      setImportMsg('❌ Erro ao buscar jogos: ' + String(e))
    }
    setBuscandoFifa(false)
  }

  // Passo 2: confirma os jogos selecionados e importa
  async function importarSelecionados(selecionados: FifaMatch[]) {
    if (!bolaoSel) return
    setJogosPreview(null)
    setImportando(true); setImportMsg(`Salvando ${selecionados.length} jogos…`)
    try {
      // Limpa jogos existentes
      await fetch(`/api/esporte/limpar-jogos?bolao=${bolaoSel.slug}`, { method: 'DELETE' })

      const res = await fetch('/api/esporte/importar-jogos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bolao_slug: bolaoSel.slug, sobrescrever: true, jogos: selecionados }),
      }).then(r => r.json())

      if (res.ok) {
        setImportMsg(`✅ ${res.importados} jogo${res.importados !== 1 ? 's' : ''} importado${res.importados !== 1 ? 's' : ''} com sucesso`)
        await selBolao(bolaoSel)
      } else {
        setImportMsg('❌ ' + (res.error || 'Erro ao salvar'))
      }
    } catch (e) {
      setImportMsg('❌ Erro: ' + String(e))
    }
    setImportando(false)
    setTimeout(() => setImportMsg(''), 6000)
  }

  async function delJogo(id: string) {
    if (!confirm('Remover jogo?')) return
    await fetch('/api/esporte/jogos', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    if (bolaoSel) await selBolao(bolaoSel)
  }

  async function salvarRes() {
    if (!resId || resGC === '' || resGF === '') { setResMsg('⚠️ Informe o placar'); return }
    setSavingR(true); setResMsg('')
    const res = await fetch('/api/esporte/resultado', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jogo_id: resId, gol_casa: parseInt(resGC), gol_fora: parseInt(resGF) }),
    }).then(r => r.json())
    setSavingR(false)
    if (res.ok) {
      setResMsg(`✅ ${res.atualizados} palpites atualizados`)
      setResId(''); setResGC(''); setResGF('')
      if (bolaoSel) await selBolao(bolaoSel)
    } else setResMsg('❌ ' + res.error)
    setTimeout(() => setResMsg(''), 4000)
  }

  const jogoResSel = jogos.find(j => j.id === resId)

  return (
    <div className={styles.panel}>
      <div className={styles.histHeader}>
        <div>
          <div className={styles.panelTitle}>⚽ Bolões Esportivos</div>
          <div className={styles.histSubtitle}>Copa, Brasileirão, Libertadores e mais</div>
        </div>
        <button type="button" className={styles.btnAcao} onClick={() => setShow(s => !s)}>
          {show ? 'Fechar' : 'Gerenciar'}
        </button>
      </div>

      {/* Modal de seleção de jogos FIFA */}
      {jogosPreview && (
        <SeletorJogosFifa
          jogosDisponiveis={jogosPreview}
          onConfirmar={importarSelecionados}
          onFechar={() => setJogosPreview(null)}
        />
      )}

      {show && (
        <div className={styles.esporteWrap}>

          {/* Lista de bolões */}
          <div className={styles.esporteBoloesList}>
            {boloes.map(b => (
              <button key={b.slug} type="button"
                className={`${styles.esporteBolaoBtn} ${bolaoSel?.slug === b.slug ? styles.esporteBolaoBtnAtivo : ''}`}
                onClick={() => selBolao(b)}>
                <div className={styles.esporteBolaoBtnNome}>{b.nome}</div>
                <div className={styles.esporteBolaoBtnMeta}>
                  {(() => { const c = getCompeticao(b.competicao); return c ? c.label : b.competicao })()}
                  {' · '}R$ {Number(b.valor_cota).toFixed(2).replace('.', ',')}
                </div>
              </button>
            ))}
            <button type="button" className={styles.btnAcao} onClick={() => { setAba('novo'); setBolaoSel(null) }}>
              + Novo bolão
            </button>
          </div>

          {/* Tabs */}
          {bolaoSel && (
            <>
              <div className={styles.esporteTabs}>
                {(['jogos','participantes','ranking'] as const).map(t => (
                  <button key={t} type="button"
                    className={`${styles.esporteTab} ${aba === t ? styles.esporteTabAtivo : ''}`}
                    onClick={() => setAba(t)}>
                    {t === 'jogos' ? '⚽ Jogos' : t === 'participantes' ? '👥 Participantes' : '🏆 Ranking'}
                  </button>
                ))}
              </div>

              <div className={styles.esporteLinkBox}>
                <span className={styles.esporteLinkLabel}>Link público</span>
                <a href={`/esporte/${bolaoSel.slug}`} target="_blank" rel="noopener noreferrer" className={styles.esporteLinkUrl}>
                  /esporte/{bolaoSel.slug}
                </a>
              </div>

              {/* Editar bolão — editor completo */}
              {editorAberto === 'editar' ? (
                <BolaoEsporteEditor
                  bolao={bolaoSel}
                  onSaved={b => { carregar(); setBolaoSel(b as BolaoEsporte); setEditorAberto(null) }}
                  onCancel={() => setEditorAberto(null)}
                />
              ) : (
                <div className={styles.esporteEditBtns} style={{ marginBottom: 12 }}>
                  <button type="button" className={styles.btnSalvar} onClick={() => setEditorAberto('editar')}>
                    ✏️ Editar bolão
                  </button>
                  <button type="button" className={styles.btnPerigo} onClick={excluirBolao}>
                    🗑 Excluir bolão
                  </button>
                </div>
              )}

              {/* ── Calculadora de Arrecadação ── */}
              {(() => {
                const valorCota  = Number(bolaoSel.valor_cota)
                const taxa       = Number(bolaoSel.taxa_admin) / 100
                const totalCotas = Number(bolaoSel.total_cotas)
                const pagos      = participantes.filter(p => p.status === 'pago').length

                const prevista      = totalCotas * valorCota
                const prevLiq       = prevista * (1 - taxa)
                const real          = pagos * valorCota
                const realLiq       = real * (1 - taxa)
                const pct           = totalCotas > 0 ? Math.round((pagos / totalCotas) * 100) : 0

                const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })

                return (
                  <div className={styles.esporteCalcWrap}>
                    <div className={styles.esporteCalcTitle}>💰 Calculadora de Arrecadação</div>
                    <div className={styles.esporteCalcGrid}>
                      <div className={styles.esporteCalcCard}>
                        <div className={styles.esporteCalcLabel}>Prevista</div>
                        <div className={styles.esporteCalcSub}>{totalCotas} cotas × {fmt(valorCota)}</div>
                        <div className={styles.esporteCalcBruto}>{fmt(prevista)}</div>
                        <div className={styles.esporteCalcLiq}>
                          Líquido ({100 - bolaoSel.taxa_admin}%): <strong>{fmt(prevLiq)}</strong>
                        </div>
                      </div>
                      <div className={`${styles.esporteCalcCard} ${styles.esporteCalcCardReal}`}>
                        <div className={styles.esporteCalcLabel}>Real (pagos)</div>
                        <div className={styles.esporteCalcSub}>{pagos} pago{pagos !== 1 ? 's' : ''} · {pct}% vendido</div>
                        <div className={styles.esporteCalcBruto}>{fmt(real)}</div>
                        <div className={styles.esporteCalcLiq}>
                          Líquido ({100 - bolaoSel.taxa_admin}%): <strong>{fmt(realLiq)}</strong>
                        </div>
                      </div>
                    </div>
                    <div className={styles.esporteCalcBar}>
                      <div className={styles.esporteCalcBarFill} style={{ width: `${pct}%` }} />
                    </div>
                    <div className={styles.esporteCalcBarLabel}>
                      {pagos}/{totalCotas} cotas vendidas
                      {bolaoSel.taxa_admin > 0 && <span> · Taxa admin {bolaoSel.taxa_admin}% = {fmt(real * taxa)} (real) / {fmt(prevista * taxa)} (prevista)</span>}
                    </div>
                  </div>
                )
              })()}
            </>
          )}

          {/* ABA JOGOS */}
          {bolaoSel && aba === 'jogos' && (
            <div className={styles.esporteJogosWrap}>

              {/* Importar da FIFA — só para bolões com fonte FIFA */}
              {(() => {
                const comp = getCompeticao(bolaoSel.competicao)
                const isFifa = (bolaoSel.fonte ?? comp?.fonte) === 'fifa'
                if (!isFifa) return null
                return (
                  <div className={styles.esporteImportWrap}>
                    <button type="button" className={styles.btnAcao}
                      onClick={abrirSeletor}
                      disabled={buscandoFifa || importando}>
                      {buscandoFifa ? 'Buscando jogos…' : `🌐 Importar jogos — ${comp?.label ?? 'FIFA'}`}
                    </button>
                    {importMsg && <div className={styles.esporteImportMsg}>{importMsg}</div>}
                  </div>
                )
              })()}

              {/* Lista de jogos */}
              {jogos.length === 0 && <div className={styles.empty}>Nenhum jogo cadastrado. Adicione manualmente ou importe da API.</div>}
              {jogos.map(j => (
                <div key={j.id} className={`${styles.esporteJogoRow} ${j.encerrado ? styles.esporteJogoEncerrado : ''} ${resId === j.id ? styles.esporteJogoSelecionado : ''}`}>
                  <div className={styles.esporteJogoInfo}>
                    <div className={styles.esporteJogoTimes}>
                      <span>{j.bandeira_casa && <span className={`fi fi-${j.bandeira_casa}`} style={{ marginRight: 4 }} />}{j.time_casa}</span>
                      <span className={styles.esporteJogoVs}>×</span>
                      <span>{j.time_fora}{j.bandeira_fora && <span className={`fi fi-${j.bandeira_fora}`} style={{ marginLeft: 4 }} />}</span>
                      {j.encerrado && j.gol_casa !== null && (
                        <span className={styles.esporteJogoResultado}>{j.gol_casa}–{j.gol_fora}</span>
                      )}
                    </div>
                    <div className={styles.esporteJogoMeta}>
                      {j.fase}{j.grupo ? ` · Grupo ${j.grupo}` : ''}{j.data_jogo ? ` · ${formatData(j.data_jogo)}` : ''}{j.hora_jogo ? ` ${j.hora_jogo}` : ''}
                    </div>
                  </div>
                  <div className={styles.esporteJogoAcoes}>
                    {!j.encerrado && (
                      <button type="button"
                        className={`${styles.esporteJogoBtnRes} ${resId === j.id ? styles.esporteJogoBtnResAtivo : ''}`}
                        onClick={() => setResId(resId === j.id ? '' : j.id)}>
                        Resultado
                      </button>
                    )}
                    <button type="button" className={styles.esporteJogoBtnDel} onClick={() => delJogo(j.id)}>✕</button>
                  </div>
                </div>
              ))}

              {/* Painel de resultado */}
              {resId && jogoResSel && (
                <div className={styles.esporteResPanel}>
                  <div className={styles.esporteResTitulo}>
                    Lançar resultado — <span className={`fi fi-${jogoResSel.bandeira_casa}`} style={{ marginRight: 3 }} />{jogoResSel.time_casa} × {jogoResSel.time_fora} <span className={`fi fi-${jogoResSel.bandeira_fora}`} style={{ marginLeft: 3 }} />
                  </div>
                  <div className={styles.esporteResRow}>
                    <input type="number" min={0} max={99} value={resGC} onChange={e => setResGC(e.target.value)} placeholder="0" className={styles.esporteGolInput} />
                    <span className={styles.esporteResX}>×</span>
                    <input type="number" min={0} max={99} value={resGF} onChange={e => setResGF(e.target.value)} placeholder="0" className={styles.esporteGolInput} />
                    <button type="button" onClick={salvarRes} disabled={savingR} className={styles.btnSalvar} style={{ flex: 1 }}>
                      {savingR ? 'Salvando…' : '✅ Salvar resultado'}
                    </button>
                    <button type="button" onClick={() => { setResId(''); setResGC(''); setResGF('') }} className={styles.btnCancelar}>
                      Cancelar
                    </button>
                  </div>
                  {resMsg && <div className={resMsg.startsWith('✅') ? styles.msgOk : styles.msgErro}>{resMsg}</div>}
                </div>
              )}

              {/* Form adicionar jogo manualmente */}
              <div className={styles.esporteAddJogoForm}>
                <div className={styles.esporteFormTitle}>+ Adicionar jogo manualmente</div>
                <div className={styles.esporteFormGrid2}>
                  <input value={jCasa} onChange={e => setJCasa(e.target.value)} placeholder="Time casa (ex: Brasil)" className={styles.configInput} />
                  <input value={jFora} onChange={e => setJFora(e.target.value)} placeholder="Time fora (ex: México)" className={styles.configInput} />
                  <input value={jBCasa} onChange={e => setJBCasa(e.target.value)} placeholder="Bandeira casa (ex: br)" className={styles.configInput} />
                  <input value={jBFora} onChange={e => setJBFora(e.target.value)} placeholder="Bandeira fora (ex: mx)" className={styles.configInput} />
                  <input type="date" value={jData} onChange={e => setJData(e.target.value)} className={styles.configInput} />
                  <input type="time" value={jHora} onChange={e => setJHora(e.target.value)} className={styles.configInput} />
                  <input value={jFase} onChange={e => setJFase(e.target.value)} placeholder="Fase" className={styles.configInput} />
                  <input value={jGrupo} onChange={e => setJGrupo(e.target.value)} placeholder="Grupo (A, B…)" className={styles.configInput} />
                </div>
                <button type="button" onClick={addJogo} disabled={addingJ || !jCasa || !jFora} className={styles.btnSalvar} style={{ width: '100%', marginTop: 8 }}>
                  {addingJ ? 'Adicionando…' : '+ Adicionar jogo'}
                </button>
              </div>
            </div>
          )}

          {/* ABA PARTICIPANTES */}
          {bolaoSel && aba === 'participantes' && (
            <div className={styles.esportePartWrap}>
              <div className={styles.esportePartHeader}>
                <span>{participantes.length} inscrito{participantes.length !== 1 ? 's' : ''}</span>
                <span style={{ color: '#00C46A' }}>{participantes.filter(p => p.status === 'pago').length} pagos</span>
                <span style={{ color: '#f87171' }}>{participantes.filter(p => p.status === 'aguardando').length} aguardando</span>
              </div>
              {participantes.length === 0
                ? <div className={styles.empty}>Nenhum participante ainda.</div>
                : participantes.map(p => {
                  const dt = new Date(p.created_at)
                  const dataFmt = dt.toLocaleDateString('pt-BR') + ' ' + dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                  return (
                    <div key={p.id} className={styles.esportePartRow}>
                      <div className={styles.esportePartInfo}>
                        <span className={styles.esportePartNome}>{p.nome}</span>
                        <span className={styles.esportePartMeta}>{p.telefone}{p.email ? ` · ${p.email}` : ''}</span>
                        <span className={styles.esportePartData}>{dataFmt}</span>
                      </div>
                      <div className={styles.esportePartRight}>
                        <span className={`${styles.esportePartStatus} ${p.status === 'pago' ? styles.esportePartPago : styles.esportePartAguardando}`}>
                          {p.status === 'pago' ? '✅ Pago' : '⏳ Aguardando'}
                        </span>
                        <span className={styles.esportePartValor}>R$ {Number(p.total).toFixed(2).replace('.', ',')}</span>
                        {p.status !== 'pago' && (
                          <button type="button" className={styles.btnConfirmarPag}
                            onClick={async () => {
                              if (!confirm(`Confirmar pagamento em dinheiro de ${p.nome}?`)) return
                              await fetch(`/api/esporte/participantes/${p.id}`, {
                                method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: 'pago' }),
                              })
                              const pd = await fetch(`/api/esporte/participantes?bolao=${bolaoSel!.slug}&admin=1`).then(r => r.json())
                              setParticipantes(pd.participantes || [])
                            }}
                          >
                            💵 Confirmar pagamento
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              }
            </div>
          )}

          {/* ABA RANKING */}
          {bolaoSel && aba === 'ranking' && (
            <div className={styles.esporteRankingWrap}>
              {ranking.length === 0
                ? <div className={styles.empty}>Nenhum participante pago ainda.</div>
                : ranking.map((p, i) => (
                  <div key={p.id} className={styles.esporteRankRow}>
                    <div className={`${styles.esporteRankPos} ${i === 0 ? styles.esporteRankGold : i === 1 ? styles.esporteRankSilver : i === 2 ? styles.esporteRankBronze : ''}`}>
                      {i + 1}
                    </div>
                    <div className={styles.esporteRankNome}>{p.nome}</div>
                    <div className={styles.esporteRankPts}>{p.pontos_total} pts</div>
                  </div>
                ))
              }
            </div>
          )}

          {/* ABA NOVO BOLÃO → editor completo */}
          {aba === 'novo' && (
            <BolaoEsporteEditor
              onSaved={b => { carregar(); setBolaoSel(b as BolaoEsporte); setAba('jogos') }}
              onCancel={() => setAba('jogos')}
            />
          )}

        </div>
      )}
    </div>
  )
}
