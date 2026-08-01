// Mirrors the design's <image-slot>: shows the real image when `src` is set,
// otherwise a soft dashed placeholder with a hint label — matching the
// unfinished slots in the source design (mascots, day tube, seal).

export default function ImageSlot({
  src,
  alt = '',
  placeholder = '',
  shape = 'rounded', // 'rounded' | 'circle'
  radius = 18,
  className = '',
  style = {},
}) {
  const borderRadius = shape === 'circle' ? '50%' : `${radius}px`

  if (src) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        style={{
          display: 'block',
          width: '100%',
          height: '100%',
          objectFit: 'contain',
          borderRadius,
          ...style,
        }}
      />
    )
  }

  return (
    <div
      className={className}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        width: '100%',
        height: '100%',
        padding: '10px',
        borderRadius,
        border: '2px dashed rgba(255,255,255,.6)',
        background: 'rgba(255,255,255,.18)',
        color: 'rgba(90,46,18,.75)',
        fontWeight: 700,
        fontSize: '12px',
        lineHeight: 1.35,
        backdropFilter: 'blur(2px)',
        ...style,
      }}
    >
      {placeholder}
    </div>
  )
}
