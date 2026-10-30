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

El cooperativo de `v28.17.1-online-web` usa mensajes cifrados sobre WebSocket
seguro, sin WebRTC, TURN, cuentas ni tarjeta. Crear sala genera un código privado
de 26 caracteres: usa «Copiar código privado» y pégalo en el otro dispositivo.
El anfitrión debe mantener la página abierta.

El transporte utiliza el [broker público de EMQX](https://www.emqx.com/en/mqtt/public-mqtt5-broker),
ofrecido para prototipos, aprendizaje y pruebas, no como servicio de producción
garantizado. No hay alta de cuenta ni facturación en el juego. No se promete
disponibilidad continua, latencia fija ni conexión desde cualquier cortafuegos.
Consulta la evidencia y los límites en `SERVICE-3D-FIXES.md`.

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

`broker-peer.js` sustituye el canal directo por WSS público de pruebas. Los
mensajes se cifran con AES-GCM en el navegador, usan nonces aleatorios y autentican
el tema de destino. El secreto de sala tiene 130 bits de entropía; los temas
usan un hash con dominio separado que no revela ni el código ni la clave AES.
No se publican mensajes retenidos. No compartas el código fuera de tu pareja.
El broker sigue viendo direcciones IP, horarios, tamaños y temas opacos.

Las instantáneas se comprimen si ambos navegadores lo admiten. Hay límites de
tamaño y colas, rechazo de mensajes repetidos y reconexión durante 45 segundos.
Un corte pausa la jornada y la recuperación resincroniza el estado del anfitrión.
Esta vía evita depender del paso de UDP/NAT; WSS todavía puede estar bloqueado
en redes restrictivas. Una futura versión de producción debe usar un servicio
propio o gestionado con garantías, no depender de un broker público de pruebas.

## Pruebas

Las pruebas cargan los módulos reales de las ampliaciones y del canal cooperativo, simulan 15 días y comprueban reglas de tendencias, comentarios, influencers, shows, reparto, misiones y acciones de la invitada.

`npm test` no cubre el dibujo ni la conexión real. `npm run test:online3d` sí abre
dos perfiles de navegador y conecta realmente al broker público.

## Archivos heredados

`server.js` y `coop-latency.test.js` pertenecen a otra versión de WebSocket con
servidor propio y permanecen archivados en `legacy/`. Los helpers ICE de
`net-rtc.js` son compatibilidad histórica: el transporte activo no los utiliza.
