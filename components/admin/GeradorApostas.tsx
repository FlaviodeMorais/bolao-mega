'use client'
import { useState, useEffect, useCallback } from 'react'
import styles from '@/app/admin/admin.module.css'
import { getLoteria, type LoteriaId } from '@/lib/loterias'
import TrevoIcon from '@/components/TrevoIcon'

interface NumStat { numero: number; count: number; pct: number; atraso?: number }
interface Parceiro { parceiro: number; count: number }
type Estrategia = 'frequentes' | 'atrasados' | 'equilibrado' | 'aleatoria'
type FonteParceiros = 'geral' | 'consecutiva' | null

// Soma dos counts dos parceiros de cada número — quanto maior, mais "conectado"
// esse número é historicamente aos demais (base do peso extra no gerador).
function partnerScorePorNumero(mapa: Record<number, Parceiro[]>): Record<number, number> {
  const score: Record<number, number> = {}
  for (const [num, parceiros] of Object.entries(mapa)) {
    score[Number(num)] = parceiros.reduce((s, p) => s + p.count, 0)
  }
  return score
}

// Maior sequência de números consecutivos numa aposta (ex: 12,13,14 → 3)
function maxSequencia(aposta: number[]): number {
  let max = 1, atual = 1
  for (let i = 1; i < aposta.length; i++) {
    if (aposta[i] === aposta[i - 1] + 1) { atual++; max = Math.max(max, atual) }
    else atual = 1
  }
  return max
}

function gerarCombinacoes(
  freq: NumStat[], atrasos: NumStat[], estrategia: Estrategia,
  numApostas: number, dezenas: number, totalNums: number,
  filtroParidade: boolean, filtroQuadrante: boolean, filtroSequencia: boolean,
  parceirosScore: Record<number, number> | null,
): number[][] {
  const scores: Record<number, number> = {}
  for (let i = 1; i <= totalNums; i++) scores[i] = 0

  if (estrategia === 'frequentes' || estrategia === 'equilibrado') {
    const max = Math.max(...freq.map(f => f.count), 1)
    freq.forEach(f => { scores[f.numero] = (scores[f.numero] || 0) + f.count / max })
  }
  if (estrategia === 'atrasados' || estrategia === 'equilibrado') {
    const maxAt = Math.max(...atrasos.map(a => a.atraso || 0), 1)
    atrasos.forEach(a => { scores[a.numero] = (scores[a.numero] || 0) + (a.atraso || 0) / maxAt })
  }
  if (estrategia === 'aleatoria') {
    for (let i = 1; i <= totalNums; i++) scores[i] = Math.random()
  }
  // Peso extra combinável: números historicamente mais "conectados" a outros
  // (estilo Wonder Grid) somam pontuação por cima de qualquer estratégia acima.
  if (parceirosScore) {
    const maxP = Math.max(...Object.values(parceirosScore), 1)
    for (let i = 1; i <= totalNums; i++) scores[i] = (scores[i] || 0) + (parceirosScore[i] || 0) / maxP
  }

  const apostas: number[][] = []
  let tentativas = 0

  while (apostas.length < numApostas && tentativas < 3000) {
    tentativas++
    const selecionados: number[] = []
    const pool = Array.from({ length: totalNums }, (_, i) => i + 1)
    while (selecionados.length < dezenas) {
      const disp = pool.filter(n => !selecionados.includes(n))
      const tot  = disp.reduce((s, n) => s + (scores[n] || 0) + 0.1, 0)
      let r = Math.random() * tot
      for (const n of disp) { r -= (scores[n] || 0) + 0.1; if (r <= 0) { selecionados.push(n); break } }
    }
    const aposta = selecionados.sort((a, b) => a - b)
    if (filtroParidade && totalNums >= 20) {
      const pares = aposta.filter(n => n % 2 === 0).length
      const limPar = Math.round(dezenas * 0.6)
      const limImpar = dezenas - Math.round(dezenas * 0.4)
      if (pares < dezenas - limPar || pares > limImpar) continue
    }
    if (filtroQuadrante && totalNums >= 20) {
      const faixas = Math.min(4, Math.floor(totalNums / 15))
      const q = new Array(faixas).fill(0)
      aposta.forEach(n => { const idx = Math.min(faixas - 1, Math.floor((n - 1) / Math.ceil(totalNums / faixas))); q[idx]++ })
      if (q.some(v => v === 0)) continue
    }
    if (filtroSequencia) {
      // Limite escala com a densidade dezenas/totalNums (ex: mega/quina toleram só 2 seguidos;
      // lotofácil, que sorteia 15 de 25, naturalmente tem sequências bem mais longas)
      const limite = Math.max(2, Math.round((dezenas * dezenas) / totalNums) + 2)
      if (maxSequencia(aposta) > limite) continue
    }
    const chave = aposta.join('-')
    if (!apostas.some(a => a.join('-') === chave)) apostas.push(aposta)
  }
  return apostas
}

