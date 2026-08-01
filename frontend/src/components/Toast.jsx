// Transient "added to cart" confirmation.
export default function Toast({ show }) {
  if (!show) return null
  return (
    <div
      style={{
        position: 'fixed',
        left: '50%',
        bottom: '96px',
        zIndex: 60,
        background: '#2A1836',
        color: '#fff',
        fontWeight: 800,
        fontSize: '14px',
        padding: '13px 22px',
        borderRadius: '100px',
        boxShadow: '0 14px 34px rgba(0,0,0,.3)',
        animation: 'toastIn .35s ease',
        display: 'flex',
        alignItems: 'center',
        gap: '9px',
      }}
    >
      🛒 ¡Combo añadido al carrito!
    </div>
  )
}
