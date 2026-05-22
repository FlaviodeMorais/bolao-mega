'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import styles from './comprovante.module.css'

interface ApostasData {
  bets: number[][]
  transacao_id: string
  compra_id: string
  data_compra: string
  hora_compra: string
  situacao: string
  total_apostas: number
}

interface Bolao {
  id: string
  nome: string
  slug: string
  valor_cota: number
  total_cotas: number
  dezenas: number
  num_apostas: number
  encerrado: boolean
  apostas_data?: ApostasData | null
}

interface Participante {
  id: string
  nome: string
  cotas: string[]
  total: number
  status: string
  telefone?: string
  acrescimo?: number | null
  created_at: string
}

function formatTel(tel: string | undefined) {
  if (!tel) return '—'
  const n = tel.replace(/\D/g, '').replace(/^55/, '')
  if (n.length === 11) return `(${n.slice(0,2)}) ${n.slice(2,7)}-${n.slice(7)}`
  if (n.length === 10) return `(${n.slice(0,2)}) ${n.slice(2,6)}-${n.slice(6)}`
  return tel
}

function ComprovanteContent() {
  const router      = useRouter()
  const params      = useSearchParams()
  const filtroId    = params.get('id')
  const filtroIds   = params.get('ids')
  const paramBolao  = params.get('bolao')
  const paramConc   = params.get('concurso')
  const modoFiltro  = !!(filtroId || filtroIds)

  const [autorizado, setAutorizado]       = useState(false)
  const [boloes, setBoloes]               = useState<Bolao[]>([])
  const [bolao, setBolao]                 = useState<Bolao | null>(null)
  const [participantes, setParticipantes] = useState<Participante[]>([])
  const [concurso, setConcurso]           = useState(paramConc || '')
  const [dataSorteio, setDataSorteio]     = useState('')
  const [loading, setLoading]             = useState(true)
  const [modoCanhoto, setModoCanhoto]     = useState(false)

  const filtroSet = filtroIds ? new Set(filtroIds.split(',')) : null
  const lista = filtroId
    ? participantes.filter(p => p.id === filtroId)
    : filtroSet
      ? participantes.filter(p => filtroSet.has(p.id))
      : participantes

  useEffect(() => {
    fetch('/api/admin/comprovante')
      .then(r => { if (r.status === 401) router.replace('/admin'); else setAutorizado(true) })
      .catch(() => router.replace('/admin'))
  }, [router])

  useEffect(() => {
    if (!autorizado) return
    Promise.all([
      fetch('/api/boloes').then(r => r.json()),
      paramConc
        ? Promise.resolve({ concurso: paramConc, data: '' })
        : fetch('/api/concurso-ativo').then(r => r.json()),
    ]).then(([bd, cd]) => {
      const lista: Bolao[] = bd.boloes || []
      setBoloes(lista)
      if (!paramConc) setConcurso(cd.concurso || '')
      setDataSorteio(cd.data || '')
      const alvo = paramBolao ? lista.find(b => b.slug === paramBolao) : lista[0]
      setBolao(alvo ?? lista[0] ?? null)
    })
  }, [autorizado, paramBolao, paramConc])

  useEffect(() => {
    if (!bolao || !concurso) return
    setLoading(true)
    fetch(`/api/participantes?concurso=${concurso}&bolao=${bolao.slug}`)
      .then(r => r.json())
      .then(d => { setParticipantes(d.participantes || []); setLoading(false) })
  }, [bolao, concurso])

  if (!autorizado) return null

  return (
    <div className={styles.page}>

      {/* ── Controles ── */}
      <div className={styles.controls}>
        <div className={styles.controlsLeft}>
          <h1 className={styles.pageTitle}>🖨️ Comprovantes de Participação</h1>
          <p className={styles.pageSubtitle}>
            {lista.length} participante(s) · Concurso #{concurso} · {dataSorteio}
          </p>
        </div>
        <div className={styles.controlsRight}>
          <button type="button" className={styles.btnBack} onClick={() => router.push('/admin')}>
            ← Voltar ao Admin
          </button>
          {!modoFiltro && (
            <select
              className={styles.select}
              title="Selecionar bolão"
              value={bolao?.slug || ''}
              onChange={e => setBolao(boloes.find(b => b.slug === e.target.value) ?? null)}
            >
              {boloes.map(b => <option key={b.slug} value={b.slug}>{b.nome}</option>)}
            </select>
          )}
          <button
            type="button"
            className={modoCanhoto ? styles.btnCanhotoAtivo : styles.btnCanhoto}
            onClick={() => setModoCanhoto(m => !m)}
          >
            {modoCanhoto ? '📋 Ver Comprovantes' : '🗟 Ver Canhotos'}
          </button>
          <button type="button" className={styles.btnPrint} onClick={() => window.print()}>
            {modoFiltro ? '🖨️ Imprimir / PDF' : '🖨️ Imprimir Todos'}
          </button>
        </div>
      </div>

      {/* ── Conteúdo ── */}
      {loading ? (
        <p className={styles.loading}>Carregando participantes…</p>
      ) : lista.length === 0 ? (
        <p className={styles.loading}>Nenhum participante encontrado para este bolão.</p>
      ) : modoCanhoto ? (

        /* ════ MODO CANHOTO ════ */
        <div className={styles.gridCanhoto}>
          {lista.map((p, idx) => {
            const ad = bolao?.apostas_data
            return (
              <div key={p.id} className={`${styles.canhoto} ${p.status === 'pago' ? styles.pago : styles.pendente}`}>
                <div className={styles.canhotoHeader}>
                  <span>🍀 <strong>GRUPO MEGA 💯</strong></span>
                  <span className={p.status === 'pago' ? styles.statusBadgePago : styles.statusBadgePendente}>
                    {p.status === 'pago' ? '✅ PAGO' : '⏳ AGUARDANDO'}
                  </span>
                </div>
                <div className={styles.canhotoBolao}>{bolao?.nome}</div>
                <div className={styles.divider} />
                <div className={styles.canhotoNome}>{p.nome}</div>
                <div className={styles.canhotoRow}>
                  <span className={styles.cartaoLabel}>Celular</span>
                  <span className={styles.cartaoValor}>{formatTel(p.telefone)}</span>
                </div>
                <div className={styles.canhotoRow}>
                  <span className={styles.cartaoLabel}>Concurso</span>
                  <span className={styles.cartaoConcurso}>#{concurso} · {dataSorteio}</span>
                </div>
                <div className={styles.canhotoRow}>
                  <span className={styles.cartaoLabel}>
                    {p.cotas.length === 1 ? '1 cota adquirida' : `${p.cotas.length} cotas adquiridas`}
                  </span>
                  <span className={styles.cartaoValor}>
                    Nº {p.cotas.map(c => c.padStart(2,'0')).join(', ')}
                  </span>
                </div>
                <div className={styles.canhotoRow}>
                  <span className={styles.cartaoLabel}>Apostas</span>
                  <span className={styles.cartaoValor}>{ad ? `${ad.total_apostas} apostas` : `${bolao?.num_apostas} apostas`}</span>
                </div>
                <div className={styles.divider} />
                <div className={styles.canhotoRow}>
                  <span className={styles.cartaoLabel}>Valor pago</span>
                  <span className={styles.cartaoTotal}>R$ {Number(p.total).toFixed(2).replace('.',',')}</span>
                </div>
                {ad?.transacao_id && (
                  <div className={styles.canhotoTransacao}>
                    ID: {ad.transacao_id}<br/>{ad.data_compra} {ad.hora_compra}
                  </div>
                )}
                <div className={styles.canhotoNumero}>Nº {String(idx+1).padStart(3,'0')}</div>
              </div>
            )
          })}
        </div>

      ) : (

        /* ════ MODO COMPROVANTE COMPLETO ════ */
        <div className={styles.grid}>
          {lista.map((p, idx) => {
            const ad = bolao?.apostas_data ?? null
            const emissao = new Date(p.created_at).toLocaleDateString('pt-BR', {
              day: '2-digit', month: '2-digit', year: 'numeric',
            })
            const horario = new Date(p.created_at).toLocaleTimeString('pt-BR', {
              hour: '2-digit', minute: '2-digit',
            })
            return (
              <div key={p.id} className={`${styles.cartao} ${p.status === 'pago' ? styles.pago : styles.pendente}`}>

                {/* ══ CABEÇALHO — repete em cada página na impressão ══ */}
                <div className={styles.printHead}>
                <div className={styles.printRow}><div className={styles.printCell}>

                  <div className={styles.cartaoHeader}>
                    <div className={styles.cartaoHeaderLeft}>
                      <span className={styles.cartaoLogo}>🍀</span>
                      <div>
                        <div className={styles.cartaoGrupo}>GRUPO MEGA 💯</div>
                        <div className={styles.cartaoBolao}>{bolao?.nome}</div>
                      </div>
                    </div>
                    <span className={p.status === 'pago' ? styles.statusBadgePago : styles.statusBadgePendente}>
                      {p.status === 'pago' ? '✅ PAGO' : '⏳ AGUARDANDO'}
                    </span>
                  </div>

                  <div className={styles.comprovanteLabel}>Comprovante de Participação</div>
                  <div className={styles.divider} />

                  <div className={styles.cartaoNomeRow}>
                    <span className={styles.cartaoLabel}>Participante</span>
                    <span className={styles.cartaoNome}>{p.nome}</span>
                  </div>
                  <div className={styles.cartaoRow}>
                    <span className={styles.cartaoLabel}>Telefone</span>
                    <span className={styles.cartaoValor}>{formatTel(p.telefone)}</span>
                  </div>
                  <div className={styles.cartaoRow}>
                    <span className={styles.cartaoLabel}>Concurso</span>
                    <span className={styles.cartaoConcurso}>#{concurso}</span>
                  </div>

                  <div className={styles.cotasSection}>
                    <span className={styles.cartaoLabel}>
                      {p.cotas.length === 1 ? '1 cota adquirida' : `${p.cotas.length} cotas adquiridas`}
                      {bolao ? ` — de ${bolao.total_cotas} disponíveis` : ''}
                    </span>
                    <div className={styles.cotasGrid}>
                      {p.cotas.map(c => (
                        <span key={c} className={styles.cota}>Nº {c.padStart(2, '0')}</span>
                      ))}
                    </div>
                  </div>

                  <div className={styles.divider} />

                  <div className={styles.cartaoRow}>
                    <span className={styles.cartaoLabel}>Valor pago</span>
                    <span className={styles.cartaoTotal}>R$ {Number(p.total).toFixed(2).replace('.', ',')}</span>
                  </div>
                  {p.acrescimo && Number(p.acrescimo) > 0 && (
                    <div className={styles.cartaoRow}>
                      <span className={styles.cartaoLabel}>Acréscimo</span>
                      <span className={styles.cartaoAcrescimo}>+ R$ {Number(p.acrescimo).toFixed(2).replace('.', ',')}</span>
                    </div>
                  )}

                  {ad && (
                    <>
                      <div className={styles.divider} />
                      <div className={styles.apostasHeader}>
                        <span className={styles.cartaoLabel}>Apostas registradas — {ad.total_apostas} jogos</span>
                        {ad.compra_id && <span className={styles.apostasId}>Compra #{ad.compra_id}</span>}
                      </div>
                      {ad.transacao_id && (
                        <div className={styles.apostasTransacao}>
                          ID: {ad.transacao_id} · {ad.data_compra} {ad.hora_compra} · {ad.situacao}
                        </div>
                      )}
                    </>
                  )}

                </div></div>
                </div>

                {/* ══ CORPO — bets fluem entre páginas ══ */}
                <div className={styles.printBody}>
                  {ad ? ad.bets.map((bet, bi) => (
                    <div key={bi} className={styles.apostaBet}>
                      <span className={styles.apostaBetNum}>{String(bi+1).padStart(2,'0')}.</span>
                      {bet.map((n, ni) => (
                        <span key={ni} className={styles.apostaBetDezena}>
                          {String(n).padStart(2,'0')}
                        </span>
                      ))}
                    </div>
                  )) : null}
                </div>

                {/* ══ RODAPÉ — repete em cada página na impressão ══ */}
                <div className={styles.printFoot}>
                <div className={styles.printRow}><div className={styles.printCell}>

                  <div className={styles.divider} />
                  <div className={styles.cartaoFooter}>
                    <div className={styles.cartaoFooterInfo}>
                      Bolão: bolao-mega-zeta.vercel.app/{bolao?.slug}<br />
                      Emissão: {emissao} às {horario}
                    </div>
                    <div className={styles.cartaoNumero}>Nº {String(idx + 1).padStart(3, '0')}</div>
                  </div>
                  <div className={styles.cartaoTermos}>
                    Prêmio dividido proporcionalmente ao número de cotas adquiridas.
                    Se sobrar cotas, o saldo é rateado entre os participantes.
                  </div>

                </div></div>
                </div>

              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default function ComprovantePage() {
  return (
    <Suspense>
      <ComprovanteContent />
    </Suspense>
  )
}
