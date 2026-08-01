import { useMemo } from 'react'

// Deterministic pseudo-random so stars don't jump between renders,
// reproducing the design's Math.sin-based generator.
function rnd(i, a, b) {
  const x = Math.sin(i * 12.9898) * 43758.5453
  return a + (x - Math.floor(x)) * (b - a)
}

export default function Background({ isDay }) {
  const stars = useMemo(
    () =>
      Array.from({ length: 40 }, (_, i) => {
        const sz = rnd(i + 1, 1.4, 3.6)
        return {
          top: rnd(i + 2, 2, 92) + '%',
          left: rnd(i + 3, 2, 96) + '%',
          width: sz + 'px',
          height: sz + 'px',
          animation: `twinkle ${rnd(i + 4, 2.2, 5).toFixed(2)}s ease-in-out ${rnd(
            i + 5,
            0,
            4,
          ).toFixed(2)}s infinite`,
        }
      }),
    [],
  )

  return (
    <>
      {/* Day gradient (always present, underneath) */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          background:
            'linear-gradient(165deg,#FFF3DE 0%,#FFD79A 40%,#FF9E4D 78%,#FF7A2F 100%)',
        }}
      />

      {/* Night layer fades in on top */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 0,
          opacity: isDay ? 0 : 1,
          transition: 'opacity .6s ease',
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: 0,
            background:
              'linear-gradient(170deg,#140E38 0%,#241653 48%,#3A2378 82%,#4A2C90 100%)',
          }}
        />
        {stars.map((st, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              top: st.top,
              left: st.left,
              width: st.width,
              height: st.height,
              borderRadius: '50%',
              background: '#FFDE7A',
              boxShadow: '0 0 7px rgba(255,216,110,.95)',
              animation: st.animation,
            }}
          />
        ))}
        {/* drifting clouds */}
        <div
          style={{
            position: 'absolute',
            top: '16%',
            left: '12%',
            width: '220px',
            height: '70px',
            borderRadius: '50%',
            background: 'rgba(20,12,50,.55)',
            filter: 'blur(22px)',
            animation: 'drift 12s ease-in-out infinite alternate',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: '62%',
            right: '8%',
            width: '280px',
            height: '80px',
            borderRadius: '50%',
            background: 'rgba(10,6,34,.6)',
            filter: 'blur(26px)',
            animation: 'drift 16s ease-in-out infinite alternate-reverse',
          }}
        />
        <div
          style={{
            position: 'absolute',
            bottom: '10%',
            left: '26%',
            width: '200px',
            height: '60px',
            borderRadius: '50%',
            background: 'rgba(20,12,50,.5)',
            filter: 'blur(20px)',
            animation: 'drift 14s ease-in-out infinite alternate',
          }}
        />
      </div>
    </>
  )
}
