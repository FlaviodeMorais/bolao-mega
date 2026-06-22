'use client'

import styles from '@/app/admin/admin.module.css'

interface HistoricoItem {
  concurso: number; bolao_slug: string | null; bolao_nome: string
  total: number; pagos: number; pendentes: number; cancelados: number; arrecadado: number
}
interface HistoricoParticipante {
  id: string; nome: string; telefone?: string; cotas: string[]
  total: number; status: string; concurso: number
  bolao_slug: string | null; bolao_nome: string
}
interface BolaoOpt { slug: string; nome: string }

interface HistoricoPanelProps {
  modo: 'resumo' | 'participantes'
  loadingHist: boolean
  showHistorico: boolean
  historico: HistoricoItem[]
  histParticipantes: HistoricoParticipante[]
  histBusca: string
  histFiltroSlug: string
  histFiltroConc: string
  msgConvite: string
  boloes: BolaoOpt[]
  onModoChange: (m: 'resumo' | 'participantes') => void
  onCarregarResumo: () => void
  onCarregarParticipantes: () => void
  onBuscaChange: (v: string) => void
  onFiltroSlugChange: (v: string) => void
  onFiltroConcChange: (v: string) => void
  onMsgConviteChange: (v: string) => void
  onEnviarConvite: (tel: string, nome: string) => void
  formatTel: (tel?: string) => string
  whatsappUrl: (tel?: string) => string
}

/**
 * Painel de histórico e CRM do admin Mega-Sena.
 * Exibe resumo por concurso ou lista de participantes com filtros e ações de convite.
 * Sem chamadas de API diretas — acionado via callbacks do admin/page.tsx.
 */
