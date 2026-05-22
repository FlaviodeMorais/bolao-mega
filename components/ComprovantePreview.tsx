'use client'

import { formatarNumero } from '@/lib/comprovante'
import styles from '@/app/comprovante/comprovante.module.css'
import { ComprovanteDataForm } from './ComprovanteForm'

interface ComprovantePreviewProps {
  dados?: ComprovanteDataForm
}

export default function ComprovantePreview({ dados }: ComprovantePreviewProps) {
  if (!dados || dados.numeros.length === 0) {
    return (
      <div className={styles.previewSection}>
        <div className={styles.previewCard}>
          <p className={styles.previewLabel}>Visualização</p>
          <div className={styles.aviso}>
            Preencha o formulário e selecione 6 números para ver a visualização do comprovante
          </div>
        </div>
      </div>
    )
  }

  const dataFormatada = new Date(dados.dataAposte).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })

  return (
    <div className={styles.previewSection}>
      <div className={styles.previewCard}>
        <p className={styles.previewLabel}>Visualização</p>

        {/* Comprovante */}
        <div id="comprovante-preview" className={styles.comprovante}>
          {/* Header */}
          <div className={styles.comproHeader}>
            <div className={styles.comproLogo}>🍀</div>
            <div className={styles.comproLogoTexto}>MEGA-SENA</div>
            <div className={styles.comproSubtexto}>Comprovante de Aposta</div>
            <div style={{ fontSize: '0.7rem', color: 'var(--gray-500)', marginTop: 'var(--s2)' }}>
              Concurso #{dados.concursoNumero}
            </div>
          </div>

          {/* Bloco de Números */}
          <div className={styles.comproBloco}>
            <div className={styles.comproTituloBloco}>Seus Números</div>
            <div className={styles.comproNumeros}>
              {dados.numeros.map(num => (
                <div key={num} className={styles.comproNumero}>
                  {formatarNumero(num)}
                </div>
              ))}
            </div>
          </div>

          {/* Informações */}
          <div className={styles.comproInfo}>
            <div className={styles.comproInfoRow}>
              <span className={styles.comproInfoLabel}>Participante:</span>
              <span className={styles.comproInfoValor}>{dados.nomeParticipante}</span>
            </div>

            {dados.cpfParticipante && (
              <div className={styles.comproInfoRow}>
                <span className={styles.comproInfoLabel}>CPF:</span>
                <span className={styles.comproInfoValor}>{dados.cpfParticipante}</span>
              </div>
            )}

            <div className={styles.comproInfoRow}>
              <span className={styles.comproInfoLabel}>Data:</span>
              <span className={styles.comproInfoValor}>{dataFormatada}</span>
            </div>

            {dados.valorAposta > 0 && (
              <div className={styles.comproInfoRow}>
                <span className={styles.comproInfoLabel}>Valor:</span>
                <span className={styles.comproInfoValor}>
                  R$ {dados.valorAposta.toFixed(2).replace('.', ',')}
                </span>
              </div>
            )}

            <div className={styles.comproInfoRow}>
              <span className={styles.comproInfoLabel}>Local:</span>
              <span className={styles.comproInfoValor}>{dados.localVenda}</span>
            </div>
          </div>

          {/* Observações */}
          {dados.observacao && (
            <div style={{ marginBottom: 'var(--s4)', fontSize: '0.85rem' }}>
              <div style={{ fontWeight: 600, color: 'var(--caixa-blue)', marginBottom: 'var(--s2)' }}>
                OBSERVAÇÕES
              </div>
              <div style={{ color: 'var(--navy)', lineHeight: 1.5 }}>
                {dados.observacao}
              </div>
            </div>
          )}

          {/* Rodapé */}
          <div className={styles.comproFooter}>
            <div className={styles.comproFooterText}>
              Comprovante de Aposta Bolão Mega
            </div>
            <div className={styles.comproFooterText}>
              Emitido em {dataFormatada} às {new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
            </div>
            <div className={styles.comproFooterAviso}>
              ⚠️ Este comprovante é válido para fins de controle e registro.
              Consulte a Caixa Econômica Federal para informações oficiais sobre sorteios.
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
