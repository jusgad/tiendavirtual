import { useProgresoEnPantalla } from './hooks.js'
import { IconMoon, IconSun } from './icons.jsx'

/**
 * Banda 5 · La transición. Atardecer.
 *
 * Es el único sitio de la página donde Día y Noche se tocan, y por eso es el
 * único donde el manual autoriza el degradado naranja → coral → magenta: lo
 * reserva para «detalles de unión entre Día y Noche» y prohíbe convertir toda
 * la pieza en degradado.
 *
 * Su trabajo es responder por qué son dos cremas y no una. No repite ninguno
 * de los dos beneficios: los acaba de contar la banda de arriba y los contará
 * la de abajo.
 *
 * El sol recorre el arco hacia la luna al ritmo del scroll, así que el paso
 * del día se ve en vez de explicarse. Con «reducir movimiento» el recorrido se
 * queda a media tarde y la escena se entiende igual.
 */
export default function Transicion() {
  const [ref, progreso] = useProgresoEnPantalla()

  // El astro recorre un arco: avanza en horizontal y sube hasta la mitad del
  // camino para después bajar, como el sol real sobre el horizonte.
  const x = progreso * 100
  const altura = Math.sin(progreso * Math.PI) * 100

  return (
    <section
      ref={ref}
      aria-labelledby="transicion-titulo"
      className="lp-transicion relative overflow-hidden px-4 py-24 text-center sm:px-6 lg:py-32"
    >
      <div className="mx-auto max-w-3xl">
        <div
          aria-hidden="true"
          className="lp-arco relative mx-auto mb-12 h-24 w-full max-w-xl"
          style={{ '--x': `${x}%`, '--alto': `${altura}%` }}
        >
          <span className="lp-arco-linea" />
          <span className="lp-arco-extremo lp-arco-sol">
            <IconSun size={22} />
          </span>
          <span className="lp-arco-extremo lp-arco-luna">
            <IconMoon size={22} />
          </span>
          <span className="lp-arco-astro">
            {/* Los dos se cruzan a mitad de camino: el sol se apaga mientras
                la luna aparece, en vez de cambiar de golpe. */}
            <span className="lp-arco-astro-sol" style={{ opacity: 1 - progreso }}>
              <IconSun size={26} />
            </span>
            <span className="lp-arco-astro-luna" style={{ opacity: progreso }}>
              <IconMoon size={26} />
            </span>
          </span>
        </div>

        <h2
          id="transicion-titulo"
          className="font-display text-[clamp(2.2rem,5vw,3.8rem)] font-semibold leading-[1.03] tracking-[-.02em] text-white"
        >
          Tu piel no es la misma a las siete de la mañana que a las once de la noche.
        </h2>

        <p className="mx-auto mt-7 max-w-2xl text-xl leading-relaxed text-white/90">
          Por eso son dos fórmulas y no una. Una te acompaña mientras haces tu vida; la otra trabaja
          mientras descansas.
        </p>
      </div>
    </section>
  )
}
