'use client'

import styles from '@/app/admin/admin.module.css'
import { LOTERIA_LIST, getLoteria, type LoteriaId } from '@/lib/loterias'
import TrevoIcon from '@/components/TrevoIcon'

interface Concurso { num: number; data: string; premio: string }

interface ConcursoPanelProps {
  proximos: Concurso[]
  concursoAtivo: string
  loadingCaixa: boolean
  editDatas: Record<number, string>
  loteriaAtual: LoteriaId
  resultadoInfo?: { atualizadoEm: string; stale: boolean } | null
  onMudarLoteria: (l: LoteriaId) => void
  onEditData: (num: number, val: string) => void
  onBuscarCaixa: (loteria: LoteriaId, force?: boolean) => void
  onSelecionar: (c: Concurso & { data: string }) => void
}

export default function ConcursoPanel({
  proximos, concursoAtivo, loadingCaixa, editDatas,
  loteriaAtual, resultadoInfo, onMudarLoteria, onEditData, onBuscarCaixa, onSelecionar,
}: ConcursoPanelProps) {
  const cfg = getLoteria(loteriaAtual)

  return (
    <div className={styles.panel}>
      <div className={styles.panelTitle}>
        <TrevoIcon loteria={loteriaAtual} size={14} /> Próximos Concursos — {cfg.label}
      </div>

      {/* ── Seletor de Loteria ── */}
      <div className={styles.helpBox}>
        <p style={{ marginBottom: 10, fontWeight: 600 }}>Selecione a modalidade:</p>
        <div className={styles.btnRow}>
          {LOTERIA_LIST.map(l => (
            <button key={l.id} type="button"
              className={`${styles.loteriaBotao} ${loteriaAtual === l.id ? styles.loteriaBotaoAtivo : ''}`}
              style={loteriaAtual === l.id ? { background: l.cor + '18', borderColor: l.cor, color: l.cor } : {}}
              onClick={() => onMudarLoteria(l.id as LoteriaId)}>
              <TrevoIcon loteria={l.id as LoteriaId} size={14} /> {l.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.helpBox}>
        <p>Aqui você define qual concurso está ativo para as inscrições de cada modalidade.</p>
        <p>Cada loteria tem seu próprio concurso ativo — independentes entre si.</p>
      </div>

      <button type="button" className={styles.btnLoad}
        onClick={() => onBuscarCaixa(loteriaAtual, true)} disabled={loadingCaixa}>
        {loadingCaixa ? '⟳ Carregando...' : `🔄 Buscar na Caixa (${cfg.label})`}
      </button>

      {resultadoInfo?.atualizadoEm && (
        <p className={styles.ccAvisoData} style={resultadoInfo.stale ? { color: '#e25555' } : undefined}>
          {resultadoInfo.stale ? '⚠️ Dados desatualizados (fontes externas indisponíveis) — ' : '✅ '}
          Último resultado atualizado em {new Date(resultadoInfo.atualizadoEm).toLocaleString('pt-BR')}
        </p>
      )}

      {proximos.length > 0 && (
        <p className={styles.ccAvisoData}>
          ⚠️ Data calculada = encerramento das apostas. Edite para a data/hora real do sorteio antes de selecionar.
        </p>
      )}

      {proximos.map(c => {
        const dataEditada = editDatas[c.num] ?? c.data
        return (
          <div key={c.num}
            className={`${styles.concursoCard} ${String(c.num) === concursoAtivo ? styles.ativo : ''}`}>
            <div className={styles.ccBody}>
              <div className={styles.ccNum}>#{c.num}</div>
              <div className={styles.ccEncerramento}>Encerramento: {c.data}</div>
              <div className={styles.ccSorteioLabel}>Data/hora do sorteio:</div>
              <input type="text" className={styles.ccSorteioInput}
                placeholder="Ex: ter., 30/06/2026 às 21h00"
                value={dataEditada}
                onChange={e => onEditData(c.num, e.target.value)} />
              <div className={styles.ccPremio}>{c.premio}</div>
            </div>
            <button type="button"
              className={`${styles.btnSel} ${String(c.num) === concursoAtivo ? styles.btnSelAtivo : ''}`}
              onClick={() => onSelecionar({ ...c, data: dataEditada })}>
              {String(c.num) === concursoAtivo ? '✔ Ativo' : 'Selecionar'}
            </button>
          </div>
        )
      })}
    </div>
  )
}
