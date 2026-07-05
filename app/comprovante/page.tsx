'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import styles from './comprovante.module.css'

interface ApostasData {
  bets: number[][]
  transacao_id: string
  compra_id: string
  data_compra: string
  hora_compra: string
  situacao: string
  total_apostas: number
}

interface ResultadoConf {
  status: string
  dezenas_sorteadas?: number[]
  resumo?: { senas: number; quinas: number; quadras: number }
  maior_premio?: string | null
  total_premiadas?: number
  apostas_premiadas?: { idx: number; dezenas: number[]; acertos: number; premio: string }[]
}

interface Bolao {
  id: string
  nome: string
  slug: string
  valor_cota: number
  total_cotas: number
  dezenas: number
  num_apostas: number
  encerrado: boolean
  loteria?: string
  apostas_data?: ApostasData | null
  resultado_conferencia?: ResultadoConf | null
}

interface Participante {
  id: string
  nome: string
  cotas: string[]
  total: number
  status: string
  telefone?: string
  acrescimo?: number | null
  created_at: string
}

// ── Bolão esportivo ──
interface PalpiteDetalhado {
  jogo_id: string
  time_casa: string
  time_fora: string
  gol_casa_real: number | null
  gol_fora_real: number | null
  palpite_casa: number
  palpite_fora: number
  pontos: number | null
  encerrado: boolean
  fase: string
  data_jogo: string | null
  hora_jogo: string | null
}
interface ParticipanteEsporte {
  id: string; nome: string; telefone?: string; total: number
  status: string; pontos_total: number | null; created_at: string
  numero: number
  palpites: PalpiteDetalhado[]
}
interface BolaoEsporte {
  nome: string; slug: string; competicao?: string; valor_cota: number; encerrado: boolean
}

function formatTel(tel: string | undefined) {
  if (!tel) return '—'
  const n = tel.replace(/\D/g, '').replace(/^55/, '')
  if (n.length === 11) return `(${n.slice(0,2)}) ${n.slice(2,7)}-${n.slice(7)}`
  if (n.length === 10) return `(${n.slice(0,2)}) ${n.slice(2,6)}-${n.slice(6)}`
  return tel
}

function whatsappShare(tel: string | undefined, nome: string, participanteId: string, slug: string, concurso: string) {
  if (!tel) return ''
  const n = tel.replace(/\D/g, '')
  const num = n.startsWith('55') ? n : `55${n}`
  const origin = typeof window !== 'undefined' ? window.location.origin : ''
  const link = `${origin}/comprovante?id=${participanteId}&pub=1&bolao=${slug}&concurso=${concurso}`
  const msg = encodeURIComponent(`🍀 Olá ${nome}! Segue seu comprovante de participação no Bolão Mega-Sena:\n${link}`)
  return `https://wa.me/${num}?text=${msg}`
}

