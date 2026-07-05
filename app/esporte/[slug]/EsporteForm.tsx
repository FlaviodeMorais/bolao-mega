'use client'
import { useState, useEffect, useRef } from 'react'
import LoginModal from '@/components/LoginModal'
import UserAuthModal from '@/components/UserAuthModal'
import UserAccountModal from '@/components/UserAccountModal'
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

export default function EsporteForm({ bolao, jogos, totalPagos }: Props) {
  const [step, setStep]         = useState<'form'|'ok'>('form')
  const [loginAberto, setLoginAberto] = useState(false)
  const [usuario, setUsuario] = useState<{ id: string; nome: string; email: string; telefone: string; chave_pix?: string } | null>(null)
  const [userAuthAberto, setUserAuthAberto] = useState(false)
  const [contaAberta, setContaAberta] = useState(false)
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
  const [palpites, setPalpites] = useState<Record<string, Palpite>>({})

  const [agora, setAgora] = useState(() => new Date())
  useEffect(() => {
    setAgora(new Date())
    const t = setInterval(() => setAgora(new Date()), 30_000)
    return () => clearInterval(t)
  }, [])

  // Autofill: usuário logado já tem nome/telefone/email/chave PIX na conta.
  useEffect(() => {
    fetch('/api/usuario/me').then(r => r.json()).then(d => {
      if (!d.usuario) return
      setUsuario(d.usuario)
    }).catch(() => {})
  }, [])

  function onAutenticado(u: { id: string; nome: string; email: string; telefone: string; chave_pix?: string }) {
    setUsuario(u)
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

  function adicionarAoCarrinho() {
    if (!usuario) { alert('⚠️ Entre ou cadastre-se para continuar.'); return }
    if (!usuario.chave_pix?.trim()) { alert('⚠️ Sua conta não tem Chave PIX cadastrada.'); return }
    if (!todosPreenchidos) { alert('⚠️ Preencha os palpites de todos os jogos!'); return }

    cart.addItem({
      tipo: 'esporte',
      bolaoSlug: bolao.slug,
      bolaoNome: bolao.nome,
      palpites: Object.values(palpites)
        .filter(p => !jogoIniciado(jogosAbertos.find(j => j.id === p.jogo_id)!))
        .map(p => ({ ...p })),
      chavePix: usuario.chave_pix.trim(),
      total: Number(bolao.valor_cota),
    })
    alert('🛒 Adicionado ao carrinho! Acesse o carrinho (ícone no topo) para finalizar o pagamento.')
  }

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
        <div className={styles.okSub}>Seus palpites estão registrados.<br/>Boa sorte, <strong>{usuario?.nome}</strong>! 🍀</div>
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
        {usuario ? (
          <button className={styles.topBarBtn} aria-label="Minha conta" title={usuario.email} onClick={() => setContaAberta(true)}>
            <span className="material-icons-round" style={{ fontSize: 18 }}>person</span>
          </button>
        ) : (
          <button className={styles.topBarBtn} aria-label="Entrar" onClick={() => setUserAuthAberto(true)}>
            <span className="material-icons-round" style={{ fontSize: 18 }}>login</span>
          </button>
        )}
        <a className={styles.topBarBtn} aria-label="Carrinho" href="/carrinho" style={{ position: 'relative', textDecoration: 'none' }}>
          <span className="material-icons-round" style={{ fontSize: 18 }}>shopping_cart</span>
          {cart.items.length > 0 && (
            <span style={{
              position: 'absolute', top: -4, right: -4,
              background: '#00AB67', color: '#fff', borderRadius: '50%',
              width: 16, height: 16, fontSize: 10, fontWeight: 800,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{cart.items.length}</span>
          )}
        </a>
        <button className={styles.topBarBtn} aria-label="Admin" onClick={() => setLoginAberto(true)}>
          <span className="material-icons-round" style={{ fontSize: 18 }}>settings</span>
        </button>
      </div>
      {loginAberto && <LoginModal onClose={() => setLoginAberto(false)} />}
      {contaAberta && usuario && (
        <UserAccountModal usuario={usuario} onClose={() => setContaAberta(false)}
          onLogout={() => { setUsuario(null); setContaAberta(false) }}
          onChavePixAtualizada={chave_pix => setUsuario(u => u ? { ...u, chave_pix } : u)} />
      )}

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

        {/* ── Sem jogos ── */}
        {jogosAbertos.length === 0 && (
          <div className={styles.section} style={{ textAlign: 'center', padding: '32px 20px' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⚽</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: 600 }}>Nenhum jogo disponível no momento</div>
            <div style={{ color: 'rgba(255,255,255,0.25)', fontSize: 12, marginTop: 6 }}>Os jogos serão liberados em breve.</div>
          </div>
        )}

        {jogosDisponiveis.length > 0 && (!usuario ? (
          <div className={styles.section} style={{ textAlign: 'center', padding: '24px 20px' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🔒</div>
            <div style={{ color: '#fff', fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Entre para participar</div>
            <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, marginBottom: 16 }}>
              Crie uma conta rápida (ou entre na sua) para não precisar redigitar seus dados a cada bolão.
            </div>
            <button type="button" className={styles.btnConfirmar} onClick={() => setUserAuthAberto(true)}>
              Entrar ou Cadastrar
            </button>
          </div>
        ) : (
          <button
            type="button"
            className={styles.btnConfirmar}
            onClick={adicionarAoCarrinho}
            disabled={!todosPreenchidos}
          >
            🛒 Adicionar ao Carrinho
          </button>
        ))}

      </div>
    </div>
  )
}
