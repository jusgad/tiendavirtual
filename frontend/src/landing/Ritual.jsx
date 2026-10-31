import { CATALOGO } from '../site.js'
import { useProgresoEnPantalla } from './hooks.js'
import { ICONOS, IconCheck, IconMoon, IconSun } from './icons.jsx'
import { Bloque, Grupo, Item, Titular } from './Movimiento.jsx'

/**
 * Estado 2 · El ritual. La transición entre el día y la noche.
 *
 * Arriba, la respuesta a por qué son dos cremas y no una, con el sol
 * cruzando hacia la luna al ritmo del scroll. Debajo, una tarjeta de cristal
 * por producto, generada desde el catálogo: si mañana entra una tercera
 * crema, aparece sola.
 *
 * Aquí viven también los envases en foto. La escena 3D se retira a una
 * esquina en esta banda para dejar el centro al texto, y cada tarjeta lleva
 * el tubo de su crema, pequeño, para que se sepa qué es qué.
 *
 * Los numerales (01, 02…) solo salen si los productos forman de verdad una
 * secuencia a lo largo del día —cada uno en un momento distinto y en orden—,
 * que es la condición que pone el prompt. Hoy la forman: mañana y noche.
 *
 * Lleva la clase `lp-transicion` porque la barra de compra aparece al llegar
 * aquí (ver `useBarraDeCompraVisible`).
 */

/** ¿Los productos forman una secuencia a lo largo del día? */
function esSecuencia(productos) {
  const momentos = productos.map((p) => p.momento)
  return momentos.every((m, i) => i === 0 || m > momentos[i - 1])
}

const ICONO_MOMENTO = { sun: IconSun, moon: IconMoon }

export default function Ritual() {
  const [ref, progreso] = useProgresoEnPantalla()
  const x = progreso * 100
  const altura = Math.sin(progreso * Math.PI) * 100
  const numerar = esSecuencia(CATALOGO)

  return (
    <section
      ref={ref}
      id="rutina"
      aria-labelledby="ritual-titulo"
      className="lp-transicion scroll-mt-24 px-5 py-28 sm:px-8 lg:py-40"
    >
      <div className="mx-auto max-w-3xl text-center">
        <div
          aria-hidden="true"
          className="lp-arco relative mx-auto mb-14 h-24 w-full max-w-xl"
          style={{ '--x': `${x}%`, '--alto': `${altura}%` }}
        >
          <span className="lp-arco-linea" />
          <span className="lp-arco-extremo lp-arco-sol">
            <IconSun size={18} />
          </span>
          <span className="lp-arco-extremo lp-arco-luna">
            <IconMoon size={18} />
          </span>
          <span className="lp-arco-astro">
            {/* Se cruzan a mitad de camino: el sol se apaga mientras la luna
                aparece, en vez de cambiar de golpe. */}
            <span className="lp-arco-astro-sol" style={{ opacity: 1 - progreso }}>
              <IconSun size={24} />
            </span>
            <span className="lp-arco-astro-luna" style={{ opacity: progreso }}>
              <IconMoon size={24} />
            </span>
          </span>
        </div>

        <Bloque>
          <p className="pm-etiqueta pm-acento">La rutina</p>
        </Bloque>
        <Titular
          id="ritual-titulo"
          className="pm-titular-lg mt-5"
          texto="Tu piel no es la misma a las siete de la mañana que a las once de la noche."
        />
        <Bloque retraso={0.2}>
          <p className="pm-cuerpo-lg pm-suave mx-auto mt-7 max-w-2xl">
            Por eso son dos fórmulas y no una. Una te acompaña mientras haces tu vida; la otra trabaja
            mientras descansas.
          </p>
        </Bloque>
      </div>

      <Grupo className="mx-auto mt-20 grid max-w-5xl gap-6 md:grid-cols-2" retraso={0.1}>
        {CATALOGO.map((producto, i) => (
          <Tarjeta key={producto.id} producto={producto} numero={numerar ? i + 1 : null} />
        ))}
      </Grupo>
    </section>
  )
}

function Tarjeta({ producto, numero }) {
  const Icono = ICONO_MOMENTO[producto.icono] ?? IconSun
  return (
    <Item como="article" className="pm-glass relative flex flex-col overflow-hidden rounded-[28px] p-7 sm:p-9">
      <div className="flex items-start justify-between gap-4">
        <div>
          {numero && (
            <p className="font-display text-[44px] italic leading-none pm-acento" aria-hidden="true">
              {String(numero).padStart(2, '0')}
            </p>
          )}
          <p className="pm-etiqueta mt-4 flex items-center gap-2">
            <Icono size={14} />
            {producto.nombre} · {producto.tipo} · 50 ml
          </p>
        </div>
        {/* El envase real, en pequeño: para que se sepa qué tubo es cuál. */}
        <img
          src={producto.imagen}
          alt={`Tubo de la crema ${producto.nombre} de PomAss, 50 ml`}
          width="400"
          height="600"
          loading="lazy"
          draggable="false"
          className="-mr-2 -mt-2 h-32 w-auto flex-none drop-shadow-[0_14px_14px_rgba(52,53,83,.25)] sm:h-36"
        />
      </div>

      <h3 className="mt-5 font-display text-[clamp(26px,2.4vw,34px)] font-semibold leading-[1.1]">
        {producto.beneficio}
      </h3>
      <p className="pm-cuerpo pm-suave mt-3">{producto.cuando}</p>

      <ul className="mt-6 space-y-3">
        {producto.beneficios.map(({ icon, text }) => {
          const IconoBeneficio = ICONOS[icon] ?? IconCheck
          return (
            <li key={text} className="flex items-center gap-3 text-[16px] font-semibold">
              <span className="pm-icono-hoja inline-flex h-9 w-9 flex-none items-center justify-center rounded-full">
                <IconoBeneficio size={17} />
              </span>
              {text}
            </li>
          )
        })}
      </ul>
    </Item>
  )
}
