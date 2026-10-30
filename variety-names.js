/* Nombres de clientes. Lo importa variety.js. */
import { NAMES } from './config.js?v=28.17.3-flat-sand';
const add = (arr, items) => { for (const it of items) if (!arr.includes(it)) arr.push(it); };
// ---------- Nombres y pueblos (turistas, locales y surfistas) ----------
add(NAMES.turista, [
  'Hannah, Hamburgo','Liam, Mánchester','Sofie, Copenhague','Giulia, Milán','Ana, Madrid',
  'Pierre, Lyon','Olga, Helsinki','Marta, Barcelona','Jon, Dublín','Ingrid, Oslo',
  'Marco, Roma','Nils, Estocolmo','Elena, Berlín','Jonas, Múnich','Marta, Varsovia',
  'Lucas, Lyon','Chloé, Bruselas','Sofía, Bogotá','Mateo, Buenos Aires','Camila, Ciudad de México',
  'Andrés, Madrid','Nora, Oslo','Erik, Estocolmo','Inés, Lisboa','Pedro, Oporto',
  'Anna, Viena','Sara, Milán','Tomás, Dublín','Julia, Ámsterdam','Ben, Londres',
  'Mia, Copenhague','Diego, Santiago de Chile','Léa, París','Finn, Hamburgo','Sanne, Ámsterdam',
  'Kasper, Copenhague','Elisa, Milán','Pablo, Bilbao','Lucía, Valencia','Marta, Sevilla',
  'Iván, Moscú','Nina, Berlín','Tom, Bristol','Eva, Praga','Klara, Viena',
  'Oskar, Varsovia','Lotte, Bruselas','Mads, Aarhus','Freja, Aarhus','Sven, Estocolmo'
]);
add(NAMES.local, [
  'Gara, La Laguna','Adán, Santa Cruz','Nira, La Orotava','Ayoze, Los Realejos',
  'Candelaria, Güímar','Zebenzui, Fasnia','Nerea, Arico','Yeray, Granadilla',
  'Garañona, San Miguel','Aday, Arona','Noa, Adeje','Chaxiraxi, Guía de Isora',
  'Arona, Vilaflor','Iballa, Santiago del Teide','Echedey, Buenavista',
  'Aday, Garachico','Nira, Icod de los Vinos','Ayoze, La Guancha',
  'Gara, San Juan de la Rambla','Adán, Los Silos','Nira, El Tanque',
  'Ayoze, Tacoronte','Candelaria, El Sauzal','Zebenzui, La Matanza',
  'Nerea, La Victoria','Yeray, Santa Úrsula','Garañona, La Esperanza',
  'Gara, Anaga','Adán, San Andrés','Nira, Taganana','Ayoze, Igueste',
  'Candelaria, La Laguna','Zebenzui, La Cuesta','Nerea, Taco','Yeray, La Salud',
  'Garañona, La Candelaria','Aday, Arafo','Noa, Fasnia','Chaxiraxi, Arico',
  'Arona, Granadilla','Iballa, San Isidro','Echedey, Los Abrigos','Aday, El Médano',
  'Nira, La Camella','Ayoze, Costa del Silencio','Gara, Las Chafiras',
  'Adán, Guargacho','Nira, Los Cristianos','Ayoze, Playa de la Arena',
  'Candelaria, Puerto de Santiago','Zebenzui, Tamaimo','Nerea, Santiago del Teide',
  'Yeray, Las Portelas','Garañona, Masca','Aday, Buenavista','Noa, Los Silos'
]);
add(NAMES.surfista, [
  'Nauzet, El Médano','Iballa, Las Américas','Aday, Costa Adeje','Gara, La Caleta',
  'Echedey, Puerto de la Cruz','Noa, Alcalá','Arona, Playa Paraíso',
  'Iballa, La Jaquita','Aday, El Poris','Gara, Abades','Echedey, Güímar',
  'Noa, La Nea','Arona, Radazul','Iballa, Las Galletas','Aday, La Tejita',
  'Gara, El Cabezo','Echedey, La Jaquita','Noa, La Tejita','Arona, El Médano',
  'Iballa, Las Américas','Aday, La Caleta','Gara, Alcalá','Echedey, Puerto de la Cruz',
  'Noa, Playa Paraíso','Arona, La Jaquita','Iballa, El Poris','Aday, Abades',
  'Gara, Güímar','Echedey, La Nea','Noa, Radazul','Arona, Las Galletas',
  'Iballa, La Tejita','Aday, El Cabezo','Gara, Las Américas','Echedey, La Caleta'
]);

