/* Elogios por producto. Lo importa variety.js. */
import { PRAISE } from './report.js?v=28.17.1-online-web';
const add = (arr, items) => { for (const it of items) if (!arr.includes(it)) arr.push(it); };
// ---------- Elogios con más sabor canario ----------
add(PRAISE.cerveza, [
  'La cerveza bien fría, como debe ser en el sur.',
  'Dorada helada, perfecta para la calima.',
  'La cerveza a su punto, ni fría ni caliente.',
  'Bien tirada y bien fría, como manda la tradición.'
]);
add(PRAISE.barraquito, [
  'El barraquito con su canela, como los de toda la vida.',
  'Un barraquito bien hecho, de los que quitan las penas.',
  'El barraquito estaba de otro nivel.',
  'Con su licor y su canela, como manda la tradición.'
]);
add(PRAISE.batido, [
  'Batido de plátano de Canarias, espeso y buenísimo.',
  'El plátano se notaba de aquí, no de importado.',
  'Batido espeso y frío, para repetir.',
  'El plátano canario se notaba, muy bueno.'
]);
add(PRAISE.papas, [
  'Papas arrugadas con mojo verde, como las de casa.',
  'El mojo picón tenía su punto, muy canario.',
  'Papas del país con su mojo, para chuparse los dedos.',
  'El mojo estaba hecho en el mortero, se notaba.'
]);
add(PRAISE.queso, [
  'Queso asado con mojo, en su punto justo.',
  'El queso de la isla, bien dorado.',
  'Queso asado con mojo verde, muy bueno.',
  'El queso estaba en su punto, para repetir.'
]);
add(PRAISE.pescado, [
  'Pescado del día, fresco y bien hecho.',
  'Se notaba que era pescado de la isla, muy bueno.',
  'Pescado fresco, en su punto.',
  'El pescado del día, para repetir.'
]);
