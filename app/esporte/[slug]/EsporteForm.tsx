'use client'
import { useState, useEffect, useRef } from 'react'
import LoginModal from '@/components/LoginModal'
import UserAuthModal from '@/components/UserAuthModal'
import { useCart } from '@/components/CartContext'
import styles from './esporte.module.css'
import { getFlagCode } from '@/lib/bandeiras'

interface Bolao {
  slug: string; nome: string; descricao?: string; competicao: string
  valor_cota: number; taxa_admin: number; total_cotas: number
  ativo: boolean; encerrado: boolean
  // configuração visual e textual por bolão
  logo_url?:        string
  cor_primaria?:    string
  header_desc?:     string
  label_cta?:       string
  label_palpites?:  string
  label_jogo_hoje?: string
  label_noticias?:  string
  premiacao?:       PremiacaoItem[]
}
interface Jogo {
  id: string; time_casa: string; time_fora: string
  bandeira_casa?: string; bandeira_fora?: string
  data_jogo?: string; hora_jogo?: string
  fase: string; grupo?: string
  gol_casa?: number; gol_fora?: number; encerrado: boolean; ordem: number
}
interface Palpite { jogo_id: string; gol_casa: number; gol_fora: number }
interface Props { bolao: Bolao; jogos: Jogo[]; totalPagos: number }

const TACA_FILTER: Record<string, string> = {
  gold:   'none',
  silver: 'grayscale(1) brightness(1.3) contrast(0.9)',
  bronze: 'sepia(1) saturate(1.2) hue-rotate(5deg) brightness(0.85)',
}

function TacaFifa({ variant }: { variant: 'gold' | 'silver' | 'bronze' }) {
  return (
    <img
      src="/FIFA-2026-World-Cup-White-Logo.png"
      alt="Troféu"
      width={80}
      height={96}
      style={{
        objectFit: 'contain',
        filter: TACA_FILTER[variant],
        mixBlendMode: 'screen',
        flexShrink: 0,
      }}
    />
  )
}

function TimeBandeira({ nome, url }: { nome: string; url?: string }) {
  // Prioridade: 1) ISO code do banco (2-7 letras sem /), 2) URL real, 3) lookup por nome
  const isIso = url && /^[a-z]{2}(-[a-z]+)?$/.test(url)
  const isoCode = isIso ? url : getFlagCode(nome)
  const validUrl = !isIso && url && (url.startsWith('http') || url.startsWith('/')) ? url : null

  if (validUrl) return <img src={validUrl} alt={nome} className={styles.timeBandeiraImg} />
  if (isoCode) return <span className={`fi fi-${isoCode} ${styles.timeBandeira}`} title={nome} />
  return <span className={styles.timeBandeiraPlaceholder} />
}

function formatData(d?: string) {
  if (!d) return ''
  const [,m,day] = d.split('-')
  return `${day}/${m}`
}

type StylesMod = Record<string, string>

