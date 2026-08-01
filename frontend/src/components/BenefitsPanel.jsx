import { DAY_BENEFITS, NIGHT_BENEFITS } from '../site'

const T = 'opacity .5s ease, transform .55s cubic-bezier(.34,1.56,.64,1)'

// Left hero column: two stacked benefit lists that crossfade with the mode.
export default function BenefitsPanel({ isDay }) {
  return (
    <div style={{ position: 'relative', minHeight: '340px' }}>
      {/* DAY */}
      <Panel
        active={isDay}
        badge="MODO DÍA"
        badgeStyle={{ background: 'rgba(255,255,255,.55)', color: '#B5470C' }}
        title="Frescura para tu rutina diaria"
        titleColor="#5A2E12"
        subColor="#B5470C"
        items={DAY_BENEFITS}
        itemColor="#6A3A1C"
        dot="day"
      />
      {/* NIGHT */}
      <Panel
        active={!isDay}
        badge="MODO NOCHE"
        badgeStyle={{ background: 'rgba(185,140,255,.22)', color: '#D8C4FF' }}
        title="Cuidado y luminosidad nocturna"
        titleColor="#F3ECFF"
        subColor="#C9AEFF"
        items={NIGHT_BENEFITS}
        itemColor="#E6DBFF"
        dot="night"
      />
    </div>
  )
}

function Panel({ active, badge, badgeStyle, title, titleColor, subColor, items, itemColor, dot }) {
  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        opacity: active ? 1 : 0,
        transform: active ? 'translateY(0)' : 'translateY(16px)',
        pointerEvents: active ? 'auto' : 'none',
        transition: T,
      }}
    >
      <div
        style={{
          display: 'inline-block',
          padding: '5px 14px',
          borderRadius: '100px',
          fontWeight: 900,
          fontSize: '12px',
          letterSpacing: '.12em',
          marginBottom: '14px',
          ...badgeStyle,
        }}
      >
        {badge}
      </div>
      <h2
        style={{
          fontFamily: "'DM Serif Display',serif",
          color: titleColor,
          fontSize: '24px',
          marginBottom: '6px',
        }}
      >
        {title}
      </h2>
      <p
        style={{
          fontWeight: 800,
          color: subColor,
          fontSize: '13px',
          letterSpacing: '.02em',
          marginBottom: '14px',
        }}
      >
        Ideal para usar:
      </p>
      <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '13px', padding: 0, margin: 0 }}>
        {items.map((b, i) => (
          <li key={i} style={{ display: 'flex', gap: '11px', alignItems: 'center' }}>
            <span style={dotStyle(dot)}>{b.icon}</span>
            <span style={{ color: itemColor, fontWeight: 600, fontSize: '15px' }}>{b.text}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function dotStyle(kind) {
  const base = {
    flex: 'none',
    width: '38px',
    height: '38px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  }
  if (kind === 'day') {
    return { ...base, background: '#fff', boxShadow: '0 4px 12px rgba(200,90,10,.22)', fontSize: '18px' }
  }
  return {
    ...base,
    background: 'rgba(255,255,255,.14)',
    border: '1px solid rgba(201,174,255,.4)',
    fontSize: '17px',
  }
}
