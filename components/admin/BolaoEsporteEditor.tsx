'use client'
import { useState } from 'react'
import styles from '@/app/admin/admin.module.css'

interface PremiacaoItem {
  lugar: number; emoji: string; label: string
  categoria: string; pts: number; pct: number
}

interface BolaoEsporte {
  id?: string
  slug: string; nome: string; descricao?: string; competicao: string
  logo_url?: string; cor_primaria?: string; header_desc?: string
  label_cta?: string; label_palpites?: string
  label_jogo_hoje?: string; label_noticias?: string
  valor_cota: number; taxa_admin: number; total_cotas: number
  ativo?: boolean; encerrado?: boolean
  premiacao?: PremiacaoItem[]
}

// Mantido em sincronia com DEFAULTS['paginas.esporte'].premiacao em lib/settings.ts
const PREMIACAO_DEFAULT: PremiacaoItem[] = [
  { lugar: 1, emoji: '🏆', label: '1º lugar', categoria: 'Acertou o Placar e o Vencedor', pts: 5, pct: 40 },
  { lugar: 2, emoji: '🥈', label: '2º lugar', categoria: 'Acertou o Vencedor',            pts: 3, pct: 30 },
  { lugar: 3, emoji: '🥉', label: '3º lugar', categoria: 'Acertou o Placar',              pts: 2, pct: 20 },
]

interface Props {
  bolao?: BolaoEsporte
  onSaved: (b: BolaoEsporte) => void
  onCancel: () => void
}

