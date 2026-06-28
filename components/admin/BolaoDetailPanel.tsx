'use client'

import styles from '@/app/admin/admin.module.css'
import GeradorApostas from '@/components/admin/GeradorApostas'
import { getLoteria } from '@/lib/loterias'

/* ── Tipos ── */
interface Participante {
  id: string; nome: string; cotas: string[]; total: number
  status: string; telefone?: string; email?: string; criado_em?: string
  acrescimo?: number; acrescimo_pago?: boolean
}
interface Bolao {
  id: string; nome: string; slug: string; valor_cota: number
  total_cotas: number; dezenas: number; num_apostas: number
  taxa_admin: number; encerrado: boolean; loteria?: string
  apostas_data?: { bets: number[][]; total_apostas: number } | null
  resultado_conferencia?: Record<string, unknown> | null
}
interface ConferirResult {
  status: string; dezenas_sorteadas: number[]
  resumo: { senas: number; quinas: number; quadras: number }
  maior_premio: string | null; total_premiadas: number
  apostas_premiadas: { idx: number; dezenas: number[]; acertos: number; premio: string }[]
}
/* ── Props agrupadas por responsabilidade ── */
export interface BolaoDetailPanelProps {
  bolao: Bolao
  concursoAtivo: string

  // Participantes
  partsBolao: Participante[]
  pagosLista: Participante[]
  pendentesLista: Participante[]
  cotasLivres: number
  arrecadado: number
  loadingParts: boolean
  confirmandoTodos: boolean
  selecionados: Set<string>
  enviandoComp: string | null
  lembreteMsg: string
  compMsg: string

  // Apostas
  apostasMsg: string
  showApostasModal: boolean
  apostasTexto: string
  uploadingApostas: boolean

  // Conferência
  showConferir: boolean
  conferirResult: ConferirResult | null
  conferirMsg: string
  conferindoRes: boolean
  conferindoManual: boolean
  dezenasInput: string

  // Encerramento
  showEncerrar: boolean
  encerrando: boolean
  encerrarOk: { acrescimo: number; participantes: number } | null

  // Config
  showConfig: boolean
  editDezenas: number
  editApostas: number
  editCotas: number
  editTaxa: number
  precoCaixa: number
  custoApostas: number
  totalBolao: number
  valorPorCota: number
  configSalva: boolean
  salvando: boolean

  // Utilitários
  formatTel: (tel?: string) => string
  whatsappUrl: (tel?: string) => string

  // Callbacks — participantes
  onFechar: () => void
  onAtualizarParts: () => void
  onConfirmarTodos: () => void
  onEnviarLembrete: () => void
  onToggleSelecionado: (id: string) => void
  onSelecionarTodosPagos: () => void
  onLimparSelecao: () => void
  onImprimirSelecionados: () => void
  onEnviarComprovante: (id: string) => void
  onConfirmarPagamento: (id: string) => void
  onConfirmarAcrescimo: (id: string) => void
  onExcluir: (id: string, nome: string) => void

  // Callbacks — apostas
  onOpenApostas: () => void
  onCloseApostas: () => void
  onApostasTextoChange: (v: string) => void
  onSalvarApostas: () => void
  onRemoverApostas: () => void

  // Callbacks — conferência
  onToggleConferir: () => void
  onConferirSorteio: () => void
  onConferirManual: () => void
  onResetarConferencia: () => void
  onDezenasInputChange: (v: string) => void
  onEnviarAcertos: () => void
  enviarAcertosMsg: string

  // Callbacks — encerramento
  onToggleEncerrar: () => void
  onEncerrarBolao: () => void

  // Callbacks — config
  onToggleConfig: () => void
  onEditDezenasChange: (v: number) => void
  onEditApostasChange: (v: number) => void
  onEditCotasChange: (v: number) => void
  onEditTaxaChange: (v: number) => void
  onSalvarConfig: () => void
  onInserirApostasGeradas: (texto: string) => void
}

/**
 * Painel de detalhe do bolão Mega-Sena selecionado.
 * Contém: header, stats, ações, modal apostas, conferência, encerramento,
 * lista de participantes e configurador.
 * Sem chamadas de API diretas — todas acionadas via callbacks do admin/page.tsx.
 */
