'use client'

import styles from '@/app/admin/admin.module.css'
import HeaderStats from './bolao-detail/HeaderStats'
import Conferencia from './bolao-detail/Conferencia'
import Encerramento from './bolao-detail/Encerramento'
import ParticipantesList from './bolao-detail/ParticipantesList'
import Configurador from './bolao-detail/Configurador'

export type { BolaoDetailPanelProps } from './bolao-detail/types'
import type { BolaoDetailPanelProps } from './bolao-detail/types'

/**
 * Painel de detalhe do bolão Mega-Sena selecionado.
 * Contém: header, stats, ações, modal apostas, conferência, encerramento,
 * lista de participantes e configurador.
 * Sem chamadas de API diretas — todas acionadas via callbacks do admin/page.tsx.
 */
export default function BolaoDetailPanel(p: BolaoDetailPanelProps) {
  return (
    <div className={styles.panel}>
      <HeaderStats {...p} />
      <Conferencia {...p} />
      <Encerramento {...p} />
      <ParticipantesList {...p} />
      <Configurador {...p} />
    </div>
  )
}
