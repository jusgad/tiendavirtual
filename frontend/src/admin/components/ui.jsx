// Componentes propios del panel: densidad de herramienta, no de landing.

export function Badge({ children, tono }) {
  return (
    <span className={'inline-block rounded-full px-2.5 py-1 text-xs font-bold ' + tono}>
      {children}
    </span>
  )
}

/** Tabla con desbordamiento horizontal propio: el cuerpo de la página nunca se desplaza. */
export function Table({ columnas, children }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-[#E7D9C4] bg-white">
      <table className="w-full min-w-[42rem] text-left text-sm">
        <thead className="border-b border-[#E7D9C4] bg-[#FFF9F0]">
          <tr>
            {columnas.map((c) => (
              <th key={c} className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-[#8A6A4A]">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  )
}

export function Modal({ titulo, onCerrar, children }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-start justify-between gap-4">
          <h2 className="font-serif text-xl text-[#3A2A1A]">{titulo}</h2>
          <button onClick={onCerrar} className="text-xl leading-none text-[#8A6A4A]" aria-label="Cerrar">
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

/** Mensaje de estado vacío o de carga dentro de una tabla. */
export function FilaMensaje({ columnas, children }) {
  return (
    <tr>
      <td colSpan={columnas} className="px-4 py-10 text-center text-sm text-[#8A6A4A]">
        {children}
      </td>
    </tr>
  )
}
