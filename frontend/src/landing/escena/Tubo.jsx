import { forwardRef, useEffect, useMemo } from 'react'
import { useTexture } from '@react-three/drei'
import * as THREE from 'three'
import { crearCuerpo, crearSellado, crearTapa } from './geometriaTubo.js'
import { cotasDelEnvase, medirSilueta } from './silueta.js'

/**
 * Un tubo de PomAss en 3D.
 *
 * La etiqueta es la foto real del producto, proyectada de frente sobre el
 * cuerpo: no se redibuja el packaging ni la mascota, que es lo que el prompt
 * prohíbe y lo que el manual de marca prohíbe aún más.
 *
 * El material de la etiqueta mezcla la foto con el color del plástico según
 * la transparencia de la imagen: donde la foto acaba, sigue el tubo, sin
 * bordes negros ni blancos.
 *
 * Expone sus materiales con `alRegistrar` para que el grupo de productos
 * pueda desvanecerlos todos a la vez cuando la escena se retira.
 */

/** Lee los píxeles de la foto. Si el navegador no deja, se sigue sin ellos. */
function leerPixeles(imagen) {
  try {
    const lienzo = document.createElement('canvas')
    lienzo.width = imagen.width
    lienzo.height = imagen.height
    const ctx = lienzo.getContext('2d', { willReadFrequently: true })
    ctx.drawImage(imagen, 0, 0)
    return ctx.getImageData(0, 0, imagen.width, imagen.height).data
  } catch {
    return null
  }
}

/** Plástico satinado con algo de barniz, como los tubos reales. */
function plastico(color, extra = {}) {
  return new THREE.MeshPhysicalMaterial({
    color,
    roughness: 0.36,
    clearcoat: 0.55,
    clearcoatRoughness: 0.32,
    ...extra,
  })
}

const Tubo = forwardRef(function Tubo({ producto, alRegistrar }, ref) {
  const textura = useTexture(producto.envase.imagen)

  const piezas = useMemo(() => {
    textura.colorSpace = THREE.SRGBColorSpace
    textura.anisotropy = 8
    textura.needsUpdate = true

    const img = textura.image
    const datos = img ? leerPixeles(img) : null
    const silueta = datos ? medirSilueta(datos, img.width, img.height) : null
    const cotas = silueta ? cotasDelEnvase(producto.envase, datos, silueta) : null

    const etiqueta = plastico(producto.color, { map: silueta ? textura : null })
    etiqueta.onBeforeCompile = (shader) => {
      // En vez de multiplicar el color por la foto, se mezcla según su alfa:
      // donde la foto es transparente, queda el plástico del tubo.
      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <map_fragment>',
        `#ifdef USE_MAP
           vec4 texelEtiqueta = texture2D( map, vMapUv );
           diffuseColor.rgb = mix( diffuseColor.rgb, texelEtiqueta.rgb, texelEtiqueta.a );
         #endif`,
      )
    }
    // Sin esto Three podría reutilizar el programa de otro material físico
    // y la etiqueta saldría multiplicada en vez de mezclada.
    etiqueta.customProgramCacheKey = () => 'pomass-etiqueta-tubo'

    const espalda = plastico(producto.color)
    const tapa = plastico('#F4F2EF', { roughness: 0.42, clearcoat: 0.3 })
    const sellado = plastico(producto.color, { roughness: 0.5 })

    return {
      cuerpo: crearCuerpo({ silueta, cotas }),
      tapaGeo: crearTapa(),
      selladoGeo: crearSellado(),
      etiqueta,
      espalda,
      tapa,
      sellado,
    }
  }, [textura, producto])

  useEffect(() => {
    alRegistrar?.([piezas.etiqueta, piezas.espalda, piezas.tapa, piezas.sellado])
  }, [piezas, alRegistrar])

  useEffect(
    () => () => {
      piezas.cuerpo.dispose()
      piezas.tapaGeo.dispose()
      piezas.selladoGeo.dispose()
      piezas.etiqueta.dispose()
      piezas.espalda.dispose()
      piezas.tapa.dispose()
      piezas.sellado.dispose()
    },
    [piezas],
  )

  return (
    <group ref={ref}>
      <mesh geometry={piezas.cuerpo} material={[piezas.etiqueta, piezas.espalda]} />
      <mesh geometry={piezas.tapaGeo} material={piezas.tapa} />
      <mesh geometry={piezas.selladoGeo} material={piezas.sellado} />
    </group>
  )
})

export default Tubo
