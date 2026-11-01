// Logotipo de la marca, enlazado al inicio de la tienda.
//
// Lo comparten el checkout, el seguimiento y el panel: son páginas separadas
// (entradas distintas de Vite), así que el enlace es un `<a href>` normal y no
// una navegación de cliente.
//
// El PNG es transparente y mide 636x208 (≈3:1): se fija el alto y el ancho
// sale solo, para que nunca se deforme. Ese tamaño es el doble del mayor al
// que se muestra (104 px de alto en la portada), que es lo que piden las
// pantallas retina; el original de 1281x419 pesaba 327 KB para verse igual.
export default function Logo({ alto = 32, href = '/', className = '' }) {
  return (
    <a
      href={href}
      className={'inline-block shrink-0 ' + className}
      aria-label="PomAss · ir al inicio"
      title="Ir al inicio"
    >
      <img
        src="/images/logo.png"
        alt="PomAss by Pao Díaz"
        style={{ height: `${alto}px`, width: 'auto', display: 'block' }}
      />
    </a>
  )
}
