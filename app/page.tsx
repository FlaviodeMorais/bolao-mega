'use client'
import { useEffect, useState, useCallback, useRef } from 'react'
import TrevoIcon from '@/components/TrevoIcon'
import LoginModal from '@/components/LoginModal'
import UserAuthModal from '@/components/UserAuthModal'
import styles from './home.module.css'

interface Bolao { id: string; nome: string; slug: string; ativo: boolean; dezenas: number; num_apostas: number; loteria?: string }
interface BolaoEsporte {
  id: string; nome: string; slug: string; descricao?: string; valor_cota: number
  competicao?: string; logo_url?: string; cor_primaria?: string
}
interface JogoHoje {
  time_casa: string; time_fora: string; hora_jogo?: string
  bandeira_casa?: string; bandeira_fora?: string
  data_jogo?: string; encerrado?: boolean
}

interface SorteioInfo {
  id: string
  label: string
  apiSlug: string
  concurso: number
  premio: string
  premioLabel: string
  data: string
  dataSomenteData: string
  diaSemana: string
  dezenas: number[]
  corA: string
  corGlow: string
}

const DIAS = ['dom.','seg.','ter.','qua.','qui.','sex.','sáb.']

function premioEmPalavras(val: number): string {
  if (val >= 1e9) return `R$${(val / 1e9).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} Bilhão`
  if (val >= 1e6) {
    const m = val / 1e6
    const casas = Number.isInteger(m) ? 0 : 1
    return m < 2 ? `R$${m.toLocaleString('pt-BR', { maximumFractionDigits: 1 })} Milhão`
                 : `R$${m.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })} Milhões`
  }
  return `R$${(val / 1e3).toLocaleString('pt-BR', { maximumFractionDigits: 0 })} Mil`
}

const LOTERIAS_HOME: Omit<SorteioInfo, 'concurso' | 'premio' | 'premioLabel' | 'data' | 'dataSomenteData' | 'diaSemana' | 'dezenas'>[] = [
  { id: 'mega',      label: 'Mega-Sena',  apiSlug: 'megasena',  corA: '#00AB67', corGlow: 'rgba(0,171,103,0.18)' },
  { id: 'quina',     label: 'Quina',      apiSlug: 'quina',     corA: '#005DA4', corGlow: 'rgba(0,93,164,0.18)'  },
  { id: 'lotofacil', label: 'Lotofácil',  apiSlug: 'lotofacil', corA: '#803594', corGlow: 'rgba(128,53,148,0.18)'},
]

function useCountdown(dataStr: string) {
  const [texto, setTexto] = useState('')
  useEffect(() => {
    if (!dataStr) return
    const m = dataStr.match(/(\d{1,2})\/(\d{2})/)
    if (!m) return
    const hm = dataStr.match(/(\d{1,2})h(\d{2})?/)
    const hora = hm ? parseInt(hm[1]) : 20
    const min  = hm?.[2] ? parseInt(hm[2]) : 0
    const draw = new Date(new Date().getFullYear(), parseInt(m[2]) - 1, parseInt(m[1]), hora, min, 0)
    const tick = () => {
      const diff = draw.getTime() - Date.now()
      if (diff <= 0) { setTexto('Encerrado'); return }
      const d = Math.floor(diff / 86400000)
      const h = Math.floor((diff % 86400000) / 3600000)
      const mn = Math.floor((diff % 3600000) / 60000)
      setTexto(d > 0 ? `${d}d ${h}h ${mn}min` : `${h}h ${mn}min`)
    }
    tick(); const id = setInterval(tick, 30000); return () => clearInterval(id)
  }, [dataStr])
  return texto
}

