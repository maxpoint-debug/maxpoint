// ===================== COTIZADOR DE USADOS =====================
// Parser de lista WhatsApp + cotizador con descuentos automáticos

// ── Estado ───────────────────────────────────────────────────
var USADOS = [];   // { modelo, cap, precio_usd } — cargado desde Firebase

// Cargar desde Firebase (llamado por firebase.js)
function cotLoadUsados(docs) {
  USADOS = docs || [];
}

// ── COTIZADOR ────────────────────────────────────────────────
function openCotizador() {
  cotReset();
  openM('mCot');
}

function cotReset() {
  setVal('cotQ', '');
  setVal('cotBat', '100');
  el('cotDrop').classList.remove('open');
  el('cotEstetica').value = 'ok';
  el('cotPantalla').value = 'ok';
  el('cotPanel').style.display = 'none';
  el('cotResultado').style.display = 'none';
  var inp = el('cotQ');
  if (inp) inp.classList.remove('sel');
}

// Buscador de modelo
var _cotRes = [];
var _cotIdx = -1;
var _cotSel = null;

function cotBuscar(q) {
  var drop = el('cotDrop');
  q = q.trim();
  if (q.length < 2 || !USADOS.length) { drop.classList.remove('open'); return; }
  var words = q.toLowerCase().split(/\s+/);
  _cotRes = USADOS.filter(function(u) {
    return words.every(function(w) { return u.modelo.toLowerCase().includes(w); });
  }).slice(0, 10);
  if (!_cotRes.length) {
    drop.innerHTML = '<div style="padding:12px;font-size:12px;color:var(--mu);text-align:center">Sin resultados</div>';
    drop.classList.add('open'); return;
  }
  drop.innerHTML = _cotRes.map(function(u, i) {
    var lbl = u.modelo;
    words.forEach(function(w) {
      var re = new RegExp('(' + w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + ')', 'gi');
      lbl = lbl.replace(re, '<mark style="background:rgba(240,180,41,.22);color:var(--acc);border-radius:2px;font-style:normal">$1</mark>');
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
  if (e.key === 'ArrowDown') { e.preventDefault(); _cotIdx = Math.min(_cotIdx + 1, items.length - 1); }
  else if (e.key === 'ArrowUp') { e.preventDefault(); _cotIdx = Math.max(_cotIdx - 1, 0); }
  else if (e.key === 'Enter' && _cotIdx >= 0) { e.preventDefault(); cotElegir(_cotIdx); return; }
  else if (e.key === 'Escape') { drop.classList.remove('open'); return; }
  items.forEach(function(el, i) { el.classList.toggle('act', i === _cotIdx); });
}

function cotElegir(i) {
  var u = _cotRes[i];
  if (!u) return;
  _cotSel = u;
  el('cotQ').value = u.modelo;
  el('cotQ').classList.add('sel');
  el('cotDrop').classList.remove('open');
  el('cotPanel').style.display = '';
  cotCalcular();
}

function cotCalcular() {
  if (!_cotSel) return;

  var base     = _cotSel.precio_usd;
  var resguard = 30;
  var bat      = parseInt(el('cotBat').value) || 100;
  var estetica = el('cotEstetica').value;
  var pantalla = el('cotPantalla').value;

  // Descuento bateria — si < 90% restamos costo de bateria del catalogo
  var descBat = 0;
  var descBatLabel = '';
  if (bat < 90) {
    // Buscar bateria del modelo en CATALOGO
    var modeloCorto = _cotSel.modelo.toLowerCase();
    var batCat = (window.CATALOGO || []).find(function(p) {
      return p.label.toLowerCase().includes('bater') &&
             modeloCorto.split(' ').some(function(w) { return w.length > 2 && p.label.toLowerCase().includes(w); });
    });
    if (batCat) {
      var usd = (window.CFG_CAT && CFG_CAT.usd) ? CFG_CAT.usd : 1425;
      descBat = Math.round(batCat.costo_usd);
      descBatLabel = 'Bateria (' + batCat.label + ')';
    } else {
      descBat = 25; // fallback si no encuentra en catalogo
      descBatLabel = 'Bateria (estimado)';
    }
  }

  // Descuento estetica
  var descEst = 0;
  var descEstLabel = '';
  if (estetica === 'leve')   { descEst = 15; descEstLabel = 'Detalles leves'; }
  if (estetica === 'marcado') { descEst = 35; descEstLabel = 'Muy marcado'; }

  // Descuento pantalla — si rota, costo del modulo del catalogo
  var descPan = 0;
  var descPanLabel = '';
  if (pantalla === 'rota') {
    var modeloCorto2 = _cotSel.modelo.toLowerCase();
    var modCat = (window.CATALOGO || []).find(function(p) {
      return (p.label.toLowerCase().includes('modulo') || p.label.toLowerCase().includes('pantalla')) &&
             modeloCorto2.split(' ').some(function(w) { return w.length > 2 && p.label.toLowerCase().includes(w); });
    });
    if (modCat) {
      var usd2 = (window.CFG_CAT && CFG_CAT.usd) ? CFG_CAT.usd : 1425;
      descPan = Math.round(modCat.costo_usd);
      descPanLabel = 'Modulo (' + modCat.label + ')';
    } else {
      descPan = 60;
      descPanLabel = 'Pantalla (estimado)';
    }
  }

  var total = base - resguard - descBat - descEst - descPan;
  if (total < 0) total = 0;

  // Mostrar resultado
  var html = '<div style="margin-bottom:10px;font-size:13px;color:var(--mu)">'
    + '<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid var(--bd)">'
    + '<span>Precio base</span><span style="color:var(--tx);font-weight:600">USD ' + base + '</span></div>'
    + '<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid var(--bd)">'
    + '<span>Resguardo</span><span style="color:var(--rd)">- USD ' + resguard + '</span></div>';

  if (descBat) html += '<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid var(--bd)">'
    + '<span>' + descBatLabel + '</span><span style="color:var(--rd)">- USD ' + descBat + '</span></div>';
  if (descEst) html += '<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid var(--bd)">'
    + '<span>' + descEstLabel + '</span><span style="color:var(--rd)">- USD ' + descEst + '</span></div>';
  if (descPan) html += '<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid var(--bd)">'
    + '<span>' + descPanLabel + '</span><span style="color:var(--rd)">- USD ' + descPan + '</span></div>';

  html += '</div>'
    + '<div style="background:rgba(45,206,137,.08);border:1px solid rgba(45,206,137,.25);border-radius:8px;padding:14px;text-align:center">'
    + '<div style="font-size:11px;color:var(--mu);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Precio de compra sugerido</div>'
    + '<div style="font-size:32px;font-weight:900;color:var(--gr)">USD ' + total + '</div>'
    + '</div>';

  el('cotResultadoInner').innerHTML = html;
  el('cotResultado').style.display = '';
}

// ── PARSER LISTA WHATSAPP ────────────────────────────────────
function openListaParser() {
  var pin = prompt('PIN:');
  if (pin !== PIN) { toast('PIN incorrecto', 'var(--rd)'); return; }
  setVal('listaInput', '');
  el('listaPreview').style.display = 'none';
  el('listaPreviewContent').innerHTML = '';
  el('btnSubirLista').disabled = true;
  openM('mLista');
}

var _listaItems = [];

function parsearLista() {
  var txt = val('listaInput');
  if (!txt.trim()) return;

  _listaItems = [];
  var lineas = txt.split('\n');
  var modeloActual = null;
  var precioActual = null;

  // Regex para detectar linea de modelo
  // Ej: "📲 14 pro 128GB" o "14 PRO MAX 256GB"
  var reModelo = /(?:📲\s*)?(\d+\s*(?:pro\s*max|pro|plus|air|mini)?\s*\d+\s*(?:gb|tb))/i;
  // Regex para precio x1 — primer precio USD en la linea
  var rePrecio = /(\d{3,4})(?:x1)?💵/i;
  var rePrecio2 = /^(\d{3,4})💵/;

  lineas.forEach(function(linea) {
    linea = linea.trim();
    if (!linea) return;

    // Detectar linea de modelo (tiene numero de modelo y capacidad)
    var mModelo = linea.match(/(?:📲\s*)?((?:iphone\s*)?\d+\s*(?:pro\s*max|pro\s*max|pro|plus|air|mini)?\s*\d+\s*(?:gb|tb))/i);
    if (mModelo) {
      // Limpiar el modelo
      var mod = mModelo[1].trim()
        .replace(/\s+/g, ' ')
        .replace(/gb/i, 'GB')
        .replace(/tb/i, 'TB');
      // Si no empieza con iPhone, agregarlo
      if (!/^iphone/i.test(mod)) mod = 'iPhone ' + mod;
      // Capitalizar pro, max, etc
      mod = mod.replace(/\bpro\b/gi, 'Pro').replace(/\bmax\b/gi, 'Max')
               .replace(/\bplus\b/gi, 'Plus').replace(/\bair\b/gi, 'Air')
               .replace(/\bmini\b/gi, 'Mini');
      modeloActual = mod;
      precioActual = null;
    }

    // Detectar precio x1 en esta linea
    var mPrecio = linea.match(/(\d{3,4})x1\s*💵/) ||
                  linea.match(/^(\d{3,4})\s*💵/) ||
                  linea.match(/(\d{3,4})💵\s*(?:100%|$)/);

    if (mPrecio && modeloActual) {
      var precio = parseInt(mPrecio[1]);
      if (precio >= 100 && precio <= 5000) {
        precioActual = precio;
        // Agregar o actualizar
        var existe = _listaItems.find(function(x) { return x.modelo === modeloActual; });
        if (existe) {
          if (precio < existe.precio_usd) existe.precio_usd = precio;
        } else {
          _listaItems.push({ modelo: modeloActual, precio_usd: precio });
        }
      }
    }
  });

  // Mostrar preview
  if (!_listaItems.length) {
    el('listaPreviewContent').innerHTML = '<div style="color:var(--rd);font-size:12px">No se detectaron modelos. Revisá el formato.</div>';
    el('listaPreview').style.display = '';
    el('btnSubirLista').disabled = true;
    return;
  }

  el('listaPreviewContent').innerHTML = _listaItems.map(function(u) {
    var existe = USADOS.find(function(x) { return x.modelo === u.modelo; });
    var tag = '';
    if (!existe) tag = '<span style="color:var(--gr);font-size:10px;font-weight:700"> NUEVO</span>';
    else if (u.precio_usd < existe.precio_usd) tag = '<span style="color:var(--acc);font-size:10px;font-weight:700"> BAJA</span>';
    else if (u.precio_usd > existe.precio_usd) tag = '<span style="color:var(--mu);font-size:10px;font-weight:700"> SUBE (no actualiza)</span>';
    return '<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--bd);font-size:12px">'
      + '<span>' + u.modelo + tag + '</span>'
      + '<span style="color:var(--bl);font-weight:700">USD ' + u.precio_usd + '</span>'
      + '</div>';
  }).join('');

  el('listaPreview').style.display = '';
  el('btnSubirLista').disabled = false;
}

function subirLista() {
  if (!_listaItems.length) return;

  // Mergear: solo actualizar si precio es menor, agregar si no existe
  var base = USADOS.slice();
  var nuevos = 0; var actualizados = 0;
  _listaItems.forEach(function(item) {
    var idx = base.findIndex(function(x) { return x.modelo === item.modelo; });
    if (idx === -1) {
      base.push(item);
      nuevos++;
    } else if (item.precio_usd < base[idx].precio_usd) {
      base[idx].precio_usd = item.precio_usd;
      actualizados++;
    }
  });

  var btn = el('btnSubirLista');
  btn.disabled = true; btn.textContent = 'Guardando...';

  FB.setUsados(base, function(err) {
    btn.disabled = false; btn.textContent = 'Actualizar base';
    if (err) { toast('Error: ' + err, 'var(--rd)'); return; }
    USADOS = base;
    closeM('mLista');
    toast('Base actualizada — ' + nuevos + ' nuevos, ' + actualizados + ' actualizados');
  });
}