export default function BolaoEsporteEditor({ bolao, onSaved, onCancel }: Props) {
  const isNew = !bolao?.id

  const [form, setForm] = useState<BolaoEsporte>(bolao ?? {
    slug: '', nome: '', descricao: '', competicao: '',
    logo_url: '', cor_primaria: '#FFB81C', header_desc: '',
    label_cta: '⚽ Quero Participar',
    label_palpites: '⚽ Seus palpites',
    label_jogo_hoje: '🔥 Jogo de hoje!',
    label_noticias: '📺 Notícias',
    valor_cota: 30, taxa_admin: 10, total_cotas: 10,
    premiacao: PREMIACAO_DEFAULT,
  })

  const [salvando, setSalvando] = useState(false)
  const [erro, setErro] = useState('')
  const [aba, setAba] = useState<'geral'|'visual'|'textos'|'premiacao'>('geral')

  function set(key: keyof BolaoEsporte, val: unknown) {
    setForm(f => ({ ...f, [key]: val }))
  }

  function setPremiacao(i: number, key: keyof PremiacaoItem, val: string | number) {
    const p = [...(form.premiacao || PREMIACAO_DEFAULT)]
    p[i] = { ...p[i], [key]: key === 'pts' || key === 'pct' || key === 'lugar' ? Number(val) : val }
    set('premiacao', p)
  }

  function addPremio() {
    const p = [...(form.premiacao || [])]
    const lugar = p.length + 1
    p.push({ lugar, emoji: '⭐', label: `${lugar}º Lugar`, categoria: '', pts: 0, pct: 0 })
    set('premiacao', p)
  }

  function removePremio(i: number) {
    const p = [...(form.premiacao || [])].filter((_, idx) => idx !== i)
    set('premiacao', p)
  }

  async function salvar() {
    if (!form.slug || !form.nome || !form.competicao) {
      setErro('Preencha slug, nome e competição.')
      return
    }
    setSalvando(true); setErro('')
    try {
      const method = isNew ? 'POST' : 'PATCH'
      const res = await fetch('/api/esporte/boloes', {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json()
      if (!res.ok) { setErro(data.error || 'Erro ao salvar'); return }
      onSaved(data.bolao)
    } catch { setErro('Erro de conexão') }
    finally { setSalvando(false) }
  }

  const abas = [
    { id: 'geral',     label: 'Geral'      },
    { id: 'visual',    label: 'Visual'     },
    { id: 'textos',    label: 'Textos'     },
    { id: 'premiacao', label: 'Premiação'  },
  ] as const

  return (
    <div className={styles.esporteEditorWrap}>
      <div className={styles.esporteEditorHeader}>
        <span className={styles.esporteEditorTitle}>
          {isNew ? '➕ Novo Bolão Esportivo' : `✏️ ${form.nome}`}
        </span>
        <button className={styles.esporteEditorClose} onClick={onCancel}>✕</button>
      </div>

      {/* Abas */}
      <div className={styles.esporteEditorTabs}>
        {abas.map(a => (
          <button
            key={a.id}
            className={`${styles.esporteEditorTab} ${aba === a.id ? styles.esporteEditorTabActive : ''}`}
            onClick={() => setAba(a.id)}
          >{a.label}</button>
        ))}
      </div>

      <div className={styles.esporteEditorBody}>

        {/* ── ABA GERAL ── */}
        {aba === 'geral' && (
          <div className={styles.esporteEditorGrid}>
            <label className={styles.esporteEditorLabel}>
              Slug (URL: /esporte/<strong>{form.slug || 'meu-bolao'}</strong>)
              <input className={styles.esporteEditorInput} value={form.slug}
                onChange={e => set('slug', e.target.value.toLowerCase().replace(/\s/g, '-'))}
                placeholder="ex: copa-2026" disabled={!isNew} />
            </label>
            <label className={styles.esporteEditorLabel}>
              Nome do bolão
              <input className={styles.esporteEditorInput} value={form.nome}
                onChange={e => set('nome', e.target.value)} placeholder="ex: Eliminatórias FIFA 2026" />
            </label>
            <label className={styles.esporteEditorLabel}>
              Nome da competição
              <input className={styles.esporteEditorInput} value={form.competicao}
                onChange={e => set('competicao', e.target.value)} placeholder="ex: UEFA Champions League 2025/26" />
            </label>
            <label className={styles.esporteEditorLabel}>
              Descrição (interna)
              <input className={styles.esporteEditorInput} value={form.descricao || ''}
                onChange={e => set('descricao', e.target.value)} placeholder="Descrição opcional" />
            </label>
            <div className={styles.esporteEditorRow3}>
              <label className={styles.esporteEditorLabel}>
                Valor da cota (R$)
                <input className={styles.esporteEditorInput} type="number" value={form.valor_cota}
                  onChange={e => set('valor_cota', Number(e.target.value))} />
              </label>
              <label className={styles.esporteEditorLabel}>
                Taxa admin (%)
                <input className={styles.esporteEditorInput} type="number" value={form.taxa_admin}
                  onChange={e => set('taxa_admin', Number(e.target.value))} />
              </label>
              <label className={styles.esporteEditorLabel}>
                Total de cotas
                <input className={styles.esporteEditorInput} type="number" value={form.total_cotas}
                  onChange={e => set('total_cotas', Number(e.target.value))} />
              </label>
            </div>
          </div>
        )}

        {/* ── ABA VISUAL ── */}
        {aba === 'visual' && (
          <div className={styles.esporteEditorGrid}>
            <label className={styles.esporteEditorLabel}>
              Logo / GIF da competição (URL ou caminho /public)
              <input className={styles.esporteEditorInput} value={form.logo_url || ''}
                onChange={e => set('logo_url', e.target.value)}
                placeholder="ex: /logos/premier.png ou https://..." />
            </label>
            {form.logo_url && (
              <div className={styles.esporteEditorPreview}>
                <img src={form.logo_url} alt="preview" style={{ height: 80, objectFit: 'contain' }} />
              </div>
            )}
            <label className={styles.esporteEditorLabel}>
              Cor principal da competição
              <div className={styles.esporteEditorColorRow}>
                <input type="color" value={form.cor_primaria || '#FFB81C'}
                  onChange={e => set('cor_primaria', e.target.value)}
                  className={styles.esporteEditorColorPicker} />
                <input className={styles.esporteEditorInput} value={form.cor_primaria || ''}
                  onChange={e => set('cor_primaria', e.target.value)} placeholder="#FFB81C" />
              </div>
            </label>
            <div className={styles.esporteEditorColorRef}>
              <span>Referências:</span>
              {[
                { nome: 'FIFA', cor: '#FFB81C' },
                { nome: 'Champions', cor: '#1A3A5C' },
                { nome: 'Premier', cor: '#3D195B' },
                { nome: 'Brasileirão', cor: '#009B3A' },
                { nome: 'Libertadores', cor: '#C8A84B' },
              ].map(c => (
                <button key={c.cor} className={styles.esporteEditorColorChip}
                  style={{ background: c.cor }}
                  onClick={() => set('cor_primaria', c.cor)}
                  title={c.nome}>{c.nome}</button>
              ))}
            </div>
          </div>
        )}

        {/* ── ABA TEXTOS ── */}
        {aba === 'textos' && (
          <div className={styles.esporteEditorGrid}>
            <label className={styles.esporteEditorLabel}>
              Subtítulo do banner
              <input className={styles.esporteEditorInput} value={form.header_desc || ''}
                onChange={e => set('header_desc', e.target.value)}
                placeholder="ex: Não é Mata-Mata! É Mata, perdeu acabou!" />
            </label>
            <label className={styles.esporteEditorLabel}>
              Label do botão CTA
              <input className={styles.esporteEditorInput} value={form.label_cta || ''}
                onChange={e => set('label_cta', e.target.value)}
                placeholder="ex: ⚽ Quero Participar" />
            </label>
            <label className={styles.esporteEditorLabel}>
              Label do card de palpites
              <input className={styles.esporteEditorInput} value={form.label_palpites || ''}
                onChange={e => set('label_palpites', e.target.value)}
                placeholder="ex: ⚽ Seus palpites" />
            </label>
            <label className={styles.esporteEditorLabel}>
              Badge &quot;Jogo de hoje&quot;
              <input className={styles.esporteEditorInput} value={form.label_jogo_hoje || ''}
                onChange={e => set('label_jogo_hoje', e.target.value)}
                placeholder="ex: 🔥 Jogo de hoje!" />
            </label>
            <label className={styles.esporteEditorLabel}>
              Título da seção de notícias
              <input className={styles.esporteEditorInput} value={form.label_noticias || ''}
                onChange={e => set('label_noticias', e.target.value)}
                placeholder="ex: 📺 CazéTV · Copa do Mundo FIFA 2026" />
            </label>
          </div>
        )}

        {/* ── ABA PREMIAÇÃO ── */}
        {aba === 'premiacao' && (
          <div className={styles.esporteEditorGrid}>
            <p className={styles.esporteEditorHint}>
              Configure os prêmios por colocação. &quot;% do prêmio&quot; divide o valor entre os acertadores daquele lugar. Total deve somar 100%.
            </p>
            {(form.premiacao || PREMIACAO_DEFAULT).map((item, i) => (
              <div key={i} className={styles.esportePremioRow}>
                <input className={`${styles.esporteEditorInput} ${styles.esportePremioEmoji}`}
                  value={item.emoji} onChange={e => setPremiacao(i, 'emoji', e.target.value)} />
                <input className={`${styles.esporteEditorInput} ${styles.esportePremioLabel}`}
                  value={item.label} onChange={e => setPremiacao(i, 'label', e.target.value)}
                  placeholder="1º Lugar" />
                <input className={`${styles.esporteEditorInput} ${styles.esportePremioCategoria}`}
                  value={item.categoria} onChange={e => setPremiacao(i, 'categoria', e.target.value)}
                  placeholder="Categoria" />
                <input className={`${styles.esporteEditorInput} ${styles.esportePremioPts}`}
                  type="number" value={item.pts} onChange={e => setPremiacao(i, 'pts', e.target.value)}
                  placeholder="Pts" title="Pontos" />
                <input className={`${styles.esporteEditorInput} ${styles.esportePremioPct}`}
                  type="number" value={item.pct} onChange={e => setPremiacao(i, 'pct', e.target.value)}
                  placeholder="%" title="% do prêmio" />
                <button className={styles.esportePremioRemove} onClick={() => removePremio(i)}>✕</button>
              </div>
            ))}
            <button className={styles.esporteEditorBtnSecundario} onClick={addPremio}>
              + Adicionar colocação
            </button>
          </div>
        )}
      </div>

      {erro && <div className={styles.esporteEditorErro}>{erro}</div>}

      <div className={styles.esporteEditorFooter}>
        <button className={styles.esporteEditorBtnSecundario} onClick={onCancel}>Cancelar</button>
        <button className={styles.esporteEditorBtnSalvar} onClick={salvar} disabled={salvando}>
          {salvando ? 'Salvando...' : isNew ? 'Criar Bolão' : 'Salvar Alterações'}
        </button>
      </div>
    </div>
  )
}
