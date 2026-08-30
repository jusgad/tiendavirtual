const logo = '/images/logo.png'

// Fixed top bar: centered logo + a Día/Noche pill toggle on the right.
export default function Header({ isDay, onToggle }) {
  return (
    <header
      className="site-header"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 40,
        height: '70px',
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        padding: '0 26px',
        backdropFilter: 'blur(6px)',
      }}
    >
      <div />
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <img
          src={logo}
          alt="PomAss by Pao Díaz"
          style={{
            height: '56px',
            width: 'auto',
            display: 'block',
            // El logo es un PNG transparente: de día se asienta solo sobre el
            // degradado claro. De noche, en cambio, su tipografía azul marino
            // («Ass», «by Pao Díaz») se pierde contra el morado oscuro, así que
            // se le pone una placa clara con la misma forma de píldora que el
            // propio logo dibuja. Sin ella la marca queda a medio leer.
            ...(isDay
              ? {}
              : {
                  background: 'rgba(255,243,222,.94)',
                  borderRadius: '999px',
                  padding: '2px 10px',
                }),
          }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <ThemeToggle isDay={isDay} onToggle={onToggle} />
      </div>
    </header>
  )
}

function ThemeToggle({ isDay, onToggle }) {
  return (
    <div
      onClick={onToggle}
      role="switch"
      aria-checked={!isDay}
      aria-label="Cambiar entre modo día y noche"
      style={{
        position: 'relative',
        minWidth: '128px',
        height: '38px',
        borderRadius: '100px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: isDay
          ? 'linear-gradient(90deg,#FFD08A,#FF8A3D)'
          : 'linear-gradient(90deg,#3A2378,#7C5CE0)',
        boxShadow: 'inset 0 2px 6px rgba(0,0,0,.18)',
        transition: 'background .5s ease',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          paddingLeft: '11px',
          opacity: isDay ? 1 : 0.35,
          transition: 'opacity .4s',
        }}
      >
        <span style={{ fontSize: '12px' }}>☀️</span>
        <span style={{ fontWeight: 800, fontSize: '12px', color: '#7A3A10' }}>Día</span>
      </div>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          paddingRight: '11px',
          opacity: isDay ? 0.35 : 1,
          transition: 'opacity .4s',
        }}
      >
        <span style={{ fontWeight: 800, fontSize: '12px', color: '#EFE6FF' }}>Noche</span>
        <span style={{ fontSize: '12px' }}>🌙</span>
      </div>
      <div
        style={{
          position: 'absolute',
          top: '4px',
          left: isDay ? '4px' : 'calc(100% - 34px)',
          width: '30px',
          height: '30px',
          borderRadius: '50%',
          background: '#fff',
          boxShadow: '0 3px 8px rgba(0,0,0,.25)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '15px',
          transition: 'left .45s cubic-bezier(.34,1.56,.64,1)',
        }}
      >
        {isDay ? '☀️' : '🌙'}
      </div>
    </div>
  )
}
