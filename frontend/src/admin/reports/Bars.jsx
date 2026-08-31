// Barras horizontales de los reportes. Sin librería de gráficas: para tres
// reportes no se paga.
//
// Se dibujan con divs y anchos en porcentaje, no con un <svg> estirado a lo
// ancho: al estirarlo, las esquinas redondeadas se deforman y las barras
// quedan con las puntas ovaladas. Con divs, el navegador ya sabe redondear.
//
// Las barras y su leyenda comparten la altura de fila para que cada nombre
// quede a la misma altura que su barra cuando se ponen en dos columnas.
const ALTO_FILA = 30

/** Clave estable: dos productos pueden llamarse igual, la posición no. */
const clave = (dato, i) => `${i}-${dato.etiqueta}`

export default function Bars({ datos }) {
  if (datos.length === 0) {
    return <p className="py-6 text-center text-sm text-[#8A6A4A]">Sin datos en este periodo.</p>
  }

  return (
    <div className="w-full" role="img" aria-label="Gráfico de barras">
      {datos.map((d, i) => (
        <div key={clave(d, i)} className="flex items-center" style={{ height: ALTO_FILA }}>
          <div className="h-3.5 w-full rounded-full bg-[#F1E7D8]">
            {/* Un valor diminuto sigue mereciendo una barrita visible. */}
            <div
              className="h-full rounded-full bg-[#FF8A3D]"
              style={{ width: `${d.valor > 0 ? Math.max(d.porcentaje, 2) : 0}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}

/** Lista de etiquetas y valores, al lado de las barras. */
export function BarsLeyenda({ datos, formatear = (v) => v }) {
  return (
    <ul>
      {datos.map((d, i) => (
        <li
          key={clave(d, i)}
          className="flex items-center justify-between gap-3 text-sm"
          style={{ height: ALTO_FILA }}
        >
          <span className="truncate text-[#3A2A1A]">{d.etiqueta}</span>
          <span className="shrink-0 font-bold text-[#6A3A1C]">{formatear(d.valor)}</span>
        </li>
      ))}
    </ul>
  )
}