// Bolinha e fonte encolhem linearmente de 6 (maior) até 20 dezenas (menor),
// garantindo que qualquer aposta (6 a 20 dezenas) caiba numa única linha.
function tamanhoBola(dezenas: number): { ballSize: number; fontSize: number } {
  const MIN_DEZ = 6, MAX_DEZ = 20
  const t = Math.min(1, Math.max(0, (dezenas - MIN_DEZ) / (MAX_DEZ - MIN_DEZ)))
  const ballSize = Math.round(34 - t * (34 - 20))
  const fontSize = Math.round(14 - t * (14 - 10))
  return { ballSize, fontSize }
}

const ESTRATEGIAS: { id: Estrategia; label: string; desc: string }[] = [
  { id: 'equilibrado', label: '⚖️ Equilibrada',      desc: 'Mistura frequentes + atrasados' },
  { id: 'frequentes',  label: '🔥 Frequentes',       desc: 'Prioriza os mais sorteados' },
  { id: 'atrasados',   label: '⏳ Atrasados',        desc: 'Prioriza números sem sair há mais tempo' },
  { id: 'aleatoria',   label: '🎲 Aleatória',        desc: 'Seleção puramente aleatória' },
]

interface Props {
  loteria: LoteriaId
  dezenasBolao: number
  numApostas: number
  uploadingApostas: boolean
  apostasMsg?: string
  onInserirApostas: (texto: string) => void
}

