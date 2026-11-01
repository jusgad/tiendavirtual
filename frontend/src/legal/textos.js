// Textos legales de la tienda, como datos: la pantalla solo los pinta.
//
// Están redactados sobre la normativa colombiana que aplica a una tienda en
// línea que vende cosméticos a consumidores finales:
//
// - Ley 1581 de 2012 y Decreto 1377 de 2013 — tratamiento de datos personales.
// - Ley 1480 de 2011 (Estatuto del Consumidor) — artículos 47 (retracto de
//   cinco días hábiles), 50 (deberes de quien vende por medios electrónicos)
//   y 51 (reversión del pago).
//
// ⚠️ Son un punto de partida serio, no un concepto jurídico: antes de
// publicar conviene que los revise un abogado, sobre todo por el producto,
// que es cosmético de uso íntimo.
//
// Los datos del comerciante salen de `site.js` para no repetirlos.

import { COMERCIANTE } from '../site.js'

export const ACTUALIZADO = '1 de septiembre de 2026'

const c = COMERCIANTE

export const DOCUMENTOS = [
  {
    id: 'comerciante',
    titulo: 'Quién te vende',
    parrafos: [
      'Esta tienda es operada por:',
    ],
    listas: [
      {
        items: [
          `**Razón social:** ${c.razonSocial}`,
          `**NIT / documento:** ${c.nit}`,
          `**Ciudad:** ${c.ciudad}`,
          `**Correo de contacto:** ${c.correo}`,
          `**Teléfono / WhatsApp:** ${c.telefono}`,
        ],
      },
    ],
    cierre: [
      'Publicamos estos datos porque el artículo 50 de la Ley 1480 de 2011 obliga a que sepas con quién estás contratando antes de comprar. Para cualquier reclamo, escríbenos primero a nosotros: tenemos quince días hábiles para responderte.',
    ],
  },

  {
    id: 'datos',
    titulo: 'Política de tratamiento de datos personales',
    parrafos: [
      `En cumplimiento de la Ley 1581 de 2012 y del Decreto 1377 de 2013, ${c.razonSocial} te informa cómo trata los datos personales que recoge en esta tienda. Al comprar o crear una cuenta, autorizas ese tratamiento en los términos de esta política.`,
    ],
    secciones: [
      {
        titulo: 'Qué datos recogemos',
        items: [
          'Tu nombre, correo electrónico y teléfono.',
          'La dirección de envío que nos indicas: departamento, ciudad, dirección y código postal si lo tienes.',
          'El historial de tus pedidos y su estado.',
          'Si creas cuenta, tu contraseña, que se guarda cifrada y que nadie —tampoco nosotros— puede leer.',
        ],
        cierre:
          '**No guardamos los datos de tu tarjeta.** El pago lo procesa la pasarela Wompi en su propia plataforma; nosotros solo recibimos la confirmación de si el pago fue aprobado o rechazado.',
      },
      {
        titulo: 'Para qué los usamos',
        items: [
          'Preparar, cobrar y despachar tu pedido.',
          'Escribirte sobre ese pedido: confirmación, pago y envío con el número de guía.',
          'Atender tus preguntas, garantías, cambios y devoluciones.',
          'Cumplir obligaciones contables y tributarias.',
        ],
        cierre:
          'No usamos tus datos para publicidad ni te enviamos promociones si no nos lo pides, y **no vendemos ni cedemos tu información a terceros**.',
      },
      {
        titulo: 'Con quién los compartimos',
        items: [
          'Con la transportadora, para poder entregarte el pedido: nombre, dirección y teléfono.',
          'Con la pasarela de pagos Wompi, para procesar el cobro.',
          'Con las autoridades, cuando la ley lo exija.',
        ],
      },
      {
        titulo: 'Datos sensibles y menores de edad',
        parrafos: [
          'No pedimos datos sensibles: ni de salud, ni de vida sexual, ni biométricos. El producto es cosmético y no requiere información clínica. Si nos escribes algo así por WhatsApp o por correo, no lo incorporamos a tu ficha.',
          'Esta tienda vende productos para adultos y no está dirigida a menores de edad. No recogemos deliberadamente datos de menores.',
        ],
      },
      {
        titulo: 'Tus derechos',
        parrafos: [
          'La ley te da derecho a conocer, actualizar y rectificar tus datos; a pedir prueba de la autorización que diste; a ser informada de cómo los hemos usado; a revocar la autorización y pedir que los borremos cuando no exista un deber legal de conservarlos; y a presentar quejas ante la Superintendencia de Industria y Comercio.',
          `Para ejercerlos, escríbenos a **${c.correo}** con tu nombre y el correo con el que compraste. Te respondemos en máximo diez días hábiles, prorrogables por cinco más si te avisamos por qué.`,
        ],
      },
      {
        titulo: 'Cuánto tiempo los guardamos',
        parrafos: [
          'Los datos de un pedido se conservan mientras dure la relación comercial y después el tiempo que exijan las normas contables y tributarias. Cumplido ese plazo, se eliminan o se anonimizan.',
        ],
      },
    ],
  },

  {
    id: 'terminos',
    titulo: 'Términos y condiciones',
    secciones: [
      {
        titulo: 'La compra',
        parrafos: [
          'Los precios están en pesos colombianos e incluyen los impuestos aplicables. El costo de envío se calcula en el checkout y se muestra antes de que pagues.',
          'Tu pedido se confirma cuando la pasarela aprueba el pago, no cuando lo creas. Mientras tanto queda en estado pendiente. Te llega un correo con el número de pedido en cuanto lo recibimos y otro cuando el pago queda confirmado.',
          'Reservamos las unidades al momento de la compra. Si por un error de inventario no pudiéramos cumplir un pedido ya pagado, te devolvemos el dinero completo.',
        ],
      },
      {
        titulo: 'Envíos',
        parrafos: [
          'Despachamos a todo el país por transportadora. Cuando el pedido sale, te enviamos la transportadora y el número de guía por correo, y también puedes consultarlo en la página de seguimiento con tu número de pedido y tu correo.',
          'Los tiempos de entrega los define la transportadora y varían según la ciudad. No respondemos por demoras causadas por una dirección incompleta o incorrecta.',
        ],
      },
      {
        titulo: 'El producto',
        parrafos: [
          'Es un cosmético de uso externo. No es un medicamento y no trata ni cura ninguna enfermedad. Lee las advertencias del empaque antes de usarlo, no lo apliques sobre piel lastimada y suspende el uso si notas irritación.',
          'Si estás embarazada, lactando o en tratamiento dermatológico, consulta a tu médico antes de usarlo.',
        ],
      },
      {
        titulo: 'Cuentas',
        parrafos: [
          'Puedes comprar como invitado o crear una cuenta. Si creas cuenta, eres responsable de mantener tu contraseña en reserva. Si crees que alguien accedió a ella, cámbiala desde «Olvidé mi contraseña».',
        ],
      },
      {
        titulo: 'Cambios a estos términos',
        parrafos: [
          `Podemos actualizar estos términos. La versión vigente es siempre la publicada en esta página, con su fecha de actualización. Los cambios no afectan pedidos ya confirmados. Última actualización: ${ACTUALIZADO}.`,
        ],
      },
    ],
  },

  {
    id: 'devoluciones',
    titulo: 'Devoluciones, retracto y garantía',
    secciones: [
      {
        titulo: 'Derecho de retracto: cinco días hábiles',
        parrafos: [
          'Como compraste por internet, el artículo 47 de la Ley 1480 de 2011 te da derecho a retractarte **dentro de los cinco (5) días hábiles siguientes a la entrega**, sin tener que explicar por qué.',
          `Para ejercerlo, escríbenos a **${c.correo}** con tu número de pedido dentro de ese plazo. Devuelves el producto en las mismas condiciones en que lo recibiste y nosotros te reintegramos el dinero **dentro de los treinta (30) días calendario** siguientes.`,
          'Los costos de transporte de la devolución corren por tu cuenta, como prevé la misma norma.',
        ],
        cierre:
          '**Importante por el tipo de producto:** al ser un cosmético de uso íntimo, el retracto aplica sobre unidades **sin abrir y con su sello original intacto**. Un producto ya destapado no puede reincorporarse al inventario por razones sanitarias.',
      },
      {
        titulo: 'Garantía legal',
        parrafos: [
          'Todos nuestros productos tienen garantía legal. Si te llega un producto defectuoso, vencido, dañado en el transporte o distinto al que pediste, escríbenos con fotos dentro de los cinco días siguientes a recibirlo y lo reponemos o te devolvemos el dinero, a tu elección, sin costo para ti.',
          'La garantía no cubre el deterioro por un uso distinto al indicado en el empaque.',
        ],
      },
      {
        titulo: 'Reversión del pago',
        parrafos: [
          'Si el producto no te llegó, no corresponde a lo que pediste, está defectuoso, o hubo un fraude o una operación no solicitada, puedes pedir la reversión del pago según el artículo 51 de la Ley 1480 de 2011. Tienes cinco días hábiles desde que tuviste noticia del hecho para solicitarla ante nosotros y ante tu banco o emisor de la tarjeta.',
        ],
      },
      {
        titulo: 'Cómo pedirlo',
        parrafos: [
          `Escríbenos a **${c.correo}** o por WhatsApp al **${c.telefono}** con tu número de pedido y lo que ocurrió. Te respondemos en máximo quince (15) días hábiles, como exige la ley.`,
          'Si no quedas conforme con nuestra respuesta, puedes acudir a la Superintendencia de Industria y Comercio.',
        ],
      },
    ],
  },
]