function SorteioCard({ s, boloes, host, msgSemBolao }: { s: SorteioInfo; boloes: Bolao[]; host: string; msgSemBolao: string }) {
  const countdown = useCountdown(s.data)
  const boloesLoteria = boloes.filter(b => b.ativo && (b.loteria ?? 'mega') === s.id)

  return (
    <div className={styles.sorteioCard}>
      {/* Header */}
      <div className={styles.sorteioCardHead} style={{ borderBottom: `1px solid ${s.corA}20` }}>
        <TrevoIcon size={22} loteria={s.id} />
        <span className={styles.sorteioCardTitle}>{s.label}</span>
        {s.concurso > 0 && (
          <span className={styles.sorteioBadge}>#{s.concurso}</span>
        )}
      </div>

      <div className={styles.sorteioCardBody}>
        {/* Prêmio */}
        <div className={styles.sorteioPremio} style={{ color: s.corA }}>
          {s.premio}
        </div>
        {s.premioLabel && (
          <div className={styles.sorteioPremioLabel} style={{ color: s.corA }}>
            {s.premioLabel}
          </div>
        )}
        {s.concurso > 0 && (
          <div className={styles.sorteioConcurso}>
            Prêmio estimado do concurso {s.concurso}
          </div>
        )}

        {/* Data + Countdown */}
        {s.data && (
          <div className={styles.sorteioDataWrap}>
            <div className={styles.sorteioDataLabel}>Sorteio</div>
            <div className={styles.sorteioDataVal}>
              {s.diaSemana ? `${s.diaSemana}, ` : ''}{s.dataSomenteData || s.data}
            </div>
            {countdown && (
              <div className={styles.sorteioDataEnc}>
                Apostas se encerram em<br />
                <span className={styles.sorteioDataEncVal}>{countdown}</span>
              </div>
            )}
          </div>
        )}

        {/* Bolões desta loteria */}
        {boloesLoteria.length > 0 && (
          <div className={styles.cardBoloes}>
            <div className={styles.cardBoloesTitulo} style={{ color: s.corA }}>
              🎰 Bolões disponíveis
            </div>
            {boloesLoteria.map(b => (
              <a key={b.id} href={`/${b.slug}`} className={styles.cardBolaoItem}
                style={{ borderColor: `${s.corA}25` }}>
                <div className={styles.cardBolaoInfo}>
                  <span className={styles.cardBolaoNome}>{b.nome}</span>
                  <span className={styles.cardBolaoMeta}>{b.num_apostas || 1} apostas · {b.dezenas || 6} dezenas</span>
                </div>
                <span className={`material-icons-round ${styles.cardBolaoArrow}`}
                  style={{ color: s.corA }}>arrow_forward_ios</span>
              </a>
            ))}
          </div>
        )}
        {boloesLoteria.length === 0 && (
          <div className={styles.empty}>{msgSemBolao}</div>
        )}

        {/* Último resultado */}
        {s.dezenas.length > 0 && (
          <div className={styles.sorteioUltimo}>
            <div className={styles.sorteioUltimoLabel}>Último resultado</div>
            <div className={styles.sorteioBalls} style={{ '--n': s.dezenas.length } as React.CSSProperties}>
              {s.dezenas.map(n => (
                <span key={n} className={styles.sorteioBall}
                  style={{ background: `${s.corA}18`, border: `1.5px solid ${s.corA}55` }}>
                  {String(n).padStart(2, '0')}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

function BandeiraJogo({ codigo }: { codigo?: string }) {
  if (!codigo) return null
  return <span className={`fi fi-${codigo} ${styles.jogoHojeBandeira}`} />
}

function badgeJogo(dataJogo?: string): string {
  if (!dataJogo) return '⚽ Próximo jogo'
  const hoje = new Date().toISOString().slice(0, 10)
  if (dataJogo === hoje) return '🔥 Jogo de hoje!'
  const [, mes, dia] = dataJogo.split('-')
  return `📅 ${dia}/${mes}`
}

function JogosAlternando({ jogos, intervaloMs }: { jogos: JogoHoje[]; intervaloMs: number }) {
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (jogos.length <= 1) return
    const id = setInterval(() => setIdx(i => (i + 1) % jogos.length), intervaloMs)
    return () => clearInterval(id)
  }, [jogos.length, intervaloMs])

  if (jogos.length === 0) return null
  const jogo = jogos[idx % jogos.length]

  return (
    <div className={styles.cardBolaoJogoHoje}>
      <span className={styles.esporteJogoHojeBadge}>{badgeJogo(jogo.data_jogo)}</span>
      <span className={styles.esporteJogoHojeTimes}>
        <BandeiraJogo codigo={jogo.bandeira_casa} />
        {jogo.time_casa}
        <span className={styles.esporteJogoHojeVs}>×</span>
        {jogo.time_fora}
        <BandeiraJogo codigo={jogo.bandeira_fora} />
      </span>
      {jogo.hora_jogo && <span className={styles.esporteJogoHojeHora}>{jogo.hora_jogo}</span>}
      {jogos.length > 1 && (
        <span className={styles.jogoHojeDots}>
          {jogos.map((_, i) => (
            <span key={i} className={`${styles.jogoHojeDot} ${i === idx ? styles.jogoHojeDotAtivo : ''}`} />
          ))}
        </span>
      )}
    </div>
  )
}

function EsporteCardCarrossel({ boloesEsporte, intervaloMs }: { boloesEsporte: BolaoEsporte[]; intervaloMs: number }) {
  const corEsporte = '#1D6EA6'
  // Todos os jogos de cada bolão — usados tanto pra montar o carrossel de jogos
  // (alternando entre eles, não só os de hoje) quanto pra ordenar os bolões
  // pela data do jogo mais próximo.
  const [jogosPorBolao, setJogosPorBolao] = useState<Record<string, JogoHoje[]>>({})

  useEffect(() => {
    if (boloesEsporte.length === 0) { setJogosPorBolao({}); return }

    Promise.all(boloesEsporte.map(b =>
      fetch(`/api/esporte/jogos?bolao=${b.slug}`).then(r => r.json()).then(d => {
        const jogos: JogoHoje[] = d.jogos || []
        return [b.slug, jogos] as const
      }).catch(() => [b.slug, []] as const)
    )).then(entries => setJogosPorBolao(Object.fromEntries(entries)))
  }, [boloesEsporte])

  // Data do jogo (ainda não encerrado) mais próximo de cada bolão — bolões sem
  // jogos futuros ficam por último.
  function menorDataJogo(slug: string): string {
    const datas = (jogosPorBolao[slug] || [])
      .filter(j => !j.encerrado && j.data_jogo)
      .map(j => j.data_jogo as string)
    return datas.length > 0 ? datas.sort()[0] : '9999-12-31'
  }

  const boloesOrdenados = [...boloesEsporte].sort((a, b) => menorDataJogo(a.slug).localeCompare(menorDataJogo(b.slug)))

  return (
    <div className={`${styles.sorteioCard} ${styles.esporteCarrosselCard}`}>
      <div className={styles.sorteioCardHead} style={{ borderBottom: `1px solid ${corEsporte}30` }}>
        <img src="/icon.png" alt="Bet+" style={{ width: 24, height: 24, borderRadius: 6, objectFit: 'cover' }} />
        <span className={styles.sorteioCardTitle}>Bolão Esportivo</span>
        {boloesEsporte.length > 0 && (
          <span className={styles.sorteioBadge} style={{ background: `${corEsporte}30`, borderColor: `${corEsporte}55`, color: '#60b4f0' }}>
            {boloesEsporte.length} ativo{boloesEsporte.length > 1 ? 's' : ''}
          </span>
        )}
      </div>
      <div className={styles.sorteioCardBody}>
        {boloesEsporte.length > 0 ? (
          <div className={styles.cardBoloes}>
            <div className={styles.cardBoloesTitulo} style={{ color: '#60b4f0' }}>
              🏆 Bolões disponíveis
            </div>
            {boloesOrdenados.map(b => {
              const jogosProximos = (jogosPorBolao[b.slug] || []).filter(j => !j.encerrado)
              return (
                <a key={b.id} href={`/esporte/${b.slug}`} className={styles.cardBolaoItem}
                  style={{ borderColor: `${corEsporte}30` }}>
                  <div className={styles.cardBolaoInfo}>
                    <span className={styles.cardBolaoNome}>{b.nome}</span>
                    {b.competicao && <span className={styles.cardBolaoMeta}>{b.competicao}</span>}
                    {jogosProximos.length > 0 && (
                      <JogosAlternando jogos={jogosProximos} intervaloMs={intervaloMs} />
                    )}
                  </div>
                  <span className={`material-icons-round ${styles.cardBolaoArrow}`}
                    style={{ color: '#60b4f0' }}>arrow_forward_ios</span>
                </a>
              )
            })}
          </div>
        ) : (
          <div className={styles.empty} style={{ paddingTop: 48, paddingBottom: 48 }}>
            Nenhum bolão esportivo ativo no momento.
          </div>
        )}
      </div>
    </div>
  )
}

function CarrosselSorteios({ sorteios, boloes, boloesEsporte, host, msgSemBolao, intervaloMs }: { sorteios: SorteioInfo[]; boloes: Bolao[]; boloesEsporte: BolaoEsporte[]; host: string; msgSemBolao: string; intervaloMs: number }) {
  const totalSlides = sorteios.length + 1 // +1 para esporte
  const [ativo, setAtivo] = useState(0)
  const ref = useRef<HTMLDivElement>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pauseRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function scrollTo(i: number, userAction = false) {
    const idx = (i + totalSlides) % totalSlides
    setAtivo(idx)
    ref.current?.children[idx]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' })
    if (userAction) {
      // pausa o autoplay por 8s após interação manual
      if (timerRef.current) clearInterval(timerRef.current)
      if (pauseRef.current) clearTimeout(pauseRef.current)
      pauseRef.current = setTimeout(startAutoplay, 8000)
    }
  }

  function startAutoplay() {
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = setInterval(() => {
      setAtivo(prev => {
        const next = (prev + 1) % totalSlides
        ref.current?.children[next]?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'start' })
        return next
      })
    }, intervaloMs)
  }

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const onScroll = () => setAtivo(Math.round(el.scrollLeft / el.offsetWidth))
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    if (totalSlides <= 1) return
    startAutoplay()
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
      if (pauseRef.current) clearTimeout(pauseRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totalSlides, intervaloMs])

  if (sorteios.length === 0) return null

  const dots = [
    ...sorteios.map(s => ({ key: s.id, label: s.label, cor: s.corA })),
    { key: 'esporte', label: 'Esportivo', cor: '#1D6EA6' },
  ]

  return (
    <div className={styles.sorteioWrap}>
      <div ref={ref} className={styles.sorteioTrack}>
        {sorteios.map(s => <SorteioCard key={s.id} s={s} boloes={boloes} host={host} msgSemBolao={msgSemBolao} />)}
        <EsporteCardCarrossel boloesEsporte={boloesEsporte} intervaloMs={intervaloMs} />
      </div>
      {totalSlides > 1 && (
        <div className={styles.sorteioDots}>
          {dots.map((d, i) => (
            <button key={d.key} onClick={() => scrollTo(i, true)} className={styles.sorteioDot}
              style={{
                width: ativo === i ? 20 : 6,
                background: ativo === i ? d.cor : 'rgba(255,255,255,0.15)',
              }}
              aria-label={d.label}
            />
          ))}
        </div>
      )}
    </div>
  )
}

export default function Home() {
  const [boloes, setBoloes]               = useState<Bolao[]>([])
  const [boloesEsporte, setBoloesEsporte] = useState<BolaoEsporte[]>([])
  const [loading, setLoading]             = useState(true)
  const [host, setHost]                   = useState('')
  const [sorteios, setSorteios]           = useState<SorteioInfo[]>([])
  const [grupoNome, setGrupoNome]         = useState('Bolões BetMais')
  const [appNome, setAppNome]             = useState('Bolões')
  const [msgSemBolao, setMsgSemBolao]     = useState('Nenhum bolão disponível no momento')
  const [loginAberto, setLoginAberto]     = useState(false)
  const [userAuthAberto, setUserAuthAberto] = useState(false)
  const [usuario, setUsuario] = useState<{ nome: string; email: string; telefone: string } | null>(null)
  const [carrosselIntervaloMs, setCarrosselIntervaloMs] = useState(5000)
  const [tagline, setTagline]             = useState('Bolões de Loteria & Esportes')
  const [homeTitulo, setHomeTitulo]       = useState('')
  const [appRodape, setAppRodape]         = useState('')

  const carregar = useCallback((inicial = false) => {
    Promise.all([
      fetch('/api/boloes').then(r => r.json()),
      fetch('/api/esporte/boloes').then(r => r.json()).catch(() => ({ boloes: [] })),
    ]).then(([b, e]) => {
      setBoloes(b.boloes || [])
      setBoloesEsporte(e.boloes || [])
      if (inicial) setLoading(false)
    }).catch(() => { if (inicial) setLoading(false) })
  }, [])

  useEffect(() => {
    setHost(window.location.host)
    carregar(true)
    fetch('/api/usuario/me').then(r => r.json()).then(d => { if (d.usuario) setUsuario(d.usuario) }).catch(() => {})
    fetch('/api/config-publica').then(r => r.json()).then(d => {
      if (d?.app?.grupo_nome)     setGrupoNome(d.app.grupo_nome)
      if (d?.app?.nome)           setAppNome(d.app.nome)
      if (d?.home?.msg_sem_bolao) setMsgSemBolao(d.home.msg_sem_bolao)
      if (d?.app?.carrossel_intervalo_seg) setCarrosselIntervaloMs(Number(d.app.carrossel_intervalo_seg) * 1000)
      if (d?.app?.tagline)        setTagline(d.app.tagline)
      if (d?.app?.rodape)         setAppRodape(d.app.rodape)
      if (d?.home?.titulo)        setHomeTitulo(d.home.titulo)
    }).catch(() => {})
    const id = setInterval(() => carregar(), 60000)
    const onFocus = () => carregar()
    window.addEventListener('focus', onFocus)
    return () => { clearInterval(id); window.removeEventListener('focus', onFocus) }
  }, [carregar])

  const carregarSorteios = useCallback(() => {
    Promise.all(
      LOTERIAS_HOME.map(l => Promise.all([
        fetch(`/api/resultados/${l.apiSlug}`).then(r => r.json()).catch(() => null),
        fetch(`/api/concurso-ativo?loteria=${l.id}`).then(r => r.json()).catch(() => null),
      ]))
    ).then(results => {
      const lista: SorteioInfo[] = []
      LOTERIAS_HOME.forEach((l, i) => {
        const [d, ativo] = results[i]

        // Concurso/data/prêmio definidos manualmente no admin têm prioridade
        // sobre o cálculo automático (último sorteado + 1) vindo da API da Caixa.
        const concursoAtivo = ativo?.concurso ? Number(ativo.concurso) : 0

        // Prêmio: sempre usa API da Caixa (valor fresco), ativo.premio só como fallback
        const val = d?.valorEstimadoProximoConcurso
        const premio = val ? `R$ ${val.toLocaleString('pt-BR')}` : (ativo?.premio || 'Acumulando')
        const premioLabel = val ? `(${premioEmPalavras(val)})` : ''

        // Data: quando admin selecionou concurso, usa ativo.data (específica daquele concurso).
        // Só usa dataCaixa (dataProximoConcurso = ultimo+1) quando não há seleção manual.
        const dataCaixa: string = d?.dataProximoConcurso || ''
        const dataStr: string = ativo?.data || dataCaixa
        let diaSemana = ''
        let dataSomenteData = ''
        const mData = (concursoAtivo
          ? dataStr.match(/(\d{1,2})\/(\d{2})\/(\d{4})/)
          : null)
          || dataCaixa.match(/^(\d{1,2})\/(\d{2})\/(\d{4})/)
          || dataStr.match(/(\d{1,2})\/(\d{2})\/(\d{4})/)
        if (mData) {
          const dt = new Date(+mData[3], +mData[2] - 1, +mData[1])
          diaSemana = DIAS[dt.getDay()] || ''
          dataSomenteData = `${mData[1].padStart(2, '0')}/${mData[2]}/${mData[3]}`
        }
        lista.push({
          ...l,
          concurso: concursoAtivo || (d?.numero ? (d.numero + 1) : 0),
          premio,
          premioLabel,
          data: dataStr,
          dataSomenteData,
          diaSemana,
          dezenas: (d?.listaDezenas || []).map(Number),
        })
      })
      setSorteios(lista)
    })
  }, [])

  useEffect(() => {
    carregarSorteios()
    const id = setInterval(carregarSorteios, 60000)
    const onFocus = () => carregarSorteios()
    window.addEventListener('focus', onFocus)
    return () => { clearInterval(id); window.removeEventListener('focus', onFocus) }
  }, [carregarSorteios])

  // Bolões sem loteria específica ou que não estão no carrossel
  const boloesAtivos = boloes.filter(b => b.ativo)
  // Loterias com bolões (para exibir no carrossel)
  const loteriasNoCarrossel = new Set(LOTERIAS_HOME.map(l => l.id))
  // Bolões de loterias fora do carrossel (edge case)
  const boloesForaDoCarrossel = boloesAtivos.filter(b => !loteriasNoCarrossel.has(b.loteria ?? 'mega'))

  return (
    <div className={styles.page}>

      {/* ── Header ── */}
      <div className={styles.header}>
        <img src="/icon.png" alt="Bet+" style={{ width: 42, height: 42, borderRadius: 10, objectFit: 'cover' }} />
        <div className={styles.headerBrand}>
          {grupoNome}
          <span className={styles.headerSub}>{tagline}</span>
        </div>
        {usuario ? (
          <button className={styles.headerBtn} aria-label="Minha conta"
            title={usuario.email}
            onClick={async () => {
              if (confirm(`Sair da conta de ${usuario.nome}?`)) {
                await fetch('/api/usuario/logout', { method: 'POST' })
                setUsuario(null)
              }
            }}>
            <span className="material-icons-round" style={{ fontSize: 18 }}>person</span>
          </button>
        ) : (
          <button className={styles.headerBtn} aria-label="Entrar" onClick={() => setUserAuthAberto(true)}>
            <span className="material-icons-round" style={{ fontSize: 18 }}>login</span>
          </button>
        )}
        <button className={styles.headerBtn} aria-label="Admin" onClick={() => setLoginAberto(true)}>
          <span className="material-icons-round" style={{ fontSize: 18 }}>settings</span>
        </button>
      </div>

      {loginAberto && <LoginModal onClose={() => setLoginAberto(false)} appNome={appNome} />}
      {userAuthAberto && (
        <UserAuthModal onClose={() => setUserAuthAberto(false)} appNome={appNome}
          onAutenticado={u => setUsuario(u)} />
      )}

      {homeTitulo && (
        <div className={styles.pageTituloWrap}>
          <span className={styles.pageTitulo}>{homeTitulo}</span>
        </div>
      )}

      {/* ── Carrossel: um card por loteria com seus bolões e resultados ── */}
      {loading
        ? <div className={styles.sorteioWrap}><div className={styles.empty}>Carregando...</div></div>
        : <CarrosselSorteios sorteios={sorteios} boloes={boloes} boloesEsporte={boloesEsporte} host={host} msgSemBolao={msgSemBolao} intervaloMs={carrosselIntervaloMs} />
      }

      {/* Bolões de loterias fora do carrossel (raro) */}
      {boloesForaDoCarrossel.length > 0 && (
        <div className={styles.secWrap}>
          <div className={styles.secCard}>
            <div className={styles.secHead}>
              <span className={styles.secTitle}>🎰 Outros Bolões</span>
            </div>
            <div className={styles.secBody}>
              {boloesForaDoCarrossel.map(b => (
                <a key={b.id} href={`/${b.slug}`} className={styles.bolaoCard}>
                  <TrevoIcon size={28} loteria={b.loteria ?? 'mega'} />
                  <div className={styles.bolaoInfo}>
                    <div className={styles.bolaoNome}>{b.nome}</div>
                    <div className={styles.bolaoMeta}>{b.num_apostas || 1} Apostas · {b.dezenas || 6} dezenas</div>
                    <div className={styles.bolaoSlug}>{host}/{b.slug}</div>
                  </div>
                  <span className={`material-icons-round ${styles.bolaoArrow}`}>arrow_forward_ios</span>
                </a>
              ))}
            </div>
          </div>
        </div>
      )}

      {appRodape && (
        <div className={styles.footerWrap}>
          <p className={styles.footerText}>{appRodape}</p>
        </div>
      )}

    </div>
  )
}
