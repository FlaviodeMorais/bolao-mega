export interface Participante {
  id: string; nome: string; cotas: string[]; total: number
  status: string; telefone?: string; email?: string; criado_em?: string
  acrescimo?: number; acrescimo_pago?: boolean
}

export interface Bolao {
  id: string; nome: string; slug: string; valor_cota: number
  total_cotas: number; dezenas: number; num_apostas: number
  taxa_admin: number; encerrado: boolean; arquivado: boolean; loteria?: string
  apostas_data?: { bets: number[][]; total_apostas: number } | null
  resultado_conferencia?: Record<string, unknown> | null
}

export interface ConferirResult {
  status: string; dezenas_sorteadas: number[]
  resumo: { senas: number; quinas: number; quadras: number }
  maior_premio: string | null; total_premiadas: number
  apostas_premiadas: { idx: number; dezenas: number[]; acertos: number; premio: string }[]
  premios_caixa?: { faixa: string; ganhadores: number; valor: number }[]
}

/** Props agrupadas por responsabilidade do painel de detalhe do bolão. */
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
  exportandoSheets: boolean
  sheetsMsg: string

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
  onExportarSheets: () => void

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
  onEnviarAcertosEmail: () => void
  enviarAcertosEmailMsg: string
  acertosDestinatario: string
  onAcertosDestinatarioChange: (v: string) => void

  // Callbacks — encerramento / arquivamento
  onToggleEncerrar: () => void
  onEncerrarBolao: () => void
  onArquivarBolao: () => void

  // Callbacks — config
  onToggleConfig: () => void
  onEditDezenasChange: (v: number) => void
  onEditApostasChange: (v: number) => void
  onEditCotasChange: (v: number) => void
  onEditTaxaChange: (v: number) => void
  onSalvarConfig: () => void
  onInserirApostasGeradas: (texto: string) => void
}
