/* Season weather table; no Game/DOM imports (safe for career.js in Node tests). */
import { SEASON_DAYS, SPECIAL_DAYS } from '../config.js?v=28.17.0-online-web';
import { pickW } from '../util.js?v=28.17.0-online-web';

export function buildSeasonForecast() {
  const f = [];
  for (let d = 1; d <= SEASON_DAYS + 1; d++) {
    let w = pickW({ sol: 52, panza: 20, calima: 13, viento: 15 });
    if (SPECIAL_DAYS[d] && SPECIAL_DAYS[d].forceWeather) w = SPECIAL_DAYS[d].forceWeather;
    if (d === 1) w = 'sol';
    f.push(w);
  }
  return f;
}