export default function BolaoDetailPanel(p: BolaoDetailPanelProps) {
  const { bolao } = p
  const loteriaCfg = getLoteria(bolao.loteria)
  return (
    <div className={styles.panel}>

      {/* ── Header ── */}
      <div className={styles.detHeader}>
        <div>
          <div className={styles.detNome}>{bolao.nome}</div>
          <div className={styles.detSub}>
            #{p.concursoAtivo || '?'} · {typeof window !== 'undefined' ? window.location.host : ''}/<wbr/>{bolao.slug}
          </div>
        </div>
        <button type="button" className={styles.btnFechar} onClick={p.onFechar} title="Fechar">✕</button>
      </div>

      {/* ── Stats ── */}
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

      {/* ── Ações rápidas ── */}
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

      {/* ── Modal apostas ── */}
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

      {/* ── Conferência do sorteio ── */}
      {p.showConferir && (
        <div className={styles.resultadoPanel}>
          <div className={styles.resultadoTitle}>🔍 Conferir Resultado — Concurso #{p.concursoAtivo}</div>
          {bolao.apostas_data ? (
            <p className={styles.resultadoInfo}>
              ✅ {bolao.apostas_data.total_apostas} apostas carregadas · O resultado será buscado automaticamente na Caixa.
            </p>
          ) : (
            <p className={styles.resultadoInfo}>
              ⚠️ Nenhuma aposta carregada. Use &quot;📊 Carregar Apostas&quot; primeiro.
            </p>
          )}
          <div className={styles.resultadoBtns}>
            {(!p.conferirResult || p.conferirResult.status === 'nao_apurado') && (
              <button type="button" className={styles.btnGanhou}
                onClick={p.onConferirSorteio}
                disabled={p.conferindoRes || !bolao.apostas_data}>
                {p.conferindoRes ? '⟳ Buscando na Caixa...' : '🔍 Buscar e Conferir'}
              </button>
            )}
            {p.conferirResult && p.conferirResult.status !== 'nao_apurado' && (
              <button type="button" className={styles.btnNaoGanhou} onClick={p.onResetarConferencia}>
                ↺ Resetar resultado
              </button>
            )}
          </div>
          {p.conferirResult?.dezenas_sorteadas && (
            <div className={styles.conferirDezenas}>
              <span className={styles.conferirResumoTitle}>Dezenas sorteadas:</span>
              <div className={styles.conferirDezGrid}>
                {p.conferirResult.dezenas_sorteadas.map((n: number) => (
                  <span key={n} className={styles.conferirDezBall}>{String(n).padStart(2, '0')}</span>
                ))}
              </div>
            </div>
          )}
          {p.conferirMsg && (
            <div className={p.conferirResult?.status === 'ganhamos' ? styles.resultadoMsgBox : styles.resultadoInfo}>
              {p.conferirMsg}
            </div>
          )}
          {(!p.conferirResult || p.conferirResult.status === 'nao_apurado') && bolao.apostas_data && (
            <div className={styles.manualEntry}>
              <div className={styles.manualLabel}>Inserir dezenas manualmente:</div>
              <div className={styles.manualRow}>
                <input type="text" className={styles.manualInput}
                  placeholder={bolao.loteria === 'lotofacil' ? 'Ex: 01 03 05 08 11 12 14 15 17 19 20 21 22 24 25' : bolao.loteria === 'quina' ? 'Ex: 05 22 41 63 77' : 'Ex: 03 30 33 35 45 47'}
                  value={p.dezenasInput}
                  onChange={e => p.onDezenasInputChange(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && p.onConferirManual()}
                />
                <button type="button" className={styles.btnGanhou}
                  onClick={p.onConferirManual}
                  disabled={p.conferindoManual || !p.dezenasInput.trim()}>
                  {p.conferindoManual ? '⟳' : '✓ Conferir'}
                </button>
              </div>
            </div>
          )}
          {p.conferirResult && p.conferirResult.total_premiadas > 0 && (
            <div className={styles.conferirResumo}>
              <div className={styles.conferirResumoTitle}>Apostas premiadas:</div>
              {(['SENA', 'QUINA', 'QUADRA'] as const).map(pr => {
                const key = pr === 'SENA' ? 'senas' : pr === 'QUINA' ? 'quinas' : 'quadras'
                const count = p.conferirResult!.resumo[key as keyof typeof p.conferirResult.resumo]
                return count > 0 ? (
                  <div key={pr} className={styles.conferirPremio}>
                    {pr === 'SENA' ? '🥇' : pr === 'QUINA' ? '🥈' : '🥉'} {pr}: {count} aposta{count !== 1 ? 's' : ''}
                  </div>
                ) : null
              })}
              <div className={styles.conferirApostas}>
                {p.conferirResult.apostas_premiadas.slice(0, 10).map(a => (
                  <div key={a.idx} className={styles.conferirAposta}>
                    <span className={styles.conferirIdx}>#{a.idx}</span>
                    <span className={styles.conferirDez}>{a.dezenas.map((n: number) => String(n).padStart(2, '0')).join(' ')}</span>
                    <span className={styles.conferirPremioTag}>{a.acertos}✓ {a.premio}</span>
                  </div>
                ))}
                {p.conferirResult.apostas_premiadas.length > 10 && (
                  <div className={styles.conferirInfo}>…e mais {p.conferirResult.apostas_premiadas.length - 10} apostas premiadas</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Acertos pós-sorteio ── */}
      {bolao.resultado_conferencia &&
        (bolao.resultado_conferencia as Record<string, string>).status !== 'nao_apurado' &&
        bolao.apostas_data && p.pagosLista.length > 0 && (
        <button type="button" className={styles.btnLembrete}
          onClick={p.onEnviarAcertos}>
          📊 Enviar Acertos por WhatsApp
        </button>
      )}
      {p.enviarAcertosMsg && <div className={styles.lembreteMsg}>{p.enviarAcertosMsg}</div>}

      {/* ── Encerrar bolão ── */}
      {!bolao.encerrado && p.cotasLivres > 0 && p.pagosLista.length > 0 && (
        <button type="button" className={styles.btnEncerrar}
          onClick={p.onToggleEncerrar}>
          ⛔ Encerrar Bolão
        </button>
      )}
      {p.lembreteMsg && <div className={styles.lembreteMsg}>{p.lembreteMsg}</div>}
      {p.compMsg && <div className={styles.lembreteMsg}>{p.compMsg}</div>}

      {bolao.encerrado && (
        <div className={styles.encerradoBanner}>
          ⛔ Bolão encerrado — complemento de pagamento enviado por e-mail
        </div>
      )}
      {p.encerrarOk && (
        <div className={styles.encerrarSucesso}>
          ✅ Encerrado com sucesso!&nbsp;
          Acréscimo de <strong>R$ {p.encerrarOk.acrescimo.toFixed(2).replace('.', ',')}</strong>&nbsp;
          enviado para {p.encerrarOk.participantes} participante(s) por e-mail.
        </div>
      )}
      {p.showEncerrar && !bolao.encerrado && (
        <div className={styles.encerrarPanel}>
          <div className={styles.encerrarTitle}>⚠️ Encerrar Bolão com Rateio</div>
          <div className={styles.encerrarCalc}>
            <div className={styles.encerrarRow}>
              <span>Cotas não vendidas</span>
              <span>{p.cotasLivres} de {bolao.total_cotas || 20}</span>
            </div>
            <div className={styles.encerrarRow}>
              <span>Valor das cotas restantes</span>
              <span>R$ {(p.cotasLivres * Number(bolao.valor_cota)).toFixed(2).replace('.', ',')}</span>
            </div>
            <div className={styles.encerrarRow}>
              <span>Participantes pagos</span>
              <span>{p.pagosLista.length}</span>
            </div>
            <div className={`${styles.encerrarRow} ${styles.encerrarDestaque}`}>
              <span>Acréscimo por participante</span>
              <span>R$ {p.pagosLista.length > 0
                ? ((p.cotasLivres * Number(bolao.valor_cota)) / p.pagosLista.length).toFixed(2).replace('.', ',')
                : '0,00'}
              </span>
            </div>
          </div>
          <div className={styles.encerrarInfo}>
            ✅ Cada participante receberá um PIX com o complemento por e-mail.<br />
            ✅ O bolão será marcado como encerrado.<br />
            ⛔ Novos cadastros serão bloqueados.
          </div>
          <div className={styles.encerrarActions}>
            <button type="button" className={styles.btnEncerrarConfirm}
              onClick={p.onEncerrarBolao} disabled={p.encerrando}>
              {p.encerrando ? '⟳ Processando...' : '⛔ Confirmar Encerramento'}
            </button>
            <button type="button" className={styles.btnLoad}
              onClick={p.onToggleEncerrar}>Cancelar</button>
          </div>
        </div>
      )}

      {/* ── Lista de participantes ── */}
      <div className={styles.partSectionHeader}>
        <div className={styles.partSectionTitle}>
          👥 Participantes — {p.partsBolao.length} cadastrado{p.partsBolao.length !== 1 ? 's' : ''}
        </div>
        {p.partsBolao.some(pt => pt.status === 'pago') && (
          <button type="button" className={styles.btnSelAll}
            onClick={p.onSelecionarTodosPagos}
            title="Selecionar todos os participantes pagos">
            ☑ Selecionar pagos
          </button>
        )}
      </div>

      {p.selecionados.size > 0 && (
        <div className={styles.selecaoBar}>
          <span className={styles.selecaoCount}>
            {p.selecionados.size} selecionado{p.selecionados.size !== 1 ? 's' : ''}
          </span>
          <button type="button" className={styles.btnImprimirSel} onClick={p.onImprimirSelecionados}>
            🖨️ Imprimir / PDF
          </button>
          <button type="button" className={styles.btnLimparSel} onClick={p.onLimparSelecao}>
            ✕ Limpar seleção
          </button>
        </div>
      )}

      {p.loadingParts ? (
        <div className={styles.empty}>Carregando...</div>
      ) : p.partsBolao.length === 0 ? (
        <div className={styles.empty}>Nenhum participante neste bolão para o concurso #{p.concursoAtivo || '?'}</div>
      ) : p.partsBolao.map(pt => (
        <div key={pt.id} className={`${styles.partCard} ${pt.status === 'pago' ? styles.partCardPago : pt.status === 'cancelado' ? styles.partCardCancel : ''} ${p.selecionados.has(pt.id) ? styles.partCardSelecionado : ''}`}>
          {pt.status === 'pago' && (
            <input type="checkbox" className={styles.partCardCheck}
              checked={p.selecionados.has(pt.id)}
              onChange={() => p.onToggleSelecionado(pt.id)}
              title="Selecionar para imprimir" />
          )}
          <div className={styles.partCardLeft}>
            <div className={styles.partCardNome}>{pt.nome}</div>
            <div className={styles.partCardTel}>
              {pt.telefone ? (
                <a href={p.whatsappUrl(pt.telefone)} target="_blank" rel="noopener noreferrer"
                   title={`Abrir WhatsApp — ${p.formatTel(pt.telefone)}`}
                   className={styles.whatsappLink}>
                  📱 {p.formatTel(pt.telefone)}
                </a>
              ) : '—'}
            </div>
            <div className={styles.partCardInfo}>
              <span className={styles.partCardCotas}>
                🎟️ {Array.isArray(pt.cotas) ? pt.cotas.join(', ') : pt.cotas}
              </span>
              <span className={styles.partCardTotal}>R$ {Number(pt.total).toFixed(2).replace('.', ',')}</span>
            </div>
          </div>
          <div className={styles.partCardRight}>
            <div className={styles.partCardStatusCol}>
              {pt.status === 'pago' && (
                <button type="button" className={styles.btnImprimir}
                  onClick={() => window.open(`/comprovante?id=${pt.id}`, '_blank')}
                  title="Imprimir comprovante">🖨️</button>
              )}
              {pt.status === 'pago' && (
                <button type="button" className={styles.btnComprovante}
                  onClick={() => p.onEnviarComprovante(pt.id)}
                  disabled={p.enviandoComp === pt.id}
                  title={pt.email ? `Enviar comprovante por e-mail — ${pt.email}` : 'Participante sem e-mail cadastrado'}>
                  {p.enviandoComp === pt.id ? '⟳' : '📧'}
                </button>
              )}
              {pt.status === 'pago'
                ? <span className={styles.statusPago}>✅ Pago</span>
                : pt.status === 'cancelado'
                  ? <span className={styles.statusCancel}>✕ Excluído</span>
                  : <>
                      <span className={styles.statusPend}>⏳ Pendente</span>
                      <button type="button" className={styles.btnConfirm}
                        onClick={() => p.onConfirmarPagamento(pt.id)}>✔ Pago</button>
                    </>
              }
              {pt.acrescimo != null && (
                <div className={styles.acrescimoRow}>
                  <span className={styles.acrescimoLbl}>
                    +R$ {Number(pt.acrescimo).toFixed(2).replace('.', ',')} complemento
                  </span>
                  {pt.acrescimo_pago
                    ? <span className={styles.statusPago}>✅ Pago</span>
                    : <>
                        <span className={styles.statusPend}>⏳</span>
                        <button type="button" className={styles.btnConfirm}
                          onClick={() => p.onConfirmarAcrescimo(pt.id)}>✔ Confirmar</button>
                      </>
                  }
                </div>
              )}
            </div>
            {pt.status !== 'cancelado' && (
              <button type="button" className={styles.btnExcluir}
                onClick={() => p.onExcluir(pt.id, pt.nome)}>✕</button>
            )}
          </div>
        </div>
      ))}

      {/* ── Configurador ── */}
      <button type="button" className={styles.configToggle} onClick={p.onToggleConfig}>
        ⚙️ Configurar Bolão <span>{p.showConfig ? '▲' : '▼'}</span>
      </button>
      {p.showConfig && (
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

          {/* ── Gerador de Apostas & Estatísticas ── */}
          <GeradorApostas
            loteria={(bolao.loteria ?? 'mega') as import('@/lib/loterias').LoteriaId}
            dezenasBolao={p.editDezenas}
            uploadingApostas={p.uploadingApostas}
            apostasMsg={p.apostasMsg}
            onInserirApostas={p.onInserirApostasGeradas}
          />
        </div>
      )}
    </div>
  )
}
