# Chiringuito de Lali y Oli 3D

Esta es la copia 3D independiente, publicada desde la rama `preview-3d`.
Procede de `fix/3d-service-integrity` en el repositorio original, commit
`8d2d667b3dbc7640ffb39da23fed34a07faec6a1`. No sustituye ni modifica el juego 2D.
Los guardados y preferencias usan claves `lali-oli.3d.*` independientes de las
del 2D, aunque las dos webs comparten el dominio de GitHub Pages.

Juego de gestión de un chiringuito en Tenerife, con modo individual y cooperativo online para dos móviles.

## Jugar

La copia 3D tiene su propia publicación:
[Abrir Lali y Oli 3D](https://oliiveer18.github.io/chiringuito-lali-oli-3d/).
El [juego 2D original](https://oliiveer18.github.io/chiringuito-de-lali-y-oli/)
mantiene su enlace y su publicación desde `main`, sin cambios.

El cooperativo usa PeerJS (WebRTC). Las pruebas entre perfiles del mismo entorno
pasan; una prueba entre máquinas de redes distintas no logró conectar. Falta
configurar un relay TURN operativo y repetir esa validación. No se presenta
el online entre redes distintas como terminado. Consulta `SERVICE-3D-FIXES.md`.

## Referencias del repositorio original

| Línea | Ubicación | Uso |
|--------|-----------|-----|
| **Oficial** | Raíz del repo, rama `main`, `version.js` (v28+) | Juego activo: https://oliiveer18.github.io/chiringuito-de-lali-y-oli/ |
| **Preview v29** | `preview/` | Rediseño visual **congelado**; solo vitrina: https://oliiveer18.github.io/chiringuito-de-lali-y-oli/preview/index.html |
| **camera-beta** | `camera-beta/` | Experimento de cámara; no es main: https://oliiveer18.github.io/chiringuito-de-lali-y-oli/camera-beta/index.html |

El preview no recibe mantenimiento rutinario; ver `preview/README.md`. Para cache bust en la build oficial, usar `?v=` alineado con `VERSION` en `version.js`.

## Desarrollo local

Requiere Node.js 18.19 o superior.

```bash
npm start        # Servidor estático local en http://localhost:8000
npm test         # Ejecuta las pruebas automatizadas
npm run check    # Alias de npm test
```

## Estructura

- Núcleo: `state.js`, `config.js`, `sim.js`, `ui.js`, `render.js`, `report.js`, `net.js`, `world.js`.
- Guardado y fiabilidad: `saves.js`, `reliability.js`, `layout.js`.
- Ampliaciones: `features.js`, `v12.js` y `v14.js`.
- Herramientas: `serve.js` y las pruebas `*.test.mjs`.
- `legacy/`: código heredado que ya no forma parte del juego activo.
- `tools/migrations/`: scripts de mantenimiento y migración.

## Cooperativo

El anfitrión simula la partida y la invitada recibe el estado. Ambas pueden comprar, mejorar, contratar personal y shows, reparar máquinas, publicar en Chiringo, contratar influencers, responder reseñas y pedir reparto.

Entre redes distintas (cada jugador en su Wi‑Fi o datos) hace falta TURN además de STUN; el juego incluye relays públicos de Open Relay. Si sigue fallando en redes muy restrictivas, el anfitrión puede definir credenciales propias antes de cargar el juego: `window.TURN_CONFIG = { urls: 'turn:…', username: '…', credential: '…' }` (por ejemplo cuenta gratuita en metered.ca).

## Pruebas

Las pruebas cargan los módulos reales de las ampliaciones y del canal cooperativo, simulan 15 días y comprueban reglas de tendencias, comentarios, influencers, shows, reparto, misiones y acciones de la invitada.

No cubren el dibujo en pantalla ni la conexión PeerJS real.

## Archivos heredados

`server.js` y `coop-latency.test.js` pertenecen a una versión anterior del cooperativo basada en WebSocket. El juego actual usa PeerJS, por lo que están archivados en `legacy/`.
