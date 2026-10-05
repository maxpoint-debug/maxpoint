// ===================== HELPERS PUROS =====================
// Sin efectos secundarios. Fácil de testear.

// --- Strings ---
function esc(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// --- Fechas ---
function hoy() {
  return new Date().toLocaleDateString('es-AR');
}
function horaActual() {
  return new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' });
}

// --- Números ---
function pesos(n) {
  return '$' + Number(n || 0).toLocaleString('es-AR');
}

// --- Badges HTML ---
var BADGE_ESTADO = {
  'Ingresado':   'b-ingresado',
  'En proceso':  'b-proceso',
  'Listo':       'b-listo',
  'Entregado':   'b-entregado',
  'No aprobado': 'b-noaprobado',
  'Garantia':    'b-garantia',
};
var BADGE_RPU = {
  'Esperando':  'b-esperando',
  'Encargado':  'b-encargado',
  'Llego':      'b-llego',
  'Usado':      'b-usado',
};
var BADGE_PAGO = {
  'Pendiente': 'b-pendiente',
  'Parcial':   'b-parcial',
  'Pagado':    'b-pagado',
  'Sin cargo': 'b-pagado',
  'Saldo autorizado': 'b-parcial',
};
var COLOR_ESTADO = {
  'Ingresado':   'var(--bl)',
  'En proceso':  'var(--or)',
  'Listo':       'var(--gr)',
  'Entregado':   'var(--mu)',
  'No aprobado': 'var(--rd)',
  'Garantia':    'var(--pu)',
};

function badgeEst(e) {
  var cls = BADGE_ESTADO[e] || 'b-ingresado';
  return '<span class="badge ' + cls + '">' + esc(e || 'Ingresado') + '</span>';
}
function badgePag(p) {
  var cls = BADGE_PAGO[p] || 'b-pendiente';
  return '<span class="badge ' + cls + '">' + esc(p || 'Pendiente') + '</span>';
}
function colorEst(e) {
  return COLOR_ESTADO[e] || 'var(--mu)';
}

// --- Orden siguiente ---
function nextOrden() {
  if (!REPS.length) return '#0001';
  var nums = REPS.map(function(r) {
    return parseInt((r.orden || '#0').replace(/[^0-9]/g, '')) || 0;
  });
  return '#' + String(Math.max.apply(null, nums) + 1).padStart(4, '0');
}

// --- Detección de repuesto sugerido ---
function detectarRepuesto(falla, equipo) {
  var f = (falla || '').toLowerCase();
  for (var i = 0; i < REGLAS_REPUESTO.length; i++) {
    var regla = REGLAS_REPUESTO[i];
    var match = regla.palabras.some(function(p) { return f.includes(p); });
    if (match) {
      return { nombre: regla.rep + (equipo ? ' — ' + equipo : ''), equipo: equipo };
    }
  }
  return null;
}

// --- DOM helpers ---
function mkBtn(clases, texto, handler) {
  var b = document.createElement('button');
  b.className = 'btn ' + clases;
  b.textContent = texto;
  b.addEventListener('click', handler);
  return b;
}
function mkBadge(cls, texto) {
  var s = document.createElement('span');
  s.className = 'badge ' + cls;
  s.textContent = texto;
  return s;
}
function el(id) {
  return document.getElementById(id);
}
function val(id) {
  var e = el(id);
  return e ? e.value.trim() : '';
}
function setVal(id, v) {
  var e = el(id);
  if (e) e.value = v || '';
}

// Evita que WhatsApp reciba caracteres sustitutos o pares Unicode que algunos
// hostings/navegadores convierten en el símbolo "rombo con signo de pregunta".
function waTextoPlano(texto) {
  return String(texto || '')
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '')
    .replace(/\uFFFD/g, '')
    .replace(/[\u2600-\u27BF]/g, '');
}

