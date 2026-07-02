'use client'

export function ShareButton({ nome, concurso, cotas, id, bolaoNome = 'Bolão' }: { nome: string; concurso: string; cotas: number; id: string; bolaoNome?: string }) {
  function compartilhar() {
    const url = `${window.location.origin}/p/${id}`
    const text = `🍀 Estou no ${bolaoNome}!\nConcurso #${concurso} com ${cotas} cota${cotas !== 1 ? 's' : ''}.\nVeja meu comprovante: ${url}`
    if (navigator.share) {
      navigator.share({ title: bolaoNome, text, url })
    } else {
      navigator.clipboard.writeText(text).then(() => alert('Link copiado! Cole no WhatsApp.'))
    }
  }

  return (
    <button className="btn" style={{ marginTop: 16 }} onClick={compartilhar}>
      📤 Compartilhar no WhatsApp
    </button>
  )
}
