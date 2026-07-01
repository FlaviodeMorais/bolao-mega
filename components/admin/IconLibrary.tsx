'use client'
import { useState } from 'react'
import styles from '@/app/admin/admin.module.css'
import { COMPETICOES } from '@/lib/competicoes'
import { TIMES_BRASILEIRAO, logoPath } from '@/lib/times-esporte'

const FEDERACOES = [
  { id: 'fifa',     label: 'FIFA',     logo: '/WC26_Logo.png',               cor: '#FFB81C' },
  { id: 'cbf',      label: 'CBF',      logo: '/logos/federacoes/cbf.png',    cor: '#009B3A' },
  { id: 'conmebol', label: 'CONMEBOL', logo: '/logos/competicoes/libertadores.png', cor: '#003087' },
  { id: 'uefa',     label: 'UEFA',     logo: '/logos/competicoes/champions.png',    cor: '#003399' },
]

function IconCard({ label, logo, flag, cor, size = 48 }: { label: string; logo?: string; flag?: string; cor?: string; size?: number }) {
  const [copied, setCopied] = useState(false)
  function copiar() {
    const txt = logo ? `logo: '${logo}'` : flag ? `flag: '${flag}'` : ''
    navigator.clipboard.writeText(txt).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) })
  }
  return (
    <div className={styles.iconCard} onClick={copiar} title={`Copiar referência de "${label}"`}>
      <div className={styles.iconCardImg} style={{ borderColor: cor || '#E2E8F0' }}>
        {logo
          ? <img src={logo} alt={label} style={{ width: size, height: size, objectFit: 'contain' }} />
          : flag
            ? <span className={`fi fi-${flag}`} style={{ fontSize: size * 0.7, display: 'block', borderRadius: 4 }} />
            : <span style={{ fontSize: size * 0.5, display: 'block' }}>?</span>
        }
      </div>
      <span className={styles.iconCardLabel}>{copied ? '✓ Copiado!' : label}</span>
    </div>
  )
}

function ShieldCard({ time }: { time: typeof TIMES_BRASILEIRAO[0] }) {
  const [copied, setCopied] = useState(false)
  function copiar() {
    navigator.clipboard.writeText(time.id).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500) })
  }
  return (
    <div className={styles.iconCard} onClick={copiar} title={`ID: ${time.id}`}>
      <div className={styles.iconCardImg} style={{ borderColor: time.cor1 }}>
        <img src={logoPath(time.id)} alt={time.nome} style={{ width: 44, height: 44, objectFit: 'contain' }} />
      </div>
      <span className={styles.iconCardLabel}>{copied ? '✓ Copiado!' : time.abrev}</span>
      <span className={styles.iconCardSub}>{time.nome}</span>
    </div>
  )
}

export default function IconLibrary() {
  const [aberta, setAberta] = useState(false)
  const [busca, setBusca] = useState('')

  const timesFiltrados = busca
    ? TIMES_BRASILEIRAO.filter(t => t.nome.toLowerCase().includes(busca.toLowerCase()) || t.abrev.toLowerCase().includes(busca.toLowerCase()))
    : TIMES_BRASILEIRAO

  return (
    <div className={styles.panel}>
      <div className={styles.histHeader}>
        <div>
          <div className={styles.panelTitle}>🎨 Biblioteca de Ícones</div>
          <div className={styles.histSubtitle}>Competições, federações e clubes — clique para copiar a referência</div>
        </div>
        <button type="button" className={styles.btnAcao} onClick={() => setAberta(a => !a)}>
          {aberta ? 'Fechar' : 'Abrir'}
        </button>
      </div>

      {aberta && (
        <div className={styles.iconLibWrap}>

          {/* Federações */}
          <div className={styles.iconSection}>
            <div className={styles.iconSectionTitle}>🏛️ Federações</div>
            <div className={styles.iconGrid}>
              {FEDERACOES.map(f => (
                <IconCard key={f.id} label={f.label} logo={f.logo} cor={f.cor} />
              ))}
            </div>
          </div>

          {/* Competições internacionais */}
          <div className={styles.iconSection}>
            <div className={styles.iconSectionTitle}>🌍 Competições Internacionais</div>
            <div className={styles.iconGrid}>
              {COMPETICOES.filter(c => !['brasileirao-26','brasileirao-b-26','copa-brasil-26','carioca-26','paulista-26','mineiro-26','gaucho-26','outro'].includes(c.id)).map(c => (
                <IconCard key={c.id} label={c.label} logo={c.logo} flag={c.flag} cor={c.cor} />
              ))}
            </div>
          </div>

          {/* Competições brasileiras */}
          <div className={styles.iconSection}>
            <div className={styles.iconSectionTitle}>🇧🇷 Competições Brasileiras</div>
            <div className={styles.iconGrid}>
              {COMPETICOES.filter(c => ['brasileirao-26','brasileirao-b-26','copa-brasil-26','carioca-26','paulista-26','mineiro-26','gaucho-26'].includes(c.id)).map(c => (
                <IconCard key={c.id} label={c.label} logo={c.logo} flag={c.flag} cor={c.cor} />
              ))}
            </div>
          </div>

          {/* Bandeiras de países */}
          <div className={styles.iconSection}>
            <div className={styles.iconSectionTitle}>🏳️ Bandeiras de Países</div>
            <div className={styles.iconGrid}>
              {[
                { code: 'br', nome: 'Brasil' },       { code: 'ar', nome: 'Argentina' },
                { code: 'uy', nome: 'Uruguai' },      { code: 'co', nome: 'Colômbia' },
                { code: 'cl', nome: 'Chile' },         { code: 'py', nome: 'Paraguai' },
                { code: 'pe', nome: 'Peru' },          { code: 'ec', nome: 'Equador' },
                { code: 'de', nome: 'Alemanha' },      { code: 'fr', nome: 'França' },
                { code: 'es', nome: 'Espanha' },       { code: 'pt', nome: 'Portugal' },
                { code: 'gb-eng', nome: 'Inglaterra' },{ code: 'it', nome: 'Itália' },
                { code: 'nl', nome: 'Holanda' },       { code: 'us', nome: 'EUA' },
                { code: 'mx', nome: 'México' },        { code: 'jp', nome: 'Japão' },
                { code: 'kr', nome: 'Coreia do Sul' }, { code: 'ma', nome: 'Marrocos' },
              ].map(p => (
                <IconCard key={p.code} label={p.nome} flag={p.code} size={36} />
              ))}
            </div>
          </div>

          {/* Escudos de clubes */}
          <div className={styles.iconSection}>
            <div className={styles.iconSectionTitle}>⚽ Clubes — Brasileirão Série A 2026</div>
            <div className={styles.iconNote}>
              ℹ️ Escudos gerados com as cores oficiais de cada clube. Para logos oficiais, adicione o arquivo em <code>/public/logos/times/[id].png</code>
            </div>
            <input
              className={styles.configInput}
              placeholder="Buscar clube…"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              style={{ marginBottom: 12, maxWidth: 300 }}
            />
            <div className={styles.iconGrid}>
              {timesFiltrados.map(t => <ShieldCard key={t.id} time={t} />)}
            </div>
          </div>

        </div>
      )}
    </div>
  )
}