function copiarTexto(texto, mensaje) {
  if (!texto) { toast('No hay dato para copiar', 'var(--rd)'); return; }
  function copiarFallback() {
    var area = document.createElement('textarea');
    area.value = texto; area.style.position = 'fixed'; area.style.opacity = '0';
    document.body.appendChild(area); area.select();
    try { document.execCommand('copy'); toast(mensaje || 'Copiado'); }
    catch(e) { toast('Error al copiar', 'var(--rd)'); }
    document.body.removeChild(area);
  }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(texto).then(function() { toast(mensaje || 'Copiado'); }).catch(copiarFallback);
  } else {
    copiarFallback();
  }
}

// --- Toast ---
function toast(msg, color) {
  var t = el('toast');
  if (!t) return;
  t.textContent = msg;
  t.style.borderLeftColor = color || 'var(--gr)';
  t.classList.add('show');
  setTimeout(function() { t.classList.remove('show'); }, 2800);
}

// Orden visual natural para equipos: iPhone 11, 11 Pro, 11 Pro Max, 12...
// No modifica los datos; se usa solo al presentar sugerencias y listados.
function compararModelos(a, b) {
  function partes(modelo) {
    var texto = String(modelo || '').toLowerCase();
    var generacion = (texto.match(/iphone\s*(\d{1,2})/) || texto.match(/\b(\d{1,2})\b/) || [0, 999])[1];
    var variante = /pro\s*max/.test(texto) ? 4 : /\bpro\b/.test(texto) ? 3 : /\bplus\b/.test(texto) ? 2 : /\bmini\b/.test(texto) ? 1 : 0;
    var capacidad = (texto.match(/(\d+)\s*(?:gb|tb)\b/) || [0, 0])[1];
    return { generacion: Number(generacion), variante: variante, capacidad: Number(capacidad), texto: texto };
  }
  var x = partes(a), y = partes(b);
  return x.generacion - y.generacion || x.variante - y.variante || x.capacidad - y.capacidad
    || x.texto.localeCompare(y.texto, 'es', { numeric: true, sensitivity: 'base' });
}

function ordenarPorModelo(items, campo) {
  return (items || []).slice().sort(function(a, b) {
    var modeloA = campo ? a[campo] : a;
    var modeloB = campo ? b[campo] : b;
    return compararModelos(modeloA, modeloB);
  });
}

// --- Finanzas operativas ---
// En reparaciones nuevas, pagos[] es la fuente de cobro. En registros legacy
// sin pagos registrados, se conserva sena como importe ya cobrado.
function pagosReparacion(r) {
  var vistos={};
  var pagos = Array.isArray(r && r.pagos) ? r.pagos.filter(function(p) {
    if (!(Number(p && p.monto || 0) > 0) || p.estado === 'revertido') return false;
    if (p.pagoId) { if (vistos[p.pagoId]) return false; vistos[p.pagoId]=true; }
    return true;
  }) : [];
  if (pagos.length) return pagos.slice();
  // `sena` sólo es fuente en documentos realmente legacy. Las órdenes del
  // esquema operativo deben tener pago estructurado para impactar saldo/Caja.
  var senaLegacy = Number(r && r.cobroHistoricoNoConciliado || 0);
  if (!senaLegacy && r && r.controlComisionV1 !== true) senaLegacy = Number(r.sena || 0);
  return senaLegacy > 0 ? [{ monto:senaLegacy, fecha:(r && r.fecha) || '', medio:'Registro previo', legacy:true }] : [];
}

function totalCobradoReparacion(r) {
  return pagosReparacion(r).reduce(function(total, pago) { return total + Number(pago.monto || 0); }, 0);
}

function resolucionFinancieraReparacion(r) {
  if (r && r.resolucionFinanciera) return r.resolucionFinanciera;
  if (r && (r.es_garantia === 'si' || r.resultadoServicio === 'Garantía / retrabajo')) return 'sin_cargo_garantia';
  if (r && (r.resultadoServicio === 'Presupuesto no aprobado' || r.resultadoServicio === 'Sin intervención / no era falla del equipo')) return 'no_corresponde';
  return 'cobrable';
}

function reparacionEsSinCargo(r) {
  return ['sin_cargo_garantia','sin_cargo_cortesia','no_corresponde'].indexOf(resolucionFinancieraReparacion(r)) !== -1;
}

