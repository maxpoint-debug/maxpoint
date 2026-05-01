// ===================== APP — init y navegacion =====================

function showView(v, navEl) {
  VIEW = v;
  PAGE = 1;

  // Nav highlight
  document.querySelectorAll('.ni').forEach(function(n) { n.classList.remove('active'); });
  if (navEl) navEl.classList.add('active');

  // Titulo
  var titulos = { reps: 'Reparaciones', rpus: 'Repuestos', cot: 'Cotizador', cli: 'Clientes', pag: 'Pagos', bal: 'Balance' };
  el('topT').textContent = titulos[v] || v;

  // Botones topbar
  setTopActions(v);

  render();
}

function setTopActions(v) {
  var ta = el('topA');
  ta.innerHTML = '';
  if (v === 'reps') {
    ta.appendChild(mkBtn('btn-g btn-sm', '⬆️ Importar historico', importarHist));
    ta.appendChild(mkBtn('btn-g btn-sm', '📥 CSV', expCSV));
    ta.appendChild(mkBtn('btn-p', '＋ Nuevo ingreso', openNewRep));
  } else if (v === 'rpus') {
    ta.appendChild(mkBtn('btn-p', '＋ Nuevo repuesto', openNewRepuesto));
  } else if (v === 'cot') {
    ta.appendChild(mkBtn('btn-g btn-sm', '📋 Actualizar lista', openListaParser));
    ta.appendChild(mkBtn('btn-p', '＋ Cotizar', openCotizador));
  } else if (v === 'bal') {
    ta.appendChild(mkBtn('btn-g btn-sm', '📋 Actualizar catalogo', openCatAdmin));
  }
}

// Cerrar autocompletes al hacer click fuera
document.addEventListener('click', function(e) {
  if (!e.target.closest('#wNom'))    el('acNomL').style.display = 'none';
  if (!e.target.closest('#wEq'))     el('acEqL').style.display  = 'none';
  if (!e.target.closest('#catWrap'))   { var d = el('catDrop');    if (d) d.classList.remove('open'); }
  if (!e.target.closest('#rpCliWrap')) { var d2 = el('rpCliDrop'); if (d2) d2.classList.remove('open'); }
  if (!e.target.closest('#cotWrap'))    { var d3 = el('cotDrop');   if (d3) d3.classList.remove('open'); }
});

// Init
setTopActions('reps');
