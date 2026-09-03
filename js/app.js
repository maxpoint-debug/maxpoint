// ===================== APP — init y navegacion =====================

function showView(v, navEl) {
  // Cerrar sidebar en mobile al navegar
  if (window.innerWidth <= 700) closeSidebar();
  VIEW = v;
  PAGE = 1;

  // Nav highlight
  document.querySelectorAll('.ni').forEach(function(n) { n.classList.remove('active'); });
  if (navEl) navEl.classList.add('active');

  // Titulo
  var titulos = { reps: 'Reparaciones', rpus: 'Repuestos', seg: 'Seguimientos', pos: 'Caja', ops: 'Operaciones de caja', ven: 'Ventas de equipos', prod: 'Productos', inv: 'Inventario', stock: 'Stock de equipos', cot: 'Cotizador', cli: 'Clientes', pag: 'Pagos', bal: 'Centro de Control', users: 'Usuarios' };
  el('topT').textContent = titulos[v] || v;

  // Botones topbar
  setTopActions(v);

  render();
}

function setTopActions(v) {
  var ta = el('topA');
  ta.innerHTML = '';
  if (v === 'reps') {
    ta.appendChild(mkBtn('btn-p', '＋ Nuevo ingreso', openNewRep));
  } else if (v === 'rpus') {
    ta.appendChild(mkBtn('btn-p', '＋ Nuevo repuesto', openNewRepuesto));
  } else if (v === 'pos') {
    ta.appendChild(mkBtn('btn-g btn-sm', 'Operaciones', function() { showView('ops'); }));
    ta.appendChild(mkBtn('btn-g btn-sm', 'Cobrar reparación', posElegirReparacionCobro));
    if (puede('ver_ventas_equipos')) ta.appendChild(mkBtn('btn-g btn-sm', 'Vender equipo', openNewVenta));
  } else if (v === 'ven') {
    ta.appendChild(mkBtn('btn-p', '+ Vender equipo', openNewVenta));
  } else if (v === 'ops') {
    ta.appendChild(mkBtn('btn-p', '+ Vender accesorio', function() { showView('pos'); }));
  } else if (v === 'prod') {
    if (puede('gestionar_productos')) ta.appendChild(mkBtn('btn-p', '+ Nuevo producto', function() { posAbrirProducto(); }));
  } else if (v === 'inv') {
    if (puede('ajustar_stock_pos')) ta.appendChild(mkBtn('btn-p', '+ Movimiento', function() { posAbrirAjuste(); }));
  } else if (v === 'stock') {
    ta.appendChild(mkBtn('btn-g btn-sm', 'Copiar lista WA', copiarListaStock));
    ta.appendChild(mkBtn('btn-p', '+  Agregar equipo', function() { openNewStock(null); }));
  } else if (v === 'cot') {
    if (puede('actualizar_cotizador')) ta.appendChild(mkBtn('btn-g btn-sm', 'Actualizar lista', openListaParser));
    ta.appendChild(mkBtn('btn-p', '+  Cotizar', openCotizador));
  } else if (v === 'bal') {
    if (puede('editar_tipo_cambio')) ta.appendChild(mkBtn('btn-g btn-sm', 'USD Blue Venta', openMoneda));
    ta.appendChild(mkBtn('btn-g btn-sm', 'Actualizar catalogo', openCatAdmin));
  }
}

// Cerrar autocompletes al hacer click fuera
document.addEventListener('click', function(e) {
  if (!e.target.closest('#wNom'))    el('acNomL').style.display = 'none';
  if (!e.target.closest('#wEq'))     el('acEqL').style.display  = 'none';
  if (!e.target.closest('#catWrap'))   { var d = el('catDrop');    if (d) d.classList.remove('open'); }
  if (!e.target.closest('#rpCliWrap')) { var d2 = el('rpCliDrop'); if (d2) d2.classList.remove('open'); }
});

// Init
setTopActions('reps');

function toggleSidebar() {
  var sb  = document.getElementById('sidebar');
  var ov  = document.getElementById('sidebarOverlay');
  if (!sb) return;
  var open = sb.classList.contains('open');
  if (open) { closeSidebar(); } else { openSidebar(); }
}

function openSidebar() {
  var sb = document.getElementById('sidebar');
  var ov = document.getElementById('sidebarOverlay');
  if (sb) sb.classList.add('open');
  if (ov) ov.classList.add('open');
}

function closeSidebar() {
  var sb = document.getElementById('sidebar');
  var ov = document.getElementById('sidebarOverlay');
  if (sb) sb.classList.remove('open');
  if (ov) ov.classList.remove('open');
}

// Exponer handlers usados desde HTML inline (compatibilidad Safari/iOS).
window.toggleSidebar = toggleSidebar;
window.openSidebar = openSidebar;
window.closeSidebar = closeSidebar;
