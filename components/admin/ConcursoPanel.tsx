'use client'

import styles from '@/app/admin/admin.module.css'
import { getLoteria, type LoteriaId } from '@/lib/loterias'
import TrevoIcon from '@/components/TrevoIcon'

interface Concurso { num: number; data: string; premio: string }

interface ConcursoPanelProps {
  proximos: Concurso[]
  concursoAtivo: string
  loadingCaixa: boolean
  editDatas: Record<number, string>
  loteriaAtual: LoteriaId
  onEditData: (num: number, val: string) => void
  onBuscarCaixa: (loteria: LoteriaId) => void
  onSelecionar: (c: Concurso & { data: string }) => void
}

export default function ConcursoPanel({
  proximos, concursoAtivo, loadingCaixa, editDatas,
  loteriaAtual, onEditData, onBuscarCaixa, onSelecionar,
}: ConcursoPanelProps) {
  const cfg = getLoteria(loteriaAtual)
  return (
    <div className={styles.panel}>
      <div className={styles.panelTitle}>
        <TrevoIcon loteria={loteriaAtual} size={14} /> Próximos Concursos — {cfg.label}
      </div>
      <div className={styles.helpBox}>
        <p>Selecione um bolão à esquerda para gerenciar participantes.</p>
        <p>Aqui você define qual concurso está ativo para as inscrições.</p>
      </div>
      <button type="button" className={styles.btnLoad}
        onClick={() => onBuscarCaixa(loteriaAtual)} disabled={loadingCaixa}>
        {loadingCaixa ? '⟳ Carregando...' : `🔄 Buscar na Caixa (${cfg.label})`}
      </button>
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
                placeholder="Ex: 24/05 · Dom · 11h00"
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
