/* coast-palette.js · Paleta costa canaria estilizada (paridad 2D drawSea) */
import { clamp } from './util.js?v=28.16.1-vfx3d';

/** Línea de costa en Z mundo (rompiente / espuma 2D) */
// Deja las dos filas de hamacas y la tarima sobre playa seca.
export const SHORE_WORLD_Z = -5.6;

export function coastNightness(h) {
  return clamp((h - 19.8) / 2, 0, 0.75);
}

function hexRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}

function mixRgb(a, b, t) {
  return {
    r: a.r + (b.r - a.r) * t,
    g: a.g + (b.g - a.g) * t,
    b: a.b + (b.b - a.b) * t
  };
}

/** Colores y factores para uniforms GPU (h = hora juego, nt = nightness, windFactor ~1 o >1) */
export function coastPalette(h, nt, windFactor = 1) {
  const shallow = mixRgb(hexRgb('#2ec2c4'), hexRgb('#2b4a6a'), nt);
  const deep = mixRgb(hexRgb('#1f8fb0'), hexRgb('#2b2f5a'), nt);
  const sandDry = mixRgb(hexRgb('#edd8a6'), hexRgb('#6b5f78'), nt * 0.65);
  const sandWet = mixRgb(hexRgb('#0f8b8d'), hexRgb('#1a3038'), nt * 0.55);
  const sunSpec = h > 17.5 ? clamp((h - 17.5) / 2, 0, 0.6) * (1 - nt) : 0;
  const wind = windFactor > 1.2 ? 1.85 : 1.0;
  return { shallow, deep, sandDry, sandWet, sunSpec, wind };
}
