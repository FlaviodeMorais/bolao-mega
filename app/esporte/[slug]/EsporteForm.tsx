'use client'
import { useState, useEffect, useRef } from 'react'
import styles from './esporte.module.css'
import { getFlagCode } from '@/lib/bandeiras'

interface Bolao {
  slug: string; nome: string; descricao?: string; competicao: string
  valor_cota: number; taxa_admin: number; total_cotas: number
  ativo: boolean; encerrado: boolean
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
      width={60}
      height={72}
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

interface Video { id: string; titulo: string; thumb: string; link: string; data: string }

function VideoRow({ videos }: { videos: Video[] }) {
  const rowRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (videos.length === 0) return
    const CARD_W = 148
    let pos = 0
    const t = setInterval(() => {
      const el = rowRef.current
      if (!el) return
      const maxScroll = el.scrollWidth - el.clientWidth
      pos = pos + CARD_W > maxScroll ? 0 : pos + CARD_W
      el.scrollTo({ left: pos, behavior: 'smooth' })
    }, 2500)
    return () => clearInterval(t)
  }, [videos])

  if (videos.length === 0) return null
  return (
    <div className={styles.videoRow} ref={rowRef}>
      {videos.map((v, i) => (
        <a key={i} href={v.link} target="_blank" rel="noopener noreferrer" className={styles.videoCard}>
          <div className={styles.videoThumbWrap}>
            <img src={v.thumb} alt={v.titulo} className={styles.videoThumb} />
            <div className={styles.videoPlay}>▶</div>
          </div>
          <div className={styles.videoTitulo}>{v.titulo}</div>
          <div className={styles.videoData}>{v.data}</div>
        </a>
      ))}
    </div>
  )
}

function MomentosCarousel() {
  const [aoVivo, setAoVivo]     = useState<Video[]>([])
  const [momentos, setMomentos] = useState<Video[]>([])
  const [outros, setOutros]     = useState<Video[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    fetch('/api/esporte/noticias').then(r => r.json()).then(d => {
      setAoVivo(d.aoVivo || [])
      setMomentos(d.momentos || [])
      setOutros(d.outros || [])
      setLoading(false)
    }).catch(() => setLoading(false))
  }, [])

  const vazio = !loading && aoVivo.length === 0 && momentos.length === 0 && outros.length === 0

  return (
    <div className={styles.momentosSec}>
      <div className={styles.momentosTitle}>📺 CazéTV · Copa do Mundo FIFA 2026</div>

      {loading && <div className={styles.momentosLoading}>Carregando vídeos...</div>}
      {vazio   && <div className={styles.momentosLoading}>Nenhum vídeo disponível.</div>}

      {aoVivo.length > 0 && (
        <div className={styles.videoSec}>
          <div className={styles.videoSecTitle}>🔴 Próximas transmissões ao vivo</div>
          <VideoRow videos={aoVivo} />
        </div>
      )}

      {momentos.length > 0 && (
        <div className={styles.videoSec}>
          <div className={styles.videoSecTitle}>🏆 Melhores Momentos | Copa do Mundo FIFA™ 2026</div>
          <VideoRow videos={momentos} />
        </div>
      )}

      {outros.length > 0 && (
        <div className={styles.videoSec}>
          <div className={styles.videoSecTitle}>📹 Outros vídeos</div>
          <VideoRow videos={outros} />
        </div>
      )}

      <a href="https://www.youtube.com/@cazetv" target="_blank" rel="noopener noreferrer" className={styles.momentosLink}>
        Ver canal CazéTV no YouTube →
      </a>
    </div>
  )
}

