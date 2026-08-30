// Corner sun/moon button that toggles the theme. The sun has animated rays and
// a smiley face; the moon has craters and floating "z"s. Both crossfade.

const T = 'opacity .5s ease, transform .55s cubic-bezier(.34,1.56,.64,1)'

// Geometría de los rayos. El disco del sol mide 64px (radio 32) y está
// centrado en la caja de 120px, o sea en (60, 60).
//
// Cada rayo se coloca por debajo del centro y gira alrededor de él: para eso
// su `transformOrigin` tiene que caer justo en el centro del disco, que está
// RADIO_INTERNO píxeles por encima del borde superior del rayo. De ahí el
// valor negativo: el origen queda fuera de la propia caja del rayo, sobre el
// centro del sol.
const RADIO_INTERNO = 36 // 32 del disco + 4 de aire, para que no lo toquen
const ALTO_RAYO = 15

export default function SunMoon({ isDay, onToggle }) {
  const rays = Array.from({ length: 12 }, (_, i) => ({
    '--r': `${i * 30}deg`,
    transform: `rotate(${i * 30}deg)`,
    animation: `sunPulse 3s ease-in-out ${(i % 4) * 0.25}s infinite`,
  }))

  return (
    <button
      onClick={onToggle}
      aria-label="Cambiar modo"
      className="corner-toggle"
      style={{
        position: 'fixed',
        top: '86px',
        left: '34px',
        zIndex: 30,
        width: '120px',
        height: '120px',
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
      }}
    >
      {/* SUN */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: isDay ? 1 : 0,
          transform: isDay ? 'scale(1) rotate(0deg)' : 'scale(.5) rotate(-40deg)',
          transition: T,
        }}
      >
        {rays.map((r, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: '50%',
              top: '50%',
              width: '6px',
              height: `${ALTO_RAYO}px`,
              marginLeft: '-3px',
              marginTop: `${RADIO_INTERNO}px`,
              background: 'linear-gradient(#FFD873,#FFB43D)',
              borderRadius: '4px',
              transformOrigin: `50% -${RADIO_INTERNO}px`,
              ...r,
            }}
          />
        ))}
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%,-50%)',
            width: '64px',
            height: '64px',
            borderRadius: '50%',
            background:
              'radial-gradient(circle at 38% 34%,#FFE9A6,#FFB43D 72%,#FF9E2E)',
            animation: 'sunGlow 3.2s ease-in-out infinite',
          }}
        >
          <div style={{ position: 'absolute', left: '19px', top: '26px', width: '8px', height: '8px', borderRadius: '50%', background: '#8A4A12' }} />
          <div style={{ position: 'absolute', right: '19px', top: '26px', width: '8px', height: '8px', borderRadius: '50%', background: '#8A4A12' }} />
          <div style={{ position: 'absolute', left: '50%', top: '34px', transform: 'translateX(-50%)', width: '22px', height: '11px', border: '3px solid #8A4A12', borderTop: 'none', borderRadius: '0 0 22px 22px' }} />
          <div style={{ position: 'absolute', left: '9px', top: '36px', width: '11px', height: '7px', borderRadius: '50%', background: 'rgba(255,120,60,.5)' }} />
          <div style={{ position: 'absolute', right: '9px', top: '36px', width: '11px', height: '7px', borderRadius: '50%', background: 'rgba(255,120,60,.5)' }} />
        </div>
      </div>

      {/* MOON */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: isDay ? 0 : 1,
          transform: isDay ? 'scale(.5) rotate(40deg)' : 'scale(1) rotate(0deg)',
          transition: T,
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: '50%',
            top: '50%',
            transform: 'translate(-50%,-50%)',
            width: '70px',
            height: '70px',
            borderRadius: '50%',
            background: 'radial-gradient(circle at 60% 40%,#FBF3D6,#E8D9A6)',
            boxShadow: '0 0 34px rgba(240,228,180,.6)',
          }}
        >
          <div style={{ position: 'absolute', right: '16px', top: '32px', width: '14px', height: '7px', border: '2.5px solid #B89A52', borderTop: 'none', borderRadius: '0 0 14px 14px' }} />
          <div style={{ position: 'absolute', right: '36px', top: '34px', width: '12px', height: '6px', border: '2.5px solid #B89A52', borderTop: 'none', borderRadius: '0 0 12px 12px' }} />
        </div>
        <div style={{ position: 'absolute', right: '6px', top: '2px', fontFamily: "'DM Serif Display',serif", color: '#FBF3D6', fontSize: '15px', animation: 'floatZ 3s ease-in-out infinite' }}>z</div>
        <div style={{ position: 'absolute', right: '0px', top: '8px', fontFamily: "'DM Serif Display',serif", color: '#FBF3D6', fontSize: '20px', animation: 'floatZ 3s ease-in-out .6s infinite' }}>Z</div>
      </div>
    </button>
  )
}
