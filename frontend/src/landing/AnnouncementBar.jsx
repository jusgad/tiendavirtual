import { IconBox, IconLock, IconTruck } from './icons.jsx'

// Los tres hechos que más tranquilizan antes de comprar algo íntimo por
// internet. Todos son ciertos hoy en la tienda: el checkout ofrece empaque
// discreto, cobra con Wompi y despacha a todo el país.
const AVISOS = [
  { Icono: IconTruck, texto: 'Envío a todo el país' },
  { Icono: IconBox, texto: 'Empaque discreto' },
  { Icono: IconLock, texto: 'Pago seguro con Wompi', soloAncho: true },
]

/** Franja superior. Blanco sobre coral profundo: 6,2:1. */
export default function AnnouncementBar() {
  return (
    <div className="bg-brand-coral-deep text-white">
      <ul className="mx-auto flex max-w-6xl items-center justify-center gap-x-7 px-4 py-2 text-[13px] font-bold tracking-wide">
        {AVISOS.map(({ Icono, texto, soloAncho }) => (
          <li key={texto} className={`${soloAncho ? 'hidden sm:flex' : 'flex'} items-center gap-1.5`}>
            <Icono size={16} />
            {texto}
          </li>
        ))}
      </ul>
    </div>
  )
}
