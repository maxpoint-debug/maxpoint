// ===================== COTIZADOR DE USADOS =====================
var USADOS = [];

// El cotizador conserva su propio orden para no depender de helpers externos.
function cotOrdenarPorModelo(items) {
  return (items || []).slice().sort(function(a, b) {
    function partes(modelo) {
      var texto = String(modelo || '').toLowerCase();
      var generacion = (texto.match(/iphone\s*(\d{1,2})/) || texto.match(/\b(\d{1,2})\b/) || [0, 999])[1];
      var variante = /pro\s*max/.test(texto) ? 4 : /\bpro\b/.test(texto) ? 3 : /\bplus\b/.test(texto) ? 2 : /\bmini\b/.test(texto) ? 1 : 0;
      var capacidad = (texto.match(/(\d+)\s*(?:gb|tb)\b/) || [0, 0])[1];
      return { generacion: Number(generacion), variante: variante, capacidad: Number(capacidad), texto: texto };
    }
    var x = partes(a.modelo), y = partes(b.modelo);
    return x.generacion - y.generacion || x.variante - y.variante || x.capacidad - y.capacidad
      || x.texto.localeCompare(y.texto, 'es', { numeric: true, sensitivity: 'base' });
  });
}

function cotLoadUsados(docs) {
  USADOS = cotOrdenarPorModelo((docs || []).map(function(u) {
    return Object.assign({}, u, { modeloClave:u.modeloClave || window.MAXPOINT_COTIZADOR.modeloClave(u.modelo, true) });
  }));
}
function cotLoadConfig(data) {
  COTIZADOR_CFG = window.MAXPOINT_COTIZADOR.config(data || {});
  if (_cotSel && typeof cotCalcular === 'function') cotCalcular();
}

function cotConfigRender() {
  var c = window.MAXPOINT_COTIZADOR.config(COTIZADOR_CFG);
  var valores = {
    cfgCotBatUmbral:c.bateria.umbral, cfgCotBatFallback:c.bateria.fallbackUsd,
    cfgCotEstLeve:c.estetica.leveUsd, cfgCotEstMarcada:c.estetica.marcadaUsd,
    cfgCotPantalla:c.pantalla.fallbackUsd, cfgCotFace:c.fallas.faceIdFallbackUsd,
    cfgCotCamNormal:c.fallas.camaraTraseraNormalUsd, cfgCotCamPro:c.fallas.camaraTraseraProUsd,
    cfgCotVidrio:c.fallas.vidrioCamaraUsd, cfgCotBotones:c.fallas.botonesUsd,
    cfgCotPieza:c.fallas.piezaDesconocidaUsd, cfgCotMinimo:c.totalMinimoUsd
  };
  Object.keys(valores).forEach(function(id) { setVal(id, valores[id]); });
  el('cfgCotSinCoincidencia').value = c.sinCoincidencia;
  el('cfgCotRedondeo').value = c.redondeo;
}

function cotGuardarConfig() {
  if (!puede('actualizar_cotizador')) { toast('Solo un administrador puede modificar el cotizador', 'var(--rd)'); return; }
  var datos = {
    bateria:{ umbral:Number(val('cfgCotBatUmbral')), fallbackUsd:Number(val('cfgCotBatFallback')) },
    estetica:{ leveUsd:Number(val('cfgCotEstLeve')), marcadaUsd:Number(val('cfgCotEstMarcada')) },
    pantalla:{ fallbackUsd:Number(val('cfgCotPantalla')) },
    fallas:{ faceIdFallbackUsd:Number(val('cfgCotFace')), camaraTraseraNormalUsd:Number(val('cfgCotCamNormal')),
      camaraTraseraProUsd:Number(val('cfgCotCamPro')), vidrioCamaraUsd:Number(val('cfgCotVidrio')),
      botonesUsd:Number(val('cfgCotBotones')), piezaDesconocidaUsd:Number(val('cfgCotPieza')) },
    sinCoincidencia:el('cfgCotSinCoincidencia').value,
    redondeo:el('cfgCotRedondeo').value,
    totalMinimoUsd:Number(val('cfgCotMinimo')),
    updated:hoy()
  };
  if (datos.bateria.umbral < 0 || datos.bateria.umbral > 100) { toast('El umbral de batería debe estar entre 0 y 100', 'var(--rd)'); return; }
  var btn = el('btnGuardarCfgCot'); btn.disabled = true; btn.textContent = 'Guardando...';
  FB.setCotizadorConfig(datos, function(err) {
    btn.disabled = false; btn.textContent = 'Guardar parámetros';
    if (err) { toast('Error: ' + err, 'var(--rd)'); return; }
    cotLoadConfig(datos); toast('Parámetros del cotizador actualizados');
  });
}

