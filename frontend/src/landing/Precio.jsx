import { CURRENCY } from '../site.js'
import { ofertaLanzamiento } from './lanzamiento.js'
import { usePrecio } from './precio.js'

/**
 * El precio del combo, con el regular tachado al lado mientras dure el
 * lanzamiento. Está en un componente porque sale en tres sitios con el mismo
 * significado y distinto tamaño: la apertura, el combo y la barra fija.
 *
 * El número grande siempre es el que se cobra (viene de la API, no escrito a
 * mano). El tachado lo decide `ofertaLanzamiento`, que lo esconde solo cuando
 * deja de ser verdad.
 *
 * El tachado lleva `<s>` por el estilo y un «Antes:» en `sr-only` por el
 * significado: un lector de pantalla no anuncia la raya, así que sin eso
 * leería dos precios seguidos sin saber cuál se paga.
 */
export default function Precio({
  tamano = 'text-[34px]',
  fila = '',
  texto = '',
  nota = true,
  compacto = false,
}) {
  const precio = usePrecio()
  const oferta = ofertaLanzamiento(precio)

  return (
    <div className={texto}>
      <p
        className={`flex flex-wrap items-baseline ${compacto ? 'gap-x-2' : 'gap-x-3'} gap-y-1 ${fila}`}
      >
        <span className={`font-display font-semibold leading-none ${tamano}`}>{precio}</span>
        <span className={`pm-suave font-bold ${compacto ? 'text-xs' : 'text-sm'}`}>{CURRENCY}</span>
        {oferta && (
          <span className={`pm-antes ${compacto ? 'pm-antes-compacto' : ''}`}>
            <span className="sr-only">Antes: </span>
            <s>{oferta.antes}</s>
          </span>
        )}
      </p>
      {oferta && nota && <p className="pm-lanzamiento mt-2.5">{oferta.nota}</p>}
    </div>
  )
}