/** Comprovante do bolão esportivo — palpite (jogo a jogo) em vez de cotas/dezenas. */
function ComprovanteEsporte({ bolao, participantes, modoPublico, modoFiltro, loading, grupoNome, router }: {
  bolao: BolaoEsporte | null
  participantes: ParticipanteEsporte[]
  modoPublico: boolean
  modoFiltro: boolean
  loading: boolean
  grupoNome: string
  router: { push: (href: string) => void }
}) {
  return (
    <div className={styles.page}>
      <div className={styles.controls}>
        <div className={styles.controlsLeft}>
          <h1 className={styles.pageTitle}>Comprovante de Participação</h1>
          <p className={styles.pageSubtitle}>{participantes.length} participante(s) · {bolao?.nome}</p>
        </div>
        <div className={styles.controlsRight}>
          {!modoPublico && (
            <button type="button" className={styles.btnBack} onClick={() => router.push('/admin')}>
              ← Voltar ao Admin
            </button>
          )}
          <button type="button" className={styles.btnPrint} onClick={() => window.print()}>
            {modoFiltro ? '🖨️ Imprimir / PDF' : '🖨️ Imprimir Todos'}
          </button>
        </div>
      </div>

      {loading ? (
        <p className={styles.loading}>Carregando participantes…</p>
      ) : participantes.length === 0 ? (
        <p className={styles.loading}>Nenhum participante encontrado para este bolão.</p>
      ) : (
        <div className={`${styles.grid} ${participantes.length === 1 ? styles.gridSingle : ''}`}>
          {participantes.map((p) => {
            const emissao = new Date(p.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
            const horario = new Date(p.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
            return (
              <div key={p.id} className={`${styles.cartao} ${p.status === 'pago' ? styles.pago : styles.pendente}`}>
                <div className={styles.cartaoHeader}>
                  <div className={styles.cartaoHeaderLeft}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/bm-circle.png" alt="BetMais" width={32} height={32} style={{ borderRadius: '50%' }} />
                    <div>
                      <div className={styles.cartaoGrupo}>{grupoNome}</div>
                      <div className={styles.cartaoBolao}>{bolao?.nome}</div>
                    </div>
                  </div>
                  <span className={p.status === 'pago' ? styles.statusBadgePago : styles.statusBadgePendente}>
                    {p.status === 'pago' ? '✅ PAGO' : '⏳ AGUARDANDO'}
                  </span>
                </div>

                <div className={styles.comprovanteLabel}>Comprovante de Participação</div>
                <div className={styles.divider} />

                <div className={styles.cartaoNomeRow}>
                  <span className={styles.cartaoLabel}>Participante</span>
                  <span className={styles.cartaoNome}>{p.nome}</span>
                </div>
                <div className={styles.cartaoRow}>
                  <span className={styles.cartaoLabel}>Telefone</span>
                  <span className={styles.cartaoValor}>{formatTel(p.telefone)}</span>
                </div>
                {p.pontos_total != null && (
                  <div className={styles.cartaoRow}>
                    <span className={styles.cartaoLabel}>Pontuação</span>
                    <span className={styles.cartaoConcurso}>{p.pontos_total} pts</span>
                  </div>
                )}

                <div className={styles.divider} />
                <div className={styles.cartaoRow}>
                  <span className={styles.cartaoLabel}>Valor pago</span>
                  <span className={styles.cartaoTotal}>R$ {Number(p.total).toFixed(2).replace('.', ',')}</span>
                </div>

                {p.palpites.length > 0 && (
                  <>
                    <div className={styles.divider} />
                    <div className={styles.apostasHeader}>
                      <span className={styles.cartaoLabel}>Palpites registrados — {p.palpites.length} jogos</span>
                    </div>
                    <div className={styles.apostasBets}>
                      {p.palpites.map(pl => (
                        <div key={pl.jogo_id} className={styles.apostaBet}>
                          <span className={styles.apostaBetNum} style={{ minWidth: 140 }}>
                            {pl.time_casa} × {pl.time_fora}
                          </span>
                          <span className={styles.apostaBetDezena}>
                            {pl.palpite_casa} – {pl.palpite_fora}
                          </span>
                          {pl.encerrado && pl.gol_casa_real != null && (
                            <span className={styles.apostaBetDezenaAcerto} style={{ borderRadius: 6, width: 'auto', padding: '2px 8px' }}>
                              real: {pl.gol_casa_real}–{pl.gol_fora_real} · {pl.pontos ?? 0}pt
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                <div className={styles.divider} />
                <div className={styles.cartaoFooter}>
                  <div className={styles.cartaoFooterInfo}>
                    Bolão: {typeof window !== 'undefined' ? window.location.host : ''}/esporte/{bolao?.slug}<br />
                    Emissão: {emissao} às {horario}
                  </div>
                  <div className={styles.cartaoNumero}>Nº {String(p.numero).padStart(3, '0')}</div>
                </div>
                <div className={styles.cartaoTermos}>
                  Pontuação premiada conforme regras do bolão. Prêmio dividido proporcionalmente entre os participantes premiados.
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function ComprovanteContent() {
  const router      = useRouter()
  const params      = useSearchParams()
  const filtroId    = params.get('id')
  const filtroIds   = params.get('ids')
  const paramBolao  = params.get('bolao')
  const paramConc   = params.get('concurso')
  const modoPublico = params.get('pub') === '1'   // acesso do participante (sem admin auth)
  const modoFiltro  = !!(filtroId || filtroIds)

  const [autorizado, setAutorizado]       = useState(modoPublico) // pub mode sempre autorizado
  const [boloes, setBoloes]               = useState<Bolao[]>([])
  const [bolao, setBolao]                 = useState<Bolao | null>(null)
  const [participantes, setParticipantes] = useState<Participante[]>([])
  const [concurso, setConcurso]           = useState(paramConc || '')
  const [dataSorteio, setDataSorteio]     = useState('')
  const [loading, setLoading]             = useState(true)
  const [grupoNome, setGrupoNome]         = useState('Bolões BetMais')

  // Bolão esportivo não tem concurso/dezenas — detectado à parte antes do fluxo de loteria
  const [tipo, setTipo]                             = useState<'loteria' | 'esporte' | null>(null)
  const [esporteBolao, setEsporteBolao]             = useState<BolaoEsporte | null>(null)
  const [esporteParticipantes, setEsporteParticipantes] = useState<ParticipanteEsporte[]>([])

  useEffect(() => {
    fetch('/api/config-publica').then(r => r.json()).then(d => {
      if (d?.app?.grupo_nome) setGrupoNome(d.app.grupo_nome)
    }).catch(() => {})
  }, [])

  const filtroSet = filtroIds ? new Set(filtroIds.split(',')) : null
  const lista = filtroId
    ? participantes.filter(p => p.id === filtroId)
    : filtroSet
      ? participantes.filter(p => filtroSet.has(p.id))
      : participantes

  useEffect(() => {
    // Sem parâmetros de participante → redireciona ao admin
    if (!modoPublico && !filtroId && !filtroIds && !paramBolao) {
      router.replace('/admin')
      return
    }
    if (modoPublico) return
    fetch('/api/admin/comprovante')
      .then(r => { if (r.status === 401) router.replace('/admin'); else setAutorizado(true) })
      .catch(() => router.replace('/admin'))
  }, [router, modoPublico, filtroId, filtroIds, paramBolao])

  // Detecta se o bolão referenciado é esportivo antes de seguir o fluxo de loteria
  // (concurso/dezenas não existem pro lado esporte — tentar tratar como loteria
  // simplesmente não encontra nada e a página fica em branco).
  useEffect(() => {
    if (!autorizado) return
    if (!filtroId && !paramBolao) { setTipo('loteria'); return }
    const qs = filtroId ? `id=${filtroId}` : `bolao=${paramBolao}`
    fetch(`/api/esporte/comprovante?${qs}`).then(r => r.json()).then(d => {
      if (d.bolao) {
        setTipo('esporte')
        setEsporteBolao(d.bolao)
        setEsporteParticipantes(d.participantes || [])
        setLoading(false)
      } else {
        setTipo('loteria')
      }
    }).catch(() => setTipo('loteria'))
  }, [autorizado, filtroId, paramBolao])

  useEffect(() => {
    if (!autorizado || tipo === 'esporte') return
    Promise.all([
      fetch('/api/boloes').then(r => r.json()),
      paramConc
        ? Promise.resolve({ concurso: paramConc, data: '' })
        : fetch('/api/concurso-ativo').then(r => r.json()),
    ]).then(([bd, cd]) => {
      const lista: Bolao[] = bd.boloes || []
      setBoloes(lista)
      if (!paramConc) setConcurso(cd.concurso || '')
      setDataSorteio(cd.data || '')
      const alvo = paramBolao ? lista.find(b => b.slug === paramBolao) : lista[0]
      setBolao(alvo ?? lista[0] ?? null)
    })
  }, [autorizado, tipo, paramBolao, paramConc])

  useEffect(() => {
    // Sem concurso fixado via link, deriva do proprio slug do bolao (ex: "3725" -> 3725,
    // "3026g2" -> 3026) em vez de manter o concurso ativo global — senao trocar de bolao
    // no seletor mantem o concurso errado para boloes antigos.
    if (tipo === 'esporte' || paramConc || !bolao) return
    const concursoDoSlug = bolao.slug.match(/^\d+/)?.[0]
    if (concursoDoSlug) setConcurso(concursoDoSlug)
  }, [tipo, bolao, paramConc])

  useEffect(() => {
    if (tipo === 'esporte' || !bolao || !concurso) return
    setLoading(true)
    fetch(`/api/participantes?concurso=${concurso}&bolao=${bolao.slug}`)
      .then(r => r.json())
      .then(d => { setParticipantes(d.participantes || []); setLoading(false) })
  }, [tipo, bolao, concurso])

  if (!autorizado) return null

  if (tipo === 'esporte') {
    return (
      <ComprovanteEsporte
        bolao={esporteBolao}
        participantes={filtroId ? esporteParticipantes.filter(p => p.id === filtroId) : esporteParticipantes}
        modoPublico={modoPublico}
        modoFiltro={modoFiltro}
        loading={loading}
        grupoNome={grupoNome}
        router={router}
      />
    )
  }

  return (
    <div className={styles.page}>

      {/* ── Controles ── */}
      <div className={styles.controls}>
        <div className={styles.controlsLeft}>
          <h1 className={styles.pageTitle}>Comprovante de Participação</h1>
          <p className={styles.pageSubtitle}>
            {lista.length} participante(s) · Concurso #{concurso} · {dataSorteio}
          </p>
        </div>
        <div className={styles.controlsRight}>
          {!modoPublico && (
            <button type="button" className={styles.btnBack} onClick={() => router.push('/admin')}>
              ← Voltar ao Admin
            </button>
          )}
          {!modoFiltro && !modoPublico && (
            <select
              className={styles.select}
              title="Selecionar bolão"
              value={bolao?.slug || ''}
              onChange={e => setBolao(boloes.find(b => b.slug === e.target.value) ?? null)}
            >
              {boloes.map(b => <option key={b.slug} value={b.slug}>{b.nome}</option>)}
            </select>
          )}
          <button type="button" className={styles.btnPrint} onClick={() => window.print()}>
            {modoFiltro ? '🖨️ Imprimir / PDF' : '🖨️ Imprimir Todos'}
          </button>
        </div>
      </div>

      {/* ── Conteúdo ── */}
      {loading ? (
        <p className={styles.loading}>Carregando participantes…</p>
      ) : lista.length === 0 ? (
        <p className={styles.loading}>Nenhum participante encontrado para este bolão.</p>
      ) : (

        /* ════ COMPROVANTE ════ */
        <div className={`${styles.grid} ${lista.length === 1 ? styles.gridSingle : ''}`}>
          {lista.map((p) => {
            // Posição na lista COMPLETA do bolão (ordem de inscrição), não na
            // lista filtrada — senão todo link individual mostraria "Nº 001".
            const idx = participantes.findIndex(x => x.id === p.id)
            const ad = bolao?.apostas_data ?? null
            const emissao = new Date(p.created_at).toLocaleDateString('pt-BR', {
              day: '2-digit', month: '2-digit', year: 'numeric',
            })
            const horario = new Date(p.created_at).toLocaleTimeString('pt-BR', {
              hour: '2-digit', minute: '2-digit',
            })
            return (
              <div key={p.id} className={`${styles.cartao} ${p.status === 'pago' ? styles.pago : styles.pendente}`}>

                {/* ══ CABEÇALHO — repete em cada página na impressão ══ */}
                <div className={styles.printHead}>
                <div className={styles.printRow}><div className={styles.printCell}>

                  <div className={styles.cartaoHeader}>
                    <div className={styles.cartaoHeaderLeft}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/bm-circle.png" alt="BetMais" width={32} height={32} style={{ borderRadius: '50%' }} />
                      <div>
                        <div className={styles.cartaoGrupo}>{grupoNome}</div>
                        <div className={styles.cartaoBolao}>{bolao?.nome}</div>
                      </div>
                    </div>
                    <span className={p.status === 'pago' ? styles.statusBadgePago : styles.statusBadgePendente}>
                      {p.status === 'pago' ? '✅ PAGO' : '⏳ AGUARDANDO'}
                    </span>
                  </div>

                  <div className={styles.comprovanteLabel}>Comprovante de Participação</div>
                  <div className={styles.divider} />

                  <div className={styles.cartaoNomeRow}>
                    <span className={styles.cartaoLabel}>Participante</span>
                    <span className={styles.cartaoNome}>{p.nome}</span>
                  </div>
                  <div className={styles.cartaoRow}>
                    <span className={styles.cartaoLabel}>Telefone</span>
                    <span className={styles.cartaoValor}>
                      {p.telefone && !modoPublico ? (
                        <a
                          href={whatsappShare(p.telefone, p.nome, p.id, bolao?.slug ?? '', concurso)}
                          target="_blank" rel="noopener noreferrer"
                          title="Enviar comprovante via WhatsApp"
                          className={styles.whatsappLink}
                        >
                          📱 {formatTel(p.telefone)}
                        </a>
                      ) : formatTel(p.telefone)}
                    </span>
                  </div>
                  <div className={styles.cartaoRow}>
                    <span className={styles.cartaoLabel}>Concurso</span>
                    <span className={styles.cartaoConcurso}>#{concurso}</span>
                  </div>

                  <div className={styles.cotasSection}>
                    <span className={styles.cartaoLabel}>
                      {p.cotas.length === 1 ? '1 cota adquirida' : `${p.cotas.length} cotas adquiridas`}
                      {bolao ? ` — de ${bolao.total_cotas} disponíveis` : ''}
                    </span>
                    <div className={styles.cotasGrid}>
                      {p.cotas.map(c => (
                        <span key={c} className={styles.cota}>Nº {c.padStart(2, '0')}</span>
                      ))}
                    </div>
                  </div>

                  <div className={styles.divider} />

                  <div className={styles.cartaoRow}>
                    <span className={styles.cartaoLabel}>Valor pago</span>
                    <span className={styles.cartaoTotal}>R$ {Number(p.total).toFixed(2).replace('.', ',')}</span>
                  </div>
                  {p.acrescimo && Number(p.acrescimo) > 0 && (
                    <div className={styles.cartaoRow}>
                      <span className={styles.cartaoLabel}>Acréscimo</span>
                      <span className={styles.cartaoAcrescimo}>+ R$ {Number(p.acrescimo).toFixed(2).replace('.', ',')}</span>
                    </div>
                  )}

                  {ad && (
                    <>
                      <div className={styles.divider} />
                      <div className={styles.apostasHeader}>
                        <span className={styles.cartaoLabel}>Apostas registradas — {ad.total_apostas} jogos</span>
                        {ad.compra_id && <span className={styles.apostasId}>Compra #{ad.compra_id}</span>}
                      </div>
                      {ad.transacao_id && (
                        <div className={styles.apostasTransacao}>
                          ID: {ad.transacao_id} · {ad.data_compra} {ad.hora_compra} · {ad.situacao}
                        </div>
                      )}
                    </>
                  )}

                </div></div>
                </div>

                {/* ══ CORPO — bets fluem entre páginas ══ */}
                <div className={styles.printBody}>
                <div className={styles.printRow}><div className={styles.printCell}>
                  {ad && (() => {
                    const acertos = new Set(bolao?.resultado_conferencia?.dezenas_sorteadas ?? [])
                    return (
                      <div className={styles.apostasBets}>
                        {ad.bets.map((bet, bi) => (
                          <div key={bi} className={styles.apostaBet}>
                            <span className={styles.apostaBetNum}>{String(bi+1).padStart(2,'0')}.</span>
                            {bet.map((n, ni) => (
                              <span
                                key={ni}
                                className={acertos.has(n) ? styles.apostaBetDezenaAcerto : styles.apostaBetDezena}
                              >
                                {String(n).padStart(2,'0')}
                              </span>
                            ))}
                          </div>
                        ))}
                      </div>
                    )
                  })()}
                </div></div>
                </div>

                {/* ══ RODAPÉ — repete em cada página na impressão ══ */}
                <div className={styles.printFoot}>
                <div className={styles.printRow}><div className={styles.printCell}>

                  {/* Resultado do sorteio */}
                  {bolao?.resultado_conferencia && bolao.resultado_conferencia.status !== 'nao_apurado' && (() => {
                    const rc = bolao.resultado_conferencia!
                    return (
                      <div className={styles.resultadoSection}>
                        <div className={styles.divider} />
                        <div className={styles.resultadoLabel}>
                          Resultado — Concurso #{concurso}
                        </div>
                        {rc.dezenas_sorteadas && rc.dezenas_sorteadas.length > 0 && (
                          <div className={styles.resultadoDezenasGrid}>
                            {rc.dezenas_sorteadas.map(n => (
                              <span key={n} className={styles.resultadoDezBall}>
                                {String(n).padStart(2, '0')}
                              </span>
                            ))}
                          </div>
                        )}
                        <div className={rc.status === 'ganhamos' ? styles.resultadoGanhou : styles.resultadoNaoPremiada}>
                          {rc.status === 'ganhamos'
                            ? `🏆 GANHAMOS! — ${rc.maior_premio} · ${rc.total_premiadas ?? rc.apostas_premiadas?.length ?? 0} aposta(s) premiada(s)`
                            : '😔 Não premiada — nenhuma aposta com 4 ou mais acertos'}
                        </div>
                        {rc.status === 'ganhamos' && rc.apostas_premiadas && rc.apostas_premiadas.length > 0 && (
                          <div className={styles.resultadoPremiadas}>
                            {rc.apostas_premiadas.slice(0, 5).map(a => (
                              <div key={a.idx} className={styles.resultadoPremiadaRow}>
                                <span className={styles.resultadoPremiadaIdx}>#{a.idx}</span>
                                <span className={styles.resultadoPremiadaDez}>
                                  {a.dezenas.map(n => String(n).padStart(2,'0')).join(' ')}
                                </span>
                                <span className={styles.resultadoPremiadaTag}>{a.acertos}✓ {a.premio}</span>
                              </div>
                            ))}
                            {rc.apostas_premiadas.length > 5 && (
                              <div className={styles.resultadoMais}>
                                +{rc.apostas_premiadas.length - 5} apostas premiadas
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })()}

                  <div className={styles.divider} />
                  <div className={styles.cartaoFooter}>
                    <div className={styles.cartaoFooterInfo}>
                      Bolão: {typeof window !== 'undefined' ? window.location.host : ''}/{bolao?.slug}<br />
                      Emissão: {emissao} às {horario}
                    </div>
                    <div className={styles.cartaoNumero}>Nº {String(idx + 1).padStart(3, '0')}</div>
                  </div>
                  <div className={styles.cartaoTermos}>
                    Prêmio dividido proporcionalmente ao número de cotas adquiridas.
                    Se sobrar cotas, o saldo é rateado entre os participantes.
                  </div>

                </div></div>
                </div>

              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function ComprovantePage() {
  return (
    <Suspense>
      <ComprovanteContent />
    </Suspense>
  )
}
