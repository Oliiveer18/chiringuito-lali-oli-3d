/* Detalles de la reseña. Lo importa variety.js. */
import { DETAIL } from './report.js?v=28.17.3-flat-sand';
const add = (arr, items) => { for (const it of items) if (!arr.includes(it)) arr.push(it); };

// ---------- Detalles con más variantes ----------
add(DETAIL.order, [
  'Pedimos {items}.',
  'Fuimos de {items}.',
  'Nuestro plan: {items}.',
  'Pedimos {items}, sin más.',
  'Entre los dos: {items}.',
  'Nuestro pedido: {items}.'
]);
add(DETAIL.wait, [
  'Esperamos {mins} minutos, que se hicieron largos.',
  'Con {mins} minutos de cola, se hace cuesta arriba.',
  'Nos tocaron {mins} minutos de espera.',
  'Cola de {mins} minutos, al sol.',
  'Una espera de {mins} minutos, no es lo ideal.'
]);
add(DETAIL.tableYes, [
  'Mesa con vistas al mar, un acierto.',
  'Comimos mirando las olas, muy bien.',
  'Mesa en primera línea, repetiremos.',
  'Mesa en la arena, qué más se puede pedir.',
  'Mesa para nosotros, y con vistas de sobra.'
]);
add(DETAIL.tableNo, [
  'Sin mesa, tocó toalla.',
  'Nos lo llevamos a la arena.',
  'Comimos de pie, como se pudo.',
  'Para llevar y a la arena.',
  'Sin mesa, pero con las vistas no se sufre tanto.'
]);
add(DETAIL.dataPosNW, [
  'Cuenta de {price}, contentos.',
  'Por {price}, bien servidos.',
  'Cuenta de {price}, sin queja.',
  'Por {price}, bien gastados.'
]);
add(DETAIL.dataTipNW, [
  '{price} y propina de {tip}, merecido.',
  'Cuenta de {price} y propina: repetiremos.',
  'Con {price} pagados y {tip} de propina, quedamos tan a gusto.',
  'Cuenta de {price} y propina de {tip}: señal de que repetiremos.'
]);