export default function EsporteForm({ bolao, jogos, totalPagos }: Props) {
  const [step, setStep]         = useState<'form'|'pix'|'ok'>('form')
  const [cadastrando, setCadastrando] = useState(false)
  const [logado, setLogado]     = useState(false)
  const [nome, setNome]         = useState('')
  const [telefone, setTelefone] = useState('')
  const [email, setEmail]       = useState('')
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

  // Carrega cadastro salvo
  useEffect(() => {
    const salvo = localStorage.getItem('bolao_participante')
    if (salvo) {
      try {
        const { nome: n, telefone: t, email: e } = JSON.parse(salvo)
        if (n) setNome(n)
        if (t) setTelefone(t)
        if (e) setEmail(e)
        setLogado(true)
        setCadastrando(true)
      } catch {}
    }
  }, [])

  function salvarCadastro() {
    if (!nome.trim() || telefone.replace(/\D/g,'').length < 11 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      alert('⚠️ Preencha nome, WhatsApp e e-mail corretamente para salvar.')
      return
    }
    localStorage.setItem('bolao_participante', JSON.stringify({ nome: nome.trim().toUpperCase(), telefone, email: email.trim().toLowerCase() }))
    setLogado(true)
    alert('✅ Cadastro salvo! Seus dados serão lembrados neste dispositivo.')
  }

  function sairCadastro() {
    localStorage.removeItem('bolao_participante')
    setLogado(false)
    setNome('')
    setTelefone('')
    setEmail('')
    setCadastrando(false)
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
  const podeContinuar    = nome.trim().length >= 3 && telefone.replace(/\D/g,'').length === 11 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

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
    if (!nome.trim() || nome.trim().length < 3) { alert('⚠️ Informe seu nome completo!'); return }
    if (telefone.replace(/\D/g,'').length < 11)  { alert('⚠️ Informe seu WhatsApp com DDD!'); return }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { alert('⚠️ Informe um e-mail válido!'); return }
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
        if (st.status === 'approved') {
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

      {/* ── Header ── */}
      <div className={styles.header}>
        <img src="/1684502982782.gif" alt="FIFA World Cup 2026" className={styles.headerLogo} />
        <div className={styles.headerComp}>{bolao.nome}</div>
        {bolao.descricao && <p className={styles.headerDesc}>{bolao.descricao}</p>}
      </div>

      {/* ── Momentos FIFA ── */}
      <MomentosCarousel />

      {/* ── Premiação ── */}
      {(() => {
        const arrecadacao = 50 * Number(bolao.valor_cota)
        const liquido = arrecadacao * (1 - Number(bolao.taxa_admin) / 100)
        const p1 = liquido * 0.60
        const p2 = liquido * 0.30
        const p3 = liquido * 0.10
        return (
          <div className={styles.pontuacaoBar}>
            <div className={styles.pontuacaoItem}>
              <TacaFifa variant="gold" />
              <div className={styles.pontuacaoTextos}>
                <span className={styles.pontuacaoTxt}>Acertou o vencedor e o placar da partida, leva o 1º Prêmio!</span>
                <span className={styles.pontuacaoValor} style={{color:'#FFB81C'}}>{formatReal(p1)}</span>
              </div>
            </div>
            <span className={styles.pontuacaoDiv} />
            <div className={styles.pontuacaoItem}>
              <TacaFifa variant="silver" />
              <div className={styles.pontuacaoTextos}>
                <span className={styles.pontuacaoTxt}>Acertou o vencedor, leva o 2º Prêmio!</span>
                <span className={styles.pontuacaoValor} style={{color:'#C0C0C0'}}>{formatReal(p2)}</span>
              </div>
            </div>
            <span className={styles.pontuacaoDiv} />
            <div className={styles.pontuacaoItem}>
              <TacaFifa variant="bronze" />
              <div className={styles.pontuacaoTextos}>
                <span className={styles.pontuacaoTxt}>Acertou o placar da partida, leva o 3º Prêmio!</span>
                <span className={styles.pontuacaoValor} style={{color:'#CD7F32'}}>{formatReal(p3)}</span>
              </div>
            </div>
          </div>
        )
      })()}

      {/* ── CTA topo ── */}
      {step === 'form' && !cadastrando && jogosDisponiveis.length > 0 && (
        <div className={styles.ctaWrap}>
          <button type="button" className={styles.btnConfirmar} onClick={() => setCadastrando(true)}>
            {logado ? `⚽ Continuar como ${nome.split(' ')[0]}` : '⚽ Quero Participar'}
          </button>
        </div>
      )}

      <div className={styles.card}>

        {/* ── Dados pessoais ── */}
        {step === 'form' && cadastrando && (
          <div className={styles.section}>
            <div className={styles.sectionTitleRow}>
              <span className={styles.sectionTitle}>👤 Seus dados</span>
              {logado && (
                <span className={styles.logadoBadge}>✅ Salvo</span>
              )}
            </div>
            <div className={styles.field}>
              <label className={styles.label}>Nome completo *</label>
              <input className={styles.input} type="text" value={nome} onChange={e => { setNome(e.target.value.toUpperCase()); setLogado(false) }} placeholder="SEU NOME COMPLETO" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>WhatsApp *</label>
              <input className={styles.input} type="tel" value={telefone} inputMode="numeric"
                onChange={e => {
                  const v = e.target.value.replace(/\D/g,'').slice(0,11)
                  const f = v.length <= 2 ? v : v.length <= 7 ? `(${v.slice(0,2)}) ${v.slice(2)}` : `(${v.slice(0,2)}) ${v.slice(2,7)}-${v.slice(7)}`
                  setTelefone(f)
                  setLogado(false)
                }}
                placeholder="(19) 99999-9999" />
            </div>
            <div className={styles.field}>
              <label className={styles.label}>E-mail *</label>
              <input className={styles.input} type="email" value={email} onChange={e => { setEmail(e.target.value); setLogado(false) }} placeholder="seu@email.com" autoComplete="email" />
            </div>
            <div className={styles.cadastroBtns}>
              <button type="button" className={styles.btnSalvar} onClick={salvarCadastro}>
                💾 Salvar cadastro
              </button>
              {logado && (
                <button type="button" className={styles.btnSair} onClick={sairCadastro}>
                  Sair
                </button>
              )}
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

        {/* ── Palpites ── */}
        {step === 'form' && jogosAbertos.length > 0 && (
          <div className={styles.section}>
            <div className={styles.sectionTitle}>⚽ Seus palpites</div>

            {/* Jogos de Hoje */}
            {jogosHoje.length > 0 && (
              <div className={styles.faseBlock}>
                <div className={styles.faseHeader}>
                  <span className={styles.faseLabel} data-urgente="true">🔥 Jogos de Hoje</span>
                  <span className={styles.faseSubtitle}>Ainda dá tempo de apostar!</span>
                  <div className={styles.faseLine} />
                </div>
                {jogosHoje.map(jogo => <JogoCard key={jogo.id} jogo={jogo} palpites={palpites} bloqueado={false} setPalpite={setPalpite} styles={styles} />)}
              </div>
            )}

            {/* Próximos Jogos */}
            {jogosFuturos.length > 0 && (
              <div className={styles.faseBlock}>
                <div className={styles.faseHeader}>
                  <span className={styles.faseLabel}>📅 Próximos Jogos</span>
                  <span className={styles.faseSubtitle}>Não deixe para amanhã, faça seu palpite agora!</span>
                  <div className={styles.faseLine} />
                </div>
                {jogosFuturos.map(jogo => <JogoCard key={jogo.id} jogo={jogo} palpites={palpites} bloqueado={false} setPalpite={setPalpite} styles={styles} />)}
              </div>
            )}

            {/* Progresso */}
            {cadastrando && (
              <div className={styles.progressWrap}>
                <div className={styles.progressBar}>
                  <div className={styles.progressFill} style={{ width: `${jogosDisponiveis.length ? (preenchidos / jogosDisponiveis.length) * 100 : 0}%` }} />
                </div>
                <div className={styles.progressLabel}>{preenchidos} de {jogosDisponiveis.length} palpites preenchidos</div>
              </div>
            )}
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

        {/* ── CTA: Quero Participar ── */}
        {step === 'form' && !cadastrando && jogosDisponiveis.length > 0 && (
          <button
            type="button"
            className={styles.btnConfirmar}
            onClick={() => setCadastrando(true)}
          >
            ⚽ Quero Participar
          </button>
        )}

        {/* ── Botão confirmar ── */}
        {step === 'form' && cadastrando && (
          <button
            type="button"
            className={styles.btnConfirmar}
            onClick={confirmar}
            disabled={enviando || !todosPreenchidos || !podeContinuar}
          >
            {enviando ? 'Registrando…' : `✅ Confirmar e pagar R$ ${Number(bolao.valor_cota).toFixed(2).replace('.',',')}`}
          </button>
        )}

      </div>
    </div>
  )
}
