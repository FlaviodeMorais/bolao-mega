'use client'
import { useState } from 'react'
import styles from '@/app/admin/admin.module.css'

const TOTAL_CONCURSOS = 3024
const BASE = 'https://servicebus2.caixa.gov.br/portaldeloterias/api/megasena'

interface Linha { concurso: number; dezenas: number[]; data_sorteio: string | null }

export default function IngerirHistorico() {
  const [status, setStatus]       = useState<'idle' | 'rodando' | 'ok' | 'erro'>('idle')
  const [progresso, setProgresso] = useState(0)
  const [log, setLog]             = useState<string[]>([])
  const [info, setInfo]           = useState<{ total: number; primeiro: number; ultimo: number } | null>(null)
  const [carregandoInfo, setCarregandoInfo] = useState(false)

  async function verificarBanco() {
    setCarregandoInfo(true)
    const r = await fetch('/api/estatisticas/info').then(r => r.json()).catch(() => null)
    setInfo(r)
    setCarregandoInfo(false)
  }

  // Busca UM concurso diretamente do browser (IP residencial → sem bloqueio da Caixa)
  async function buscarConcurso(n: number): Promise<Linha | null> {
    try {
      const ctrl = new AbortController()
      const timer = setTimeout(() => ctrl.abort(), 8000)
      const r = await fetch(`${BASE}/${n}`, { cache: 'no-store', signal: ctrl.signal })
      clearTimeout(timer)
      if (!r.ok) return null
      const d = await r.json()
      const dezenas = (d.listaDezenas || d.dezenas || []).map(Number)
      if (dezenas.length !== 6) return null
      return { concurso: n, dezenas, data_sorteio: d.dataApuracao || null }
    } catch {
      return null
    }
  }

  // Envia lote de resultados para o backend inserir no Supabase
  async function salvarLote(linhas: Linha[]): Promise<{ ok: boolean; erro?: string }> {
    try {
      const r = await fetch('/api/admin/salvar-historico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ linhas }),
      })
      return await r.json()
    } catch (e) {
      return { ok: false, erro: String(e) }
    }
  }

  async function iniciarIngestao() {
    setStatus('rodando')
    setProgresso(0)
    setLog([])
    let inseridosTotal = 0
    let errosTotal = 0

    const LOTE_FETCH = 8    // menos paralelo = mais estável
    const LOTE_SALVAR = 80  // salva a cada 80 concursos

    let buffer: Linha[] = []

    try {
      for (let inicio = 1; inicio <= TOTAL_CONCURSOS; inicio += LOTE_FETCH) {
        const nums = Array.from(
          { length: Math.min(LOTE_FETCH, TOTAL_CONCURSOS - inicio + 1) },
          (_, i) => inicio + i
        )

        const resultados = await Promise.all(nums.map(buscarConcurso))

        for (const r of resultados) {
          if (r) buffer.push(r)
          else errosTotal++
        }

        const isUltimoLote = inicio + LOTE_FETCH > TOTAL_CONCURSOS
        if (buffer.length >= LOTE_SALVAR || isUltimoLote) {
          if (buffer.length > 0) {
            const save = await salvarLote(buffer)
            if (save.ok) {
              inseridosTotal += buffer.length
              setLog(l => [...l, `✅ ${buffer[0].concurso}–${buffer[buffer.length-1].concurso}: ${buffer.length} salvos`])
            } else {
              errosTotal += buffer.length
              setLog(l => [...l, `❌ Lote ${buffer[0].concurso}–${buffer[buffer.length-1].concurso}: ${save.erro}`])
            }
            buffer = []
          }
        }

        setProgresso(Math.round((Math.min(inicio + LOTE_FETCH - 1, TOTAL_CONCURSOS) / TOTAL_CONCURSOS) * 100))

        // Pequena pausa para não sobrecarregar o browser
        await new Promise(res => setTimeout(res, 100))
      }
    } catch (err) {
      setLog(l => [...l, `💥 Erro inesperado: ${String(err)}`])
    }

    setLog(l => [...l, `🏁 Concluído: ${inseridosTotal} inseridos, ${errosTotal} erros.`])
    setStatus(inseridosTotal > 0 ? 'ok' : 'erro')
    verificarBanco()
  }

  return (
    <div className={styles.panel}>
      <div className={styles.panelTitle}>🗄️ Histórico Estatístico</div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <button
          type="button"
          className={styles.btnLoad}
          onClick={verificarBanco}
          disabled={carregandoInfo}
          style={{ marginBottom: 0 }}
        >
          {carregandoInfo ? 'Verificando...' : '🔍 Verificar banco'}
        </button>
        {info && (
          <span style={{ fontSize: 12, color: info.total > 0 ? '#00A651' : '#f59e0b' }}>
            {info.total > 0
              ? `${info.total.toLocaleString('pt-BR')} concursos (${info.primeiro}–${info.ultimo})`
              : 'Banco vazio'}
          </span>
        )}
      </div>

      {status === 'idle' && (
        <p style={{ fontSize: 12, color: '#4a6070', marginBottom: 14, lineHeight: 1.5 }}>
          Busca os resultados históricos diretamente do seu browser (necessário para contornar bloqueio de IP da Caixa) e salva no banco. Leva alguns minutos — <strong>não feche esta aba</strong>.
        </p>
      )}

      {status === 'idle' && (
        <button type="button" className={styles.btnLoad} onClick={iniciarIngestao}>
          ⬇️ Carregar histórico completo (~{TOTAL_CONCURSOS} concursos)
        </button>
      )}

      {status === 'rodando' && (
        <div style={{ marginBottom: 10 }}>
          <div style={{ height: 8, background: '#1e2d3d', borderRadius: 4, overflow: 'hidden', marginBottom: 4 }}>
            <div style={{ height: '100%', width: `${progresso}%`, background: '#00A651', borderRadius: 4, transition: 'width .3s ease' }} />
          </div>
          <div style={{ fontSize: 11, color: '#4a6070' }}>{progresso}% concluído — não feche esta aba...</div>
        </div>
      )}

      {status !== 'idle' && log.length > 0 && (
        <div style={{
          background: '#0a1520', border: '1px solid #1e2d3d', borderRadius: 8,
          padding: '10px 12px', maxHeight: 160, overflowY: 'auto',
          fontFamily: 'monospace', fontSize: 11, color: '#4a6070', lineHeight: 1.6, marginBottom: 10
        }}>
          {log.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}

      {status === 'ok' && <div style={{ color: '#00A651', fontSize: 13, fontWeight: 700, marginBottom: 10 }}>✅ Histórico carregado! Acesse /estatisticas para ver as análises.</div>}
      {status === 'erro' && <div style={{ color: '#f87171', fontSize: 13, marginBottom: 10 }}>⚠️ Falha na ingestão. Verifique o console do browser.</div>}

      {(status === 'ok' || status === 'erro') && (
        <button type="button" className={styles.btnLoad} onClick={() => { setStatus('idle'); setLog([]); setProgresso(0) }}>
          Resetar
        </button>
      )}
    </div>
  )
}
