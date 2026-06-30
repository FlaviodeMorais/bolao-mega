'use client'

import styles from '@/app/admin/admin.module.css'
import { Field, type TabProps } from './shared'

interface Props extends TabProps {
  home: { titulo?: string; link_stats?: string; rodape?: string; msg_sem_bolao?: string }
}

export default function HomeTab({ home, updateNs, salvar, saving }: Props) {
  return (
    <div className={styles.settingsGrid}>
      <Field label="Título da página"     name="titulo"        value={home.titulo        ?? ''} onChange={v => updateNs('paginas.home','titulo',v)}        placeholder="🎰 Escolha seu Bolão" />
      <Field label="Link de estatísticas"  name="link_stats"    value={home.link_stats    ?? ''} onChange={v => updateNs('paginas.home','link_stats',v)}    placeholder="📊 Análises & Estatísticas" />
      <Field label="Rodapé"                name="rodape"        value={home.rodape        ?? ''} onChange={v => updateNs('paginas.home','rodape',v)}        placeholder="Boa sorte a todos! 🍀" />
      <Field label="Mensagem sem bolão ativo" name="msg_sem_bolao" value={home.msg_sem_bolao ?? ''} onChange={v => updateNs('paginas.home','msg_sem_bolao',v)} placeholder="Nenhum bolão disponível no momento" />
      <button type="button" className={styles.settingsSave} onClick={() => salvar('paginas.home')} disabled={saving}>
        {saving ? 'Salvando...' : '💾 Salvar Home'}
      </button>
    </div>
  )
}
