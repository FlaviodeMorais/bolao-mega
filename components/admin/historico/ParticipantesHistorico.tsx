'use client'

import styles from '@/app/admin/admin.module.css'
import type { HistoricoParticipante } from '@/hooks/admin/useHistoricoParticipantes'

interface BolaoOpt { slug: string; nome: string }

interface Props {
  participantes: HistoricoParticipante[]
  total: number; page: number; totalPages: number
  busca: string; filtroSlug: string; filtroConc: string; filtroTipo: 'todos' | 'loteria' | 'esporte'
  loadingHist: boolean
  msgConvite: string
  enviandoId: string | null
  enviandoMassa: boolean
  resultadoConvite: string
  boloes: BolaoOpt[]
  onBuscaChange: (v: string) => void
  onFiltroSlugChange: (v: string) => void
  onFiltroConcChange: (v: string) => void
  onFiltroTipoChange: (v: 'todos' | 'loteria' | 'esporte') => void
  onMsgConviteChange: (v: string) => void
  onFiltrar: () => void
  onPagina: (p: number) => void
  onEnviarIndividual: (tel: string, nome: string, id: string) => void
  onEnviarTodos: () => void
  formatTel: (tel?: string) => string
  whatsappUrl: (tel?: string) => string
}

/**
 * Card "Participantes" do Histórico — CRM com busca/filtro/paginação
 * server-side (view historico_participantes, loteria + esporte) e disparo
 * sistemático de convite via Whapi (POST /api/admin/convite-massa) — não
 * depende mais de abrir N janelas wa.me no navegador do admin.
 */