var _cotRes = [], _cotIdx = -1, _cotSel = null;

function openCotizador() {
  cotReset();
  openM('mCot');
}

function cotReset() {
  setVal('cotQ', '');
  setVal('cotBat', '100');
  var d = el('cotDrop'); if (d) d.classList.remove('open');
  var q = el('cotQ'); if (q) q.classList.remove('sel');
  if (el('cotEstetica')) el('cotEstetica').value = 'ok';
  if (el('cotPantalla')) el('cotPantalla').value = 'ok';
  ['cotFaceId','cotCamTras','cotCamFront','cotCarcasa','cotVidrioCam','cotBotones'].forEach(function(id) { if (el(id)) el(id).value = 'ok'; });
  setVal('cotPieza', '');
  if (el('cotPanel'))    el('cotPanel').style.display = 'none';
  if (el('cotResultado')) el('cotResultado').style.display = 'none';
  _cotSel = null;
  _cotExtras = [];
  cotRenderExtras();
  if (el('btnCotWA'))    el('btnCotWA').style.display = 'none';
  if (el('btnCotPrint')) el('btnCotPrint').style.display = 'none';
}

function cotBuscar(q) {
  var drop = el('cotDrop');
  q = (q || '').trim();
  if (q.length < 2 || !USADOS.length) { drop.classList.remove('open'); return; }
  var words = q.toLowerCase().split(/\s+/);
  _cotRes = cotOrdenarPorModelo(USADOS.filter(function(u) {
    return words.every(function(w) { return u.modelo.toLowerCase().includes(w); });
  })).slice(0, 10);
  if (!_cotRes.length) {
    drop.innerHTML = '<div style="padding:12px;font-size:12px;color:var(--mu);text-align:center">Sin resultados</div>';
    drop.classList.add('open'); return;
  }
  drop.innerHTML = _cotRes.map(function(u, i) {
    var lbl = u.modelo;
    words.forEach(function(w) {
      var re = new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g,'\\$&') + ')','gi');
      lbl = lbl.replace(re,'<mark style="background:rgba(240,180,41,.22);color:var(--acc);border-radius:2px;font-style:normal">$1</mark>');
    });
    return '<div class="cat-item" onmousedown="cotElegir(' + i + ')">'
      + '<span style="flex:1;font-size:13px">' + lbl + '</span>'
      + '<span style="font-size:12px;color:var(--bl);font-weight:700">USD ' + u.precio_usd + '</span>'
      + '</div>';
  }).join('');
  _cotIdx = -1;
  drop.classList.add('open');
}

function cotKeyDown(e) {
  var drop = el('cotDrop');
  var items = drop.querySelectorAll('.cat-item');
  if (!drop.classList.contains('open')) return;
  if (e.key === 'ArrowDown') { e.preventDefault(); _cotIdx = Math.min(_cotIdx+1, items.length-1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); _cotIdx = Math.max(_cotIdx-1, 0); }
  else if (e.key === 'Enter' && _cotIdx >= 0) { e.preventDefault(); cotElegir(_cotIdx); return; }
  else if (e.key === 'Escape') { drop.classList.remove('open'); return; }
  items.forEach(function(el,i) { el.classList.toggle('act', i===_cotIdx); });
}

function cotElegir(i) {
  var u = _cotRes[i]; if (!u) return;
  _cotSel = u;
  el('cotQ').value = u.modelo;
  el('cotQ').classList.add('sel');
  el('cotDrop').classList.remove('open');
  el('cotPanel').style.display = '';
  cotCalcular();
}

