'use client'

import styles from '@/app/admin/admin.module.css'

interface Concurso { num: number; data: string; premio: string }

interface ConcursoPanelProps {
  proximos: Concurso[]
  concursoAtivo: string
  loadingCaixa: boolean
  editDatas: Record<number, string>
  onEditData: (num: number, val: string) => void
  onBuscarCaixa: () => void
  onSelecionar: (c: Concurso & { data: string }) => void
}

/**
 * Painel de seleção de concurso Mega-Sena.
 * Exibido no painel direito quando nenhum bolão está selecionado.
 * Não chama APIs — delegado via onBuscarCaixa e onSelecionar.
 */
export default function ConcursoPanel({
  proximos, concursoAtivo, loadingCaixa, editDatas,
  onEditData, onBuscarCaixa, onSelecionar,
}: ConcursoPanelProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.panelTitle}>🎲 Próximos Concursos</div>
      <div className={styles.helpBox}>
        <p>Selecione um bolão à esquerda para gerenciar participantes.</p>
        <p>Aqui você também pode definir qual concurso está ativo para as inscrições.</p>
      </div>
      <button type="button" className={styles.btnLoad} onClick={onBuscarCaixa} disabled={loadingCaixa}>
        {loadingCaixa ? '⟳ Carregando...' : '🔄 Buscar na Caixa'}
      </button>
      {proximos.length > 0 && (
        <p className={styles.ccAvisoData}>
          ⚠️ Data calculada = encerramento das apostas. Edite para a data/hora real do sorteio antes de selecionar.
        </p>
      )}
      {proximos.map(c => {
        const dataEditada = editDatas[c.num] ?? c.data
        return (
          <div key={c.num} className={`${styles.concursoCard} ${String(c.num) === concursoAtivo ? styles.ativo : ''}`}>
            <div className={styles.ccBody}>
              <div className={styles.ccNum}>#{c.num}</div>
              <div className={styles.ccEncerramento}>Encerramento apostas: {c.data}</div>
              <div className={styles.ccSorteioLabel}>Data/hora do sorteio:</div>
              <input
                type="text"
                className={styles.ccSorteioInput}
                placeholder="Ex: 24/05 · Dom · 11h00"
                value={dataEditada}
                onChange={e => onEditData(c.num, e.target.value)}
              />
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
