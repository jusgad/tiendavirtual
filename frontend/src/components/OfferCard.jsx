import { PRICE, CURRENCY, whatsappUrl } from '../site'
import ImageSlot from './ImageSlot'

const sealMascot = '/images/logo.jpeg'

// Glass offer card with price, buy + WhatsApp buttons, trust seal and socials.
export default function OfferCard({ isDay, onBuy }) {
  return (
    <section className="offer-section" style={{ position: 'relative', zIndex: 20, maxWidth: '960px', margin: '0 auto', padding: '0 30px 60px' }}>
      <div
        className="offer-grid"
        style={{
          background: 'rgba(255,255,255,.9)',
          backdropFilter: 'blur(14px)',
          borderRadius: '28px',
          padding: '34px 36px',
          boxShadow: '0 24px 60px rgba(40,20,60,.25)',
          display: 'grid',
          gridTemplateColumns: '1.3fr 1fr',
          gap: '34px',
          alignItems: 'center',
        }}
      >
        <div>
          <div style={{ display: 'inline-block', padding: '5px 13px', borderRadius: '100px', background: '#FFEBD6', color: '#C24E0A', fontWeight: 900, fontSize: '11px', letterSpacing: '.1em', marginBottom: '12px' }}>
            OFERTA ESPECIAL POR LAS DOS CREMAS
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
            <span style={{ fontFamily: "'DM Serif Display',serif", fontSize: '52px', color: '#2A1836' }}>{PRICE}</span>
            <span style={{ fontWeight: 800, color: '#8A7A95', fontSize: '16px' }}>{CURRENCY}</span>
          </div>
          <p style={{ color: '#5B4A66', fontWeight: 700, fontSize: '15px', marginTop: '8px', lineHeight: 1.5 }}>
            Incluye: <span style={{ color: '#C24E0A' }}>DÍA</span> Crema íntima 50 ml +{' '}
            <span style={{ color: '#6A45C8' }}>NOCHE</span> Crema íntima blanqueadora 50 ml
          </p>
          <div style={{ display: 'flex', gap: '16px', marginTop: '14px', flexWrap: 'wrap' }}>
            <Trust>🔒 Pago seguro</Trust>
            <Trust>🚚 Envío a todo el país</Trust>
            <Trust>🍑 Fórmula suave</Trust>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button
            onClick={onBuy}
            style={{
              border: 'none',
              cursor: 'pointer',
              color: '#fff',
              fontWeight: 900,
              fontSize: '16px',
              padding: '16px',
              borderRadius: '100px',
              background: isDay
                ? 'linear-gradient(90deg,#FF8A3D,#FF6A1F)'
                : 'linear-gradient(90deg,#7C5CE0,#B98CFF)',
              boxShadow: isDay
                ? '0 10px 24px rgba(255,120,40,.42)'
                : '0 10px 24px rgba(124,92,224,.48)',
              transition: 'background .5s ease, box-shadow .5s ease',
            }}
          >
            🛒 COMPRAR AHORA
          </button>
          <a
            href={whatsappUrl()}
            target="_blank"
            rel="noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              background: '#25D366',
              color: '#fff',
              fontWeight: 900,
              fontSize: '16px',
              padding: '16px',
              borderRadius: '100px',
              boxShadow: '0 10px 24px rgba(37,211,102,.4)',
            }}
          >
            <WhatsAppIcon />
            COMPRAR POR WHATSAPP
          </a>
          <p style={{ textAlign: 'center', color: '#9587A0', fontWeight: 700, fontSize: '12px', margin: 0 }}>
            Respuesta inmediata por WhatsApp
          </p>
        </div>
      </div>

      {/* trust seal + socials */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '20px', marginTop: '26px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ width: '64px', height: '64px', flex: 'none' }}>
            <ImageSlot src={sealMascot} shape="circle" placeholder="Mascota 🇨🇴" />
          </div>
          <div style={{ color: isDay ? '#5A2E12' : '#2A1836' }}>
            <div style={{ fontFamily: "'DM Serif Display',serif", fontSize: '18px' }}>Hecho con amor en Colombia 🇨🇴</div>
            <div style={{ fontWeight: 700, fontSize: '13px', opacity: 0.75 }}>Marca colombiana · Pao Díaz</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Social label="Instagram" isDay={isDay}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="1.2" fill="currentColor" stroke="none" /></svg>
          </Social>
          <Social label="TikTok" isDay={isDay}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 3c.3 2 1.6 3.6 3.5 3.9v2.6c-1.3 0-2.5-.4-3.5-1v5.9c0 3-2.4 5.4-5.4 5.4S5.7 17.4 5.7 14.4s2.4-5.4 5.4-5.4c.3 0 .6 0 .9.1v2.7c-.3-.1-.6-.2-.9-.2-1.5 0-2.7 1.2-2.7 2.8s1.2 2.7 2.7 2.7 2.7-1.2 2.7-2.7V3h2.7z" /></svg>
          </Social>
          <Social label="Facebook" isDay={isDay}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M14 8.5V7c0-.8.2-1.2 1.3-1.2H17V3h-2.6c-2.7 0-3.8 1.4-3.8 3.6v1.9H8.5V11H10.6v9h3.4v-9h2.3l.4-2.5H14z" /></svg>
          </Social>
        </div>
      </div>
    </section>
  )
}

function Trust({ children }) {
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#6B5A76', fontWeight: 700, fontSize: '13px' }}>
      {children}
    </span>
  )
}

function Social({ label, isDay, children }) {
  return (
    <a
      href="#"
      aria-label={label}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '40px',
        height: '40px',
        borderRadius: '50%',
        background: isDay ? 'rgba(255,255,255,.6)' : 'rgba(255,255,255,.85)',
        color: isDay ? '#B5470C' : '#4A2C90',
        transition: 'all .5s ease',
      }}
    >
      {children}
    </a>
  )
}

function WhatsAppIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="#fff">
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.79 3.08 1.21 4.79 1.21 5.46 0 9.91-4.45 9.91-9.91C21.95 6.45 17.5 2 12.04 2zm5.8 14.03c-.24.68-1.2 1.26-1.98 1.42-.53.11-1.22.2-3.56-.76-2.99-1.24-4.91-4.27-5.06-4.47-.15-.2-1.22-1.62-1.22-3.09s.77-2.19 1.05-2.49c.28-.3.61-.37.81-.37.2 0 .41 0 .58.01.19.01.44-.07.68.52.24.6.83 2.07.9 2.22.07.15.12.32.02.52-.1.2-.15.32-.3.5-.15.18-.32.4-.45.53-.15.15-.31.32-.13.62.18.3.79 1.3 1.69 2.11 1.16 1.03 2.14 1.35 2.44 1.5.3.15.47.13.65-.08.18-.2.75-.87.95-1.17.2-.3.4-.25.68-.15.28.1 1.76.83 2.06.98.3.15.5.22.57.35.07.12.07.72-.17 1.4z" />
    </svg>
  )
}
