# Integridad del servicio y cooperativo 3D

Origen: rama `fix/3d-service-integrity`, basada en `experiment/vfx-clientes-3d`
en `e011f02b1b623cf8861603e76907520c08744e4a`. Copia independiente:
`Oliiveer18/chiringuito-lali-oli-3d`, publicación desde `preview-3d` y registro
de entrega en `fix/3d-online-web`. Identificador de versión:
`v28.17.1-online-web`.

## Cambios

- **Estado único:** `Game.service3D` contiene bandejas, unidades con calidad y
  estaciones temporizadas. El modelo es serializable y no depende del renderer.
- **Stock:** reservar una preparación consume una unidad una sola vez; las
  preparaciones en marcha reservan hueco en bandeja. Sin stock o capacidad se
  rechaza la acción antes de descontar género.
- **Preparación:** café con tiempo real de simulación, cerveza con calidad
  persistente y plancha que no entrega crudo y sigue avanzando hasta quemarse.
  Una caña interrumpida devuelve su reserva una sola vez, sin premio.
- **Entrega:** una unidad preparada completa una línea pendiente. No activa
  `startPart()`, no cobra otro ingrediente y no se retira si la entrega falla.
  Las líneas en preparación automática no admiten otra entrega duplicada.
- **Dinero:** la calidad se recompensa al cobrar la comanda completada, no al
  producir. El cobro y la finalización de comanda tienen protección contra
  duplicados; caja, ingresos y propinas de calidad se registran juntos.
- **Tiempo:** estaciones fuera del render; pausa y velocidades usan el reloj de
  simulación. El avance determinista respeta la pausa, conserva fracciones de
  tiempo y actualiza el mundo 3D sin dibujar todos los pasos intermedios.
- **Control:** objetivo contextual actualizado aunque conserve el mismo tipo;
  posición tomada del cliente visible; Espacio sin doble acción heredada;
  captura de puntero y cancelación por desenfoque, pausa o salida de alcance.
- **Limpieza:** la vajilla se añade al finalizar la tarea, no al solicitarla;
  fregar conserva la comida y el renderer del limpiador no libera mesas.
- **Transiciones:** vaciado de bandejas y estaciones; preparados descartados
  registrados como merma al cierre, sin reembolsar género ya utilizado.
- **Representación:** reinicio de posición al cambiar la jornada, bandejas
  visuales derivadas del estado compartido y escala DPR del overlay corregida.
- **Cooperativo:** intenciones del invitado resueltas por el anfitrión, id de
  servicio, deduplicación de secuencias y snapshots de bandejas/estaciones.
  La secuencia se recupera del snapshot para evitar bloqueos al reconectar.
- **Sala privada:** código aleatorio de 26 caracteres, copia/pegado y contenido
  cifrado con AES-GCM. El broker solo recibe temas hash y texto cifrado; no el
  secreto de sala. La reconexión conserva la identidad de la partida.
- **Movimiento online:** personajes locales distintos, posición y orientación
  compartidas e interpolación remota. El anfitrión valida secuencias, velocidad,
  límites, colisiones y proximidad a estaciones o clientes.
- **Coherencia:** el invitado transmite su última posición antes de una acción.
  El lado de llegada de los clientes también se incluye en los snapshots.
- **HUD del invitado:** día, hora y dinero se actualizan sin exigir las
  estadísticas privadas de simulación que solo conserva el anfitrión.
- **Reconexión:** una interrupción pausa el servicio; al recuperar el canal se
  restaura el envío y se evita duplicar manejadores de mensajes.

## Pruebas

```sh
npm test
npm run test:service3d
npm run test:service3d:browser
npm run test:online3d
```

`service-3d.test.mjs` incluye 26 regresiones del modelo puro. El recorrido de
navegador prueba menús, preparación con eventos reales, entrega y cobro,
cancelación, pausa, controles opuestos, velocidades, limpieza, snapshots,
reinicio, redimensionado y cierre. Es posible definir `TEST_URL` para comprobar
una vista alojada y `TEST_ARTIFACTS` para guardar sus capturas fuera del repo.

`online-3d.browser.test.mjs` usa dos perfiles aislados y un enlace WSS cifrado
real. Comprueba sala/código privado, entrada en servicio, movimiento en ambos sentidos,
preparación y stock compartidos, rechazo por distancia, entrega y cobro, pausa
y recuperación tras cerrar realmente el socket. La entrega usa una fixture controlada
de cliente y posición para aislar esa acción de la navegación.

Las suites adicionales de gestión, mercado, servicio, persistencia y reputación
se conservan. `camera-beta.test.mjs` sigue siendo una prueba heredada incompatible
con el bootstrap de esta rama; ya fallaba en el commit de partida y no se presenta
como una regresión nueva.