export default function GeradorApostas({ loteria, dezenasBolao, numApostas, uploadingApostas, apostasMsg, onInserirApostas }: Props) {
  const cfg = getLoteria(loteria)
  const dezenas = dezenasBolao

  const [freqDados, setFreqDados]       = useState<NumStat[]>([])
  const [atrasosDados, setAtrasosDados] = useState<NumStat[]>([])
  const [paresPorNumero, setParesPorNumero]       = useState<Record<number, Parceiro[]>>({})
  const [paresConsecPorNumero, setParesConsecPorNumero] = useState<Record<number, Parceiro[]>>({})
  const [loadingEstat, setLoadingEstat] = useState(false)

  const [estrategia, setEstrategia]           = useState<Estrategia>('equilibrado')
  const [fonteParceiros, setFonteParceiros]   = useState<FonteParceiros>(null)
  const [filtroParidade, setFiltroParidade]     = useState(true)
  const [filtroQuadrante, setFiltroQuadrante]   = useState(false)
  const [filtroSequencia, setFiltroSequencia]   = useState(false)
  const [apostasGeradas, setApostasGeradas]   = useState<number[][]>([])
  const [gerando, setGerando]                 = useState(false)
  const [copiado, setCopiado]                 = useState(false)

  // Reset ao mudar loteria
  useEffect(() => {
    setFreqDados([]); setAtrasosDados([]); setParesPorNumero({}); setParesConsecPorNumero({})
    setApostasGeradas([])
  }, [loteria, dezenasBolao])

  useEffect(() => {
    if (freqDados.length > 0) return
    setLoadingEstat(true)
    Promise.all([
      fetch(`/api/estatisticas/frequencia?loteria=${loteria}`).then(r => r.json()),
      fetch(`/api/estatisticas/atrasos?loteria=${loteria}`).then(r => r.json()),
      fetch(`/api/estatisticas/combinacoes?loteria=${loteria}`).then(r => r.json()),
    ]).then(([f, a, c]) => {
      setFreqDados(f.numeros || [])
      setAtrasosDados(a.numeros || [])
      setParesPorNumero(c.paresPorNumero || {})
      setParesConsecPorNumero(c.paresConsecPorNumero || {})
      setLoadingEstat(false)
    }).catch(() => setLoadingEstat(false))
  }, [loteria, freqDados.length])

  const gerar = useCallback(() => {
    setGerando(true)
    setTimeout(() => {
      const parceirosMap = fonteParceiros === 'geral' ? paresPorNumero : fonteParceiros === 'consecutiva' ? paresConsecPorNumero : null
      const parceirosScore = parceirosMap ? partnerScorePorNumero(parceirosMap) : null
      const res = gerarCombinacoes(freqDados, atrasosDados, estrategia, numApostas, dezenas, cfg.totalNumeros, filtroParidade, filtroQuadrante, filtroSequencia, parceirosScore)
      setApostasGeradas(res); setGerando(false); setCopiado(false)
    }, 50)
  }, [freqDados, atrasosDados, estrategia, fonteParceiros, paresPorNumero, paresConsecPorNumero, numApostas, dezenas, cfg.totalNumeros, filtroParidade, filtroQuadrante, filtroSequencia])

  function copiar() {
    const txt = apostasGeradas.map((a, i) =>
      `Aposta ${i + 1}: ${a.map(n => String(n).padStart(2, '0')).join(' - ')}`
    ).join('\n')
    navigator.clipboard.writeText(txt)
    setCopiado(true); setTimeout(() => setCopiado(false), 2000)
  }

  function handleInserir() {
    if (!apostasGeradas.length) return
    const texto = apostasGeradas.map(a => a.map(n => String(n).padStart(2, '0')).join(' ')).join('\n')
    onInserirApostas(texto)
  }

  return (
    <div className={styles.geradorConfig}>
      {apostasGeradas.length > 0 && (
        <div className={styles.geradorResultadoHeader} style={{ justifyContent: 'flex-end' }}>
          <button type="button" className={styles.btnSecundario}
            onClick={copiar} style={{ padding: '5px 12px', fontSize: 12 }}>
            {copiado ? '✅ Copiado!' : '📋 Copiar'}
          </button>
        </div>
      )}

      {loadingEstat && (
        <div className={styles.geradorLoading}>Carregando estatísticas da {cfg.label}...</div>
      )}
      {!loadingEstat && freqDados.length === 0 && (
        <div className={styles.geradorLoading}>
          Histórico não carregado — acesse 🛠️ Ferramentas → <TrevoIcon loteria={loteria} size={12} /> {cfg.label}
        </div>
      )}

      <div className={styles.geradorSplit}>
        <div className={styles.geradorSplitCol}>
          <div className={styles.geradorConfigGroup}>
            <div className={styles.geradorConfigLabel}>Estratégia</div>
            <div className={styles.geradorEstrategias}>
              {ESTRATEGIAS.map(e => (
                <button key={e.id} type="button" title={e.desc}
                  className={`${styles.geradorEstrBtn} ${estrategia === e.id ? styles.geradorEstrBtnAtivo : ''}`}
                  style={estrategia === e.id ? { background: cfg.cor, borderColor: cfg.cor } : {}}
                  onClick={() => setEstrategia(e.id)}>
                  {e.label}
                </button>
              ))}
            </div>
          </div>

          <div className={styles.geradorConfigGroup}>
            <div className={styles.geradorConfigLabel}>Base dos parceiros</div>
            <div className={styles.geradorEstrategias}>
              <button type="button" title="Soma peso extra aos números que mais saíram juntos historicamente (estilo Wonder Grid) — clique de novo para desativar"
                className={`${styles.geradorEstrBtn} ${fonteParceiros === 'geral' ? styles.geradorEstrBtnAtivo : ''}`}
                style={fonteParceiros === 'geral' ? { background: cfg.cor, borderColor: cfg.cor } : {}}
                onClick={() => setFonteParceiros(f => f === 'geral' ? null : 'geral')}>
                🔗 Duplas gerais
              </button>
              <button type="button" title="Soma peso extra aos números literalmente consecutivos entre si (ex: 43 → 44) — clique de novo para desativar"
                className={`${styles.geradorEstrBtn} ${fonteParceiros === 'consecutiva' ? styles.geradorEstrBtnAtivo : ''}`}
                style={fonteParceiros === 'consecutiva' ? { background: cfg.cor, borderColor: cfg.cor } : {}}
                onClick={() => setFonteParceiros(f => f === 'consecutiva' ? null : 'consecutiva')}>
                🔢 Consecutivas
              </button>
            </div>
          </div>

          {cfg.totalNumeros >= 20 && (
            <div className={styles.geradorFiltros}>
              <label className={styles.geradorCheck}>
                <input type="checkbox" checked={filtroParidade} onChange={e => setFiltroParidade(e.target.checked)} />
                <span>Paridade equilibrada</span>
              </label>
              <label className={styles.geradorCheck}>
                <input type="checkbox" checked={filtroQuadrante} onChange={e => setFiltroQuadrante(e.target.checked)} />
                <span>Distribuição por faixas</span>
              </label>
              <label className={styles.geradorCheck}>
                <input type="checkbox" checked={filtroSequencia} onChange={e => setFiltroSequencia(e.target.checked)} />
                <span>Evitar sequências longas</span>
              </label>
            </div>
          )}

          <button type="button" className={styles.btnPrimario}
            style={{ background: cfg.cor, width: 175, marginTop: 4 }}
            onClick={gerar} disabled={gerando || freqDados.length === 0}>
            <span className={styles.btnPrimarioLabel}>{gerando ? '⟳ Gerando...' : '✨ Gerar Combinações'}</span>
          </button>

          {apostasGeradas.length > 0 && (
            <button type="button" className={styles.btnPrimario}
              style={{ background: cfg.cor, width: 175 }}
              onClick={handleInserir} disabled={uploadingApostas}>
              <span className={styles.btnPrimarioLabel}>{uploadingApostas ? '⟳ Inserindo...' : '📊 Inserir apostas'}</span>
            </button>
          )}
          {apostasMsg && (
            <div className={apostasMsg.startsWith('✅') ? styles.lembreteMsg : styles.loginErr}
              style={{ width: 175, textAlign: 'center' }}>
              {apostasMsg}
            </div>
          )}
        </div>

        <div className={styles.geradorSplitCol}>
          {apostasGeradas.length > 0 ? (
            <div className={styles.geradorResultado}>
              <div className={styles.geradorApostas}>
                {apostasGeradas.map((aposta, i) => {
                  // Sempre uma linha só (6 a 20 dezenas) - bolinha e fonte encolhem
                  // proporcionalmente conforme a quantidade de dezenas cresce.
                  const { ballSize, fontSize } = tamanhoBola(aposta.length)
                  return (
                    <div key={i} className={styles.geradorApostaRow}>
                      <div className={styles.geradorApostaBalls}>
                        {aposta.map(n => (
                          <span key={n} className={styles.geradorApoBall}
                            style={{ background: cfg.cor, width: ballSize, height: ballSize, fontSize }}>
                            {String(n).padStart(2, '0')}
                          </span>
                        ))}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className={styles.geradorLoading}>
              As combinações geradas vão aparecer aqui.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