// Array de descuentos extras [ { lbl, usd } ]
var _cotExtras = [];

function cotAgregarExtra() {
  var id = 'extra_' + Date.now();
  _cotExtras.push({ id: id, lbl: '', usd: 0 });
  cotRenderExtras();
}

function cotQuitarExtra(id) {
  _cotExtras = _cotExtras.filter(function(e) { return e.id !== id; });
  cotRenderExtras();
  cotCalcular();
}

function cotRenderExtras() {
  var wrap = el('cotExtrasWrap');
  if (!wrap) return;
  wrap.innerHTML = '';
  _cotExtras.forEach(function(extra) {
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:6px;align-items:center;margin-bottom:6px;position:relative';
    row.innerHTML =
      '<div style="flex:1;position:relative">'
      + '<input type="text" placeholder="Buscar repuesto o descripcion..." autocomplete="off"'
      + ' style="width:100%;background:var(--s2);border:1px solid var(--bd);border-radius:6px;padding:7px 10px;color:var(--tx);font-size:12px;outline:none"'
      + ' data-id="' + extra.id + '"'
      + ' value="' + (extra.lbl || '') + '"'
      + ' oninput="cotExtraBuscar(this)"'
      + '/>'
      + '<div class="cat-drop" id="ed_' + extra.id + '"></div>'
      + '</div>'
      + '<input type="number" placeholder="USD" min="0"'
      + ' style="width:70px;background:var(--s2);border:1px solid var(--bd);border-radius:6px;padding:7px 8px;color:var(--rd);font-size:12px;font-weight:700;text-align:center;outline:none"'
      + ' data-id="' + extra.id + '"'
      + ' value="' + (extra.usd || '') + '"'
      + ' oninput="cotExtraSetUsd(this)"'
      + '/>'
      + '<button data-eid="' + extra.id + '" onclick="cotQuitarExtra(this.dataset.eid)" style="background:none;border:none;color:var(--mu);cursor:pointer;font-size:16px;padding:0 4px">&#10006;</button>';
      + ' style="background:none;border:none;color:var(--mu);cursor:pointer;font-size:16px;padding:0 4px">x</button>';
    wrap.appendChild(row);
  });
}

