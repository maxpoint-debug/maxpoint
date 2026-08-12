// ===================== NOTIFICACIONES INTERNAS =====================
// Interfaz por usuario. La persistencia y el listener se conectan desde Firebase.
var NOTIFICACIONES = [];

function notificacionesFecha(n) {
  var t = n && n.creadaEn && n.creadaEn.toDate ? n.creadaEn.toDate() : null;
  if (!t) return (n && n.fecha) || '';
  var dif = Date.now() - t.getTime();
  if (dif < 60000) return 'Ahora';
  if (dif < 3600000) return 'Hace ' + Math.floor(dif / 60000) + ' min';
  if (dif < 86400000) return 'Hace ' + Math.floor(dif / 3600000) + ' h';
  if (dif < 172800000) return 'Ayer';
  return t.toLocaleDateString('es-AR') + ' · ' + t.toLocaleTimeString('es-AR', { hour:'2-digit', minute:'2-digit' });
}
function notificacionesRender() {
  var badge = el('notifBadge'), panel = el('notifPanel'); if (!badge || !panel) return;
  var noLeidas = NOTIFICACIONES.filter(function(n) { return !n.leida; }).length;
  badge.textContent = noLeidas > 99 ? '99+' : noLeidas;
  badge.style.display = noLeidas ? '' : 'none';
  panel.innerHTML = '<div class="notif-head"><span>NOTIFICACIONES</span><span class="mu">' + (noLeidas ? noLeidas + ' sin leer' : '') + '</span></div>';
  if (!NOTIFICACIONES.length) { panel.innerHTML += '<div class="notif-empty">No tenés notificaciones.</div>'; return; }
  NOTIFICACIONES.forEach(function(n) {
    var item = document.createElement('div'); item.className = 'notif-item' + (n.leida ? '' : ' unread') + (n.prioridad === 'importante' ? ' importante' : '');
    item.innerHTML = '<div class="notif-title">' + esc(n.titulo || 'Notificación') + '</div><div class="notif-msg">' + esc(n.mensaje || '') + '</div><div class="notif-time">' + esc(notificacionesFecha(n)) + '</div>';
    item.addEventListener('click', function() { notificacionesAbrir(n); }); panel.appendChild(item);
  });
}
function notificacionesToggle() { var p = el('notifPanel'); if (!p) return; p.classList.toggle('open'); notificacionesRender(); }
function notificacionesCerrar() { var p = el('notifPanel'); if (p) p.classList.remove('open'); }
function notificacionesAbrir(n) {
  if (!n) return;
  if (!n.leida && window.FB && typeof FB.marcarNotificacionLeida === 'function') FB.marcarNotificacionLeida(n.id, function() {});
  notificacionesCerrar();
  if (n.entidad === 'reparacion' && n.entidadId && typeof openDet === 'function') { openDet(n.entidadId); return; }
  if (n.entidad === 'repuesto') { showView('rpus', document.getElementById('nav-rpus')); return; }
}
document.addEventListener('click', function(e) { if (!e.target.closest('#notifWrap')) notificacionesCerrar(); });
window.notificacionesToggle = notificacionesToggle;
window.notificacionesCerrar = notificacionesCerrar;
window.notificacionesRender = notificacionesRender;
