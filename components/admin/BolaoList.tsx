'use client'

import styles from '@/app/admin/admin.module.css'
import { LOTERIA_LIST, type LoteriaId } from '@/lib/loterias'
import type { Bolao } from '@/hooks/admin/useBoloes'
export type { Bolao }

interface BolaoListActions {
  onSelecionar: (b: Bolao) => void
  onCopiarLink: (slug: string) => void
  onCancelar: (b: Bolao) => void
  onExcluir: (b: Bolao) => void
  onRenomear: (id: string) => void
  onRenomearConfirm: (id: string) => void
  onRenomearCancel: () => void
  onCriar: () => void
}

interface BolaoListProps {
  boloes: Bolao[]
  bolaoAtualId: string | null
  linkCopiado: boolean
  renamingId: string | null
  renameVal: string
  onRenameValChange: (v: string) => void
  showCreate: boolean
  novoNome: string
  novoSlug: string
  novaLoteria: LoteriaId
  criando: boolean
  criarErro: string
  onNovoNomeChange: (v: string) => void
  onNovoSlugChange: (v: string) => void
  onNovaLoteriaChange: (v: LoteriaId) => void
  onShowCreateToggle: (show: boolean) => void
  actions: BolaoListActions
}

const LOTERIA_BADGE: Record<string, string> = {
  mega:      '🍀',
  lotofacil: '🌸',
  quina:     '🔵',
}
const LOTERIA_COR: Record<string, string> = {
  mega:      '#009B63',
  lotofacil: '#702A82',
  quina:     '#00508F',
}

export default function BolaoList({
  boloes, bolaoAtualId, linkCopiado,
  renamingId, renameVal, onRenameValChange,
  showCreate, novoNome, novoSlug, novaLoteria, criando, criarErro,
  onNovoNomeChange, onNovoSlugChange, onNovaLoteriaChange, onShowCreateToggle,
  actions,
}: BolaoListProps) {
  return (
    <div className={styles.panel}>
      <div className={styles.panelTitle}>🎰 Bolões</div>

      {boloes.length === 0 && !showCreate && (
        <div className={styles.empty}>Nenhum bolão. Clique em &quot;+ Novo Bolão&quot;.</div>
      )}

      {boloes.map(b => {
        const cor = LOTERIA_COR[b.loteria ?? 'mega']
        return (
          <div key={b.id}
            className={`${styles.bolaoCard} ${bolaoAtualId === b.id ? styles.selected : ''} ${!b.ativo ? styles.bolaoInativo : ''}`}
            onClick={() => b.ativo && actions.onSelecionar(b)}>
            <div className={styles.bolaoInfo}>
              {renamingId === b.id ? (
                <div className={styles.renameRow} onClick={e => e.stopPropagation()}>
                  <input className={styles.renameInput} value={renameVal}
                    title="Novo nome" placeholder="Nome do bolão"
                    onChange={e => onRenameValChange(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter') actions.onRenomearConfirm(b.id)
                      if (e.key === 'Escape') actions.onRenomearCancel()
                    }} autoFocus />
                  <button type="button" className={styles.btnRenomearOk} onClick={() => actions.onRenomearConfirm(b.id)}>✓</button>
                  <button type="button" className={styles.btnRenomearCancel} onClick={actions.onRenomearCancel}>✕</button>
                </div>
              ) : (
                <div className={styles.bolaoNomeRow}>
                  <div className={styles.bolaoNome}>{b.nome}</div>
                  <button type="button" className={styles.btnRenomear}
                    onClick={e => { e.stopPropagation(); actions.onRenomear(b.id) }} title="Renomear">✎</button>
                </div>
              )}
              <div className={styles.bolaoUrl}>/{b.slug}</div>
              <div className={styles.bolaoMeta}>
                <span style={{ color: cor, fontWeight: 700 }}>
                  {LOTERIA_BADGE[b.loteria ?? 'mega']} {b.loteria === 'lotofacil' ? 'Lotofácil' : b.loteria === 'quina' ? 'Quina' : 'Mega-Sena'}
                </span>
                {' · '}{b.num_apostas || 1} apostas · {b.dezenas || 6} dez · R$ {Number(b.valor_cota).toFixed(2).replace('.', ',')}/cota
              </div>
            </div>
            <div className={styles.bolaoActions}>
              {b.resultado_conferencia?.status === 'ganhamos'     && <span className={styles.badgeGanhou}>🏆</span>}
              {b.resultado_conferencia?.status === 'nao_premiada' && <span className={styles.badgeNaoPremiada}>😔</span>}
              {b.resultado_conferencia?.status === 'nao_apurado'  && <span className={styles.badgeNaoApurado}>⏳</span>}
              {b.ativo
                ? <span className={styles.bolaoAtivo}>ATIVO</span>
                : <span className={styles.bolaoCancelado}>CANCELADO</span>
              }
              {b.ativo && (
                <button type="button" className={styles.btnSel}
                  onClick={e => { e.stopPropagation(); actions.onCopiarLink(b.slug) }}
                  title="Copiar link">
                  {linkCopiado ? '✓' : '🔗'}
                </button>
              )}
              <button type="button"
                className={b.ativo ? styles.btnCancelarBolao : styles.btnReativarBolao}
                onClick={e => { e.stopPropagation(); actions.onCancelar(b) }}
                title={b.ativo ? 'Cancelar bolão' : 'Reativar bolão'}>
                {b.ativo ? '⊘' : '↺'}
              </button>
              {!b.ativo && (
                <button type="button" className={styles.btnExcluirBolao}
                  onClick={e => { e.stopPropagation(); actions.onExcluir(b) }}
                  title="Excluir permanentemente">🗑</button>
              )}
            </div>
          </div>
        )
      })}

      {!showCreate ? (
        <button type="button" className={styles.btnLoad} onClick={() => onShowCreateToggle(true)}>+ Novo Bolão</button>
      ) : (
        <div className={styles.createForm}>
          {/* Seletor de loteria */}
          <div className={styles.loteriaSelector}>
            {LOTERIA_LIST.map(l => (
              <button key={l.id} type="button"
                className={`${styles.loteriaBotao} ${novaLoteria === l.id ? styles.loteriaBotaoAtivo : ''}`}
                style={novaLoteria === l.id ? { borderColor: l.cor, background: l.cor + '15', color: l.cor } : {}}
                onClick={() => onNovaLoteriaChange(l.id)}>
                {l.emoji} {l.label}
              </button>
            ))}
          </div>
          <input className={styles.createInput} placeholder="Nome do bolão"
            value={novoNome} onChange={e => onNovoNomeChange(e.target.value)} />
          <input className={styles.createInput} placeholder="slug (ex: grupo-vip)"
            value={novoSlug}
            onChange={e => onNovoSlugChange(
              e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/^-+|-+$/g, '').replace(/-{2,}/g, '-')
            )} />
          {criarErro && <div className={styles.loginErr}>{criarErro}</div>}
          <div className={styles.createBtns}>
            <button type="button" className={styles.btnCreate}
              onClick={actions.onCriar}
              disabled={criando || !novoNome.trim() || !novoSlug.trim()}>
              {criando ? 'Criando...' : 'Criar'}
            </button>
            <button type="button" className={styles.btnLoad}
              onClick={() => { onShowCreateToggle(false); onNovoNomeChange(''); onNovoSlugChange('') }}>
              Cancelar
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
