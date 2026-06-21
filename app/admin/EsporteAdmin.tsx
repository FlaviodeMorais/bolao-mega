'use client'
import { useState, useEffect } from 'react'
import styles from './admin.module.css'

interface BolaoEsporte {
  id: string; slug: string; nome: string; competicao: string
  valor_cota: number; taxa_admin: number; total_cotas: number
  ativo: boolean; encerrado: boolean
}
interface Jogo {
  id: string; time_casa: string; time_fora: string
  bandeira_casa?: string; bandeira_fora?: string
  data_jogo?: string; hora_jogo?: string
  fase: string; grupo?: string; ordem: number
  gol_casa?: number | null; gol_fora?: number | null; encerrado: boolean
}
interface RankingPart { id: string; nome: string; pontos_total: number }
interface Participante {
  id: string; nome: string; telefone: string; email?: string
  total: number; status: 'aguardando'|'pago'|'cancelado'
  created_at: string; pontos_total?: number
}

function formatData(d?: string) {
  if (!d) return ''
  const [, m, day] = d.split('-')
  return `${day}/${m}`
}

export default function EsporteAdmin() {
  const [boloes, setBoloes]           = useState<BolaoEsporte[]>([])
  const [bolaoSel, setBolaoSel]       = useState<BolaoEsporte | null>(null)
  const [jogos, setJogos]             = useState<Jogo[]>([])
  const [ranking, setRanking]               = useState<RankingPart[]>([])
  const [participantes, setParticipantes]   = useState<Participante[]>([])
  const [show, setShow]                     = useState(true)
  const [aba, setAba]                       = useState<'jogos'|'participantes'|'ranking'|'novo'>('jogos')

  // Form novo bolão
  const [nSlug, setNSlug]   = useState('')
  const [nNome, setNNome]   = useState('')
  const [nDesc, setNDesc]   = useState('')
  const [nComp, setNComp]   = useState('Copa do Mundo 2026')
  const [nValor, setNValor] = useState('50')
  const [nTaxa, setNTaxa]   = useState('10')
  const [nTotal, setNTotal] = useState('30')
  const [criando, setCriando] = useState(false)
  const [erroB, setErroB]     = useState('')

  // Form novo jogo
  const [jCasa, setJCasa]   = useState('')
  const [jFora, setJFora]   = useState('')
  const [jBCasa, setJBCasa] = useState('')
  const [jBFora, setJBFora] = useState('')
  const [jData, setJData]   = useState('')
  const [jHora, setJHora]   = useState('')
  const [jFase, setJFase]   = useState('Fase de Grupos')
  const [jGrupo, setJGrupo] = useState('')
  const [addingJ, setAddingJ] = useState(false)
  const [importando, setImportando] = useState(false)
  const [importMsg, setImportMsg] = useState('')

  // Editar bolão
  const [editNome, setEditNome]   = useState('')
  const [editValor, setEditValor] = useState('')
  const [editTaxa, setEditTaxa]   = useState('')
  const [editAtivo, setEditAtivo] = useState(true)
  const [salvando, setSalvando]   = useState(false)
  const [editMsg, setEditMsg]     = useState('')

  // Resultado
  const [resId, setResId]       = useState('')
  const [resGC, setResGC]       = useState('')
  const [resGF, setResGF]       = useState('')
  const [savingR, setSavingR]   = useState(false)
  const [resMsg, setResMsg]     = useState('')

  async function carregar() {
    const d = await fetch('/api/esporte/boloes').then(r => r.json())
    setBoloes(d.boloes || [])
  }

  async function selBolao(b: BolaoEsporte) {
    setBolaoSel(b)
    setEditNome(b.nome)
    setEditValor(String(b.valor_cota))
    setEditTaxa(String(b.taxa_admin))
    setEditAtivo(b.ativo)
    setAba('jogos')
    setResId('')
    const [jd, rd, pd] = await Promise.all([
      fetch(`/api/esporte/jogos?bolao=${b.slug}`).then(r => r.json()),
      fetch(`/api/esporte/ranking?bolao=${b.slug}`).then(r => r.json()),
      fetch(`/api/esporte/participantes?bolao=${b.slug}&admin=1`).then(r => r.json()),
    ])
    setJogos(jd.jogos || [])
    setRanking(rd.ranking || [])
    setParticipantes(pd.participantes || [])
  }

  useEffect(() => { if (show) carregar() }, [show])

  async function criarBolao() {
    if (!nSlug || !nNome) { setErroB('Slug e nome são obrigatórios'); return }
    setCriando(true); setErroB('')
    const res = await fetch('/api/esporte/boloes', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: nSlug, nome: nNome, descricao: nDesc, competicao: nComp, valor_cota: parseFloat(nValor), taxa_admin: parseFloat(nTaxa), total_cotas: parseInt(nTotal) }),
    }).then(r => r.json())
    setCriando(false)
    if (res.error) { setErroB(res.error); return }
    await carregar()
    setNSlug(''); setNNome(''); setNDesc('')
    setAba('jogos')
  }

  async function salvarBolao() {
    if (!bolaoSel) return
    setSalvando(true); setEditMsg('')
    const res = await fetch('/api/esporte/boloes', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: bolaoSel.slug, nome: editNome, valor_cota: parseFloat(editValor), taxa_admin: parseFloat(editTaxa), ativo: editAtivo }),
    }).then(r => r.json())
    setSalvando(false)
    if (res.error) { setEditMsg('❌ ' + res.error); return }
    setEditMsg('✅ Salvo!')
    setBolaoSel(res.bolao)
    await carregar()
    setTimeout(() => setEditMsg(''), 3000)
  }

  async function excluirBolao() {
    if (!bolaoSel) return
    if (!confirm(`Excluir "${bolaoSel.nome}" e TODOS os seus jogos? Esta ação não pode ser desfeita.`)) return
    await fetch('/api/esporte/boloes', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slug: bolaoSel.slug }),
    })
    setBolaoSel(null)
    await carregar()
  }

  async function addJogo() {
    if (!bolaoSel || !jCasa || !jFora) return
    setAddingJ(true)
    await fetch('/api/esporte/jogos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bolao_slug: bolaoSel.slug, time_casa: jCasa, time_fora: jFora, bandeira_casa: jBCasa || null, bandeira_fora: jBFora || null, data_jogo: jData || null, hora_jogo: jHora || null, fase: jFase, grupo: jGrupo || null, ordem: jogos.length + 1 }),
    })
    setAddingJ(false)
    setJCasa(''); setJFora(''); setJBCasa(''); setJBFora(''); setJData(''); setJHora(''); setJGrupo('')
    await selBolao(bolaoSel)
  }

  async function importarFifa(sobrescrever = false) {
    if (!bolaoSel) return
    if (sobrescrever && !confirm('Isso vai APAGAR todos os jogos existentes e reimportar da FIFA. Confirma?')) return
    setImportando(true); setImportMsg('Buscando agenda da FIFA…')

    try {
      // 1. Limpa todos os jogos existentes primeiro
      setImportMsg('Limpando jogos anteriores…')
      const limpar = await fetch(`/api/esporte/limpar-jogos?bolao=${bolaoSel.slug}`, { method: 'DELETE' })
      if (!limpar.ok) throw new Error('Falha ao limpar jogos existentes')

      // 2. Busca agenda completa da Copa 2026 na FIFA
      setImportMsg('Conectando à API da FIFA…')
      const params = new URLSearchParams({ idCompetition: '17', idSeason: '285023', count: '200', language: 'pt' })
      const r = await fetch(`https://api.fifa.com/api/v3/calendar/matches?${params}`)
      if (!r.ok) throw new Error(`FIFA API retornou ${r.status}`)
      const d = await r.json()
      const todos = (d.Results || [])
      setImportMsg(`${todos.length} jogos encontrados. Salvando futuros…`)

      // Envia para o backend salvar
      const res = await fetch('/api/esporte/importar-jogos', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bolao_slug: bolaoSel.slug, sobrescrever, jogos: todos }),
      }).then(r => r.json())

      if (res.ok) {
        setImportMsg(`✅ ${res.importados} jogos importados (${res.ignorados} já existiam de ${res.total} total)`)
        await selBolao(bolaoSel)
      } else {
        setImportMsg('❌ ' + (res.error || 'Erro ao salvar'))
      }
    } catch (e) {
      setImportMsg('❌ Erro: ' + String(e))
    }
    setImportando(false)
    setTimeout(() => setImportMsg(''), 8000)
  }

  async function delJogo(id: string) {
    if (!confirm('Remover jogo?')) return
    await fetch('/api/esporte/jogos', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id }) })
    if (bolaoSel) await selBolao(bolaoSel)
  }

  async function salvarRes() {
    if (!resId || resGC === '' || resGF === '') { setResMsg('⚠️ Informe o placar'); return }
    setSavingR(true); setResMsg('')
    const res = await fetch('/api/esporte/resultado', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ jogo_id: resId, gol_casa: parseInt(resGC), gol_fora: parseInt(resGF) }),
    }).then(r => r.json())
    setSavingR(false)
    if (res.ok) {
      setResMsg(`✅ ${res.atualizados} palpites atualizados`)
      setResId(''); setResGC(''); setResGF('')
      if (bolaoSel) await selBolao(bolaoSel)
    } else setResMsg('❌ ' + res.error)
    setTimeout(() => setResMsg(''), 4000)
  }

  const jogoResSel = jogos.find(j => j.id === resId)

  return (
    <div className={styles.panel}>
      <div className={styles.histHeader}>
        <div>
          <div className={styles.panelTitle}>⚽ Bolões Esportivos</div>
          <div className={styles.histSubtitle}>Copa, Brasileirão, Libertadores e mais</div>
        </div>
        <button type="button" className={styles.btnAcao} onClick={() => setShow(s => !s)}>
          {show ? 'Fechar' : 'Gerenciar'}
        </button>
      </div>

      {show && (
        <div className={styles.esporteWrap}>

          {/* Lista de bolões */}
          <div className={styles.esporteBoloesList}>
            {boloes.map(b => (
              <button key={b.slug} type="button"
                className={`${styles.esporteBolaoBtn} ${bolaoSel?.slug === b.slug ? styles.esporteBolaoBtnAtivo : ''}`}
                onClick={() => selBolao(b)}>
                <div className={styles.esporteBolaoBtnNome}>{b.nome}</div>
                <div className={styles.esporteBolaoBtnMeta}>{b.competicao} · R$ {Number(b.valor_cota).toFixed(2).replace('.',',')}</div>
              </button>
            ))}
            <button type="button" className={styles.btnAcao} onClick={() => { setAba('novo'); setBolaoSel(null) }}>
              + Novo bolão
            </button>
          </div>

          {/* Tabs quando há bolão selecionado */}
          {bolaoSel && (
            <>
              <div className={styles.esporteTabs}>
                {(['jogos','participantes','ranking'] as const).map(t => (
                  <button key={t} type="button"
                    className={`${styles.esporteTab} ${aba === t ? styles.esporteTabAtivo : ''}`}
                    onClick={() => setAba(t)}>
                    {t === 'jogos' ? '⚽ Jogos' : t === 'participantes' ? '👥 Participantes' : '🏆 Ranking'}
                  </button>
                ))}
              </div>

              <div className={styles.esporteLinkBox}>
                <span className={styles.esporteLinkLabel}>Link público</span>
                <a href={`/esporte/${bolaoSel.slug}`} target="_blank" rel="noopener noreferrer" className={styles.esporteLinkUrl}>
                  /esporte/{bolaoSel.slug}
                </a>
              </div>

              {/* Editar bolão */}
              <div className={styles.esporteEditWrap}>
                <div className={styles.esporteEditRow}>
                  <div style={{flex:2}}>
                    <div className={styles.configLabel}>Nome do bolão</div>
                    <input value={editNome} onChange={e => setEditNome(e.target.value)} className={styles.configInput} />
                  </div>
                  <div>
                    <div className={styles.configLabel}>Valor da cota (R$)</div>
                    <input type="number" value={editValor} onChange={e => setEditValor(e.target.value)} className={styles.configInput} />
                  </div>
                  <div>
                    <div className={styles.configLabel}>Taxa admin (%)</div>
                    <input type="number" value={editTaxa} onChange={e => setEditTaxa(e.target.value)} className={styles.configInput} />
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:6,paddingTop:18}}>
                    <input type="checkbox" id="editAtivo" checked={editAtivo} onChange={e => setEditAtivo(e.target.checked)} />
                    <label htmlFor="editAtivo" className={styles.configLabel} style={{margin:0}}>Ativo</label>
                  </div>
                </div>
                <div className={styles.esporteEditBtns}>
                  <button type="button" className={styles.btnSalvar} onClick={salvarBolao} disabled={salvando}>
                    {salvando ? 'Salvando…' : '💾 Salvar alterações'}
                  </button>
                  <button type="button" className={styles.btnPerigo} onClick={excluirBolao}>
                    🗑 Excluir bolão
                  </button>
                  {editMsg && <span className={styles.esporteImportMsg}>{editMsg}</span>}
                </div>
              </div>
            </>
          )}

          {/* ABA JOGOS */}
          {bolaoSel && aba === 'jogos' && (
            <div className={styles.esporteJogosWrap}>

              {/* Importar da FIFA */}
              <div className={styles.esporteImportWrap}>
                <button type="button" className={styles.btnAcao} onClick={() => importarFifa(false)} disabled={importando}>
                  {importando ? 'Importando…' : '🌐 Importar agenda FIFA 2026'}
                </button>
                <button type="button" className={styles.btnPerigo} onClick={() => importarFifa(true)} disabled={importando}>
                  ↺ Reimportar (apaga tudo)
                </button>
                {importMsg && <div className={styles.esporteImportMsg}>{importMsg}</div>}
              </div>

              {/* Lista */}
              {jogos.length === 0 && <div className={styles.empty}>Nenhum jogo cadastrado ainda.</div>}
              {jogos.map(j => (
                <div key={j.id} className={`${styles.esporteJogoRow} ${j.encerrado ? styles.esporteJogoEncerrado : ''} ${resId === j.id ? styles.esporteJogoSelecionado : ''}`}>
                  <div className={styles.esporteJogoInfo}>
                    <div className={styles.esporteJogoTimes}>
                      <span>{j.bandeira_casa && <span className={`fi fi-${j.bandeira_casa}`} style={{marginRight:4}} />}{j.time_casa}</span>
                      <span className={styles.esporteJogoVs}>×</span>
                      <span>{j.time_fora}{j.bandeira_fora && <span className={`fi fi-${j.bandeira_fora}`} style={{marginLeft:4}} />}</span>
                      {j.encerrado && j.gol_casa !== null && (
                        <span className={styles.esporteJogoResultado}>{j.gol_casa}–{j.gol_fora}</span>
                      )}
                    </div>
                    <div className={styles.esporteJogoMeta}>
                      {j.fase}{j.grupo ? ` · Grupo ${j.grupo}` : ''}{j.data_jogo ? ` · ${formatData(j.data_jogo)}` : ''}{j.hora_jogo ? ` ${j.hora_jogo}` : ''}
                    </div>
                  </div>
                  <div className={styles.esporteJogoAcoes}>
                    {!j.encerrado && (
                      <button type="button"
                        className={`${styles.esporteJogoBtnRes} ${resId === j.id ? styles.esporteJogoBtnResAtivo : ''}`}
                        onClick={() => setResId(resId === j.id ? '' : j.id)}>
                        Resultado
                      </button>
                    )}
                    <button type="button" className={styles.esporteJogoBtnDel} onClick={() => delJogo(j.id)}>✕</button>
                  </div>
                </div>
              ))}

              {/* Painel de resultado */}
              {resId && jogoResSel && (
                <div className={styles.esporteResPanel}>
                  <div className={styles.esporteResTitulo}>
                    Lançar resultado — <span className={`fi fi-${jogoResSel.bandeira_casa}`} style={{marginRight:3}} />{jogoResSel.time_casa} × {jogoResSel.time_fora} <span className={`fi fi-${jogoResSel.bandeira_fora}`} style={{marginLeft:3}} />
                  </div>
                  <div className={styles.esporteResRow}>
                    <input type="number" min={0} max={99} value={resGC} onChange={e => setResGC(e.target.value)} placeholder="0" className={styles.esporteGolInput} />
                    <span className={styles.esporteResX}>×</span>
                    <input type="number" min={0} max={99} value={resGF} onChange={e => setResGF(e.target.value)} placeholder="0" className={styles.esporteGolInput} />
                    <button type="button" onClick={salvarRes} disabled={savingR} className={styles.btnSalvar} style={{ flex: 1 }}>
                      {savingR ? 'Salvando…' : '✅ Salvar resultado'}
                    </button>
                    <button type="button" onClick={() => { setResId(''); setResGC(''); setResGF('') }} className={styles.btnCancelar}>
                      Cancelar
                    </button>
                  </div>
                  {resMsg && <div className={resMsg.startsWith('✅') ? styles.msgOk : styles.msgErro}>{resMsg}</div>}
                </div>
              )}

              {/* Form adicionar jogo */}
              <div className={styles.esporteAddJogoForm}>
                <div className={styles.esporteFormTitle}>+ Adicionar jogo</div>
                <div className={styles.esporteFormGrid2}>
                  <input value={jCasa} onChange={e => setJCasa(e.target.value)} placeholder="Time casa (ex: Brasil)" className={styles.configInput} />
                  <input value={jFora} onChange={e => setJFora(e.target.value)} placeholder="Time fora (ex: México)" className={styles.configInput} />
                  <input value={jBCasa} onChange={e => setJBCasa(e.target.value)} placeholder="Bandeira casa 🇧🇷" className={styles.configInput} />
                  <input value={jBFora} onChange={e => setJBFora(e.target.value)} placeholder="Bandeira fora 🇲🇽" className={styles.configInput} />
                  <input type="date" value={jData} onChange={e => setJData(e.target.value)} className={styles.configInput} />
                  <input type="time" value={jHora} onChange={e => setJHora(e.target.value)} className={styles.configInput} />
                  <input value={jFase} onChange={e => setJFase(e.target.value)} placeholder="Fase" className={styles.configInput} />
                  <input value={jGrupo} onChange={e => setJGrupo(e.target.value)} placeholder="Grupo (A, B…)" className={styles.configInput} />
                </div>
                <button type="button" onClick={addJogo} disabled={addingJ || !jCasa || !jFora} className={styles.btnSalvar} style={{ width: '100%', marginTop: 8 }}>
                  {addingJ ? 'Adicionando…' : '+ Adicionar jogo'}
                </button>
              </div>
            </div>
          )}

          {/* ABA PARTICIPANTES */}
          {bolaoSel && aba === 'participantes' && (
            <div className={styles.esportePartWrap}>
              <div className={styles.esportePartHeader}>
                <span>{participantes.length} inscrito{participantes.length !== 1 ? 's' : ''}</span>
                <span style={{color:'#00C46A'}}>{participantes.filter(p=>p.status==='pago').length} pagos</span>
                <span style={{color:'#f87171'}}>{participantes.filter(p=>p.status==='aguardando').length} aguardando</span>
              </div>
              {participantes.length === 0
                ? <div className={styles.empty}>Nenhum participante ainda.</div>
                : participantes.map(p => {
                  const dt = new Date(p.created_at)
                  const dataFmt = dt.toLocaleDateString('pt-BR') + ' ' + dt.toLocaleTimeString('pt-BR', {hour:'2-digit',minute:'2-digit'})
                  return (
                    <div key={p.id} className={styles.esportePartRow}>
                      <div className={styles.esportePartInfo}>
                        <span className={styles.esportePartNome}>{p.nome}</span>
                        <span className={styles.esportePartMeta}>{p.telefone}{p.email ? ` · ${p.email}` : ''}</span>
                        <span className={styles.esportePartData}>{dataFmt}</span>
                      </div>
                      <div className={styles.esportePartRight}>
                        <span className={`${styles.esportePartStatus} ${p.status === 'pago' ? styles.esportePartPago : styles.esportePartAguardando}`}>
                          {p.status === 'pago' ? '✅ Pago' : '⏳ Aguardando'}
                        </span>
                        <span className={styles.esportePartValor}>R$ {Number(p.total).toFixed(2).replace('.',',')}</span>
                        {p.status !== 'pago' && (
                          <button
                            type="button"
                            className={styles.btnConfirmarPag}
                            onClick={async () => {
                              if (!confirm(`Confirmar pagamento em dinheiro de ${p.nome}?`)) return
                              await fetch(`/api/esporte/participantes/${p.id}`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ status: 'pago' }),
                              })
                              const pd = await fetch(`/api/esporte/participantes?bolao=${bolaoSel!.slug}&admin=1`).then(r => r.json())
                              setParticipantes(pd.participantes || [])
                            }}
                          >
                            💵 Confirmar pagamento
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              }
            </div>
          )}

          {/* ABA RANKING */}
          {bolaoSel && aba === 'ranking' && (
            <div className={styles.esporteRankingWrap}>
              {ranking.length === 0
                ? <div className={styles.empty}>Nenhum participante pago ainda.</div>
                : ranking.map((p, i) => (
                  <div key={p.id} className={styles.esporteRankRow}>
                    <div className={`${styles.esporteRankPos} ${i === 0 ? styles.esporteRankGold : i === 1 ? styles.esporteRankSilver : i === 2 ? styles.esporteRankBronze : ''}`}>
                      {i + 1}
                    </div>
                    <div className={styles.esporteRankNome}>{p.nome}</div>
                    <div className={styles.esporteRankPts}>{p.pontos_total} pts</div>
                  </div>
                ))
              }
            </div>
          )}

          {/* ABA NOVO BOLÃO */}
          {aba === 'novo' && (
            <div className={styles.esporteNovoBolaoForm}>
              <div className={styles.esporteFormTitle}>Novo bolão esportivo</div>
              <div className={styles.esporteFormGrid1}>
                <input value={nSlug} onChange={e => setNSlug(e.target.value.toLowerCase().replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,''))} placeholder="slug (ex: copa-2026)" className={styles.configInput} />
                <input value={nNome} onChange={e => setNNome(e.target.value)} placeholder="Nome do bolão" className={styles.configInput} />
                <input value={nDesc} onChange={e => setNDesc(e.target.value)} placeholder="Descrição (opcional)" className={styles.configInput} />
                <input value={nComp} onChange={e => setNComp(e.target.value)} placeholder="Competição" className={styles.configInput} />
              </div>
              <div className={styles.esporteFormGrid3}>
                <div>
                  <label className={styles.configLabel}>Valor da cota (R$)</label>
                  <input value={nValor} onChange={e => setNValor(e.target.value)} type="number" className={styles.configInput} />
                </div>
                <div>
                  <label className={styles.configLabel}>Taxa admin (%)</label>
                  <input value={nTaxa} onChange={e => setNTaxa(e.target.value)} type="number" className={styles.configInput} />
                </div>
                <div>
                  <label className={styles.configLabel}>Total de cotas</label>
                  <input value={nTotal} onChange={e => setNTotal(e.target.value)} type="number" className={styles.configInput} />
                </div>
              </div>
              {erroB && <div className={styles.msgErro}>{erroB}</div>}
              <button type="button" onClick={criarBolao} disabled={criando} className={styles.btnSalvar} style={{ width: '100%', marginTop: 8 }}>
                {criando ? 'Criando…' : '✅ Criar bolão'}
              </button>
            </div>
          )}

        </div>
      )}
    </div>
  )
}
