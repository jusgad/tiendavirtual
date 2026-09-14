import { IconSparkle } from './icons.jsx'

// Solo lo que el manual fija: el lema y el beneficio principal de cada crema.
// El manual pide no saturar con beneficios secundarios, y una cinta que pasa
// en bucle es justo donde sería tentador meterlos todos.
const FRASES = [
  'Confianza en todo momento.',
  'Día: neutraliza olores indeseados',
  'Noche: crema íntima blanqueadora',
  'Hecho en Colombia',
]

function Tira({ oculta = false }) {
  // Dos vueltas de frases por tira: en pantallas anchas una sola no alcanza a
  // cubrir el ancho y se vería el hueco antes de que la cinta dé la vuelta.
  const frases = [...FRASES, ...FRASES]
  return (
    <ul className="lp-marquesina-tira" aria-hidden={oculta || undefined}>
      {frases.map((frase, i) => (
        <li key={i} className="flex items-center gap-7 whitespace-nowrap">
          <span>{frase}</span>
          <IconSparkle size={14} className="text-brand-coral" />
        </li>
      ))}
    </ul>
  )
}

/**
 * Cinta en movimiento entre el hero y el selector. Se detiene al pasar el
 * ratón, y con «reducir movimiento» queda quieta.
 *
 * La segunda tira es una copia para que el bucle no tenga costura; se oculta a
 * los lectores de pantalla para que no lean todo dos veces.
 */
export default function Marquee() {
  return (
    <div className="lp-marquesina bg-brand-tinta py-4 font-display text-lg italic text-brand-crema sm:text-xl">
      <div className="lp-marquesina-pista">
        <Tira />
        <Tira oculta />
      </div>
    </div>
  )
}