## Límites de este paquete

Se conserva la preparación automática anterior cuando se usa la acción de
atender sin una unidad preparada compatible. No se ha convertido todavía toda
la jornada a un circuito manual exclusivo.

La plancha contextual sigue iniciando papas; la selección de otros platos, el
panel de comandas y la reorganización de HUD son trabajo posterior. Tampoco se
ha unificado aún la posición del jugador libre con el actor de tareas de sala.

El transporte de `v28.17.0` ya no usa WebRTC ni depende de TURN. El anterior
canal sí falló en la prueba sandbox/cloud, por lo que se sustituyó en lugar
de presentar esa prueba fallida como una conexión entre redes validada.

El nuevo enlace usa el [broker público EMQX](https://www.emqx.com/en/mqtt/public-mqtt5-broker),
que está ofrecido para prototipos y pruebas, no para disponibilidad de producción
garantizada. No se ha abierto una cuenta, activado facturación ni contratado un
relay. No se certifican todas las redes, datos móviles, VPN o cortafuegos, ni se
han medido FPS en un móvil físico. El cifrado no oculta IP, horarios o volumen
al proveedor. El anfitrión debe permanecer conectado.

`relay.test.mjs` comprueba códigos privados aleatorios, separación entre clave y
tema público, codec MQTT con fragmentación, límites, cifrado AES-GCM, alteración,
destino incorrecto, compresión negociada y rechazo de paquetes retenidos/repetidos.
La comprobación adicional del 30 de octubre de 2026 usó el juego publicado
en GitHub Pages con anfitrión en Chromium del sandbox e invitado en el
navegador cloud separado. Ambos cargaron `v28.17.0-online-web`. Se verificaron:

- Entrada mediante el código privado y el mismo identificador de servicio.
- Café preparado por el anfitrión y plancha preparada/recogida por el invitado;
  stock y ambas bandejas coincidentes, sin cobro por preparar.
- Movimiento del invitado mediante entrada de teclado real, reflejado en el host.
- Pausa solicitada por el invitado y reanudación desde el anfitrión.
- Cierre real del WebSocket del invitado: el host pausó y reconectó al mismo
  servicio, conservando las dos bandejas y los 400 € de caja.
- Cero errores de página registrados en ambos entornos.

Esta prueba valida esa conexión entre dos entornos separados. No equivale a
una garantía universal para todos los operadores o a un SLA de producción.

`v28.17.1` mantiene el mismo transporte y corrige además la carrera de nombres
en el guardado: persistencia inmediata al asignar el nombre y título de partida
desde el dato guardado, sin esperar al módulo visual. La prueba de aislamiento
comprueba el nombre en el almacenamiento antes de recargar y vuelve a continuar
la misma partida. Las claves del 2D permanecen separadas e intactas.

### Resultado final de la versión publicada

En `v28.17.1-online-web` de GitHub Pages terminaron correctamente las nueve
pruebas online, las diez de jornada y la prueba de guardado aislado, incluyendo
nombre persistido, recarga y continuación. Las tres suites registraron cero
errores de página. También pasaron `npm test`, sus seis grupos de regresión del
transporte, y la comprobación visual de sala a 375 px con código en dos líneas,
copiado exacto y validación del código incompleto. No son pruebas físicas de
todos los teléfonos o redes y no alteran el límite de disponibilidad del broker.

## Cómo probar el cooperativo

- Abre [la copia 3D en GitHub Pages](https://oliiveer18.github.io/chiringuito-lali-oli-3d/)
  en dos navegadores o dispositivos.
- El anfitrión elige Cooperativo, una partida y Crear sala. Comparte el código
  privado de 26 caracteres con «Copiar código privado».
- La otra persona elige Cooperativo y Unirme con código, lo pega y entra.
- El anfitrión pasa a planificación. Ambos deben confirmar para abrir el servicio.
- Deben verse personajes distintos, movimiento, productos, existencias y dinero
  compartidos. El anfitrión conserva la autoridad de la simulación.

## Vista de pruebas de Computer

```sh
node tools/build-service-preview.mjs /ruta/absoluta/de/salida
```

El constructor copia solo los archivos de ejecución y adapta almacenamiento a
memoria para el iframe de pruebas, que no admite las APIs de persistencia del
juego. También desactiva pantalla completa en ese entorno.

Esta adaptación no modifica los archivos originales ni la publicación de
GitHub. En la vista de pruebas se pierde el guardado al recargar; la versión
normal conserva su mecanismo de guardado. No se ha hecho merge ni despliegue
a `main` del repositorio 2D original.