export default function HistoricoPanel({
  modo, loadingHist, showHistorico, historico,
  histParticipantes, histBusca, histFiltroSlug, histFiltroConc,
  msgConvite, boloes,
  onModoChange, onCarregarResumo, onCarregarParticipantes,
  onBuscaChange, onFiltroSlugChange, onFiltroConcChange,
  onMsgConviteChange, onEnviarConvite,
  formatTel, whatsappUrl,
}: HistoricoPanelProps) {
  const busca = histBusca.toLowerCase()
  const lista = histParticipantes.filter(p =>
    !busca || p.nome.toLowerCase().includes(busca) || (p.telefone || '').includes(busca)
  )
  const comTel = lista.filter(p => p.telefone).length

  return (
    <div className={styles.panel}>
      {/* Cabeçalho + toggle */}
      <div className={styles.histHeader}>
        <div>
          <div className={styles.panelTitle}>Histórico</div>
          <div className={styles.histSubtitle}>
            {modo === 'resumo' ? 'Resumo por concurso' : `${histParticipantes.length > 0 ? histParticipantes.length + ' participantes' : 'Base de contatos'}`}
          </div>
        </div>
        <div className={styles.histSegmentado}>
          <button type="button"
            className={modo === 'resumo' ? styles.histSegAtivo : styles.histSegBtn}
            onClick={() => { onModoChange('resumo'); onCarregarResumo() }}>
            Resumo
          </button>
          <button type="button"
            className={modo === 'participantes' ? styles.histSegAtivo : styles.histSegBtn}
            onClick={() => { onModoChange('participantes'); onCarregarParticipantes() }}>
            Participantes
          </button>
        </div>
      </div>

      {loadingHist && <div className={styles.empty}>Carregando...</div>}

      {/* ── MODO RESUMO ── */}
      {!loadingHist && modo === 'resumo' && (
        <>
          <button type="button" className={styles.btnLoad} onClick={onCarregarResumo} style={{ marginBottom: 14 }}>
            Carregar histórico
          </button>
          {showHistorico && (
            historico.length === 0
              ? <div className={styles.empty}>Nenhum histórico encontrado</div>
              : <div className={styles.histTableWrap}><table className={styles.histTable}>
                  <thead>
                    <tr>
                      <th>Concurso</th><th>Bolão</th>
                      <th>Pagos</th><th>Pend.</th><th>Canc.</th><th>Arrecadado</th>
                    </tr>
                  </thead>
                  {historico.map((h, i) => {
                    const prev = i > 0 ? historico[i - 1].concurso : null
                    const novo = h.concurso !== prev
                    const rowKey = `${h.concurso}-${h.bolao_slug || 'main'}`
                    return (
                      <tbody key={rowKey}>
                        {novo && i > 0 && <tr className={styles.histSep}><td colSpan={6} /></tr>}
                        <tr className={novo ? styles.histRowFirst : styles.histRowSub}>
                          <td>{novo ? `#${h.concurso}` : ''}</td>
                          <td>
                            <div className={styles.histBolaoNome}>{h.bolao_nome}</div>
                            {h.bolao_slug && <div className={styles.histBolaoSlug}>/{h.bolao_slug}</div>}
                          </td>
                          <td className={styles.histPago}>{h.pagos}</td>
                          <td className={h.pendentes > 0 ? styles.histPend : ''}>{h.pendentes || '—'}</td>
                          <td className={h.cancelados > 0 ? styles.histCancel : ''}>{h.cancelados || '—'}</td>
                          <td className={styles.histValor}>R$ {h.arrecadado.toFixed(2).replace('.', ',')}</td>
                        </tr>
                      </tbody>
                    )
                  })}
                </table></div>
          )}
        </>
      )}

      {/* ── MODO PARTICIPANTES ── */}
      {!loadingHist && modo === 'participantes' && (
        <>
          {/* Barra de filtros */}
          <div className={styles.crmFiltros}>
            <div className={styles.crmBuscaWrap}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
              <input className={styles.crmBusca} placeholder="Buscar por nome ou telefone"
                value={histBusca} onChange={e => onBuscaChange(e.target.value)} />
            </div>
            <select className={styles.crmSelect}
              value={histFiltroSlug} onChange={e => onFiltroSlugChange(e.target.value)}>
              <option value="">Todos os bolões</option>
              {boloes.map(b => <option key={b.slug} value={b.slug}>{b.nome}</option>)}
            </select>
            <input className={styles.crmInputConc} placeholder="Concurso"
              value={histFiltroConc} onChange={e => onFiltroConcChange(e.target.value)} />
            <button type="button" className={styles.crmBtnFiltrar} onClick={onCarregarParticipantes}>
              Filtrar
            </button>
          </div>

          {/* Stats rápidas */}
          {lista.length > 0 && (
            <div className={styles.crmStats}>
              <div className={styles.crmStat}>
                <span className={styles.crmStatNum}>{lista.length}</span>
                <span className={styles.crmStatLabel}>participantes</span>
              </div>
              <div className={styles.crmStatDiv} />
              <div className={styles.crmStat}>
                <span className={styles.crmStatNum}>{comTel}</span>
                <span className={styles.crmStatLabel}>com WhatsApp</span>
              </div>
              <div className={styles.crmStatDiv} />
              <div className={styles.crmStat}>
                <span className={`${styles.crmStatNum} ${styles.crmStatGreen}`}>
                  R$ {lista.filter(p => p.status === 'pago').reduce((s, p) => s + Number(p.total), 0).toFixed(2).replace('.', ',')}
                </span>
                <span className={styles.crmStatLabel}>arrecadado</span>
              </div>
              {comTel > 0 && (
                <>
                  <div className={styles.crmStatDiv} />
                  <button type="button" className={styles.crmBtnMassivo}
                    onClick={() => {
                      const comTelefone = lista.filter(p => p.telefone)
                      if (comTelefone.length === 0) return
                      if (!confirm(`Abrir WhatsApp para ${comTelefone.length} contatos?`)) return
                      comTelefone.forEach((p, i) => {
                        setTimeout(() => onEnviarConvite(p.telefone!, p.nome), i * 600)
                      })
                    }}>
                    Enviar convite para todos ({comTel})
                  </button>
                </>
              )}
            </div>
          )}

          {/* Modelo de mensagem */}
          {lista.length > 0 && (
            <div className={styles.crmMsgArea}>
              <label className={styles.crmMsgLabel}>Mensagem de convite personalizada</label>
              <textarea className={styles.crmMsgTextarea} rows={2}
                placeholder="🍀 Olá {nome}! Temos um novo bolão disponível. Participe: {link}"
                value={msgConvite} onChange={e => onMsgConviteChange(e.target.value)} />
            </div>
          )}

          {/* Lista */}
          {lista.length === 0
            ? <div className={styles.empty}>Nenhum participante encontrado</div>
            : <div className={styles.crmLista}>
                {lista.map(p => (
                  <div key={p.id} className={styles.crmCard}>
                    <div className={`${styles.crmCardBar} ${p.status === 'pago' ? styles.crmBarPago : p.status === 'cancelado' ? styles.crmBarCancel : styles.crmBarPend}`} />
                    <div className={styles.crmCardBody}>
                      <div className={styles.crmCardTop}>
                        <span className={styles.crmNome}>{p.nome}</span>
                        <span className={styles.crmValor}>R$ {Number(p.total).toFixed(2).replace('.', ',')}</span>
                      </div>
                      <div className={styles.crmCardMeta}>
                        <span className={styles.crmTag}># {p.concurso}</span>
                        <span className={styles.crmTagNeutro}>{p.bolao_nome}</span>
                        {Array.isArray(p.cotas) && p.cotas.length > 0 && (
                          <span className={styles.crmTagNeutro}>{p.cotas.length} cota{p.cotas.length !== 1 ? 's' : ''}</span>
                        )}
                        <span className={`${styles.crmStatus} ${p.status === 'pago' ? styles.crmStatusPago : p.status === 'cancelado' ? styles.crmStatusCancel : styles.crmStatusPend}`}>
                          {p.status === 'pago' ? 'Pago' : p.status === 'cancelado' ? 'Cancelado' : 'Pendente'}
                        </span>
                      </div>
                      {p.telefone && (
                        <div className={styles.crmCardAcoes}>
                          <a href={whatsappUrl(p.telefone)} target="_blank" rel="noopener noreferrer" className={styles.crmTelBtn}>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M5.337 7.407a12 12 0 1 0 11.29 0A12 12 0 0 0 5.337 7.407z" fill="none" stroke="currentColor" strokeWidth="1.5" opacity=".3"/></svg>
                            {formatTel(p.telefone)}
                          </a>
                          <button type="button" className={styles.crmAcaoBtnWA}
                            onClick={() => onEnviarConvite(p.telefone!, p.nome)}>
                            Convidar
                          </button>
                          {p.status === 'pago' && (
                            <button type="button" className={styles.crmAcaoBtnComp}
                              onClick={() => {
                                const url = `/comprovante?id=${p.id}&pub=1&bolao=${p.bolao_slug || ''}&concurso=${p.concurso}`
                                window.open(url, '_blank')
                              }}>
                              Ver comprovante
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
          }
        </>
      )}
    </div>
  )
}
