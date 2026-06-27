'use client'
import { useState } from 'react'
import styles from '@/app/admin/admin.module.css'

const TOTAL_CONCURSOS = 3024
const LOTE = 200

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

  async function iniciarIngestao() {
    setStatus('rodando')
    setProgresso(0)
    setLog([])
    let inseridosTotal = 0
    let errosTotal = 0

    for (let de = 1; de <= TOTAL_CONCURSOS; de += LOTE) {
      const ate = Math.min(de + LOTE - 1, TOTAL_CONCURSOS)
      try {
        const r = await fetch('/api/admin/ingerir-historico', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ de, ate }),
        }).then(r => r.json())
        inseridosTotal += r.inseridos || 0
        errosTotal += r.erros || 0
        setLog(l => [...l, `✅ ${de}–${ate}: ${r.inseridos} inseridos${r.erros ? `, ${r.erros} erros` : ''}`])
      } catch {
        setLog(l => [...l, `❌ Erro no lote ${de}–${ate}`])
        errosTotal++
      }
      setProgresso(Math.round((ate / TOTAL_CONCURSOS) * 100))
    }

    setLog(l => [...l, `🏁 Concluído: ${inseridosTotal} inseridos, ${errosTotal} erros.`])
    setStatus(errosTotal > inseridosTotal / 2 ? 'erro' : 'ok')
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
          Carrega todos os resultados históricos da Mega-Sena (API pública da Caixa) para habilitar as análises em <strong>/estatisticas</strong>. O processo leva alguns minutos — mantenha a aba aberta.
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
          <div style={{ fontSize: 11, color: '#4a6070' }}>{progresso}% concluído — aguarde...</div>
        </div>
      )}

      {status !== 'idle' && log.length > 0 && (
        <div style={{
          background: '#0a1520', border: '1px solid #1e2d3d', borderRadius: 8,
          padding: '10px 12px', maxHeight: 160, overflowY: 'auto',
          fontFamily: 'monospace', fontSize: 11, color: '#4a6070', lineHeight: 1.6,
          marginBottom: 10
        }}>
          {log.map((l, i) => <div key={i}>{l}</div>)}
        </div>
      )}

      {status === 'ok' && <div style={{ color: '#00A651', fontSize: 13, fontWeight: 700, marginBottom: 10 }}>✅ Histórico carregado! Acesse /estatisticas para ver as análises.</div>}
      {status === 'erro' && <div style={{ color: '#f87171', fontSize: 13, marginBottom: 10 }}>⚠️ Alguns concursos falharam. Tente novamente.</div>}

      {(status === 'ok' || status === 'erro') && (
        <button type="button" className={styles.btnLoad} onClick={() => { setStatus('idle'); setLog([]); setProgresso(0) }}>
          Resetar
        </button>
      )}
    </div>
  )
}