function JogoCard({ jogo, palpites, bloqueado, setPalpite, styles }: {
  jogo: Jogo; palpites: Record<string, Palpite>; bloqueado: boolean
  setPalpite: (id: string, campo: 'gol_casa'|'gol_fora', val: string) => void
  styles: StylesMod
}) {
  const pal = palpites[jogo.id]
  return (
    <div className={`${styles.jogoCard} ${pal && !bloqueado ? styles.jogoCardPreenchido : ''} ${bloqueado ? styles.jogoCardBloqueado : ''}`}>
      <div className={styles.jogoCardTop}>
        <span className={styles.jogoGrupo}>{jogo.grupo && jogo.grupo !== '_' ? jogo.grupo : jogo.fase}</span>
        <span className={styles.jogoData}>
          {jogo.data_jogo ? formatData(jogo.data_jogo) : ''}{jogo.hora_jogo ? ` · ${jogo.hora_jogo}` : ''}
          {bloqueado && <span className={styles.jogoBloqueadoTag}>🔒 Encerrado</span>}
        </span>
      </div>
      <div className={styles.jogoCardBody}>
        <div className={styles.timeCasa}>
          <span className={styles.timeNome}>{jogo.time_casa}</span>
          <TimeBandeira nome={jogo.time_casa} url={jogo.bandeira_casa} />
        </div>
        <div className={styles.placarBloco}>
          <input
            className={`${styles.golInput}${pal && !bloqueado ? ' '+styles.golInputPreenchido : ''}`}
            type="number" min={0} max={99}
            value={pal?.gol_casa ?? ''}
            onChange={e => !bloqueado && setPalpite(jogo.id, 'gol_casa', e.target.value)}
            placeholder="–" disabled={bloqueado}
          />
          <span className={styles.vs}>×</span>
          <input
            className={`${styles.golInput}${pal && !bloqueado ? ' '+styles.golInputPreenchido : ''}`}
            type="number" min={0} max={99}
            value={pal?.gol_fora ?? ''}
            onChange={e => !bloqueado && setPalpite(jogo.id, 'gol_fora', e.target.value)}
            placeholder="–" disabled={bloqueado}
          />
        </div>
        <div className={styles.timeFora}>
          <TimeBandeira nome={jogo.time_fora} url={jogo.bandeira_fora} />
          <span className={styles.timeNome}>{jogo.time_fora}</span>
        </div>
      </div>
    </div>
  )
}

function formatReal(v: number) {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function JogosCarrossel({ jogos, palpites, setPalpite, preenchidos, styles, labelPalpites, labelJogoHoje }: {
  jogos: Jogo[]
  palpites: Record<string, Palpite>
  setPalpite: (id: string, campo: 'gol_casa'|'gol_fora', val: string) => void
  preenchidos: number
  styles: StylesMod
  labelPalpites: string
  labelJogoHoje: string
}) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [slideAtual, setSlideAtual] = useState(0)
  const total = jogos.length
  const hoje = new Date().toISOString().slice(0, 10)

  function irPara(idx: number) {
    const el = trackRef.current
    if (!el) return
    el.scrollTo({ left: idx * el.clientWidth, behavior: 'smooth' })
    setSlideAtual(idx)
  }

  function onScroll() {
    const el = trackRef.current
    if (!el) return
    setSlideAtual(Math.round(el.scrollLeft / el.clientWidth))
  }

  if (total === 0) return null

  return (
    <div className={styles.jogosCarrosselWrap}>
      <div className={styles.jogosCarrossel}>
        <div className={styles.jogosCarrosselHeader}>
          <span className={styles.jogosCarrosselTitle}>{labelPalpites}</span>
          <span className={styles.jogosCarrosselCounter}>{slideAtual + 1} / {total}</span>
        </div>
        <div className={styles.jogosCarrosselTrack} ref={trackRef} onScroll={onScroll}>
          {jogos.map(jogo => (
            <div key={jogo.id} className={styles.jogosCarrosselSlide}>
              {jogo.data_jogo === hoje && (
                <div className={styles.jogosCarrosselBadgeHoje}>{labelJogoHoje}</div>
              )}
              <JogoCard jogo={jogo} palpites={palpites} bloqueado={false} setPalpite={setPalpite} styles={styles} />
            </div>
          ))}
        </div>
        <div className={styles.jogosCarrosselFooter}>
          <button className={styles.jogosCarrosselBtn} onClick={() => irPara(Math.max(0, slideAtual - 1))} disabled={slideAtual === 0}>‹</button>
          <div className={styles.jogosCarrosselProgressWrap}>
            <div className={styles.jogosCarrosselBar}>
              <div className={styles.jogosCarrosselBarFill} style={{ width: `${total ? (preenchidos / total) * 100 : 0}%` }} />
            </div>
            <span className={styles.jogosCarrosselProgressLabel}>{preenchidos} de {total} palpites preenchidos</span>
          </div>
          <button className={styles.jogosCarrosselBtn} onClick={() => irPara(Math.min(total - 1, slideAtual + 1))} disabled={slideAtual === total - 1}>›</button>
        </div>
      </div>
    </div>
  )
}

interface Video { id: string; titulo: string; thumb: string; link: string; data: string }

