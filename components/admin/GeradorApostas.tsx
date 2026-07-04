'use client'
import { useState, useEffect, useCallback } from 'react'
import styles from '@/app/admin/admin.module.css'
import { getLoteria, type LoteriaId } from '@/lib/loterias'
import TrevoIcon from '@/components/TrevoIcon'

interface NumStat { numero: number; count: number; pct: number; atraso?: number }
type Estrategia = 'frequentes' | 'atrasados' | 'equilibrado' | 'aleatoria'

function gerarCombinacoes(
  freq: NumStat[], atrasos: NumStat[], estrategia: Estrategia,
  numApostas: number, dezenas: number, totalNums: number,
  filtroParidade: boolean, filtroQuadrante: boolean,
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
    const chave = aposta.join('-')
    if (!apostas.some(a => a.join('-') === chave)) apostas.push(aposta)
  }
  return apostas
}

const ESTRATEGIAS: { id: Estrategia; label: string; desc: string }[] = [
  { id: 'equilibrado', label: '⚖️ Equilibrada',  desc: 'Mistura frequentes + atrasados' },
  { id: 'frequentes',  label: '🔥 Frequentes',   desc: 'Prioriza os mais sorteados' },
  { id: 'atrasados',   label: '⏳ Atrasados',    desc: 'Prioriza números sem sair há mais tempo' },
  { id: 'aleatoria',   label: '🎲 Aleatória',    desc: 'Seleção puramente aleatória' },
]

interface Props {
  loteria: LoteriaId
  dezenasBolao: number
  uploadingApostas: boolean
  apostasMsg?: string
  onInserirApostas: (texto: string) => void
}

export default function GeradorApostas({ loteria, dezenasBolao, uploadingApostas, apostasMsg, onInserirApostas }: Props) {
  const cfg = getLoteria(loteria)

  const [freqDados, setFreqDados]       = useState<NumStat[]>([])
  const [atrasosDados, setAtrasosDados] = useState<NumStat[]>([])
  const [loadingEstat, setLoadingEstat] = useState(false)

  const [estrategia, setEstrategia]           = useState<Estrategia>('equilibrado')
  const [numApostas, setNumApostas]           = useState(6)
  const [dezenas, setDezenas]                 = useState(dezenasBolao)
  const [filtroParidade, setFiltroParidade]   = useState(true)
  const [filtroQuadrante, setFiltroQuadrante] = useState(false)
  const [apostasGeradas, setApostasGeradas]   = useState<number[][]>([])
  const [gerando, setGerando]                 = useState(false)
  const [copiado, setCopiado]                 = useState(false)

  // Reset ao mudar loteria
  useEffect(() => {
    setFreqDados([]); setAtrasosDados([])
    setApostasGeradas([]); setDezenas(dezenasBolao)
  }, [loteria, dezenasBolao])

  useEffect(() => {
    if (freqDados.length > 0) return
    setLoadingEstat(true)
    Promise.all([
      fetch(`/api/estatisticas/frequencia?loteria=${loteria}`).then(r => r.json()),
      fetch(`/api/estatisticas/atrasos?loteria=${loteria}`).then(r => r.json()),
    ]).then(([f, a]) => {
      setFreqDados(f.numeros || [])
      setAtrasosDados(a.numeros || [])
      setLoadingEstat(false)
    }).catch(() => setLoadingEstat(false))
  }, [loteria, freqDados.length])

  const gerar = useCallback(() => {
    setGerando(true)
    setTimeout(() => {
      const res = gerarCombinacoes(freqDados, atrasosDados, estrategia, numApostas, dezenas, cfg.totalNumeros, filtroParidade, filtroQuadrante)
      setApostasGeradas(res); setGerando(false); setCopiado(false)
    }, 50)
  }, [freqDados, atrasosDados, estrategia, numApostas, dezenas, cfg.totalNumeros, filtroParidade, filtroQuadrante])

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
      <div className={styles.geradorSectionLabel}><TrevoIcon loteria={loteria} size={12} /> Gerador de Apostas — {cfg.label}</div>
      {loadingEstat && (
        <div className={styles.geradorLoading}>Carregando estatísticas da {cfg.label}...</div>
      )}
      {!loadingEstat && freqDados.length === 0 && (
        <div className={styles.geradorLoading}>
          Histórico não carregado — acesse 🛠️ Ferramentas → <TrevoIcon loteria={loteria} size={12} /> {cfg.label}
        </div>
      )}

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

            <div className={styles.geradorParamRow}>
              <div className={styles.geradorParam}>
                <div className={styles.geradorConfigLabel}>Apostas</div>
                <div className={styles.geradorStepper}>
                  <button type="button" onClick={() => setNumApostas(n => Math.max(1, n - 1))}>−</button>
                  <span>{numApostas}</span>
                  <button type="button" onClick={() => setNumApostas(n => Math.min(50, n + 1))}>+</button>
                </div>
              </div>
              <div className={styles.geradorParam}>
                <div className={styles.geradorConfigLabel}>Dezenas / aposta ({cfg.minDezenas}–{cfg.maxDezenas})</div>
                <div className={styles.geradorStepper}>
                  <button type="button" onClick={() => setDezenas(n => Math.max(cfg.minDezenas, n - 1))}>−</button>
                  <span>{dezenas}</span>
                  <button type="button" onClick={() => setDezenas(n => Math.min(cfg.maxDezenas, n + 1))}>+</button>
                </div>
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
              </div>
            )}

            <button type="button" className={styles.btnPrimario}
              style={{ background: cfg.cor, width: '100%', justifyContent: 'center', marginTop: 4 }}
              onClick={gerar} disabled={gerando || freqDados.length === 0}>
              {gerando ? '⟳ Gerando...' : `✨ Gerar Combinações`}
            </button>

            {apostasGeradas.length > 0 && (
              <div className={styles.geradorResultado}>
                <div className={styles.geradorResultadoHeader}>
                  <span className={styles.geradorConfigLabel}>
                    {apostasGeradas.length} combinaç{apostasGeradas.length !== 1 ? 'ões' : 'ão'}
                  </span>
                  <button type="button" className={styles.btnSecundario}
                    onClick={copiar} style={{ padding: '5px 12px', fontSize: 12 }}>
                    {copiado ? '✅ Copiado!' : '📋 Copiar'}
                  </button>
                </div>
                <div className={styles.geradorApostas}>
                  {apostasGeradas.map((aposta, i) => (
                    <div key={i} className={styles.geradorApostaRow}>
                      <span className={styles.geradorApostaIdx}>{i + 1}</span>
                      <div className={styles.geradorApostaBalls}>
                        {aposta.map(n => (
                          <span key={n} className={styles.geradorApoBall}
                            style={{ background: `linear-gradient(135deg, ${cfg.corSecundaria} 0%, ${cfg.cor} 100%)` }}>
                            {String(n).padStart(2, '0')}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
                <button type="button" className={styles.btnPrimario}
                  style={{ background: cfg.cor, width: '100%', justifyContent: 'center', marginTop: 8 }}
                  onClick={handleInserir} disabled={uploadingApostas}>
                  {uploadingApostas ? '⟳ Inserindo...' : '📊 Inserir apostas neste bolão'}
                </button>
                {apostasMsg && (
                  <div className={apostasMsg.startsWith('✅') ? styles.lembreteMsg : styles.loginErr}
                    style={{ marginTop: 8, textAlign: 'center' }}>
                    {apostasMsg}
                  </div>
                )}
              </div>
            )}
          </div>
  )
}
