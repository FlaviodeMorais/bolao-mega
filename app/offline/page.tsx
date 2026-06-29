export default function OfflinePage() {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      background: '#0D1B2A', color: '#fff', fontFamily: 'sans-serif', gap: 16,
    }}>
      <div style={{ fontSize: 48 }}>📡</div>
      <h1 style={{ margin: 0, fontSize: 24 }}>Sem conexão</h1>
      <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)' }}>
        Verifique sua internet e tente novamente.
      </p>
    </div>
  )
}
