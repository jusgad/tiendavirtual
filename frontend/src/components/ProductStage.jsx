import ImageSlot from './ImageSlot'

const T = 'opacity .5s ease, transform .55s cubic-bezier(.34,1.56,.64,1)'

// Center hero column: big DÍA / NOCHE title, product tube on a podium, and a
// crossfading mascot. Tubes/mascots use ImageSlot so real photos can be dropped
// in via the `products` prop; otherwise soft placeholders show (as in the design).
export default function ProductStage({ isDay, products = {} }) {
  return (
    <div style={{ position: 'relative', textAlign: 'center' }}>
      {/* Title */}
      <div style={{ position: 'relative', height: '80px', marginBottom: '6px' }}>
        <div style={{ position: 'absolute', inset: 0, opacity: isDay ? 1 : 0, transform: isDay ? 'translateY(0)' : 'translateY(14px)', transition: T }}>
          <h1 style={{ fontFamily: "'DM Serif Display',serif", fontSize: '72px', color: '#fff', lineHeight: 0.9, textShadow: '0 6px 20px rgba(200,90,10,.45)', margin: 0 }}>DÍA</h1>
          <p style={{ fontFamily: "'DM Serif Display',serif", fontStyle: 'italic', color: '#7A3A10', fontSize: '18px', margin: 0 }}>Crema íntima</p>
        </div>
        <div style={{ position: 'absolute', inset: 0, opacity: isDay ? 0 : 1, transform: isDay ? 'translateY(14px)' : 'translateY(0)', transition: T }}>
          <h1 style={{ fontFamily: "'DM Serif Display',serif", fontSize: '72px', color: '#F6EEFF', lineHeight: 0.9, textShadow: '0 6px 24px rgba(70,40,150,.6)', margin: 0 }}>NOCHE</h1>
          <p style={{ fontFamily: "'DM Serif Display',serif", fontStyle: 'italic', color: '#D6C4FF', fontSize: '18px', margin: 0 }}>Crema íntima blanqueadora</p>
        </div>
      </div>

      {/* Product stage */}
      <div style={{ position: 'relative', height: '330px', marginTop: '74px' }}>
        {/* mascots */}
        <div className="stage-mascot" style={{ ...mascotBase, opacity: isDay ? 1 : 0, transform: isDay ? 'scale(1) rotate(4deg)' : 'scale(.7) rotate(-8deg)', transition: T, animation: 'breathe 4s ease-in-out infinite' }}>
          <ImageSlot src={products.mascotDay} shape="rounded" radius={18} placeholder="Mascota durazno guiñando 🍑" />
        </div>
        <div className="stage-mascot" style={{ ...mascotBase, opacity: isDay ? 0 : 1, transform: isDay ? 'scale(.7) rotate(8deg)' : 'scale(1) rotate(-4deg)', transition: T, animation: 'breathe 4.5s ease-in-out infinite' }}>
          <ImageSlot src={products.mascotNight} shape="rounded" radius={18} placeholder="Durazno durmiendo 😴" />
        </div>

        {/* tubes */}
        <div style={{ ...tubeBase, opacity: isDay ? 1 : 0, transform: isDay ? 'scale(1) translateY(0)' : 'scale(.7) translateY(14px)', transition: T }}>
          <div style={{ width: '150px', height: '230px' }}>
            <ImageSlot src={products.tubeDay} shape="rounded" radius={20} placeholder="Tubo DÍA · 50 ml" />
          </div>
        </div>
        <div style={{ ...tubeBase, opacity: isDay ? 0 : 1, transform: isDay ? 'scale(.7) translateY(14px)' : 'scale(1) translateY(0)', transition: T }}>
          <div style={{ width: '150px', height: '230px' }}>
            <ImageSlot src={products.tubeNight} shape="rounded" radius={20} placeholder="Tubo NOCHE · 50 ml" />
          </div>
        </div>

        {/* podium */}
        <div style={{ position: 'absolute', left: '50%', bottom: '6px', transform: 'translateX(-50%)', zIndex: 1 }}>
          <div
            style={{
              width: '210px',
              height: '46px',
              borderRadius: '50%',
              background: isDay
                ? 'radial-gradient(ellipse at 50% 40%,#FFF6E6,#FFD9A6)'
                : 'radial-gradient(ellipse at 50% 40%,#4A3A82,#2C1E5C)',
              transition: 'background .5s ease',
            }}
          />
          <div
            style={{
              width: '210px',
              height: '70px',
              marginTop: '-24px',
              borderRadius: '0 0 24px 24px / 0 0 40px 40px',
              background: isDay
                ? 'linear-gradient(90deg,#F0C98A,#FFF0D6 45%,#F0C98A)'
                : 'linear-gradient(90deg,#2C1E5C,#5A4A96 45%,#2C1E5C)',
              boxShadow: 'inset 0 -8px 18px rgba(0,0,0,.15)',
              transition: 'background .5s ease',
            }}
          />
        </div>

        {/* ground shadow */}
        <div style={{ position: 'absolute', left: '50%', bottom: '-6px', transform: 'translateX(-50%)', width: '230px', height: '26px', borderRadius: '50%', background: 'rgba(0,0,0,.16)', filter: 'blur(10px)', zIndex: 0 }} />
      </div>
    </div>
  )
}

const mascotBase = {
  position: 'absolute',
  right: '-52px',
  bottom: '128px',
  width: '128px',
  height: '128px',
  zIndex: 3,
}

const tubeBase = {
  position: 'absolute',
  left: '50%',
  bottom: '70px',
  marginLeft: '-75px',
  zIndex: 2,
}
