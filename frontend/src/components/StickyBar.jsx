import { PRICE, CURRENCY, whatsappUrl } from '../site'

// Bottom sticky purchase bar; recolors with the mode.
export default function StickyBar({ isDay, onBuy }) {
  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 45,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '14px',
        padding: '12px 22px',
        backdropFilter: 'blur(12px)',
        background: isDay
          ? 'linear-gradient(90deg,rgba(255,138,61,.96),rgba(255,106,31,.96))'
          : 'linear-gradient(90deg,rgba(58,35,120,.96),rgba(124,92,224,.96))',
        boxShadow: '0 -8px 26px rgba(0,0,0,.22)',
        transition: 'background .5s ease',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontFamily: "'DM Serif Display',serif", fontSize: '22px', color: '#fff' }}>{PRICE}</span>
        <span style={{ color: 'rgba(255,255,255,.8)', fontWeight: 800, fontSize: '12px' }}>
          {CURRENCY} · combo Día + Noche
        </span>
      </div>
      <div style={{ display: 'flex', gap: '10px' }}>
        <button
          onClick={onBuy}
          style={{ background: '#fff', color: '#2A1836', fontWeight: 900, fontSize: '14px', padding: '11px 20px', border: 'none', borderRadius: '100px', cursor: 'pointer', whiteSpace: 'nowrap' }}
        >
          🛒 Comprar
        </button>
        <a
          href={whatsappUrl()}
          target="_blank"
          rel="noreferrer"
          style={{ display: 'flex', alignItems: 'center', gap: '7px', background: '#25D366', color: '#fff', fontWeight: 900, fontSize: '14px', padding: '11px 18px', borderRadius: '100px', whiteSpace: 'nowrap' }}
        >
          WhatsApp
        </a>
      </div>
    </div>
  )
}