function cotExtraBuscar(input) {
  var id  = input.dataset.id;
  var q   = input.value.trim();
  var drop = el('ed_' + id);
  if (!drop) return;
  if (q.length < 2 || !window.CATALOGO || !window.CATALOGO.length) { drop.classList.remove('open'); return; }
  var words = q.toLowerCase().split(/\s+/);
  var res = (window.CATALOGO || []).filter(function(p) {
    return words.every(function(w) { return p.label.toLowerCase().includes(w); });
  }).slice(0, 8);
  if (!res.length) { drop.classList.remove('open'); return; }
  drop.innerHTML = res.map(function(p) {
    return '<div class="cat-item" data-lbl="' + p.label.replace(/"/g,'&quot;') + '" data-usd="' + p.costo_usd + '" data-eid="' + id + '" onmousedown="cotExtraElegirEl(this)">' + '<span style="flex:1;font-size:12px">' + p.label + '</span>' + '<span style="font-size:11px;color:var(--bl);font-weight:700;margin-left:8px">USD ' + p.costo_usd + '</span>' + '</div>';
      + '<span style="flex:1;font-size:12px">' + p.label + '</span>'
      + '<span style="font-size:11px;color:var(--bl);font-weight:700;margin-left:8px">USD ' + p.costo_usd + '</span>'
      + '</div>';
  }).join('');
  drop.classList.add('open');
  // Actualizar label en array
  var extra = _cotExtras.find(function(e) { return e.id === id; });
  if (extra) extra.lbl = input.value;
}

function cotExtraElegirEl(el) {
  cotExtraElegir(el.dataset.eid, el.dataset.lbl, parseFloat(el.dataset.usd));
}

function cotExtraElegir(id, lbl, usd) {
  var extra = _cotExtras.find(function(e) { return e.id === id; });
  if (!extra) return;
  extra.lbl = lbl;
  extra.usd = Math.round(usd);
  cotRenderExtras();
  cotCalcular();
  var drop = el('ed_' + id); if (drop) drop.classList.remove('open');
}

function cotExtraSetUsd(input) {
  var id  = input.dataset.id;
  var extra = _cotExtras.find(function(e) { return e.id === id; });
  if (extra) { extra.usd = parseFloat(input.value) || 0; cotCalcular(); }
}

function cotCalcular() {
  if (!_cotSel) return;
  var base = Number(_cotSel.precio_usd || 0), bat = parseInt(el('cotBat').value, 10) || 100;
  var pieza = val('cotPieza').trim();
  var resultado = window.MAXPOINT_COTIZADOR.calcular({
    modelo:_cotSel.modelo, base:base, bateria:bat,
    estetica:el('cotEstetica').value, pantalla:el('cotPantalla').value,
    problemas:{ faceid:el('cotFaceId').value, camtras:el('cotCamTras').value, camfront:el('cotCamFront').value,
      carcasa:el('cotCarcasa').value, vidriocam:el('cotVidrioCam').value, botones:el('cotBotones').value, pieza:pieza ? 'si' : 'ok' },
    piezaDescripcion:pieza, extras:_cotExtras, catalogo:window.CATALOGO || [], config:COTIZADOR_CFG
  });
  window._cotInternoResultado = resultado;

  var row = function(lbl, val, color) {
    return '<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--bd);font-size:13px">'
      + '<span style="color:var(--mu)">' + lbl + '</span>'
      + '<span style="font-weight:700;color:' + color + '">' + val + '</span></div>';
  };

  var html = row('Precio base', 'USD ' + base, 'var(--tx)')
  resultado.descuentos.forEach(function(e) {
    var concepto = e.lbl + (e.repuesto ? '<div style="font-size:10px;color:var(--mu);margin-top:2px">' + esc(e.repuesto) + '</div>' : '');
    html += row(concepto, '- USD ' + e.usd, 'var(--rd)');
  });
  resultado.revision.forEach(function(lbl) { html += row(lbl, 'Revisión presencial', 'var(--or)'); });
  html += '<div style="background:' + (resultado.requiereRevision ? 'rgba(240,180,41,.08)' : 'rgba(45,206,137,.08)') + ';border:1px solid ' + (resultado.requiereRevision ? 'rgba(240,180,41,.25)' : 'rgba(45,206,137,.25)') + ';'
    + 'border-radius:8px;padding:14px;text-align:center;margin-top:10px">'
    + '<div style="font-size:10px;color:var(--mu);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">' + (resultado.requiereRevision ? 'Resultado' : 'Precio de compra sugerido') + '</div>'
    + '<div style="font-size:' + (resultado.requiereRevision ? '18' : '34') + 'px;font-weight:900;color:' + (resultado.requiereRevision ? 'var(--or)' : 'var(--gr)') + '">' + (resultado.requiereRevision ? 'Valor sujeto a revisión presencial' : 'USD ' + resultado.total) + '</div>'
    + '</div>';

  el('cotResultadoInner').innerHTML = html;
  el('cotResultado').style.display = '';
  if (el('btnCotWA'))    el('btnCotWA').style.display = '';
  if (el('btnCotPrint')) el('btnCotPrint').style.display = '';
}

// ── PARSER LISTA WHATSAPP ────────────────────────────────────
function openListaParser() {
  if (!puede('actualizar_cotizador')) { toast('Solo un administrador puede actualizar la base del cotizador', 'var(--rd)'); return; }
  openM('mLista');
  try {
    setVal('listaInput', '');
    el('listaPreview').style.display = 'none';
    el('listaPreviewContent').innerHTML = '';
    el('btnSubirLista').disabled = true;
    cotReiniciarListas();
    cotConfigRender();
    cotManualCargar();
  } catch (err) {
    toast('Se abrió la lista, pero no se pudo cargar la base: ' + err.message, 'var(--or)');
  }
}

function cotManualCargar() {
  var sel = el('cotManualSel'); if (!sel) return;
  sel.innerHTML = '<option value="">' + (USADOS.length ? 'Nuevo modelo' : 'No hay modelos cargados: agregá el primero') + '</option>' + cotOrdenarPorModelo(USADOS).map(function(u) {
    return '<option value="' + String(u.modelo).replace(/"/g, '&quot;') + '">' + esc(u.modelo) + '</option>';
  }).join('');
  cotManualNuevo();
}

function cotManualElegir() {
  var modelo = val('cotManualSel');
  var equipo = USADOS.find(function(u) { return u.modelo === modelo; });
  var partes = equipo ? String(equipo.modelo).match(/^(.*?)(?:\s+(\d+(?:GB|TB)))$/i) : null;
  setVal('cotManualModelo', partes ? partes[1] : (equipo ? equipo.modelo : ''));
  setVal('cotManualCapacidad', partes ? partes[2].toUpperCase() : '');
  setVal('cotManualPrecio', equipo ? equipo.precio_usd : '');
}

function cotManualNuevo() {
  var sel = el('cotManualSel'); if (sel) sel.value = '';
  setVal('cotManualModelo', ''); setVal('cotManualCapacidad', ''); setVal('cotManualPrecio', '');
  var modelo = el('cotManualModelo'); if (modelo) modelo.focus();
}

function cotGuardarManual() {
  if (!puede('actualizar_cotizador')) { toast('Solo un administrador puede actualizar la base del cotizador', 'var(--rd)'); return; }
  var modeloBase = val('cotManualModelo').trim().replace(/\s+/g, ' ');
  var capacidad = val('cotManualCapacidad').trim().toUpperCase().replace(/\s+/g, '');
  if (/^\d+$/.test(capacidad)) capacidad += 'GB';
  var modelo = modeloBase && capacidad ? modeloBase + ' ' + capacidad : '';
  var precio = Number(val('cotManualPrecio'));
  if (!modelo || !/^\d+(GB|TB)$/.test(capacidad) || !Number.isFinite(precio) || precio < 0) { toast('Completá modelo, almacenamiento y valor USD válido', 'var(--rd)'); return; }
  var modeloOriginal = val('cotManualSel');
  var base = USADOS.slice(), indice = base.findIndex(function(u) { return u.modelo === (modeloOriginal || modelo); });
  var modeloClave = window.MAXPOINT_COTIZADOR.modeloClave(modelo, true);
  if (indice === -1) base.push({ modelo: modelo, modeloClave:modeloClave, precio_usd: precio });
  else base[indice] = Object.assign({}, base[indice], { modelo: modelo, modeloClave:modeloClave, precio_usd: precio });
  var btn = el('btnCotManual'); btn.disabled = true; btn.textContent = 'Guardando...';
  FB.setUsados(base, function(err) {
    btn.disabled = false; btn.textContent = 'Guardar modelo';
    if (err) { toast('Error: ' + err, 'var(--rd)'); return; }
    USADOS = cotOrdenarPorModelo(base); cotManualCargar();
    toast(indice === -1 ? 'Modelo agregado' : 'Valor actualizado');
  });
}

var _listaItems = [], _listasSesion = [], _lineasIgnoradas = 0;

function parsearLista() {
  var txt = val('listaInput');
  if (!txt.trim()) {
    el('listaPreviewContent').innerHTML = '<div style="color:var(--or);font-size:12px">Pegá una lista antes de interpretarla.</div>';
    el('listaPreview').style.display = '';
    el('btnSubirLista').disabled = true;
    return;
  }
  var items = [], ignoradas = 0, modeloActual = '';
  txt.split('\n').forEach(function(original) {
    var linea = original.trim(); if (!linea) return;
    var datos = window.MAXPOINT_COTIZADOR.datosModelo(linea);
    if (datos && datos.capacidad) modeloActual = window.MAXPOINT_COTIZADOR.etiquetaModelo(linea);
    var limpia = linea.replace(/(\d)[.,](\d{3})\b/g, '$1$2').replace(/x\s*\d+\b/gi, ' ').replace(/\d+\s*%/g, ' ');
    var numeros = (limpia.match(/\d+(?:\.\d+)?/g) || []).map(Number);
    if (datos) {
      var usados = [Number(datos.generacion), Number(datos.capacidad.replace(/[^0-9]/g,''))];
      usados.forEach(function(n) { var i = numeros.indexOf(n); if (i >= 0) numeros.splice(i, 1); });
    }
    var precio = numeros.length ? numeros[numeros.length - 1] : 0;
    if (modeloActual && Number.isFinite(precio) && precio > 0) {
      items.push({ modelo:modeloActual, modeloClave:window.MAXPOINT_COTIZADOR.modeloClave(modeloActual, true), precio_usd:precio });
      modeloActual = '';
    } else if (!datos) ignoradas++;
  });
  items = window.MAXPOINT_COTIZADOR.consolidar([items]);
  _lineasIgnoradas += ignoradas;

  if (!items.length) {
    el('listaPreviewContent').innerHTML = '<div style="color:var(--rd);font-size:12px">No se detectaron modelos. Revisá el formato.</div>';
    el('listaPreview').style.display = '';
    el('btnSubirLista').disabled = true;
    return;
  }

  _listasSesion.push(items);
  _listaItems = window.MAXPOINT_COTIZADOR.consolidar(_listasSesion);
  el('listaPreviewContent').innerHTML = cotOrdenarPorModelo(_listaItems).map(function(u) {
    return '<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--bd);font-size:12px">'
      + '<span>' + u.modelo + '</span>'
      + '<span style="color:var(--bl);font-weight:700">USD ' + u.precio_usd + '</span>'
      + '</div>';
  }).join('');

  el('listaPreview').style.display = '';
  el('btnSubirLista').disabled = false;
  setVal('listaInput', '');
  el('listaSesionInfo').textContent = _listasSesion.length + ' lista(s) procesada(s) · ' + _listaItems.length + ' valores finales · ' + _lineasIgnoradas + ' línea(s) ignorada(s)';
  toast('Lista ' + _listasSesion.length + ' procesada: ' + items.length + ' modelo(s)');
}

function cotReiniciarListas() {
  _listaItems = []; _listasSesion = []; _lineasIgnoradas = 0;
  setVal('listaInput', '');
  if (el('listaPreview')) el('listaPreview').style.display = 'none';
  if (el('listaPreviewContent')) el('listaPreviewContent').innerHTML = '';
  if (el('listaSesionInfo')) el('listaSesionInfo').textContent = 'Todavía no procesaste listas en esta actualización.';
  if (el('btnSubirLista')) el('btnSubirLista').disabled = true;
}

// El listener directo evita depender de atributos inline y no permite que el
// botón falle silenciosamente en navegadores con políticas más estrictas.
(function vincularInterpretarLista() {
  var boton = el('btnInterpretarLista');
  if (!boton) return;
  boton.addEventListener('click', function() {
    try {
      parsearLista();
    } catch (err) {
      el('listaPreviewContent').innerHTML = '<div style="color:var(--rd);font-size:12px">No se pudo interpretar la lista: ' + esc(err.message) + '</div>';
      el('listaPreview').style.display = '';
      el('btnSubirLista').disabled = true;
      toast('Error al interpretar la lista', 'var(--rd)');
      console.error('Error al interpretar lista de usados:', err);
    }
  });
})();

function subirLista() {
  if (!puede('actualizar_cotizador')) { toast('Solo un administrador puede actualizar la base del cotizador', 'var(--rd)'); return; }
  if (!_listaItems.length) return;
  var base = _listaItems.slice();
  var btn = el('btnSubirLista');
  btn.disabled = true; btn.textContent = 'Guardando...';
  FB.setUsados(base, function(err) {
    btn.disabled = false; btn.textContent = 'Actualizar base';
    if (err) { toast('Error: ' + err, 'var(--rd)'); return; }
    USADOS = cotOrdenarPorModelo(base);
    closeM('mLista');
    toast('Base reemplazada por la actualización actual — ' + base.length + ' modelos');
  });
}

// ── WHATSAPP + IMPRIMIR ──────────────────────────────

function cotAbrirWA() {
  if (!_cotSel) return;
  setVal('waNombre', '');
  setVal('waTel', '');
  openM('mCotWA');
}

function cotEnviarWA() {
  var nombre = val('waNombre').trim();
  var tel    = val('waTel').trim().replace(/[^0-9]/g, '');
  if (!tel) { toast('Ingresa el telefono', 'var(--rd)'); return; }

  var bat      = parseInt(el('cotBat').value) || 100;
  var estetica = el('cotEstetica').value;
  var pantalla = el('cotPantalla').value;
  var resultado = window._cotInternoResultado || {};

  var partes = [];
  if (nombre) partes.push('Hola ' + nombre + '!');
  else partes.push('Hola!');
  partes.push('');
  partes.push('Te paso la cotizacion de tu equipo:');
  partes.push('');
  partes.push('Modelo: ' + _cotSel.modelo);
  if (bat < window.MAXPOINT_COTIZADOR.config(COTIZADOR_CFG).bateria.umbral) partes.push('Bateria: ' + bat + '%');
  if (estetica === 'leve')    partes.push('Estetica: Detalles leves');
  if (estetica === 'marcado') partes.push('Estetica: Muy marcado');
  if (pantalla === 'rota')    partes.push('Pantalla: Rota');
  _cotExtras.forEach(function(e) {
    if (e.usd) partes.push((e.lbl || 'Descuento') + (e.repuesto ? ' (' + e.repuesto + ')' : '') + ': - USD ' + e.usd);
  });
  partes.push('');
  partes.push(resultado.requiereRevision ? 'Valor de toma: sujeto a revisión presencial' : 'Valor de toma en parte de pago: USD ' + resultado.total);
  partes.push('');
  partes.push('Cualquier consulta estamos disponibles!');
  partes.push('MaxPoint - Sistema de Taller');

  var msg = partes.join('\n');
  var url = 'https://wa.me/' + tel + '?text=' + encodeURIComponent(waTextoPlano(msg));
  window.open(url, '_blank');
  closeM('mCotWA');
}
function cotImprimir() {
  if (!_cotSel) return;
  var inner = el('cotResultadoInner');
  if (!inner) return;
  var resultado = window._cotInternoResultado || {};

  var w = window.open('', '_blank');
  w.document.write(
    '<!DOCTYPE html><html><head><meta charset="UTF-8">'
    + '<title>Cotizacion MaxPoint</title>'
    + '<style>body{font-family:system-ui,sans-serif;max-width:400px;margin:20px auto;color:#111}'
    + 'h2{font-size:18px;margin-bottom:4px}h3{font-size:14px;color:#555;margin:0 0 16px}'
    + '.row{display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #eee;font-size:14px}'
    + '.total{background:#f0fff4;border:1px solid #86efac;border-radius:8px;padding:14px;text-align:center;margin-top:16px}'
    + '.total div:first-child{font-size:11px;color:#666;text-transform:uppercase;letter-spacing:1px}'
    + '.total div:last-child{font-size:28px;font-weight:900;color:#16a34a}'
    + '.footer{margin-top:20px;font-size:11px;color:#999;text-align:center}'
    + '@media print{button{display:none}}'
    + '</style></head><body>'
    + '<h2>Cotizacion MaxPoint</h2>'
    + '<h3>' + _cotSel.modelo + '</h3>'
    + inner.innerHTML.replace(/var\(--[a-z]+\)/g,'#666').replace(/var\(--rd\)/g,'#dc2626').replace(/var\(--tx\)/g,'#111').replace(/var\(--bd\)/g,'#e5e7eb')
    + '<div class="total"><div>Valor de toma en parte de pago</div><div>' + (resultado.requiereRevision ? 'Sujeto a revisión presencial' : 'USD ' + resultado.total) + '</div></div>'
    + '<div class="footer">MaxPoint — Sistema de Taller</div>'
    + '<br><button onclick="window.print()" style="width:100%;padding:10px;background:#111;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px">Imprimir</button>'
    + '</body></html>'
  );
  w.document.close();
}
