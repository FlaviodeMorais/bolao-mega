'use client'

import { useState } from 'react'
import styles from '@/app/admin/admin.module.css'
import ResumoHistorico from './historico/ResumoHistorico'
import ParticipantesHistorico from './historico/ParticipantesHistorico'
import type { useHistoricoResumo } from '@/hooks/admin/useHistoricoResumo'
import type { useHistoricoParticipantes } from '@/hooks/admin/useHistoricoParticipantes'

interface BolaoOpt { slug: string; nome: string; ativo: boolean }

interface Props {
  resumo: ReturnType<typeof useHistoricoResumo>
  parts: ReturnType<typeof useHistoricoParticipantes>
  boloes: BolaoOpt[]
  formatTel: (tel?: string) => string
  whatsappUrl: (tel?: string) => string
}

/**
 * Card "Histórico" do admin — shell com o toggle Resumo/Participantes.
 * Cada modo é um componente próprio (historico/ResumoHistorico e
 * historico/ParticipantesHistorico), cada um com seu próprio hook de estado.
 */
export default function HistoricoPanel({ resumo, parts, boloes, formatTel, whatsappUrl }: Props) {
  const [modo, setModo] = useState<'resumo' | 'participantes'>('resumo')

  return (
    <div className={styles.panel}>
      <div className={styles.histHeader}>
        <div>
          <div className={styles.panelTitle}>Histórico</div>
          <div className={styles.histSubtitle}>
            {modo === 'resumo' ? 'Resumo por concurso (loteria + esporte)' : `${parts.total > 0 ? parts.total + ' participantes' : 'Base de contatos'}`}
          </div>
        </div>
        <div className={styles.histSegmentado}>
          <button type="button"
            className={modo === 'resumo' ? styles.histSegAtivo : styles.histSegBtn}
            onClick={() => { setModo('resumo'); resumo.carregarHistorico() }}>
            Resumo
          </button>
          <button type="button"
            className={modo === 'participantes' ? styles.histSegAtivo : styles.histSegBtn}
            onClick={() => { setModo('participantes'); parts.carregarHistParticipantes(1) }}>
            Participantes
          </button>
        </div>
      </div>

      {modo === 'resumo' ? (
        <ResumoHistorico
          loadingHist={resumo.loadingHist}
          showHistorico={resumo.showHistorico}
          historico={resumo.historico}
          onCarregar={resumo.carregarHistorico}
        />
      ) : (
        <ParticipantesHistorico
          participantes={parts.participantes}
          total={parts.total}
          page={parts.page}
          totalPages={parts.totalPages}
          busca={parts.busca}
          filtroSlug={parts.filtroSlug}
          filtroConc={parts.filtroConc}
          filtroTipo={parts.filtroTipo}
          bolaoConviteSlug={parts.bolaoConviteSlug}
          loadingHist={parts.loadingHist}
          msgConvite={parts.msgConvite}
          enviandoId={parts.enviandoId}
          enviandoMassa={parts.enviandoMassa}
          resultadoConvite={parts.resultadoConvite}
          selecionados={parts.selecionados}
          boloes={boloes}
          onBuscaChange={parts.setBusca}
          onFiltroSlugChange={parts.setFiltroSlug}
          onFiltroConcChange={parts.setFiltroConc}
          onFiltroTipoChange={parts.setFiltroTipo}
          onBolaoConviteChange={parts.setBolaoConviteSlug}
          onMsgConviteChange={parts.setMsgConvite}
          onFiltrar={() => parts.carregarHistParticipantes(1)}
          onPagina={p => parts.carregarHistParticipantes(p)}
          onToggleSelecionado={parts.toggleSelecionado}
          onSelecionarVisiveis={parts.selecionarVisiveis}
          onLimparSelecao={parts.limparSelecao}
          onEnviarIndividual={parts.enviarConviteIndividual}
          onEnviarTodos={parts.enviarConviteTodos}
          onEnviarSelecionados={parts.enviarConviteSelecionados}
          formatTel={formatTel}
          whatsappUrl={whatsappUrl}
        />
      )}
    </div>
  )
}
