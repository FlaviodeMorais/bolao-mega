'use client'

import { useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import styles from './comprovante.module.css'

interface Bolao {
  id: string
  nome: string
  slug: string
  valor_cota: number
  total_cotas: number
  dezenas: number
  num_apostas: number
  encerrado: boolean
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

export default function ComprovantePage() {
  const router      = useRouter()
  const params      = useSearchParams()
  const filtroId    = params.get('id')              // 1 participante
  const filtroIds   = params.get('ids')             // vários participantes (vírgula)
  const paramBolao  = params.get('bolao')           // slug do bolão (passado pelo admin)
  const paramConc   = params.get('concurso')        // concurso (passado pelo admin)
  const modoFiltro  = !!(filtroId || filtroIds)     // true = modo filtrado (sem seletor)

  const [autorizado, setAutorizado]           = useState(false)
  const [boloes, setBoloes]                   = useState<Bolao[]>([])
  const [bolao, setBolao]                     = useState<Bolao | null>(null)
  const [participantes, setParticipantes]     = useState<Participante[]>([])
  const [concurso, setConcurso]               = useState(paramConc || '')
  const [dataSorteio, setDataSorteio]         = useState('')
  const [loading, setLoading]                 = useState(true)

  const filtroSet = filtroIds ? new Set(filtroIds.split(',')) : null
  const lista = filtroId
    ? participantes.filter(p => p.id === filtroId)
    : filtroSet
      ? participantes.filter(p => filtroSet.has(p.id))
      : participantes

  // Verificar autenticação admin
  useEffect(() => {
    fetch('/api/admin/comprovante')
      .then(r => {
        if (r.status === 401) router.replace('/admin')
        else setAutorizado(true)
      })
      .catch(() => router.replace('/admin'))
  }, [router])

  // Carregar bolões e concurso ativo
  useEffect(() => {
    if (!autorizado) return
    Promise.all([
      fetch('/api/boloes').then(r => r.json()),
      paramConc ? Promise.resolve({ concurso: paramConc, data: '' }) : fetch('/api/concurso-ativo').then(r => r.json()),
    ]).then(([bd, cd]) => {
      const lista: Bolao[] = bd.boloes || []
      setBoloes(lista)
      if (!paramConc) setConcurso(cd.concurso || '')
      setDataSorteio(cd.data || '')
      // Se vier bolão pela URL, pré-seleciona; senão usa o primeiro
      const alvo = paramBolao ? lista.find(b => b.slug === paramBolao) : lista[0]
      setBolao(alvo ?? lista[0] ?? null)
    })
  }, [autorizado, paramBolao, paramConc])

  // Carregar participantes ao mudar bolão
  useEffect(() => {
    if (!bolao || !concurso) return
    setLoading(true)
    fetch(`/api/participantes?concurso=${concurso}&bolao=${bolao.slug}`)
      .then(r => r.json())
      .then(d => {
        setParticipantes(d.participantes || [])
        setLoading(false)
      })
  }, [bolao, concurso])

  if (!autorizado) return null

  return (
    <div className={styles.page}>

      {/* ── Controles (ocultos na impressão) ── */}
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
              {boloes.map(b => (
                <option key={b.slug} value={b.slug}>{b.nome}</option>
              ))}
            </select>
          )}
          <button type="button" className={styles.btnPrint} onClick={() => window.print()}>
            {modoFiltro ? '🖨️ Imprimir / PDF' : '🖨️ Imprimir Todos'}
          </button>
        </div>
      </div>

      {/* ── Grade de comprovantes ── */}
      {loading ? (
        <p className={styles.loading}>Carregando participantes…</p>
      ) : lista.length === 0 ? (
        <p className={styles.loading}>Nenhum participante encontrado para este bolão.</p>
      ) : (
        <div className={styles.grid}>
          {lista.map(p => (
            <div key={p.id} className={`${styles.cartao} ${p.status === 'pago' ? styles.pago : styles.pendente}`}>

              {/* Cabeçalho */}
              <div className={styles.cartaoHeader}>
                <span className={styles.cartaoLogo}>🍀</span>
                <div>
                  <div className={styles.cartaoGrupo}>GRUPO MEGA 💯</div>
                  <div className={styles.cartaoBolao}>{bolao?.nome}</div>
                </div>
              </div>

              <div className={styles.divider} />

              {/* Concurso */}
              <div className={styles.cartaoRow}>
                <span className={styles.cartaoLabel}>Concurso</span>
                <span className={styles.cartaoValor}>#{concurso} · {dataSorteio}</span>
              </div>

              <div className={styles.divider} />

              {/* Participante */}
              <div className={styles.cartaoNomeRow}>
                <span className={styles.cartaoLabel}>Participante</span>
                <span className={styles.cartaoNome}>{p.nome}</span>
              </div>

              <div className={styles.cartaoRow}>
                <span className={styles.cartaoLabel}>Celular</span>
                <span className={styles.cartaoValor}>{formatTel(p.telefone)}</span>
              </div>

              {/* Cotas */}
              <div className={styles.cotasSection}>
                <span className={styles.cartaoLabel}>Cotas adquiridas ({p.cotas.length})</span>
                <div className={styles.cotasGrid}>
                  {p.cotas.map(c => (
                    <span key={c} className={styles.cota}>{c.padStart(2, '0')}</span>
                  ))}
                </div>
              </div>

              <div className={styles.divider} />

              {/* Totais */}
              <div className={styles.cartaoRow}>
                <span className={styles.cartaoLabel}>Valor pago</span>
                <span className={styles.cartaoTotal}>
                  R$ {Number(p.total).toFixed(2).replace('.', ',')}
                </span>
              </div>

              {p.acrescimo && Number(p.acrescimo) > 0 && (
                <div className={styles.cartaoRow}>
                  <span className={styles.cartaoLabel}>Acréscimo</span>
                  <span className={styles.cartaoAcrescimo}>
                    + R$ {Number(p.acrescimo).toFixed(2).replace('.', ',')}
                  </span>
                </div>
              )}

              <div className={styles.cartaoRow}>
                <span className={styles.cartaoLabel}>Status</span>
                <span className={p.status === 'pago' ? styles.statusPago : styles.statusPendente}>
                  {p.status === 'pago' ? '✅ PAGO' : '⏳ AGUARDANDO'}
                </span>
              </div>

              <div className={styles.cartaoRow}>
                <span className={styles.cartaoLabel}>Data</span>
                <span className={styles.cartaoValor}>
                  {new Date(p.created_at).toLocaleDateString('pt-BR', {
                    day: '2-digit', month: '2-digit', year: 'numeric',
                    hour: '2-digit', minute: '2-digit',
                  })}
                </span>
              </div>

              <div className={styles.divider} />

              {/* Rodapé */}
              <div className={styles.cartaoTermos}>
                <strong>{bolao?.num_apostas} apostas · {bolao?.dezenas} dezenas por aposta</strong><br />
                Prêmio dividido proporcionalmente ao número de cotas adquiridas.<br />
                Se sobrar cotas, o saldo é rateado entre os participantes.
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  )
}
