// Lógica pura de los reportes: rango por defecto, límites de la consulta,
// escalado de las barras y etiquetas de periodo. El componente solo pinta.
//
// Todo lo que tenga que ver con fechas se resuelve en hora de Colombia
// (UTC-5, sin horario de verano): es la hora en la que la dueña piensa cuando
// dice "hoy" o "este mes".

const HORA_MS = 60 * 60 * 1000
const DIA_MS = 24 * HORA_MS
const DESFASE_COLOMBIA_MS = 5 * HORA_MS
const DIAS_POR_DEFECTO = 30

/** 'YYYY-MM-DD' del día en el que cae ese instante visto desde Colombia. */
function diaColombiano(instanteMs) {
  return new Date(instanteMs - DESFASE_COLOMBIA_MS).toISOString().slice(0, 10)
}

/**
 * Últimos 30 días, hoy incluido. Es el rango que el backend usa por defecto.
 *
 * El día se calcula en hora de Colombia a propósito: a las 9 de la noche en
 * Bogotá ya es el día siguiente en UTC, y el reporte se abriría en "mañana".
 */
export function rangoPorDefecto(ahora = new Date()) {
  const hoy = ahora.getTime()
  return {
    from: diaColombiano(hoy - (DIAS_POR_DEFECTO - 1) * DIA_MS),
    to: diaColombiano(hoy),
  }
}

/**
 * Convierte las fechas del formulario ('YYYY-MM-DD') en los instantes que la
 * dueña quiere decir: desde el arranque del primer día hasta el cierre del
 * último, en hora de Colombia (UTC-5, sin horario de verano).
 *
 * Sin esto, mandar la fecha pelada la lee como medianoche UTC: las ventas del
 * último día quedarían fuera, y pedir un solo día (desde = hasta) daría error.
 *
 * El extremo que venga vacío no se devuelve: el backend tiene su propio
 * rango por defecto y es mejor dejarlo decidir que inventarle uno.
 */
export function limitesConsulta({ from, to } = {}) {
  const limites = {}
  if (from) limites.from = `${from}T00:00:00-05:00`
  if (to) limites.to = `${to}T23:59:59.999-05:00`
  return limites
}

/**
 * Mensaje en español si el rango no tiene sentido; cadena vacía si está bien.
 *
 * Existe para no llegar a preguntar: con "desde" después de "hasta" el backend
 * responde `"from" debe ser anterior a "to"`, que no le dice nada a la dueña.
 *
 * Un extremo en blanco es válido: el backend completa el que falte (sin
 * "hasta" llega hasta hoy, sin "desde" arranca 30 días antes). Y pedir un solo
 * día —desde igual a hasta— también vale: `limitesConsulta` lo abre de la
 * medianoche al cierre.
 *
 * Las fechas vienen como 'YYYY-MM-DD', así que compararlas como texto ordena
 * igual que compararlas como fechas y no hace falta construir ningún `Date`.
 */
export function validarRango({ from, to } = {}) {
  if (!from || !to) return ''
  if (from > to) return 'La fecha "desde" no puede ser posterior a la de "hasta".'
  return ''
}

/**
 * Convierte una lista en barras, con el porcentaje relativo al mayor valor.
 * Escalar contra el máximo —y no contra el total— es lo que hace comparables
 * dos barras de un vistazo.
 */
export function aBarras(items, { etiqueta, valor }) {
  if (items.length === 0) return []
  const numero = (i) => Number(i[valor]) || 0
  const maximo = Math.max(...items.map(numero))
  return items.map((i) => {
    const v = numero(i)
    return {
      etiqueta: String(i[etiqueta]),
      valor: v,
      porcentaje: maximo > 0 ? Math.round((v / maximo) * 100) : 0,
    }
  })
}

/**
 * 'YYYY-MM-DD' o 'YYYY-MM' a algo legible: "30 de ago" / "ago de 2026".
 *
 * El periodo se lee como fecha local y se formatea en la misma zona, así que
 * la etiqueta siempre dice el mismo día que trae la cadena.
 */
export function etiquetaPeriodo(periodo) {
  const partes = periodo.split('-')
  if (partes.length === 3) {
    const d = new Date(`${periodo}T00:00:00`)
    return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short' }).format(d)
  }
  const d = new Date(`${periodo}-01T00:00:00`)
  return new Intl.DateTimeFormat('es-CO', { month: 'short', year: 'numeric' }).format(d)
}
