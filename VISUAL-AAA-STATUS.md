# Estado de la renovación visual AAA — Chiringuito 3D

## Lo implementado y comprobado
- Mar: shader Gerstner-like con espuma, fresnel y specular mejorados (commit anterior).
- Productos y máquinas: siguen siendo procedurales de Three.js (cilindros, cajas, esferas).
- No hay modelos GLTF, OBJ ni texturas externas en el repositorio.

## Limitaciones
- Calidad visual máxima alcanzable sin assets externos: procedural de alta gama.
- Estaciones solo visuales (gofre, cóctel, churros, helado, algodón, freidora) no tienen interacción nueva.
- No se han añadido partículas complejas de vapor/cocción para preservar FPS en móvil.

## Próximos pasos posibles
- Sustituir createItem3D y los builders de upgrades-3d.js por geometría más detallada.
- Añadir un loader GLTF si se aportan modelos.
- Reforzar iluminación y materiales del kiosco.
