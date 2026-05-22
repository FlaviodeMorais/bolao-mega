import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'

export interface ApostaData {
  numerosConcurso: string
  concursoNumero: string
  dataAposte?: string
  nomeParticipante: string
  cpfParticipante?: string
  valorAposta?: number
  localVenda?: string
  observacao?: string
}

/**
 * Valida se os números inseridos são válidos para Mega-Sena (6 números de 1-60)
 */
export function validarNumerosMegaSena(numeros: number[]): boolean {
  if (numeros.length !== 6) return false
  return numeros.every(n => n >= 1 && n <= 60 && Number.isInteger(n))
}

/**
 * Formata números para display com zeros à esquerda
 */
export function formatarNumero(n: number): string {
  return String(n).padStart(2, '0')
}

/**
 * Gera PDF do comprovante
 */
export async function gerarPDF(elementId: string, nomeArquivo: string = 'comprovante.pdf') {
  try {
    const element = document.getElementById(elementId)
    if (!element) throw new Error('Elemento não encontrado')

    // Usa html2canvas para capturar o elemento
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    })

    // Dimensões do PDF (A4)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    })

    const imgWidth = 210 // A4 width in mm
    const pageHeight = 297 // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    let heightLeft = imgHeight

    let position = 0

    // Adiciona imagens ao PDF (suporta múltiplas páginas se necessário)
    const imgData = canvas.toDataURL('image/png')
    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight

    while (heightLeft >= 0) {
      position = heightLeft - imgHeight
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
    }

    pdf.save(nomeArquivo)
  } catch (error) {
    console.error('Erro ao gerar PDF:', error)
    throw error
  }
}

/**
 * Abre diálogo de impressão
 */
export function imprimirComprovante(elementId: string) {
  const element = document.getElementById(elementId)
  if (!element) return

  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    alert('Por favor, permita pop-ups para imprimir')
    return
  }

  const styles = `
    <style>
      * {
        margin: 0;
        padding: 0;
        box-sizing: border-box;
      }

      body {
        font-family: 'Plus Jakarta Sans', Arial, sans-serif;
        background: white;
        padding: 20px;
      }

      @media print {
        body {
          padding: 0;
        }
      }
    </style>
  `

  printWindow.document.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Comprovante de Aposta</title>
        ${styles}
      </head>
      <body>
        ${element.innerHTML}
      </body>
    </html>
  `)

  printWindow.document.close()
  printWindow.focus()

  setTimeout(() => {
    printWindow.print()
  }, 250)
}
