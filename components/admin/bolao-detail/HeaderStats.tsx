'use client'

import styles from '@/app/admin/admin.module.css'
import type { BolaoDetailPanelProps } from './types'
import { getLoteria } from '@/lib/loterias'

type Props = Pick<BolaoDetailPanelProps,
  | 'bolao' | 'concursoAtivo' | 'cotasLivres' | 'pagosLista' | 'pendentesLista' | 'arrecadado'
  | 'loadingParts' | 'confirmandoTodos' | 'apostasMsg'
  | 'showApostasModal' | 'apostasTexto' | 'uploadingApostas'
  | 'onFechar' | 'onAtualizarParts' | 'onConfirmarTodos' | 'onEnviarLembrete'
  | 'onToggleConferir' | 'onOpenApostas' | 'onRemoverApostas'
  | 'onCloseApostas' | 'onApostasTextoChange' | 'onSalvarApostas'
>

/** Header, stats rápidos, ações em lote e modal de upload de apostas. */
export default function HeaderStats(p: Props) {
  const { bolao } = p
  const loteriaCfg = getLoteria(bolao.loteria)

  return (
    <>
      <div className={styles.detHeader}>
        <div>
          <div className={styles.detNome}>{bolao.nome}</div>
          <div className={styles.detSub}>
            #{p.concursoAtivo || '?'} · {typeof window !== 'undefined' ? window.location.host : ''}/<wbr/>{bolao.slug}
          </div>
        </div>
        <button type="button" className={styles.btnFechar} onClick={p.onFechar} title="Fechar">✕</button>
      </div>

      <div className={styles.detStatsRow}>
        <div className={styles.detStat}>
          <div className={styles.detStatVal}>{p.cotasLivres}/{bolao.total_cotas || 20}</div>
          <div className={styles.detStatLbl}>Cotas Livres</div>
        </div>
        <div className={styles.detStat}>
          <div className={styles.detStatVal}>{p.pagosLista.length}</div>
          <div className={styles.detStatLbl}>Pagos</div>
        </div>
        <div className={`${styles.detStat} ${p.pendentesLista.length > 0 ? styles.detStatWarn : ''}`}>
          <div className={styles.detStatVal}>{p.pendentesLista.length}</div>
          <div className={styles.detStatLbl}>Pendentes</div>
        </div>
        <div className={styles.detStat}>
          <div className={styles.detStatVal}>R$ {p.arrecadado.toFixed(2).replace('.', ',')}</div>
          <div className={styles.detStatLbl}>Arrecadado</div>
        </div>
      </div>

      <div className={styles.detActions}>
        <button type="button" className={styles.btnLoad}
          onClick={p.onAtualizarParts} disabled={p.loadingParts}>
          {p.loadingParts ? '⟳' : '🔄'} Atualizar
        </button>
        {p.pendentesLista.length > 0 && (
          <button type="button" className={styles.btnConfirmAll}
            onClick={p.onConfirmarTodos} disabled={p.confirmandoTodos}>
            {p.confirmandoTodos ? 'Confirmando...' : `✔ Confirmar todos (${p.pendentesLista.length})`}
          </button>
        )}
        <button type="button" className={styles.btnWhatsapp} onClick={p.onEnviarLembrete}>
          📱 Lembrete
        </button>
        <button type="button" className={styles.btnConferir}
          onClick={p.onToggleConferir}>
          🔍 Conferir
        </button>
        <button type="button" className={styles.btnUploadApostas}
          onClick={p.onOpenApostas}
          title="Colar texto das apostas">
          {bolao.apostas_data ? '📊 Apostas ✅' : '📊 Carregar Apostas'}
        </button>
        {bolao.apostas_data && (
          <button type="button" className={styles.btnRemoverApostas}
            onClick={p.onRemoverApostas} title="Remover apostas">✕</button>
        )}
      </div>
      {p.apostasMsg && <div className={styles.lembreteMsg}>{p.apostasMsg}</div>}

      {p.showApostasModal && (
        <div className={styles.apostasModal}>
          <div className={styles.apostasModalBox}>
            <div className={styles.apostasModalTitle}>📊 Carregar Apostas</div>
            <p className={styles.apostasModalDesc}>
              Cole abaixo o texto com os números das apostas.<br />
              Formato aceito: <strong>{loteriaCfg.minDezenas}–{loteriaCfg.maxDezenas} números por linha</strong> ({loteriaCfg.label}), separados por espaço — ex:{' '}
              <code>{Array.from({ length: loteriaCfg.minDezenas }, (_, i) => String(i + 1).padStart(2, '0')).join(' ')}</code>
            </p>
            <textarea
              className={styles.apostasTextarea}
              placeholder="Cole aqui os números das apostas..."
              value={p.apostasTexto}
              onChange={e => p.onApostasTextoChange(e.target.value)}
              rows={8}
            />
            <div className={styles.apostasModalActions}>
              <button type="button" className={styles.btnLoad}
                onClick={p.onCloseApostas}>Cancelar</button>
              <button type="button" className={styles.btnConfirmAll}
                onClick={p.onSalvarApostas} disabled={p.uploadingApostas || !p.apostasTexto.trim()}>
                {p.uploadingApostas ? '⟳ Processando...' : '✔ Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
