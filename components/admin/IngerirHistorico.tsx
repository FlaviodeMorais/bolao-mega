'use client'
import { useState, useRef } from 'react'
import styles from '@/app/admin/admin.module.css'

const TOTAL = 3024
const BASE  = 'https://servicebus2.caixa.gov.br/portaldeloterias/api/megasena'

interface Linha { concurso: number; dezenas: number[]; data_sorteio: string | null }

export default function IngerirHistorico() {
  const [rodando, setRodando]   = useState(false)
  const [pct, setPct]           = useState(0)
  const [resumo, setResumo]     = useState('')
  const [info, setInfo]         = useState<string | null>(null)
  const [verificando, setVerif] = useState(false)
  const abortRef                = useRef(false)

  async function verificar() {
    setVerif(true)
    const r = await fetch('/api/estatisticas/info').then(r => r.json()).catch(() => null)
    setInfo(r?.total > 0 ? `${r.total.toLocaleString('pt-BR')} concursos (${r.primeiro}–${r.ultimo})` : 'Banco vazio')
    setVerif(false)
  }

  async function parar() {
    abortRef.current = true
  }

  async function iniciar() {
    abortRef.current = false
    setRodando(true)
    setPct(0)
    setResumo('Iniciando...')

    let inseridos = 0
    let erros = 0
    let buffer: Linha[] = []

    for (let n = 1; n <= TOTAL; n++) {
      if (abortRef.current) { setResumo(`⏹ Parado em #${n}. ${inseridos} inseridos.`); break }

      // Busca 1 concurso por vez — sem sobrecarregar o browser
      try {
        const ctrl = new AbortController()
        const t = setTimeout(() => ctrl.abort(), 6000)
        const r = await fetch(`${BASE}/${n}`, { cache: 'no-store', signal: ctrl.signal })
        clearTimeout(t)
        if (r.ok) {
          const d = await r.json()
          const dez = (d.listaDezenas || d.dezenas || []).map(Number)
          if (dez.length === 6) buffer.push({ concurso: n, dezenas: dez, data_sorteio: d.dataApuracao || null })
          else erros++
        } else erros++
      } catch { erros++ }

      // Salva a cada 50 concursos ou no final
      if (buffer.length >= 50 || n === TOTAL) {
        if (buffer.length > 0) {
          try {
            const res = await fetch('/api/admin/salvar-historico', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ linhas: buffer }),
            }).then(r => r.json())
            if (res.ok) inseridos += buffer.length
            else erros += buffer.length
          } catch { erros += buffer.length }
          buffer = []
        }
        // Atualiza UI apenas a cada lote salvo — menos re-renders
        setPct(Math.round((n / TOTAL) * 100))
        setResumo(`#${n} de ${TOTAL} — ${inseridos} salvos, ${erros} erros`)
      }
    }

    if (!abortRef.current) setResumo(`✅ Concluído: ${inseridos} inseridos, ${erros} erros.`)
    setRodando(false)
    verificar()
  }

  return (
    <div className={styles.panel}>
      <div className={styles.panelTitle}>🗄️ Histórico Estatístico</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
        <button className={styles.btnLoad} onClick={verificar} disabled={verificando} style={{ marginBottom: 0 }}>
          {verificando ? 'Verificando...' : '🔍 Verificar banco'}
        </button>
        {info && <span style={{ fontSize: 12, color: info.includes('vazio') ? '#f59e0b' : '#00A651' }}>{info}</span>}
      </div>

      {!rodando && (
        <p style={{ fontSize: 12, color: '#4a6070', marginBottom: 12, lineHeight: 1.5 }}>
          Busca os ~3024 concursos da Mega-Sena do seu browser e salva no banco. Leva ~15 minutos — <strong>não feche esta aba</strong>.
        </p>
      )}

      {!rodando && (
        <button className={styles.btnLoad} onClick={iniciar}>
          ⬇️ Carregar histórico completo (~{TOTAL} concursos)
        </button>
      )}

      {rodando && (
        <>
          <div style={{ height: 8, background: '#1e2d3d', borderRadius: 4, overflow: 'hidden', marginBottom: 6 }}>
            <div style={{ height: '100%', width: `${pct}%`, background: '#00A651', borderRadius: 4, transition: 'width .5s' }} />
          </div>
          <div style={{ fontSize: 12, color: '#4a6070', marginBottom: 12 }}>{pct}% — {resumo}</div>
          <button className={styles.btnLoad} onClick={parar} style={{ background: '#1a1a2e', borderColor: '#f87171', color: '#f87171' }}>
            ⏹ Parar
          </button>
        </>
      )}

      {!rodando && resumo && (
        <div style={{ fontSize: 12, color: resumo.includes('✅') ? '#00A651' : '#f87171', marginTop: 8 }}>{resumo}</div>
      )}
    </div>
  )
}
