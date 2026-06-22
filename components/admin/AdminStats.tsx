'use client'

import styles from '@/app/admin/admin.module.css'

interface Bolao { id: string; ativo: boolean; [key: string]: unknown }
interface Participante { status: string; total: number; [key: string]: unknown }

interface AdminStatsProps {
  bolaoAtual: { nome: string; slug: string } | null
  pagosLista: Participante[]
  pendentesLista: Participante[]
  arrecadado: number
  concursoAtivo: string
  dataAtiva: string
  premioAtivo: string
  boloesAtivosCount: number
}

/**
 * Grade de estatísticas no topo do admin.
 * Exibe resumo do bolão selecionado ou visão geral quando nenhum está selecionado.
 * Apenas renderização — sem side effects ou chamadas de API.
 */
export default function AdminStats({
  bolaoAtual, pagosLista, pendentesLista, arrecadado,
  concursoAtivo, dataAtiva, premioAtivo, boloesAtivosCount,
}: AdminStatsProps) {
  return (
    <div className={styles.statsGrid}>
      {bolaoAtual ? (
        <>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Bolão</span>
            <div className={styles.statValSm}>{bolaoAtual.nome}</div>
            <span className={styles.statSub}>/{bolaoAtual.slug}</span>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>✅ Pagos</span>
            <div className={styles.statVal}>{pagosLista.length}</div>
          </div>
          <div className={`${styles.statCard} ${pendentesLista.length > 0 ? styles.statWarn : ''}`}>
            <span className={styles.statLabel}>⏳ Pendentes</span>
            <div className={styles.statVal}>{pendentesLista.length}</div>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Arrecadado</span>
            <div className={styles.statVal}>R$ {arrecadado.toFixed(2).replace('.', ',')}</div>
          </div>
        </>
      ) : (
        <>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Concurso Ativo</span>
            <div className={styles.statVal}>{concursoAtivo ? `#${concursoAtivo}` : '—'}</div>
            {dataAtiva && <span className={styles.statSub}>{dataAtiva}</span>}
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Prêmio Estimado</span>
            <div className={styles.statVal}>{premioAtivo || '—'}</div>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Bolões Ativos</span>
            <div className={styles.statVal}>{boloesAtivosCount}</div>
          </div>
          <div className={styles.statCard}>
            <span className={styles.statLabel}>Selecione um Bolão</span>
            <div className={styles.statValHint}>para ver detalhes</div>
          </div>
        </>
      )}
    </div>
  )
}
