'use client'

import styles from '@/app/admin/admin.module.css'
import GeradorApostas from '@/components/admin/GeradorApostas'
import { getLoteria } from '@/lib/loterias'
import type { BolaoDetailPanelProps } from './types'

type Props = Pick<BolaoDetailPanelProps,
  | 'bolao' | 'showConfig'
  | 'editDezenas' | 'editApostas' | 'editCotas' | 'editTaxa'
  | 'precoCaixa' | 'custoApostas' | 'totalBolao' | 'valorPorCota'
  | 'configSalva' | 'salvando' | 'apostasMsg' | 'uploadingApostas'
  | 'onToggleConfig' | 'onEditDezenasChange' | 'onEditApostasChange'
  | 'onEditCotasChange' | 'onEditTaxaChange' | 'onSalvarConfig'
  | 'onInserirApostasGeradas'
>

/** Configurador de dezenas/apostas/cotas/taxa e gerador de apostas. */
export default function Configurador(p: Props) {
  const { bolao } = p
  const loteriaCfg = getLoteria(bolao.loteria)

  return (
    <>
      <button type="button" className={styles.geradorToggle} onClick={p.onToggleConfig}>
        <span>⚙️ Configurar Bolão</span>
        <span>{p.showConfig ? '▲' : '▼'}</span>
      </button>
      {p.showConfig && (
        <div className={styles.configuradorCols}>
          <div className={styles.configurador}>
            <div className={styles.configGrid3}>
              <div className={styles.configField}>
                <label className={styles.configLabel}>Dezenas / Aposta</label>
                <select className={styles.configSelect} value={p.editDezenas}
                  title="Dezenas por aposta" onChange={e => p.onEditDezenasChange(Number(e.target.value))}>
                  {Object.entries(loteriaCfg.precos).map(([d, pr]) => (
                    <option key={d} value={d}>{d} dez — R$ {(pr as number).toLocaleString('pt-BR')},00</option>
                  ))}
                </select>
              </div>
              <div className={styles.configField}>
                <label className={styles.configLabel}>Apostas</label>
                <input type="number" min={1} max={999} className={styles.configInput}
                  title="Apostas no bolão" placeholder="Ex: 100"
                  value={p.editApostas} onChange={e => p.onEditApostasChange(Math.max(1, Number(e.target.value)))} />
              </div>
              <div className={styles.configField}>
                <label className={styles.configLabel}>Total de Cotas</label>
                <input type="number" min={1} max={200} className={styles.configInput}
                  title="Total de cotas" placeholder="Ex: 20"
                  value={p.editCotas} onChange={e => p.onEditCotasChange(Math.max(1, Number(e.target.value)))} />
              </div>
            </div>
            <div className={styles.configFieldNarrow}>
              <label className={styles.configLabel}>Taxa de Administração (R$)</label>
              <input type="number" min={0} step={0.01} className={styles.configInput}
                title="Taxa admin" placeholder="0,00"
                value={p.editTaxa} onChange={e => p.onEditTaxaChange(Math.max(0, Number(e.target.value)))} />
            </div>
            <div className={styles.configCalc}>
              <div className={styles.calcRow}>
                <span>Preço Caixa — {p.editDezenas} dezenas</span>
                <span>R$ {p.precoCaixa.toLocaleString('pt-BR')},00 / aposta</span>
              </div>
              <div className={styles.calcRow}>
                <span>{p.editApostas} × R$ {p.precoCaixa.toLocaleString('pt-BR')},00</span>
                <span>R$ {p.custoApostas.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              {p.editTaxa > 0 && (
                <div className={styles.calcRow}>
                  <span>Taxa de administração</span>
                  <span>+ R$ {p.editTaxa.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                </div>
              )}
              <div className={`${styles.calcRow} ${styles.calcSeparator}`}>
                <span>Total do bolão</span>
                <span>R$ {p.totalBolao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
              <div className={`${styles.calcRow} ${styles.calcDestaque}`}>
                <span>Valor por cota ({p.editCotas} cotas)</span>
                <span>R$ {p.valorPorCota.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
              </div>
            </div>

            {p.configSalva && <div className={styles.configOk}>✅ Configuração salva!</div>}
            <button type="button" className={styles.btnCreate} onClick={p.onSalvarConfig} disabled={p.salvando}>
              {p.salvando ? 'Salvando...' : '💾 Salvar Configuração'}
            </button>
          </div>

          <div className={styles.configurador}>
            <GeradorApostas
              loteria={(bolao.loteria ?? 'mega') as import('@/lib/loterias').LoteriaId}
              dezenasBolao={p.editDezenas}
              uploadingApostas={p.uploadingApostas}
              apostasMsg={p.apostasMsg}
              onInserirApostas={p.onInserirApostasGeradas}
            />
          </div>
        </div>
      )}
    </>
  )
}
