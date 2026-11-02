# Handoff — cambios de precio y fotos del combo (2 nov 2026)

## Qué se pidió

1. Cambiar el precio de lanzamiento del combo de $89.900 a $94.000, dejando el precio regular en $117.500.
2. Reemplazar las ilustraciones de los tubos Día/Noche por las fotos reales del producto.

## Qué se hizo

- **Precio**: ya estaba en `frontend/src/site.js` (`PRICE = '$94.000'`, `PRECIO_REGULAR = 117500`) de un commit anterior a esta sesión. No requirió cambios nuevos.
- **Fotos de los tubos**:
  - Se recortaron las dos fotos reales (fondo transparente) a su silueta y se guardaron en `frontend/public/images/tubo_dia.png` y `tubo_noche.png`.
  - Se remidieron las cotas de `sellado`/`tapa` (usadas por el modelo 3D en `frontend/src/landing/escena/Tubo.jsx` para ajustar la geometría del tubo a la foto) y se actualizaron en `frontend/src/site.js`. Para Noche, la tapa es oscura y no la detecta la heurística de gris claro, así que esa cota quedó en el 15 % inferior reservado para ese caso (ver comentario en el código).
- Tests relevantes corridos y en verde: `geometria.test.js`, `catalogo.test.js`, `precio.test.js`, `lanzamiento.test.js` (35 tests).
- Verificado visualmente con `npm run dev` + Playwright: hero, sección "La rutina" y la animación de scroll (el tubo que se encoge y sube pegado al header) funcionan igual que antes, ahora con las fotos reales.

## Pull request

- PR: https://github.com/jusgad/tiendavirtual/pull/1 — **mezclado** a `main` (commit `a8891dc`).
- Commit: `feat(landing): fotos reales de los tubos Día y Noche`.

## Pendiente / no resuelto en esta sesión

- **No se pudo levantar `docker compose up --build` (stack completo) en este contenedor.** El build del backend necesita `apt-get install openssl ca-certificates` desde `deb.debian.org`, y la política de red de este entorno cloud bloquea ese host (405 Method Not Allowed vía el proxy del agente). Para poder correr el stack completo en un entorno cloud como este, hay que:
  - Abrir el menú del entorno (barra de título de la sesión) → **Edit** → **Network access**, y ampliar el acceso o agregar `deb.debian.org` a los dominios permitidos (dejando marcada la opción de incluir gestores de paquetes por defecto).
  - Alternativa: cambiar la imagen base del backend de `node:20-slim` a `node:20-alpine` (usa `apk` en vez de `apt`, y los paquetes `openssl`/`ca-certificates` ya suelen venir o están en el registro de Alpine, que si respondió sin bloqueo en este entorno) — esto es un cambio de Dockerfile que no se hizo porque no fue pedido y toca cómo se construye la imagen de producción.
- **No se verificó si el sitio en producción se despliega automáticamente desde `main`.** Si el hosting (Render/Vercel según `docs/howto-desplegar-render-vercel.md`) no tiene auto-deploy en push, hay que disparar el deploy manualmente para que el precio y las fotos nuevas salgan a producción.

## Verificación hecha sin Docker

La vista que se confirmó en esta sesión fue con el frontend solo (`cd frontend && npm run dev`, puerto 5173), que no depende del backend para la landing (la landing solo llama a la API para leer el precio del combo, con fallback a `PRICE` de `site.js` si la API no responde — ver `frontend/src/landing/precio.js`). Esa vista es representativa de lo que se verá en producción para la landing.