function saldoReparacion(r) {
  return Math.max(0, Number(r && r.presupuesto || 0) - totalCobradoReparacion(r));
}

function estadoPagoReparacion(r) {
  var presupuesto = Number(r && r.presupuesto || 0);
  var cobrado = totalCobradoReparacion(r), resolucion = resolucionFinancieraReparacion(r);
  if (reparacionEsSinCargo(r)) return 'Sin cargo';
  if (presupuesto <= 0) return cobrado > 0 ? 'Pagado' : 'Pendiente';
  if (cobrado >= presupuesto) return 'Pagado';
  if (resolucion === 'saldo_autorizado') return 'Saldo autorizado';
  return cobrado > 0 ? 'Parcial' : 'Pendiente';
}

function reparacionPuedeEntregarseFinancieramente(r) {
  var estado = estadoPagoReparacion(r);
  return estado === 'Pagado' || estado === 'Sin cargo' || estado === 'Saldo autorizado';
}

// Campos derivados sin mezclar la seña legacy con el historial nuevo.
function resumenFinancieroReparacion(r) {
  var presupuesto = Number(r && r.presupuesto || 0);
  var totalCobrado = totalCobradoReparacion(r);
  return {
    totalCobrado: totalCobrado,
    saldo: Math.max(0, presupuesto - totalCobrado),
    pago: estadoPagoReparacion(r)
  };
}

// Sólo Cobrada impacta en métricas. Reservada/Pendiente no son venta realizada;
// los históricos sin estado se tratan como Cobrada para mantener compatibilidad.
function ventaValidaParaMetricas(venta) {
  return (venta && venta.estadoVenta ? venta.estadoVenta : 'Cobrada') === 'Cobrada';
}

// --- Modales ---
function openM(id)  { el(id).classList.add('open'); if(typeof applePrepararSugerencias==='function')applePrepararSugerencias(); }
function closeM(id) { el(id).classList.remove('open'); }

// --- Sync bar ---
function syncOk(msg) {
  var b = el('syncbar');
  b.className = 'syncbar ok';
  el('syncmsg').textContent = msg || 'Sincronizado';
  setTimeout(function() { b.style.display = 'none'; }, 3000);
}
function syncErr(msg) {
  var b = el('syncbar');
  b.className = 'syncbar err';
  b.style.display = 'flex';
  el('syncmsg').textContent = msg || 'Error de conexion';
}
function syncLoad(msg) {
  var b = el('syncbar');
  b.className = 'syncbar load';
  b.style.display = 'flex';
  el('syncmsg').textContent = msg || 'Procesando...';
}

// --- Sidebar counters ---
function updSidebar() {
  var listos    = REPS.filter(function(r) { return r.estado === 'Listo'; }).length;
  var esperando = RPUS.filter(function(r) { return r.estado === 'Esperando'; }).length;

  var nb1 = el('nb-l'), nb2 = el('nb-r');
  if (nb1) { nb1.textContent = listos;    nb1.style.display = listos    ? '' : 'none'; }
  if (nb2) { nb2.textContent = esperando; nb2.style.display = esperando ? '' : 'none'; }

  var s1 = el('sb1'), s2 = el('sb2'), s3 = el('sb3');
  if (s1) s1.textContent = REPS.length.toLocaleString();
  if (s2) s2.textContent = listos;
  if (s3) s3.textContent = esperando;
}

// --- CSV Export ---
function expCSV() {
  var cols = ['orden','fecha','nombre','telefono','equipo','modelo','falla','presupuesto','sena','estado','pago','tecnico'];
  var nl   = '\n';
  var rows = getFiltrados().map(function(r) {
    return cols.map(function(c) {
      return '"' + String(r[c] || '').replace(/"/g, '""') + '"';
    }).join(',');
  });
  var csv  = cols.join(',') + nl + rows.join(nl);
  var a    = document.createElement('a');
  a.href   = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = 'maxpoint-reps.csv';
  a.click();
  toast('CSV exportado');
}
