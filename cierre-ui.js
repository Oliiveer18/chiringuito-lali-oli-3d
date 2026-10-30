/* v25: bloque «Chiringo · balance de hoy» en el informe de cierre.
   El balance de seguidores se resuelve una sola vez al cerrar la jornada y se aplica en ese momento: al abrir el día siguiente no se repite. */
import { Game, Net } from './state.js?v=28.17.2-flat-sand';
import { escapeHtml, eur } from './util.js?v=28.17.2-flat-sand';
import { closeSocialDay } from './v12.js?v=28.17.2-flat-sand';

function closeHtml() {
  const u = Game.upgrades;
  if (!u || u.socialFollowers == null || !Game.dayStats) return '';
  let r = u.socialReport;
  if (Net.role !== 'guest') { try { r = closeSocialDay() || r; } catch (e) { } }
  if (!r || r.dia !== Game.day) return '';
  const rows = (a, sg) => a.length ? a.map(x => '<li><span>' + escapeHtml(x.k) + '</span><b>' + sg + x.n + '</b></li>').join('') : '<li class="rd-mut">Nada</li>';
  const net = (r.net >= 0 ? '+' : '−') + Math.abs(r.net), st = u.socialStats;
  return '<div class="rd-close"><div class="rd-close-h">Chiringo · balance de hoy</div>' +
    '<p class="rd-close-p">👥 <b>' + r.before + '</b> seguidores al abrir → <b>' + r.total + '</b> definitivos (' + net + ')</p>' +
    '<div class="rd-close-grid"><div><h5 class="g">Ganados +' + r.gainSum + '</h5><ul>' + rows(r.gains, '+') + '</ul></div>' +
    '<div><h5 class="b">Perdidos −' + r.lossSum + '</h5><ul>' + rows(r.losses, '−') + '</ul></div></div>' +
    '<p class="rd-close-n">Variación neta ' + net + ' · total definitivo ' + r.total + '. ' +
    (st ? 'Alcance ' + st.reach + ' · interacciones ' + st.interactions + ' (❤️ ' + st.likes + ' · 💬 ' + st.comments + '). ' : '') +
    (r.resp ? 'Respuesta del público a lo publicado: ×' + String(r.resp).replace('.', ',') + '. ' : '') +
    'Este balance ya está aplicado y no se repetirá al abrir mañana. Caja: ' + eur(Game.money) + '.</p></div>';
}

const rb = document.getElementById('rep-body');
if (rb) {
  new MutationObserver(() => {
    if (Game.mode !== 'report' || rb.querySelector('.rd-close')) return;
    let h = ''; try { h = closeHtml(); } catch (e) { }
    if (!h) return;
    const rv = rb.querySelector('.reviews');
    if (rv) rv.insertAdjacentHTML('beforebegin', h); else rb.insertAdjacentHTML('beforeend', h);
  }).observe(rb, { childList: true });
}

