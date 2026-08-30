// Columna derecha del hero: píldora pulsante que lleva al checkout.
//
// Antes abría WhatsApp, igual que los otros dos botones de la landing. Se
// cambió a la compra en el sitio: es la que registra el pedido, descuenta
// inventario y lo hace visible en el panel.
export default function FloatingCta({ isDay, onBuy }) {
  const ctaTop = isDay ? 'CREMA ÍNTIMA' : 'CREMA ÍNTIMA BLANQUEADORA'

  return (
    <div style={{ display: 'flex', justifyContent: 'center' }}>
      <button
        onClick={onBuy}
        type="button"
        style={{
          border: 'none',
          font: 'inherit',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          maxWidth: '190px',
          padding: '20px 22px',
          borderRadius: '100px',
          textAlign: 'center',
          color: '#fff',
          cursor: 'pointer',
          background: isDay
            ? 'linear-gradient(135deg,#FF9E4D,#FF6A1F)'
            : 'linear-gradient(135deg,#B98CFF,#7C5CE0)',
          boxShadow: isDay
            ? '0 14px 34px rgba(255,110,40,.5)'
            : '0 14px 34px rgba(124,92,224,.55)',
          transition: 'background .5s ease, box-shadow .5s ease, transform .25s ease',
        }}
      >
        <span
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '100px',
            boxShadow: isDay
              ? '0 0 0 3px rgba(255,138,61,.5)'
              : '0 0 0 3px rgba(185,140,255,.5)',
            animation: 'ringPulse 1.8s ease-out infinite',
          }}
        />
        <span style={{ fontWeight: 900, fontSize: '13px', letterSpacing: '.04em', lineHeight: 1.35, textAlign: 'center' }}>
          {ctaTop}
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '7px', fontWeight: 900, fontSize: '13px', marginTop: '8px' }}>
          CLIC AQUÍ <span style={{ display: 'inline-block', animation: 'bobArrow 1.1s ease-in-out infinite' }}>→</span>
        </span>
      </button>
    </div>
  )
}
