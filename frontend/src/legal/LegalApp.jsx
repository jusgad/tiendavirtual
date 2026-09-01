import Logo from '../shared/Logo.jsx'
import { ACTUALIZADO, DOCUMENTOS } from './textos.js'

/**
 * Página de textos legales. Estática: no llama a la API.
 *
 * Los cuatro documentos van en una sola página con anclas, en vez de en cuatro
 * páginas: así un enlace del tipo `/legal.html#devoluciones` lleva directo al
 * apartado que hace falta citar, y quien llega buscando "cómo devuelvo esto"
 * lo encuentra sin navegar.
 */
export default function LegalApp() {
  return (
    <div className="min-h-screen bg-[#FFF9F0] text-[#3A2A1A]">
      <header className="border-b border-[#E7D9C4] bg-white/70">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          {/* `Logo` ya trae su propio enlace al inicio: envolverlo en otro
              anida dos <a>, que es HTML inválido. */}
          <Logo alto={30} />
          <a href="/" className="text-sm font-bold text-[#6A3A1C] hover:underline">
            Volver a la tienda
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-10">
        <h1 className="font-serif text-3xl">Información legal</h1>
        <p className="mt-2 text-sm text-[#8A6A4A]">Última actualización: {ACTUALIZADO}</p>

        <nav className="mt-6 flex flex-wrap gap-2">
          {DOCUMENTOS.map((d) => (
            <a
              key={d.id}
              href={`#${d.id}`}
              className="rounded-full border border-[#E7D9C4] bg-white px-4 py-2 text-sm font-bold text-[#6A3A1C] hover:bg-[#FFF3DE]"
            >
              {d.titulo}
            </a>
          ))}
        </nav>

        <div className="mt-10 space-y-12">
          {DOCUMENTOS.map((doc) => (
            <section key={doc.id} id={doc.id} className="scroll-mt-6">
              <h2 className="font-serif text-2xl">{doc.titulo}</h2>
              <Cuerpo parrafos={doc.parrafos} />
              {doc.listas?.map((lista, i) => (
                <Lista key={i} items={lista.items} />
              ))}
              {doc.secciones?.map((sec) => (
                <div key={sec.titulo} className="mt-6">
                  <h3 className="font-bold">{sec.titulo}</h3>
                  <Cuerpo parrafos={sec.parrafos} />
                  {sec.items && <Lista items={sec.items} />}
                  <Cuerpo parrafos={sec.cierre ? [sec.cierre] : undefined} />
                </div>
              ))}
              <Cuerpo parrafos={doc.cierre} />
            </section>
          ))}
        </div>

        <p className="mt-14 border-t border-[#E7D9C4] pt-6 text-xs leading-relaxed text-[#8A6A4A]">
          Estos textos se rigen por la ley colombiana: Ley 1581 de 2012 y Decreto 1377 de 2013 para
          el tratamiento de datos personales, y Ley 1480 de 2011 (Estatuto del Consumidor) para la
          compra, el retracto y la garantía. Ante cualquier reclamo puedes acudir a la
          Superintendencia de Industria y Comercio.
        </p>
      </main>
    </div>
  )
}

/**
 * Pinta párrafos con **negrita** en línea.
 *
 * Se resuelve aquí, partiendo por los asteriscos, en vez de traer una
 * dependencia de Markdown para la única marca que se usa en todo el texto.
 */
function Cuerpo({ parrafos }) {
  if (!parrafos?.length) return null
  return (
    <div className="mt-3 space-y-3 text-[15px] leading-relaxed">
      {parrafos.map((p, i) => (
        <p key={i}>{conNegritas(p)}</p>
      ))}
    </div>
  )
}

function Lista({ items }) {
  return (
    <ul className="mt-3 space-y-2 text-[15px] leading-relaxed">
      {items.map((item, i) => (
        <li key={i} className="flex gap-2">
          <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-peach-500" />
          <span>{conNegritas(item)}</span>
        </li>
      ))}
    </ul>
  )
}

function conNegritas(texto) {
  return texto.split('**').map((trozo, i) =>
    // Los trozos impares son los que iban entre asteriscos.
    i % 2 === 1 ? <strong key={i}>{trozo}</strong> : <span key={i}>{trozo}</span>,
  )
}
