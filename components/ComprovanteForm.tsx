'use client'

import { useState } from 'react'
import styles from '@/app/comprovante/comprovante.module.css'
import { validarNumerosMegaSena, formatarNumero, gerarPDF, imprimirComprovante } from '@/lib/comprovante'

interface ComprovanteFormProps {
  onDadosChange: (dados: ComprovanteDataForm) => void
}

export interface ComprovanteDataForm {
  numeros: number[]
  nomeParticipante: string
  cpfParticipante: string
  concursoNumero: string
  dataAposte: string
  valorAposta: number
  localVenda: string
  observacao: string
}

const NUMEROS_MEGA_SENA = Array.from({ length: 60 }, (_, i) => i + 1)

export default function ComprovanteForm({ onDadosChange }: ComprovanteFormProps) {
  const [numeros, setNumeros] = useState<number[]>([])
  const [nomeParticipante, setNomeParticipante] = useState('')
  const [cpfParticipante, setCpfParticipante] = useState('')
  const [concursoNumero, setConcursoNumero] = useState('')
  const [dataAposte, setDataAposte] = useState(new Date().toISOString().split('T')[0])
  const [valorAposta, setValorAposta] = useState('')
  const [localVenda, setLocalVenda] = useState('BOLÃO MEGA')
  const [observacao, setObservacao] = useState('')
  const [erro, setErro] = useState('')


  const toggleNumero = (num: number) => {
    if (numeros.includes(num)) {
      setNumeros(numeros.filter(n => n !== num))
    } else if (numeros.length < 6) {
      setNumeros(prev => [...prev, num].sort((a, b) => a - b))
    }
  }

  const removerNumero = (num: number) => {
    setNumeros(numeros.filter(n => n !== num))
  }

  const limparNumeros = () => {
    setNumeros([])
  }

  const gerarApostaSorteada = () => {
    const novosNumeros: number[] = []
    while (novosNumeros.length < 6) {
      const num = Math.floor(Math.random() * 60) + 1
      if (!novosNumeros.includes(num)) {
        novosNumeros.push(num)
      }
    }
    setNumeros(novosNumeros.sort((a, b) => a - b))
  }

  const handleSubmit = () => {
    setErro('')

    if (!validarNumerosMegaSena(numeros)) {
      setErro('Selecione exatamente 6 números diferentes de 1 a 60')
      return
    }

    if (!nomeParticipante.trim()) {
      setErro('Nome do participante é obrigatório')
      return
    }

    if (!concursoNumero.trim()) {
      setErro('Número do concurso é obrigatório')
      return
    }

    const dados: ComprovanteDataForm = {
      numeros,
      nomeParticipante: nomeParticipante.trim(),
      cpfParticipante: cpfParticipante.trim(),
      concursoNumero: concursoNumero.trim(),
      dataAposte,
      valorAposta: valorAposta ? parseFloat(valorAposta) : 0,
      localVenda: localVenda.trim() || 'BOLÃO MEGA',
      observacao: observacao.trim(),
    }

    onDadosChange(dados)
  }

  const handleImprimir = () => {
    if (!validarNumerosMegaSena(numeros)) {
      setErro('Selecione exatamente 6 números para imprimir')
      return
    }
    imprimirComprovante('comprovante-preview')
  }

  const handleGerarPDF = async () => {
    if (!validarNumerosMegaSena(numeros)) {
      setErro('Selecione exatamente 6 números para exportar')
      return
    }
    try {
      await gerarPDF('comprovante-preview', `comprovante-${concursoNumero || 'aposta'}.pdf`)
    } catch (error) {
      setErro('Erro ao gerar PDF. Tente novamente.')
    }
  }

  return (
    <div className={styles.container}>
      {/* FORMULÁRIO */}
      <div className={styles.formularioSection}>
        <div className={styles.formularioCard}>
          <h1 className={styles.titulo}>Comprovante de Aposta</h1>
          <p className={styles.subtitulo}>Preencha o formulário e selecione seus números</p>

          {erro && <div className={styles.erro}>{erro}</div>}

          <form className={styles.formulario} onSubmit={e => { e.preventDefault(); handleSubmit() }}>
            {/* Informações Básicas */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s4)' }}>
              <div className={styles.grupo}>
                <label htmlFor="nome" className={styles.label}>Nome do Participante</label>
                <input
                  id="nome"
                  type="text"
                  className={styles.input}
                  value={nomeParticipante}
                  onChange={e => setNomeParticipante(e.target.value)}
                  placeholder="Seu nome completo"
                />
              </div>

              <div className={styles.grupo}>
                <label htmlFor="cpf" className={styles.label}>CPF (opcional)</label>
                <input
                  id="cpf"
                  type="text"
                  className={styles.input}
                  value={cpfParticipante}
                  onChange={e => setCpfParticipante(e.target.value)}
                  placeholder="000.000.000-00"
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s4)' }}>
              <div className={styles.grupo}>
                <label htmlFor="concurso" className={styles.label}>Nº do Concurso</label>
                <input
                  id="concurso"
                  type="text"
                  className={styles.input}
                  value={concursoNumero}
                  onChange={e => setConcursoNumero(e.target.value)}
                  placeholder="Ex: 2750"
                />
              </div>

              <div className={styles.grupo}>
                <label htmlFor="data" className={styles.label}>Data da Aposta</label>
                <input
                  id="data"
                  type="date"
                  className={styles.input}
                  value={dataAposte}
                  onChange={e => setDataAposte(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--s4)' }}>
              <div className={styles.grupo}>
                <label htmlFor="valor" className={styles.label}>Valor da Aposta (R$)</label>
                <input
                  id="valor"
                  type="number"
                  step="0.01"
                  className={styles.input}
                  value={valorAposta}
                  onChange={e => setValorAposta(e.target.value)}
                  placeholder="0,00"
                />
              </div>

              <div className={styles.grupo}>
                <label htmlFor="local" className={styles.label}>Local de Venda</label>
                <input
                  id="local"
                  type="text"
                  className={styles.input}
                  value={localVenda}
                  onChange={e => setLocalVenda(e.target.value)}
                  placeholder="BOLÃO MEGA"
                />
              </div>
            </div>

            <div className={styles.grupo}>
              <label htmlFor="obs" className={styles.label}>Observações (opcional)</label>
              <textarea
                id="obs"
                className={styles.input}
                value={observacao}
                onChange={e => setObservacao(e.target.value)}
                placeholder="Adicione notas extras..."
                style={{ minHeight: '80px', fontFamily: 'var(--f-sans)', resize: 'vertical' }}
              />
            </div>

            {/* Seleção de Números */}
            <div>
              <label className={styles.numerosSelecionadosLabel}>
                Números Selecionados ({numeros.length}/6)
              </label>
              <div className={styles.numerosSelecionados}>
                {numeros.length === 0 ? (
                  <span style={{ color: 'var(--gray-400)', fontSize: '0.875rem' }}>
                    Selecione 6 números abaixo
                  </span>
                ) : (
                  numeros.map(num => (
                    <div key={num} className={styles.numeroBadge}>
                      {formatarNumero(num)}
                      <button type="button" onClick={() => removerNumero(num)}>
                        ✕
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Grade de Números */}
            <div>
              <div className={styles.gradeNumeros}>
                {NUMEROS_MEGA_SENA.map(num => (
                  <button
                    key={num}
                    type="button"
                    className={`${styles.botaoNumero} ${numeros.includes(num) ? styles.selecionado : ''}`}
                    onClick={() => toggleNumero(num)}
                    disabled={numeros.length === 6 && !numeros.includes(num)}
                  >
                    {formatarNumero(num)}
                  </button>
                ))}
              </div>
            </div>

            {/* Ações */}
            <div className={styles.acoesForm}>
              <button
                type="button"
                className={styles.botaoSecundario}
                onClick={gerarApostaSorteada}
              >
                🎲 Aleatória
              </button>
              <button
                type="button"
                className={styles.botaoSecundario}
                onClick={limparNumeros}
              >
                🗑️ Limpar
              </button>
              <button
                type="submit"
                className={styles.botaoPrincipal}
              >
                ✓ Confirmar
              </button>
            </div>

            {/* Botões de Print/PDF */}
            {numeros.length === 6 && (
              <div style={{ display: 'flex', gap: 'var(--s3)', marginTop: 'var(--s4)' }}>
                <button
                  type="button"
                  className={styles.botaoImprimir}
                  onClick={handleImprimir}
                  style={{ flex: 1 }}
                >
                  🖨️ Imprimir
                </button>
                <button
                  type="button"
                  className={styles.botaoGerarPDF}
                  onClick={handleGerarPDF}
                  style={{ flex: 1 }}
                >
                  📄 Gerar PDF
                </button>
              </div>
            )}
          </form>
        </div>
      </div>

    </div>
  )
}