export default function ParticipantesHistorico({
  participantes, total, page, totalPages,
  busca, filtroSlug, filtroConc, filtroTipo,
  loadingHist, msgConvite,
  enviandoId, enviandoMassa, resultadoConvite,
  boloes,
  onBuscaChange, onFiltroSlugChange, onFiltroConcChange, onFiltroTipoChange,
  onMsgConviteChange, onFiltrar, onPagina,
  onEnviarIndividual, onEnviarTodos,
  formatTel, whatsappUrl,
}: Props) {
  const comTel = participantes.filter(p => p.telefone).length
  const arrecadadoPagina = participantes.filter(p => p.status === 'pago').reduce((s, p) => s + Number(p.total), 0)

  return (
    <>
      {/* Barra de filtros */}
      <div className={styles.crmFiltros}>
        <div className={styles.crmBuscaWrap}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
          <input className={styles.crmBusca} placeholder="Buscar por nome ou telefone"
            value={busca} onChange={e => onBuscaChange(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && onFiltrar()} />
        </div>
        <select className={styles.crmSelect} value={filtroTipo} onChange={e => onFiltroTipoChange(e.target.value as 'todos' | 'loteria' | 'esporte')}>
          <option value="todos">Loteria + Esporte</option>
          <option value="loteria">Só loteria</option>
          <option value="esporte">Só esporte</option>
        </select>
        <select className={styles.crmSelect}
          value={filtroSlug} onChange={e => onFiltroSlugChange(e.target.value)}>
          <option value="">Todos os bolões</option>
          {boloes.map(b => <option key={b.slug} value={b.slug}>{b.nome}</option>)}
        </select>
        <input className={styles.crmInputConc} placeholder="Concurso"
          value={filtroConc} onChange={e => onFiltroConcChange(e.target.value)} />
        <button type="button" className={styles.crmBtnFiltrar} onClick={onFiltrar} disabled={loadingHist}>
          Filtrar
        </button>
      </div>

      {loadingHist && <div className={styles.empty}>Carregando...</div>}

      {!loadingHist && participantes.length > 0 && (
        <div className={styles.crmStats}>
          <div className={styles.crmStat}>
            <span className={styles.crmStatNum}>{total}</span>
            <span className={styles.crmStatLabel}>participantes (total)</span>
          </div>
          <div className={styles.crmStatDiv} />
          <div className={styles.crmStat}>
            <span className={styles.crmStatNum}>{comTel}</span>
            <span className={styles.crmStatLabel}>com WhatsApp nesta página</span>
          </div>
          <div className={styles.crmStatDiv} />
          <div className={styles.crmStat}>
            <span className={`${styles.crmStatNum} ${styles.crmStatGreen}`}>
              R$ {arrecadadoPagina.toFixed(2).replace('.', ',')}
            </span>
            <span className={styles.crmStatLabel}>arrecadado nesta página</span>
          </div>
          <div className={styles.crmStatDiv} />
          <button type="button" className={styles.crmBtnMassivo} disabled={enviandoMassa} onClick={onEnviarTodos}>
            {enviandoMassa ? '⟳ Enviando...' : `Enviar convite (todos os filtrados)`}
          </button>
        </div>
      )}

      {resultadoConvite && (
        <div style={{ fontSize: 12, fontWeight: 600, margin: '4px 0 10px' }}>{resultadoConvite}</div>
      )}

      {!loadingHist && participantes.length > 0 && (
        <div className={styles.crmMsgArea}>
          <label className={styles.crmMsgLabel}>Mensagem de convite personalizada (use {'{nome}'} pra personalizar)</label>
          <textarea className={styles.crmMsgTextarea} rows={2}
            placeholder="🍀 Olá {nome}! Temos um novo bolão disponível. Participe: {link}"
            value={msgConvite} onChange={e => onMsgConviteChange(e.target.value)} />
        </div>
      )}

      {/* Lista */}
      {!loadingHist && (
        participantes.length === 0
          ? <div className={styles.empty}>Nenhum participante encontrado</div>
          : <div className={styles.crmLista}>
              {participantes.map(p => (
                <div key={p.id} className={styles.crmCard}>
                  <div className={`${styles.crmCardBar} ${p.status === 'pago' ? styles.crmBarPago : p.status === 'cancelado' ? styles.crmBarCancel : styles.crmBarPend}`} />
                  <div className={styles.crmCardBody}>
                    <div className={styles.crmCardTop}>
                      <span className={styles.crmNome}>{p.nome}</span>
                      <span className={styles.crmValor}>R$ {Number(p.total).toFixed(2).replace('.', ',')}</span>
                    </div>
                    <div className={styles.crmCardMeta}>
                      <span className={`${styles.histTipoBadge} ${p.tipo === 'esporte' ? styles.histTipoEsporte : styles.histTipoLoteria}`}>
                        {p.tipo === 'esporte' ? 'Esporte' : 'Loteria'}
                      </span>
                      {p.concurso != null && <span className={styles.crmTag}># {p.concurso}</span>}
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
                        <button type="button" className={styles.crmAcaoBtnWA} disabled={enviandoId === p.id}
                          onClick={() => onEnviarIndividual(p.telefone!, p.nome, p.id)}>
                          {enviandoId === p.id ? 'Enviando...' : 'Convidar'}
                        </button>
                        {p.status === 'pago' && (
                          <button type="button" className={styles.crmAcaoBtnComp}
                            onClick={() => {
                              const url = p.tipo === 'esporte'
                                ? `/comprovante?id=${p.id}&pub=1&bolao=${p.bolao_slug || ''}`
                                : `/comprovante?id=${p.id}&pub=1&bolao=${p.bolao_slug || ''}&concurso=${p.concurso}`
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
      )}

      {!loadingHist && totalPages > 1 && (
        <div className={styles.histPaginacao}>
          <button type="button" className={styles.histPagBtn} disabled={page <= 1} onClick={() => onPagina(page - 1)}>
            ← Anterior
          </button>
          <span className={styles.histPagInfo}>Página {page} de {totalPages}</span>
          <button type="button" className={styles.histPagBtn} disabled={page >= totalPages} onClick={() => onPagina(page + 1)}>
            Próxima →
          </button>
        </div>
      )}
    </>
  )
}
