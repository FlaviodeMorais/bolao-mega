'use client'
import { useState, useRef } from 'react'
import styles from '@/app/admin/admin.module.css'
import { LOTERIA_LIST, getLoteria, type LoteriaId } from '@/lib/loterias'

// Totais aproximados por loteria para a barra de progresso
const TOTAIS: Record<LoteriaId, number> = { mega: 3024, lotofacil: 3100, quina: 6400 }

// URL da API Caixa por loteria
const CAIXA_URL: Record<LoteriaId, string> = {
  mega:      'https://servicebus2.caixa.gov.br/portaldeloterias/api/megasena',
  lotofacil: 'https://servicebus2.caixa.gov.br/portaldeloterias/api/lotofacil',
  quina:     'https://servicebus2.caixa.gov.br/portaldeloterias/api/quina',
}

interface Linha { concurso: number; dezenas: number[]; data_sorteio: string | null }

export default function IngerirHistorico() {
  const [loteria, setLoteria]       = useState<LoteriaId>('mega')
  const [rodando, setRodando]       = useState(false)
  const [pct, setPct]               = useState(0)
  const [resumo, setResumo]         = useState('')
  const [info, setInfo]             = useState<Record<LoteriaId, string | null>>({ mega: null, lotofacil: null, quina: null })
  const [verificando, setVerif]     = useState(false)
  const abortRef                    = useRef(false)

  async function verificar() {
    setVerif(true)
    const results = await Promise.all(
      LOTERIA_LIST.map(l =>
        fetch(`/api/estatisticas/info?loteria=${l.id}`).then(r => r.json()).catch(() => null)
      )
    )
    const novo: Record<string, string | null> = {}
    LOTERIA_LIST.forEach((l, i) => {
      const r = results[i]
      novo[l.id] = r?.total > 0
        ? `${r.total.toLocaleString('pt-BR')} concursos (${r.primeiro}–${r.ultimo})`
        : 'Banco vazio'
    })
    setInfo(novo as Record<LoteriaId, string | null>)
    setVerif(false)
  }

  async function iniciar() {
    abortRef.current = false
    setRodando(true); setPct(0)
    const total    = TOTAIS[loteria]
    const baseUrl  = CAIXA_URL[loteria]
    const cfg      = getLoteria(loteria)
    let inseridos  = 0
    let erros      = 0
    let buffer: Linha[] = []
    setResumo('Iniciando...')

    for (let n = 1; n <= total; n++) {
      if (abortRef.current) { setResumo(`⏹ Parado em #${n}. ${inseridos} inseridos.`); break }

      try {
        const ctrl = new AbortController()
        const t = setTimeout(() => ctrl.abort(), 6000)
        const r = await fetch(`${baseUrl}/${n}`, { cache: 'no-store', signal: ctrl.signal })
        clearTimeout(t)
        if (r.ok) {
          const d = await r.json()
          const dez = (d.listaDezenas || d.dezenas || []).map(Number)
          if (dez.length === cfg.minDezenas) {
            buffer.push({ concurso: n, dezenas: dez, data_sorteio: d.dataApuracao || null })
          } else erros++
        } else erros++
      } catch { erros++ }

      if (buffer.length >= 50 || n === total) {
        if (buffer.length > 0) {
          try {
            const res = await fetch('/api/admin/salvar-historico', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ linhas: buffer, loteria }),
            }).then(r => r.json())
            if (res.ok) inseridos += buffer.length
            else erros += buffer.length
          } catch { erros += buffer.length }
          buffer = []
        }
        setPct(Math.round((n / total) * 100))
        setResumo(`#${n} de ${total} — ${inseridos} salvos, ${erros} erros`)
      }
    }

    if (!abortRef.current) setResumo(`✅ Concluído: ${inseridos} inseridos, ${erros} erros.`)
    setRodando(false)
    verificar()
  }

  const cfg = getLoteria(loteria)

  return (
    <div className={styles.panel}>
      <div className={styles.panelTitle}>🗄️ Histórico Estatístico</div>

      {/* Status por loteria */}
      <div className={`${styles.detStatsRow} ${styles.detStatsRow3}`}>
        {LOTERIA_LIST.map(l => {
          const val       = info[l.id]
          const vazio     = val?.includes('vazio')
          const carregado = val && !vazio
          const cor = carregado ? '#007A45' : vazio ? '#D97706' : '#94A3B8'
          return (
            <div key={l.id} className={`${styles.detStat} ${vazio ? styles.detStatWarn : ''}`}>
              <div className={`${styles.detStatVal} ${styles.detStatValSm}`} style={{ color: cor }}>
                {l.emoji} {l.label}
              </div>
              <span className={`${styles.detStatLbl} ${styles.detStatLblPlain}`} style={{ color: cor }}>
                {val ?? '—'}
              </span>
            </div>
          )
        })}
      </div>

      <div className={styles.btnRow}>
        <button className={`${styles.btnLoad} ${styles.btnLoadInline}`} onClick={verificar} disabled={verificando}>
          {verificando ? '⟳' : '🔍'} Verificar banco
        </button>
        <a href="/estatisticas" target="_blank" className={`${styles.btnLoad} ${styles.btnLoadInline}`}>
          📊 Ver Estatísticas
        </a>
      </div>

      {/* Seletor de loteria */}
      {!rodando && (
        <div className={styles.btnRow}>
          {LOTERIA_LIST.map(l => (
            <button key={l.id} type="button"
              className={`${styles.loteriaBotao} ${loteria === l.id ? styles.loteriaBotaoAtivo : ''}`}
              style={loteria === l.id ? { background: l.cor + '18', borderColor: l.cor, color: l.cor } : {}}
              onClick={() => setLoteria(l.id)}>
              {l.emoji} {l.label}
            </button>
          ))}
        </div>
      )}

      {!rodando && (
        <p className={styles.helpText}>
          Busca os concursos da <strong style={{ color: cfg.cor }}>{cfg.label}</strong> do seu browser e salva no banco.
          Aprox. <strong>{TOTAIS[loteria].toLocaleString('pt-BR')}</strong> concursos — leva ~15 min. <strong>Não feche esta aba.</strong>
        </p>
      )}

      {!rodando && (
        <button className={styles.btnLoad} onClick={iniciar}>
          ⬇️ Carregar histórico — {cfg.emoji} {cfg.label} (~{TOTAIS[loteria]} concursos)
        </button>
      )}

      {rodando && (
        <>
          <div className={styles.progressWrap}>
            <div className={styles.progressFill} style={{ width: `${pct}%`, background: cfg.cor }} />
          </div>
          <div className={styles.helpText}>{pct}% — {resumo}</div>
          <button className={styles.btnPerigoPad} onClick={() => { abortRef.current = true }}>
            ⏹ Parar
          </button>
        </>
      )}

      {!rodando && resumo && (
        <div className={`${styles.resumoMsg} ${resumo.includes('✅') ? styles.resumoMsgOk : styles.resumoMsgErr}`}>{resumo}</div>
      )}
    </div>
  )
}
