// ===================== MONEDA Y TIPO DE CAMBIO =====================
// Base para operaciones futuras en USD con cobro opcional en ARS.

function monedaLoadConfig(data) {
  if (!data) return;
  MONEDA_CFG.blueVenta = Number(data.blueVenta || 0);
  MONEDA_CFG.fuente = data.fuente || 'Blue Venta';
  MONEDA_CFG.updated = data.updated || '';
}

function cotizacionBlueVenta() { return Number(MONEDA_CFG.blueVenta || 0); }
function usdAArs(montoUsd, cotizacion) { return Number(montoUsd || 0) * Number(cotizacion || cotizacionBlueVenta() || 0); }
function arsAUsd(montoArs, cotizacion) {
  var valor = Number(cotizacion || cotizacionBlueVenta() || 0);
  return valor ? Number(montoArs || 0) / valor : 0;
}

function openMoneda() {
  if (!puede('editar_tipo_cambio')) { toast('Solo un administrador puede actualizar la cotización', 'var(--rd)'); return; }
  setVal('fxBlueVenta', MONEDA_CFG.blueVenta || '');
  el('fxFuente').value = MONEDA_CFG.fuente || 'Blue Venta';
  setVal('fxNota', '');
  el('fxActual').textContent = MONEDA_CFG.blueVenta ? 'Vigente: USD 1 = ' + pesos(MONEDA_CFG.blueVenta) + ' · ' + (MONEDA_CFG.fuente || 'Blue Venta') + (MONEDA_CFG.updated ? ' · ' + MONEDA_CFG.updated : '') : 'Todavía no hay cotización configurada.';
  monedaRenderHistorial();
  openM('mMoneda');
}

function monedaRenderHistorial() {
  var wrap = el('fxHistorial'); if (!wrap) return;
  var lista = (window.TIPOS_CAMBIO || []).slice().sort(function(a, b) { return (b._ordenFx || 0) - (a._ordenFx || 0); }).slice(0, 8);
  wrap.innerHTML = lista.length ? '<div class="dst">Últimas actualizaciones</div>' + lista.map(function(x) {
    return '<div class="dr"><span class="dl">' + esc(x.fuente || 'Blue Venta') + (x.usuario && x.usuario.nombre ? ' · ' + esc(x.usuario.nombre) : '') + '</span><span class="mono">' + pesos(x.blueVenta || 0) + '</span></div>';
  }).join('') : '<div class="mu" style="font-size:11px">Sin historial todavía.</div>';
}

function monedaGuardar() {
  if (!puede('editar_tipo_cambio')) { toast('Sin permiso para actualizar la cotización', 'var(--rd)'); return; }
  var blueVenta = Number(val('fxBlueVenta'));
  if (!Number.isFinite(blueVenta) || blueVenta <= 0) { toast('Ingresá una cotización Blue Venta válida', 'var(--rd)'); return; }
  var data = { blueVenta: blueVenta, fuente: el('fxFuente').value, nota: val('fxNota').trim(), updated: hoy() };
  FB.setMoneda(data, function(err) {
    if (err) { toast('Error: ' + err, 'var(--rd)'); return; }
    closeM('mMoneda'); toast('Cotización Blue Venta actualizada');
  });
}