function MomentosCarousel({ label }: { label: string }) {
  const [aoVivo, setAoVivo]     = useState<Video[]>([])
  const [momentos, setMomentos] = useState<Video[]>([])
  const [loading, setLoading]   = useState(true)
  const rowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetch('/api/esporte/noticias').then(r => r.json()).then(d => {
      setAoVivo(d.aoVivo || [])
      setMomentos(d.momentos || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  useEffect(() => {
    const total = aoVivo.length + momentos.length
    if (total === 0) return
    let pos = 0
    const t = setInterval(() => {
      const el = rowRef.current
      if (!el) return
      const cardW = el.clientWidth
      const maxScroll = el.scrollWidth - cardW
      pos = pos + cardW > maxScroll ? 0 : pos + cardW
      el.scrollTo({ left: pos, behavior: 'smooth' })
    }, 4000)
    return () => clearInterval(t)
  }, [aoVivo, momentos])

  const vazio = !loading && aoVivo.length === 0 && momentos.length === 0

  function renderCard(v: Video, i: number) {
    return (
      <a key={i} href={v.link} target="_blank" rel="noopener noreferrer" className={styles.videoCard}>
        <div className={styles.videoThumbWrap}>
          <img src={v.thumb} alt={v.titulo} className={styles.videoThumb} />
          <div className={styles.videoPlay}>▶</div>
        </div>
        <div className={styles.videoTitulo}>{v.titulo}</div>
        <div className={styles.videoData}>{v.data}</div>
      </a>
    )
  }

  return (
    <div className={styles.momentosSec}>
      <div className={styles.momentosTitle}>{label}</div>

      {loading && <div className={styles.momentosLoading}>Carregando vídeos...</div>}
      {vazio   && <div className={styles.momentosLoading}>Nenhum vídeo disponível.</div>}

      {!loading && !vazio && (
        <div className={styles.videoRow} ref={rowRef}>
          {aoVivo.map((v, i) => renderCard(v, i))}
          {momentos.map((v, i) => renderCard(v, aoVivo.length + i))}
        </div>
      )}

    </div>
  )
}

interface PremiacaoItem { lugar: number; emoji: string; label: string; categoria: string; pts: number; pct: number }

const PREMIACAO_DEFAULT: PremiacaoItem[] = [
  { lugar: 1, emoji: '🏆', label: '1º lugar', categoria: 'Acertou o Placar e o Vencedor', pts: 5, pct: 40 },
  { lugar: 2, emoji: '🥈', label: '2º lugar', categoria: 'Acertou o Vencedor',            pts: 3, pct: 30 },
  { lugar: 3, emoji: '🥉', label: '3º lugar', categoria: 'Acertou o Placar',              pts: 2, pct: 20 },
]

const TACA_VARIANT: Record<number, 'gold'|'silver'|'bronze'> = { 1: 'gold', 2: 'silver', 3: 'bronze' }
const LUGAR_COR:   Record<number, string>                    = { 1: '#FFB81C', 2: '#C0C0C0', 3: '#CD7F32' }
const PTS_COR:     Record<number, string>                    = { 1: 'gold',   2: 'green',  3: 'blue' }

function maskTelefoneEsporte(digits: string): string {
  const v = digits.replace(/\D/g, '').slice(0, 11)
  return v.length <= 2 ? v : v.length <= 7 ? `(${v.slice(0, 2)}) ${v.slice(2)}` : `(${v.slice(0, 2)}) ${v.slice(2, 7)}-${v.slice(7)}`
}

export default function EsporteForm({ bolao, jogos, totalPagos }: Props) {
  const [step, setStep]         = useState<'form'|'pix'|'ok'>('form')
  const [cadastrando, setCadastrando] = useState(false)
  const [loginAberto, setLoginAberto] = useState(false)
  const [usuario, setUsuario] = useState<{ id: string; nome: string; email: string; telefone: string } | null>(null)
  const [userAuthAberto, setUserAuthAberto] = useState(false)
  const cart = useCart()
  // premiacao vem do bolão; fallback para settings globais; fallback para default
  const [premiacao, setPremiacao] = useState<PremiacaoItem[]>(bolao.premiacao?.length ? bolao.premiacao : PREMIACAO_DEFAULT)

  useEffect(() => {
    if (!bolao.premiacao?.length) {
      fetch('/api/config-publica').then(r => r.json()).then(d => {
        if (d?.esporte?.premiacao?.length) setPremiacao(d.esporte.premiacao)
      }).catch(() => {})
    }
  }, [bolao.premiacao])
  const [nome, setNome]         = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail]       = useState('')
  const [chavePix, setChavePix] = useState('')
  const [palpites, setPalpites] = useState<Record<string, Palpite>>({})
  const [enviando, setEnviando] = useState(false)
  const [pixData, setPixData]   = useState<{ pixCode: string; qrCodeBase64: string; paymentId: string } | null>(null)
  const [payStatus, setPayStatus] = useState<'aguardando'|'pago'>('aguardando')
  const [payTimer, setPayTimer] = useState('30:00')
  const [copiado, setCopiado]   = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const pollRef  = useRef<ReturnType<typeof setInterval> | null>(null)

  const [agora, setAgora] = useState(() => new Date())
  useEffect(() => {
    setAgora(new Date())
    const t = setInterval(() => setAgora(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])

  // Autofill: participante logado não precisa redigitar nome/telefone/email.
  // Chave PIX continua sendo pedida por sessão (não faz parte da conta).
  useEffect(() => {
    fetch('/api/usuario/me').then(r => r.json()).then(d => {
      if (!d.usuario) return
      setUsuario(d.usuario)
      setNome(d.usuario.nome.toUpperCase())
      setTelefone(maskTelefoneEsporte(d.usuario.telefone))
      setEmail(d.usuario.email)
    }).catch(() => {})
    const chave = localStorage.getItem('bolao_esporte_chave_pix')
    if (chave) setChavePix(chave)
  }, [])

  function onAutenticado(u: { id: string; nome: string; email: string; telefone: string }) {
    setUsuario(u)
    setNome(u.nome.toUpperCase())
    setTelefone(maskTelefoneEsporte(u.telefone))
    setEmail(u.email)
    setCadastrando(true)
  }

  // Mostra todos os jogos não encerrados — bloqueio de horário é feito no submit
  const jogosAbertos = jogos.filter(j => !j.encerrado)

  // Jogo bloqueado = já iniciou ou encerrado (feedback visual, não esconde)
  function jogoIniciado(j: Jogo) {
    if (j.encerrado) return true
    if (j.data_jogo && j.hora_jogo) {
      return new Date(`${j.data_jogo}T${j.hora_jogo}:00-03:00`) <= agora
    }
    return false
  }

  const hoje = agora.toLocaleDateString('sv-SE', { timeZone: 'America/Sao_Paulo' }) // 'sv-SE' → YYYY-MM-DD

  // Separa jogos de hoje (disponíveis) dos próximos
  const jogosHoje    = jogosAbertos.filter(j => j.data_jogo === hoje && !jogoIniciado(j))
  const jogosFuturos = jogosAbertos.filter(j => j.data_jogo !== hoje || jogoIniciado(j))
    .filter(j => !jogoIniciado(j)) // só os ainda abertos de datas futuras
  const preenchidos      = Object.keys(palpites).filter(id => !jogoIniciado(jogosAbertos.find(j => j.id === id)!)).length
  const jogosDisponiveis = jogosAbertos.filter(j => !jogoIniciado(j))
  const todosPreenchidos = jogosDisponiveis.length === 0 || jogosDisponiveis.every(j => palpites[j.id])
  const podeContinuar    = nome.trim().length >= 3 && telefone.replace(/\D/g,'').length === 11 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && chavePix.trim().length > 0

  function setPalpite(jogo_id: string, campo: 'gol_casa'|'gol_fora', val: string) {
    const n = Math.max(0, Math.min(99, parseInt(val) || 0))
    setPalpites(prev => ({
      ...prev,
      [jogo_id]: {
        jogo_id,
        gol_casa: campo === 'gol_casa' ? n : (prev[jogo_id]?.gol_casa ?? 0),
        gol_fora: campo === 'gol_fora' ? n : (prev[jogo_id]?.gol_fora ?? 0),
      }
    }))
  }

  async function confirmar() {
    if (!usuario) { alert('⚠️ Entre ou cadastre-se para participar.'); return }
    if (!nome.trim() || nome.trim().length < 3) { alert('⚠️ Informe seu nome completo!'); return }
    if (telefone.replace(/\D/g,'').length < 11)  { alert('⚠️ Informe seu WhatsApp com DDD!'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { alert('⚠️ Informe um e-mail válido!'); return }
    if (!chavePix.trim()) { alert('⚠️ Informe sua Chave PIX!'); return }
    if (!todosPreenchidos) { alert('⚠️ Preencha os palpites de todos os jogos!'); return }
    setEnviando(true)
    try {
      const res = await fetch('/api/esporte/participantes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bolao_slug: bolao.slug,
          nome: nome.trim().toUpperCase(),
          telefone: '55' + telefone.replace(/\D/g,''),
          email: email.trim().toLowerCase(),
          chave_pix: chavePix.trim(),
          usuario_id: usuario?.id || null,
          palpites: Object.values(palpites).filter(p => !jogoIniciado(jogosAbertos.find(j => j.id === p.jogo_id)!)),
        }),
      }).then(r => r.json())

      if (res.error) { alert('⚠️ ' + res.error); return }
      setPixData({ pixCode: res.pixCode, qrCodeBase64: res.qrCodeBase64, paymentId: res.paymentId })
      setStep('pix')

      let secs = 30 * 60
      if (timerRef.current) clearInterval(timerRef.current)
      timerRef.current = setInterval(() => {
        secs--
        const m = String(Math.floor(secs/60)).padStart(2,'0')
        const s = String(secs%60).padStart(2,'0')
        setPayTimer(`${m}:${s}`)
        if (secs <= 0) clearInterval(timerRef.current!)
      }, 1000)

      if (pollRef.current) clearInterval(pollRef.current)
      pollRef.current = setInterval(async () => {
        const st = await fetch(`/api/status?paymentId=${res.paymentId}`).then(r => r.json())
        if (st.status === 'pago' || st.status === 'approved') {
          setPayStatus('pago')
          clearInterval(pollRef.current!)
          clearInterval(timerRef.current!)
          setTimeout(() => setStep('ok'), 1500)
        }
      }, 5000)
    } finally {
      setEnviando(false)
    }
  }

  function adicionarAoCarrinho() {
    if (!usuario) { alert('⚠️ Entre ou cadastre-se para continuar.'); return }
    if (!nome.trim() || nome.trim().length < 3) { alert('⚠️ Informe seu nome completo!'); return }
    if (telefone.replace(/\D/g,'').length < 11)  { alert('⚠️ Informe seu WhatsApp com DDD!'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { alert('⚠️ Informe um e-mail válido!'); return }
    if (!chavePix.trim()) { alert('⚠️ Informe sua Chave PIX!'); return }
    if (!todosPreenchidos) { alert('⚠️ Preencha os palpites de todos os jogos!'); return }

    cart.addItem({
      tipo: 'esporte',
      bolaoSlug: bolao.slug,
      bolaoNome: bolao.nome,
      palpites: Object.values(palpites)
        .filter(p => !jogoIniciado(jogosAbertos.find(j => j.id === p.jogo_id)!))
        .map(p => ({ ...p })),
      chavePix: chavePix.trim(),
      total: Number(bolao.valor_cota),
    })
    alert('🛒 Adicionado ao carrinho! Acesse o carrinho (ícone no topo da home) para finalizar o pagamento.')
  }

  function copiarPix() {
    if (!pixData) return
    navigator.clipboard.writeText(pixData.pixCode)
    setCopiado(true)
    setTimeout(() => setCopiado(false), 2000)
  }

  useEffect(() => () => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (pollRef.current)  clearInterval(pollRef.current)
  }, [])

  if (bolao.encerrado || !bolao.ativo) return (
    <div className={styles.page}>
      <div className={styles.encerrado}>
        <span className={styles.encIcon}>{bolao.encerrado ? '⛔' : '🔒'}</span>
        <div className={styles.encTitle}>{bolao.encerrado ? 'Bolão Encerrado' : 'Inscrições Fechadas'}</div>
        <div className={styles.encSub}>{bolao.encerrado ? 'Este bolão já foi encerrado.' : 'As inscrições para este bolão estão temporariamente fechadas.'}</div>
      </div>
    </div>
  )

  if (step === 'ok') return (
    <div className={styles.page}>
      <div className={styles.okBox}>
        <span className={styles.okIcon}>🎉</span>
        <div className={styles.okTitle}>Tudo certo!</div>
        <div className={styles.okSub}>Seus palpites estão registrados.<br/>Boa sorte, <strong>{nome}</strong>! 🍀</div>
      </div>
    </div>
  )

  return (
    <div className={styles.page}>

      {/* ── Top bar: voltar + admin ── */}
      <div className={styles.topBar}>
        <a href="/" className={styles.topBarBack} aria-label="Voltar">
          <span className="material-icons-round" style={{ fontSize: 18 }}>arrow_back</span>
        </a>
        <div className={styles.topBarBrand}>
          ESPORTE
          <span className={styles.topBarSub}>{bolao.nome}</span>
        </div>
        <button className={styles.topBarBtn} aria-label="Admin" onClick={() => setLoginAberto(true)}>
          <span className="material-icons-round" style={{ fontSize: 18 }}>settings</span>
        </button>
      </div>
      {loginAberto && <LoginModal onClose={() => setLoginAberto(false)} />}

      {/* ── Header banner ── */}
      <div className={styles.headerWrap}>
        <div className={styles.header} style={{ '--comp-cor': bolao.cor_primaria || '#FFB81C' } as React.CSSProperties}>
          <div className={styles.headerTop}>
            {bolao.logo_url && (
              <img src={bolao.logo_url} alt={bolao.competicao} className={styles.headerLogo} />
            )}
            <div className={styles.headerInfo}>
              <span className={styles.headerLabel}>{bolao.competicao}</span>
            </div>
          </div>
          {bolao.header_desc && <p className={styles.headerDesc}>{bolao.header_desc}</p>}
        </div>
      </div>

      {/* ── Carrossel de jogos + CTA ── */}
      {step === 'form' && (
        <JogosCarrossel
          jogos={jogosDisponiveis}
          palpites={palpites}
          setPalpite={setPalpite}
          preenchidos={preenchidos}
          styles={styles}
          labelPalpites={bolao.label_palpites || '⚽ Seus palpites'}
          labelJogoHoje={bolao.label_jogo_hoje || '🔥 Jogo de hoje!'}
        />
      )}
      {step === 'form' && !cadastrando && jogosDisponiveis.length > 0 && (
        <div className={styles.ctaWrap}>
          <button type="button" className={styles.btnConfirmar}
            onClick={() => usuario ? setCadastrando(true) : setUserAuthAberto(true)}>
            {usuario
              ? `${bolao.label_cta?.split(' ')[0] || '⚽'} Continuar como ${nome.split(' ')[0]}`
              : bolao.label_cta || '⚽ Quero Participar'}
          </button>
        </div>
      )}
      {userAuthAberto && (
        <UserAuthModal onClose={() => setUserAuthAberto(false)} onAutenticado={onAutenticado} />
      )}

      {/* ── Notícias / Momentos ── */}
      <MomentosCarousel label={bolao.label_noticias || '📺 Notícias'} />

      {/* ── Premiação — banners dinâmicos ── */}
      <div className={styles.premiacaoWrap}>
        {premiacao.map(item => (
          <div key={item.lugar} className={styles.premiacaoBanner} data-place={String(item.lugar)}>
            <TacaFifa variant={TACA_VARIANT[item.lugar] ?? 'gold'} />
            <div className={styles.premiacaoInfo}>
              <span className={styles.premiacaoLugar} style={{color: LUGAR_COR[item.lugar] ?? '#FFB81C'}}>
                {item.emoji} {item.label}
              </span>
              <span className={styles.premiacaoCategoria}>{item.categoria}</span>
            </div>
            <div className={styles.premiacaoPremio}>
              <span className={styles.premiacaoPts} data-color={PTS_COR[item.lugar] ?? 'gold'}>{item.pts} pts</span>
              <span className={styles.premiacaoPct}>{item.pct}% ÷ acertadores</span>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.card}>

        {/* ── Dados pessoais ── */}
        {step === 'form' && cadastrando && (
          <div className={styles.section}>
            <div className={styles.sectionTitleRow}>
              <span className={styles.sectionTitle}>👤 Seus dados</span>
              {usuario && (
                <span className={styles.logadoBadge}>✅ {usuario.email}</span>
              )}
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Nome completo *</label>
              <input className={styles.input} type="text" value={nome} onChange={e => setNome(e.target.value.toUpperCase())} placeholder="SEU NOME COMPLETO" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>WhatsApp *</label>
              <input className={styles.input} type="tel" value={telefone} inputMode="numeric"
                onChange={e => setTelefone(maskTelefoneEsporte(e.target.value))}
                placeholder="(19) 99999-9999" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>E-mail *</label>
              <input className={styles.input} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" autoComplete="email" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Chave PIX *</label>
              <input className={styles.input} type="text" value={chavePix}
                onChange={e => { setChavePix(e.target.value); localStorage.setItem('bolao_esporte_chave_pix', e.target.value) }}
                placeholder="CPF, e-mail, telefone ou chave aleatória" autoComplete="off" />
            </div>
          </div>
        )}

        {/* ── Sem jogos ── */}
        {step === 'form' && jogosAbertos.length === 0 && (
          <div className={styles.section} style={{ textAlign: 'center', padding: '32px 20px' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⚽</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: 600 }}>Nenhum jogo disponível no momento</div>
            <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, marginTop: 6 }}>Os jogos serão liberados em breve.</div>
          </div>
        )}

        {/* ── PIX ── */}
        {step === 'pix' && pixData && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>💳 Pagamento via PIX</div>
            <div className={styles.pixValor}>R$ {Number(bolao.valor_cota).toFixed(2).replace('.',',')}</div>
            {pixData.qrCodeBase64 && (
              <div className={styles.qrWrap}>
                <img src={`data:image/png;base64,${pixData.qrCodeBase64}`} alt="QR Code PIX" className={styles.qrImg} />
              </div>
            )}
            <div className={styles.pixCodeBox}>
              <div className={styles.pixCodeLabel}>Copia e cola</div>
              <div className={styles.pixCode}>{pixData.pixCode}</div>
            </div>
            <button type="button" className={styles.btnCopiar} onClick={copiarPix}>
              {copiado ? '✅ Copiado!' : '📋 Copiar código PIX'}
            </button>
            <div className={`${styles.payStatus} ${payStatus === 'pago' ? styles.payStatusPago : ''}`}>
              {payStatus === 'pago' ? '✅ Pagamento confirmado!' : `⏳ Aguardando pagamento… ${payTimer}`}
            </div>
          </div>
        )}

        {/* ── Botão confirmar ── */}
        {step === 'form' && cadastrando && (<>
          <button
            type="button"
            className={styles.btnConfirmar}
            onClick={confirmar}
            disabled={enviando || !todosPreenchidos || !podeContinuar}
          >
            {enviando ? 'Registrando…' : `✅ Confirmar e pagar R$ ${Number(bolao.valor_cota).toFixed(2).replace('.',',')}`}
          </button>
          <button
            type="button"
            className={styles.btnSair}
            style={{ marginTop: 8, width: '100%' }}
            onClick={adicionarAoCarrinho}
            disabled={enviando || !todosPreenchidos || !podeContinuar}
          >
            🛒 Adicionar ao Carrinho
          </button>
        </>)}

      </div>
    </div>
  )
}
