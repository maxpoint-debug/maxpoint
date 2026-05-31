// ===================== COTIZADOR DE USADOS =====================
var USADOS = [];

function cotLoadUsados(docs) { USADOS = docs || []; }

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
  if (el('cotPanel'))    el('cotPanel').style.display = 'none';
  if (el('cotResultado')) el('cotResultado').style.display = 'none';
  _cotSel = null;
}

function cotBuscar(q) {
  var drop = el('cotDrop');
  q = (q || '').trim();
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

function cotCalcular() {
  if (!_cotSel) return;
  var base     = _cotSel.precio_usd;
  var resguard = 30;
  var bat      = parseInt(el('cotBat').value) || 100;
  var estetica = el('cotEstetica').value;
  var pantalla = el('cotPantalla').value;

  // Descuento bateria
  var descBat = 0, descBatLbl = '';
  if (bat < 90) {
    var mCorto = _cotSel.modelo.toLowerCase();
    var batCat = (window.CATALOGO || []).find(function(p) {
      return p.label.toLowerCase().includes('bater') &&
        mCorto.split(' ').some(function(w) { return w.length > 2 && p.label.toLowerCase().includes(w); });
    });
    descBat    = batCat ? Math.round(batCat.costo_usd) : 20;
    descBatLbl = batCat ? 'Bateria (' + batCat.label + ')' : 'Bateria (estimado)';
  }

  // Descuento estetica
  var descEst = 0, descEstLbl = '';
  if (estetica === 'leve')    { descEst = 15; descEstLbl = 'Detalles leves'; }
  if (estetica === 'marcado') { descEst = 35; descEstLbl = 'Muy marcado'; }

  // Descuento pantalla
  var descPan = 0, descPanLbl = '';
  if (pantalla === 'rota') {
    var mCorto2 = _cotSel.modelo.toLowerCase();
    var modCat = (window.CATALOGO || []).find(function(p) {
      return (p.label.toLowerCase().includes('modulo') || p.label.toLowerCase().includes('pantalla')) &&
        mCorto2.split(' ').some(function(w) { return w.length > 2 && p.label.toLowerCase().includes(w); });
    });
    descPan    = modCat ? Math.round(modCat.costo_usd) : 50;
    descPanLbl = modCat ? 'Modulo (' + modCat.label + ')' : 'Pantalla (estimado)';
  }

  var total = Math.max(0, base - resguard - descBat - descEst - descPan);

  var row = function(lbl, val, color) {
    return '<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--bd);font-size:13px">'
      + '<span style="color:var(--mu)">' + lbl + '</span>'
      + '<span style="font-weight:700;color:' + color + '">' + val + '</span></div>';
  };

  var html = row('Precio base', 'USD ' + base, 'var(--tx)')
    + row('Resguardo', '- USD ' + resguard, 'var(--rd)');
  if (descBat) html += row(descBatLbl, '- USD ' + descBat, 'var(--rd)');
  if (descEst) html += row(descEstLbl, '- USD ' + descEst, 'var(--rd)');
  if (descPan) html += row(descPanLbl, '- USD ' + descPan, 'var(--rd)');

  html += '<div style="background:rgba(45,206,137,.08);border:1px solid rgba(45,206,137,.25);'
    + 'border-radius:8px;padding:14px;text-align:center;margin-top:10px">'
    + '<div style="font-size:10px;color:var(--mu);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Precio de compra sugerido</div>'
    + '<div style="font-size:34px;font-weight:900;color:var(--gr)">USD ' + total + '</div>'
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

  lineas.forEach(function(linea) {
    linea = linea.trim();
    if (!linea) return;

    // Detectar modelo: tiene numero de iphone + capacidad
    var mMod = linea.match(/(?:i?phone\s*)?(\d{1,2}\s*(?:pro\s*max|pro|plus|air|mini)?\s*\d{3}\s*(?:gb|tb))/i);
    if (mMod) {
      var mod = mMod[1].trim().replace(/\s+/g,' ')
        .replace(/(\d+)\s*(gb|tb)/i, '$1$2')
        .replace(/gb/i,'GB').replace(/tb/i,'TB')
        .replace(/pro\s*max/i,'Pro Max').replace(/\bpro\b/i,'Pro')
        .replace(/\bplus\b/i,'Plus').replace(/\bair\b/i,'Air').replace(/\bmini\b/i,'Mini');
      if (!/^iphone/i.test(mod)) mod = 'iPhone ' + mod;
      modeloActual = mod.trim();
    }

    // Detectar precio x1
    var mPrecio = linea.match(/(\d{3,4})x1\s*[\uD83D\uDCAB\uD83D\uDCB5💵]/)
      || linea.match(/^(\d{3,4})\s*[\uD83D\uDCAB\uD83D\uDCB5💵]/)
      || linea.match(/(\d{3,4})💵/);

    if (mPrecio && modeloActual) {
      var precio = parseInt(mPrecio[1]);
      if (precio >= 100 && precio <= 5000) {
        var existe = _listaItems.find(function(x) { return x.modelo === modeloActual; });
        if (existe) { if (precio < existe.precio_usd) existe.precio_usd = precio; }
        else _listaItems.push({ modelo: modeloActual, precio_usd: precio });
      }
    }
  });

  if (!_listaItems.length) {
    el('listaPreviewContent').innerHTML = '<div style="color:var(--rd);font-size:12px">No se detectaron modelos. Revisá el formato.</div>';
    el('listaPreview').style.display = '';
    el('btnSubirLista').disabled = true;
    return;
  }

  el('listaPreviewContent').innerHTML = _listaItems.map(function(u) {
    var existe = USADOS.find(function(x) { return x.modelo === u.modelo; });
    var tag = !existe
      ? '<span style="color:var(--gr);font-size:10px;font-weight:700"> NUEVO</span>'
      : u.precio_usd < existe.precio_usd
        ? '<span style="color:var(--acc);font-size:10px;font-weight:700"> BAJA</span>'
        : '<span style="color:var(--mu);font-size:10px;font-weight:700"> sin cambio</span>';
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
  var base = USADOS.slice();
  var nuevos = 0, actualizados = 0;
  _listaItems.forEach(function(item) {
    var idx = base.findIndex(function(x) { return x.modelo === item.modelo; });
    if (idx === -1) { base.push(item); nuevos++; }
    else if (item.precio_usd < base[idx].precio_usd) { base[idx].precio_usd = item.precio_usd; actualizados++; }
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
