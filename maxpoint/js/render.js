// ===================== RENDER =====================
// Todas las funciones que construyen UI con DOM methods.
// Cero innerHTML con strings interpolados para evitar bugs de escaping.

// ---- Dispatcher central ----
function render() {
  if      (VIEW === 'reps') renderReps();
  else if (VIEW === 'rpus') renderRpus();
  else if (VIEW === 'cot')  renderCot();
  else if (VIEW === 'cli')  renderCli();
  else if (VIEW === 'pag')  renderPag();
  else if (VIEW === 'bal')  renderBal();
}

// ---- Filtrado ----
function getFiltrados() {
  var list = REPS.slice().reverse();
  if (SEARCH) {
    var q = SEARCH.toLowerCase();
    list = list.filter(function(r) {
      return (r.nombre  || '').toLowerCase().includes(q)
          || (r.equipo  || '').toLowerCase().includes(q)
          || (r.orden   || '').includes(q)
          || (r.telefono|| '').includes(q)
          || (r.falla   || '').toLowerCase().includes(q);
    });
  }
  if (FILT) {
    list = list.filter(function(r) { return r.estado === FILT; });
  }
  return list;
}

// ============================================================
// REPARACIONES
// ============================================================
function renderReps() {
  var cnt  = el('cnt');
  var all  = getFiltrados();
  var tot  = Math.max(1, Math.ceil(all.length / PZ));
  if (PAGE > tot) PAGE = tot;
  var list = all.slice((PAGE - 1) * PZ, PAGE * PZ);

  // Stats
  var ac = REPS.filter(function(r) { return r.estado !== 'Entregado' && r.estado !== 'No aprobado'; }).length;
  var li = REPS.filter(function(r) { return r.estado === 'Listo'; }).length;
  var cb = REPS.filter(function(r) { return r.pago !== 'Pagado' && r.estado !== 'Entregado' && r.estado !== 'No aprobado'; })
               .reduce(function(s, r) { return s + Number(r.presupuesto || 0) - Number(r.sena || 0); }, 0);

  cnt.innerHTML = '';

  // -- Toolbar --
  var tb = document.createElement('div');
  tb.className = 'toolbar';

  var si  = document.createElement('div');  si.className = 'si';
  var ico = document.createElement('span'); ico.className = 'si-ico'; ico.textContent = '🔍';
  var inp = document.createElement('input');
  inp.placeholder = 'Buscar nombre, equipo, orden...';
  inp.value = SEARCH;
  inp.addEventListener('input', function() { SEARCH = this.value; PAGE = 1; renderReps(); });
  si.appendChild(ico); si.appendChild(inp); tb.appendChild(si);

  var sel = document.createElement('select'); sel.className = 'fsel';
  ['', 'Ingresado', 'En proceso', 'Listo', 'Entregado', 'No aprobado', 'Garantia'].forEach(function(e) {
    var o = document.createElement('option');
    o.value = e; o.textContent = e || 'Todos los estados';
    if (FILT === e) o.selected = true;
    sel.appendChild(o);
  });
  sel.addEventListener('change', function() { FILT = this.value; PAGE = 1; renderReps(); });
  tb.appendChild(sel);
  cnt.appendChild(tb);

  // -- Stat cards --
  var sg = document.createElement('div'); sg.className = 'sg';
  sg.innerHTML = ''
    + '<div class="sc"><div class="scl">Total registros</div><div class="scv cy">' + REPS.length.toLocaleString() + '</div></div>'
    + '<div class="sc"><div class="scl">En taller</div><div class="scv cb">' + ac + '</div></div>'
    + '<div class="sc"><div class="scl">Para retirar</div><div class="scv cg">' + li + '</div></div>'
    + '<div class="sc"><div class="scl">Por cobrar</div><div class="scv co">' + pesos(cb) + '</div></div>';
  cnt.appendChild(sg);

  if (!list.length) {
    var em = document.createElement('div'); em.className = 'empty';
    em.innerHTML = '<div class="ei">📋</div>' + (REPS.length ? 'Sin resultados para ese filtro.' : 'Sin ordenes. Importa el historico o carga la primera.');
    cnt.appendChild(em);
    return;
  }

  // -- Tabla --
  var tw = document.createElement('div'); tw.className = 'tw';
  var tbl = document.createElement('table');
  tbl.innerHTML = '<thead><tr>'
    + '<th>Orden</th><th>Cliente</th><th>Equipo</th>'
    + '<th>Falla</th><th>Presup.</th><th>Estado</th>'
    + '<th>Pago</th><th>Fecha</th><th></th>'
    + '</tr></thead>';

  var tbody = document.createElement('tbody');
  list.forEach(function(r) {
    var tr = document.createElement('tr');

    // Celda orden
    var tdOrden = document.createElement('td');
    var spanOrden = document.createElement('span'); spanOrden.className = 'on'; spanOrden.textContent = r.orden || '';
    tdOrden.appendChild(spanOrden); tr.appendChild(tdOrden);

    // Celda cliente
    var tdCli = document.createElement('td');
    var divNom = document.createElement('div'); divNom.style.fontWeight = '600'; divNom.textContent = r.nombre || '';
    var divTel = document.createElement('div'); divTel.className = 'mu mono'; divTel.style.fontSize = '11px'; divTel.textContent = r.telefono || '';
    tdCli.appendChild(divNom); tdCli.appendChild(divTel); tr.appendChild(tdCli);

    // Equipo
    var tdEq = document.createElement('td'); tdEq.style.fontSize = '12px'; tdEq.textContent = r.equipo || ''; tr.appendChild(tdEq);

    // Falla (truncada)
    var tdFalla = document.createElement('td');
    tdFalla.className = 'mu'; tdFalla.style.cssText = 'max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-size:12px';
    tdFalla.textContent = (r.falla || '').substring(0, 40); tr.appendChild(tdFalla);

    // Presupuesto
    var tdPres = document.createElement('td'); tdPres.className = 'mono'; tdPres.style.fontSize = '12px';
    tdPres.textContent = (r.presupuesto && r.presupuesto !== '0') ? pesos(r.presupuesto) : '—'; tr.appendChild(tdPres);

    // Estado (badge via innerHTML, string fija)
    var tdEst = document.createElement('td'); tdEst.innerHTML = badgeEst(r.estado); tr.appendChild(tdEst);

    // Pago
    var tdPag = document.createElement('td'); tdPag.innerHTML = badgePag(r.pago); tr.appendChild(tdPag);

    // Fecha
    var tdFecha = document.createElement('td'); tdFecha.className = 'mu mono'; tdFecha.style.fontSize = '11px'; tdFecha.textContent = r.fecha || ''; tr.appendChild(tdFecha);

    // Acciones — closures limpios con IIFE
    var tdActs = document.createElement('td'); tdActs.className = 'acts';
    tdActs.appendChild(mkBtn('btn-g btn-sm', 'Ver',  (function(id) { return function() { openDet(id); }; })(r.id)));
    tdActs.appendChild(mkBtn('btn-g btn-sm', '✏️',   (function(id) { return function() { openEditRep(id); }; })(r.id)));
    tdActs.appendChild(mkBtn('btn-d btn-sm', '🗑',   (function(id, ord) {
      return function() {
        if (confirm('Eliminar orden ' + ord + '?')) {
          FB.del(id, function(err) {
            if (err) toast('Error: ' + err, 'var(--rd)');
            else toast('Eliminado', 'var(--rd)');
          });
        }
      };
    })(r.id, r.orden)));
    tr.appendChild(tdActs);

    tbody.appendChild(tr);
  });

  tbl.appendChild(tbody);
  tw.appendChild(tbl);

  // -- Paginacion --
  var pg = document.createElement('div'); pg.className = 'pg';
  var info = document.createElement('span'); info.className = 'pi';
  info.textContent = all.length + ' registros — pag. ' + PAGE + '/' + tot;
  pg.appendChild(info);
  var pgBtns = document.createElement('div'); pgBtns.style.display = 'flex'; pgBtns.style.gap = '6px';
  var bPrev = mkBtn('btn-g btn-sm', '← Ant', function() { PAGE--; renderReps(); }); if (PAGE <= 1) bPrev.disabled = true;
  var bNext = mkBtn('btn-g btn-sm', 'Sig →', function() { PAGE++; renderReps(); }); if (PAGE >= tot) bNext.disabled = true;
  pgBtns.appendChild(bPrev); pgBtns.appendChild(bNext);
  pg.appendChild(pgBtns);
  tw.appendChild(pg);
  cnt.appendChild(tw);
}

// ============================================================
// REPUESTOS
// ============================================================
function renderRpus() {
  var cnt = el('cnt'); cnt.innerHTML = '';

  var esp = RPUS.filter(function(r) { return r.estado === 'Esperando'; });
  var enc = RPUS.filter(function(r) { return r.estado === 'Encargado'; });
  var lle = RPUS.filter(function(r) { return r.estado === 'Llego'; });
  var usa = RPUS.filter(function(r) { return r.estado === 'Usado'; });
  var cE  = esp.reduce(function(s, r) { return s + Number(r.costo || 0); }, 0);

  // Stats
  var sg = document.createElement('div'); sg.className = 'sg';
  sg.innerHTML = ''
    + '<div class="sc"><div class="scl">Esperando</div><div class="scv cp">' + esp.length + '</div></div>'
    + '<div class="sc"><div class="scl">Encargado</div><div class="scv co">' + enc.length + '</div></div>'
    + '<div class="sc"><div class="scl">Disponibles</div><div class="scv cg">' + lle.length + '</div></div>'
    + '<div class="sc"><div class="scl">Usados</div><div class="scv cy">' + usa.length + '</div></div>'
    + '<div class="sc"><div class="scl">Costo pendiente</div><div class="scv co">' + pesos(cE) + '</div></div>';
  // Boton copiar lista (solo si hay Esperando)
  if (esp.length) {
    var btnCopy = document.createElement('button');
    btnCopy.className = 'btn btn-p';
    btnCopy.style.cssText = 'margin-top:8px;width:100%';
    btnCopy.textContent = '📋 Copiar lista para proveedor (' + esp.length + ')';
    btnCopy.addEventListener('click', function() { copiarListaProveedor(esp); });
    cnt.appendChild(btnCopy);
  }
  cnt.appendChild(sg);

  function rpCard(r) {
    var card = document.createElement('div'); card.className = 'rc';

    var top = document.createElement('div');
    top.style.cssText = 'display:flex;justify-content:space-between;align-items:flex-start;gap:8px';

    var info = document.createElement('div');
    var nom  = document.createElement('div'); nom.style.cssText = 'font-weight:600;font-size:14px'; nom.textContent = r.nombre || '';
    info.appendChild(nom);
    if (r.modelo) {
      var mod = document.createElement('div'); mod.className = 'mu'; mod.style.fontSize = '12px'; mod.textContent = r.modelo;
      info.appendChild(mod);
    }

    var btns = document.createElement('div');
    btns.style.cssText = 'display:flex;gap:5px;align-items:center;flex-wrap:wrap';

    // Dropdown de estado — permite cambiar en cualquier direccion
    var sel = document.createElement('select');
    sel.className = 'rpu-estado-sel';
    ['Esperando','Encargado','Llego','Usado'].forEach(function(est) {
      var opt = document.createElement('option');
      opt.value = est; opt.textContent = est;
      if (est === r.estado) opt.selected = true;
      sel.appendChild(opt);
    });
    // Color del select segun estado actual
    var colorMap = { 'Esperando':'var(--pu)', 'Encargado':'var(--or)', 'Llego':'var(--gr)', 'Usado':'var(--mu)' };
    sel.style.color = colorMap[r.estado] || 'var(--mu)';
    sel.addEventListener('change', (function(id, selEl) {
      return function() {
        var nuevoEst = selEl.value;
        selEl.style.color = colorMap[nuevoEst] || 'var(--mu)';
        FB.updR(id, { estado: nuevoEst }, function() {
          toast('Estado: ' + nuevoEst);
        });
      };
    })(r.id, sel));
    btns.appendChild(sel);

    btns.appendChild(mkBtn('btn-d btn-sm', '🗑', (function(id) {
      return function() {
        if (confirm('Eliminar repuesto?')) {
          FB.delR(id, function() { toast('Eliminado', 'var(--rd)'); });
        }
      };
    })(r.id)));

    top.appendChild(info); top.appendChild(btns); card.appendChild(top);

    // Meta info
    var meta = document.createElement('div'); meta.className = 'rcm';
    if (r.orden)     meta.innerHTML += '<span>🔧 <span class="on">' + esc(r.orden) + '</span></span>';
    if (r.cliente)   meta.innerHTML += '<span>👤 ' + esc(r.cliente) + '</span>';
    if (r.costo && r.costo !== '0') meta.innerHTML += '<span>💰 <span class="mono">' + pesos(r.costo) + '</span></span>';
    if (r.proveedor) meta.innerHTML += '<span>🏪 ' + esc(r.proveedor) + '</span>';
    if (r.fecha)     meta.innerHTML += '<span class="mono mu" style="font-size:11px">' + esc(r.fecha) + '</span>';
    card.appendChild(meta);

    if (r.notas) {
      var nn = document.createElement('div');
      nn.style.cssText = 'margin-top:5px;font-size:12px;color:var(--mu)';
      nn.textContent = r.notas; card.appendChild(nn);
    }
    return card;
  }

  function addSection(titulo, color, items) {
    if (!items.length) return;
    var h = document.createElement('h2'); h.className = 'section-title'; h.style.color = color; h.textContent = titulo;
    cnt.appendChild(h);
    items.forEach(function(r) { cnt.appendChild(rpCard(r)); });
  }

  addSection('⏳ Esperando',    'var(--pu)', esp);
  addSection('📦 Encargado',   'var(--or)', enc);
  addSection('✅ Disponibles', 'var(--gr)', lle);
  addSection('✓ Usados',       'var(--mu)', usa);

  if (!RPUS.length) {
    var em = document.createElement('div'); em.className = 'empty';
    em.innerHTML = '<div class="ei">📦</div>Sin repuestos cargados.';
    cnt.appendChild(em);
  }
}

// ============================================================
// CLIENTES
// ============================================================
function renderCli() {
  var cnt = el('cnt'); cnt.innerHTML = '';

  // Search bar
  var tb = document.createElement('div'); tb.className = 'toolbar';
  var si = document.createElement('div'); si.className = 'si';
  var ico = document.createElement('span'); ico.className = 'si-ico'; ico.textContent = '🔍';
  var inp = document.createElement('input'); inp.placeholder = 'Buscar cliente...';
  inp.addEventListener('input', function() {
    var q = this.value.toLowerCase();
    cnt.querySelectorAll('.rc[data-s]').forEach(function(c) {
      c.style.display = c.dataset.s.includes(q) ? '' : 'none';
    });
  });
  si.appendChild(ico); si.appendChild(inp); tb.appendChild(si); cnt.appendChild(tb);

  // Agrupar por cliente
  var map = {};
  REPS.forEach(function(r) {
    var k = (r.nombre || '').trim().toLowerCase();
    if (!k) return;
    if (!map[k]) map[k] = { nombre: r.nombre, tel: r.telefono, ords: [] };
    map[k].ords.push(r);
  });
  var clientes = Object.values(map).sort(function(a, b) { return a.nombre.localeCompare(b.nombre); });

  if (!clientes.length) {
    cnt.innerHTML += '<div class="empty"><div class="ei">👤</div>Sin clientes.</div>';
    return;
  }

  clientes.forEach(function(c) {
    var card = document.createElement('div'); card.className = 'rc';
    card.dataset.s = (c.nombre + ' ' + (c.tel || '')).toLowerCase();

    var act = c.ords.filter(function(r) { return r.estado !== 'Entregado' && r.estado !== 'No aprobado'; }).length;

    // Header
    var hd = document.createElement('div');
    hd.style.cssText = 'display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;flex-wrap:wrap;gap:6px';
    var info = document.createElement('div');
    var nom  = document.createElement('div'); nom.style.cssText = 'font-weight:600;font-size:14px'; nom.textContent = c.nombre;
    var tel  = document.createElement('div'); tel.className = 'mu mono'; tel.style.fontSize = '12px'; tel.textContent = c.tel || 'Sin telefono';
    info.appendChild(nom); info.appendChild(tel);
    var btns = document.createElement('div'); btns.style.cssText = 'display:flex;gap:5px;flex-wrap:wrap;align-items:center';
    btns.appendChild(mkBadge('b-count', c.ords.length + ' ord.'));
    if (act) btns.appendChild(mkBadge('b-active', act + ' activo' + (act !== 1 ? 's' : '')));
    if (c.tel) {
      // Buscamos la ultima orden activa del cliente para abrirWA2 con contexto
      var ultimaOrd = c.ords.slice().reverse().find(function(o) {
        return o.estado !== 'Entregado' && o.estado !== 'No aprobado';
      }) || c.ords[c.ords.length - 1];
      btns.appendChild(mkBtn('btn-w btn-sm', '💬 WA', (function(ord) {
        return function() {
          if (ord) abrirWA2(ord.id);
          else toast('Sin ordenes para enviar mensaje', 'var(--mu)');
        };
      })(ultimaOrd)));
    }
    hd.appendChild(info); hd.appendChild(btns); card.appendChild(hd);

    // Ultimas 3 ordenes
    c.ords.slice().reverse().slice(0, 3).forEach(function(r) {
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;align-items:center;gap:8px;border-top:1px solid var(--bd);padding:5px 0;font-size:13px;flex-wrap:wrap';
      var spanOrd = document.createElement('span'); spanOrd.className = 'on'; spanOrd.textContent = r.orden || '';
      var spanEq  = document.createElement('span'); spanEq.className  = 'mu'; spanEq.style.fontSize = '12px'; spanEq.textContent = r.equipo || '';
      var spanFec = document.createElement('span'); spanFec.className = 'mu'; spanFec.style.fontSize = '11px'; spanFec.textContent = r.fecha || '';
      var estSpan = document.createElement('span'); estSpan.innerHTML = badgeEst(r.estado);
      var bVer    = mkBtn('btn-g btn-sm', 'Ver', (function(id) { return function() { openDet(id); }; })(r.id));
      row.appendChild(spanOrd); row.appendChild(spanEq);
      row.appendChild(estSpan); row.appendChild(spanFec); row.appendChild(bVer);
      card.appendChild(row);
    });
    if (c.ords.length > 3) {
      var more = document.createElement('div');
      more.style.cssText = 'font-size:11px;color:var(--mu);text-align:center;padding-top:4px';
      more.textContent = '+' + (c.ords.length - 3) + ' mas';
      card.appendChild(more);
    }
    cnt.appendChild(card);
  });
}

// ============================================================
// PAGOS
// ============================================================
function renderPag() {
  var cnt = el('cnt'); cnt.innerHTML = '';

  var pnd = REPS.filter(function(r) { return r.pago === 'Pendiente' && r.estado !== 'Entregado' && r.estado !== 'No aprobado'; });
  var prc = REPS.filter(function(r) { return r.pago === 'Parcial'; });
  var cobrado = REPS.filter(function(r) { return r.pago === 'Pagado'; })
                    .reduce(function(s, r) { return s + Number(r.presupuesto || 0); }, 0);
  var porcobrar = pnd.reduce(function(s, r) { return s + Number(r.presupuesto || 0); }, 0)
                + prc.reduce(function(s, r) { return s + Number(r.presupuesto || 0) - Number(r.sena || 0); }, 0);

  // Stats
  var sg = document.createElement('div'); sg.className = 'sg';
  sg.innerHTML = ''
    + '<div class="sc"><div class="scl">Por cobrar</div><div class="scv co">' + pesos(porcobrar) + '</div></div>'
    + '<div class="sc"><div class="scl">Total cobrado</div><div class="scv cg">' + pesos(cobrado) + '</div></div>'
    + '<div class="sc"><div class="scl">Pendientes</div><div class="scv cr">' + pnd.length + '</div></div>'
    + '<div class="sc"><div class="scl">Con sena</div><div class="scv cy">' + prc.length + '</div></div>';
  cnt.appendChild(sg);

  function mkTabla(titulo, color, filas, cols) {
    if (!filas.length) return;
    var h = document.createElement('h2'); h.className = 'section-title'; h.style.color = color; h.textContent = titulo;
    cnt.appendChild(h);
    var tw = document.createElement('div'); tw.className = 'tw'; tw.style.marginBottom = '20px';
    var tbl = document.createElement('table');
    var thead = document.createElement('thead');
    var htr = document.createElement('tr');
    cols.concat(['Accion']).forEach(function(c) {
      var th = document.createElement('th'); th.textContent = c; htr.appendChild(th);
    });
    thead.appendChild(htr); tbl.appendChild(thead);
    var tbody = document.createElement('tbody');
    filas.forEach(function(r) {
      var tr = document.createElement('tr');
      var sal = Number(r.presupuesto || 0) - Number(r.sena || 0);

      function addTd(content, cls) {
        var td = document.createElement('td'); if (cls) td.className = cls;
        if (typeof content === 'string') td.innerHTML = content; else td.appendChild(content);
        tr.appendChild(td);
      }
      var spanOrd = document.createElement('span'); spanOrd.className = 'on'; spanOrd.textContent = r.orden || '';
      addTd(spanOrd); addTd(esc(r.nombre)); addTd(esc(r.equipo));
      if (cols.length === 5) {
        addTd(r.presupuesto && r.presupuesto !== '0' ? pesos(r.presupuesto) : '—', 'mono');
        addTd(badgeEst(r.estado));
      } else {
        addTd(pesos(r.presupuesto || 0), 'mono');
        addTd(pesos(r.sena || 0), 'mono cg');
        addTd(pesos(sal), 'mono co');
      }
      var tdAct = document.createElement('td');
      tdAct.appendChild(mkBtn('btn-g btn-sm', '💳 Cobrar', (function(id) {
        return function() { openPago(id); };
      })(r.id)));
      tr.appendChild(tdAct);
      tbody.appendChild(tr);
    });
    tbl.appendChild(tbody); tw.appendChild(tbl); cnt.appendChild(tw);
  }

  mkTabla('Sin pago',  'var(--rd)', pnd, ['Orden','Cliente','Equipo','Presupuesto','Estado']);
  mkTabla('Con sena', 'var(--or)', prc, ['Orden','Cliente','Equipo','Presupuesto','Sena','Saldo']);

  if (!pnd.length && !prc.length) {
    cnt.innerHTML += '<div class="empty"><div class="ei">🎉</div>Sin pagos pendientes. Todo al dia!</div>';
  }
}

// ============================================================
// BALANCE
// ============================================================
function renderBal() {
  var cnt = el('cnt'); cnt.innerHTML = '';

  var tCobrado = REPS.filter(function(r) { return r.pago === 'Pagado'; })
                     .reduce(function(s, r) { return s + Number(r.presupuesto || 0); }, 0);
  var cRepuestos = RPUS.filter(function(r) { return r.estado === 'Usado'; })
                       .reduce(function(s, r) { return s + Number(r.costo || 0); }, 0);

  var sg = document.createElement('div'); sg.className = 'sg'; sg.style.gridTemplateColumns = 'repeat(3,1fr)';
  sg.innerHTML = ''
    + '<div class="sc"><div class="scl">Total cobrado</div><div class="scv cg">' + pesos(tCobrado) + '</div></div>'
    + '<div class="sc"><div class="scl">Costo repuestos</div><div class="scv cr">' + pesos(cRepuestos) + '</div></div>'
    + '<div class="sc"><div class="scl">Margen estimado</div><div class="scv cy">' + pesos(tCobrado - cRepuestos) + '</div></div>';
  cnt.appendChild(sg);

  // Desglose mensual
  var mes = {};
  REPS.forEach(function(r) {
    if (!r.fecha) return;
    var p = r.fecha.split('/');
    if (p.length < 3) return;
    var k = p[2] + '-' + p[1];
    if (!mes[k]) mes[k] = { cobrado: 0, total: 0 };
    mes[k].total++;
    if (r.pago === 'Pagado') mes[k].cobrado += Number(r.presupuesto || 0);
  });
  var MN = ['','Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic'];

  var tw = document.createElement('div'); tw.className = 'tw';
  var tbl = document.createElement('table');
  tbl.innerHTML = '<thead><tr><th>Mes</th><th>Reparaciones</th><th>Cobrado</th></tr></thead>';
  var tbody = document.createElement('tbody');
  Object.entries(mes)
    .sort(function(a, b) { return b[0].localeCompare(a[0]); })
    .forEach(function(entry) {
      var k = entry[0], v = entry[1];
      var pt = k.split('-');
      var tr = document.createElement('tr');
      tr.innerHTML = ''
        + '<td style="font-weight:600">' + (MN[parseInt(pt[1])] || pt[1]) + ' ' + pt[0] + '</td>'
        + '<td class="mono">' + v.total + '</td>'
        + '<td class="mono cg">' + pesos(v.cobrado) + '</td>';
      tbody.appendChild(tr);
    });
  tbl.appendChild(tbody); tw.appendChild(tbl); cnt.appendChild(tw);
}

// ── COPIAR LISTA PARA PROVEEDOR ─────────────────────────────
function copiarListaProveedor(items) {
  // grupos: key normalizada -> { label original, cantidad }
  var grupos = {};
  items.forEach(function(r) {
    var nom = (r.nombre || '').trim();
    if (!nom) return;
    var mod = (r.modelo || '').trim();
    var label = (mod && nom.toLowerCase().indexOf(mod.toLowerCase()) === -1)
      ? nom + ' — ' + mod
      : nom;
    // Normalizar para agrupar duplicados (minusculas + espacios simples)
    var key = label.toLowerCase().replace(/\s+/g, ' ');
    if (grupos[key]) {
      grupos[key].cant += 1;
    } else {
      grupos[key] = { label: label, cant: 1 };
    }
  });
  var lineas = Object.keys(grupos).map(function(k) {
    var g = grupos[k];
    return '- ' + g.cant + 'x ' + g.label;
  });
  var texto = lineas.join('\n');
  if (!texto) { toast('Sin repuestos en Esperando', 'var(--rd)'); return; }
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(texto).then(function() {
      toast('Lista copiada (' + lineas.length + ' items)');
    }).catch(function() { fallbackCopy(texto); });
  } else {
    fallbackCopy(texto);
  }
}

function fallbackCopy(texto) {
  var ta = document.createElement('textarea');
  ta.value = texto;
  ta.style.cssText = 'position:fixed;top:-9999px;left:-9999px';
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); toast('Lista copiada'); }
  catch(e) { toast('Error al copiar', 'var(--rd)'); }
  document.body.removeChild(ta);
}

// ── RENDER COTIZADOR ─────────────────────────────────
function renderCot() {
  var cnt = el('content');
  cnt.innerHTML = '';
  if (!USADOS.length) {
    cnt.innerHTML = '<div style="padding:32px;text-align:center;color:var(--mu)">'
      + '<div style="font-size:32px;margin-bottom:12px">&#128242;</div>'
      + '<div style="font-size:15px;font-weight:700;margin-bottom:6px">Sin modelos cargados</div>'
      + '<div style="font-size:13px">Usa "Actualizar lista" para cargar precios del proveedor</div>'
      + '</div>';
    return;
  }
  var precios = USADOS.map(function(u){return u.precio_usd;});
  var sc = document.createElement('div'); sc.className = 'sc-row';
  sc.innerHTML = '<div class="sc"><div class="scl">Modelos</div><div class="scv cb">' + USADOS.length + '</div></div>'
    + '<div class="sc"><div class="scl">Desde</div><div class="scv cg">USD ' + Math.min.apply(null,precios) + '</div></div>'
    + '<div class="sc"><div class="scl">Hasta</div><div class="scv cb">USD ' + Math.max.apply(null,precios) + '</div></div>';
  cnt.appendChild(sc);
  var lista = document.createElement('div');
  lista.style.cssText = 'display:flex;flex-direction:column;gap:6px;margin-top:12px';
  USADOS.slice().sort(function(a,b){return b.precio_usd-a.precio_usd;}).forEach(function(u) {
    var row = document.createElement('div');
    row.style.cssText = 'background:var(--s1);border:1px solid var(--bd);border-radius:8px;padding:10px 14px;display:flex;align-items:center;cursor:pointer';
    row.innerHTML = '<span style="flex:1;font-size:13px;font-weight:600">' + u.modelo + '</span>'
      + '<span style="font-size:14px;font-weight:800;color:var(--bl)">USD ' + u.precio_usd + '</span>';
    row.addEventListener('click', (function(modelo){
      return function() {
        var found = USADOS.find(function(x){return x.modelo===modelo;});
        if (!found) return;
        _cotSel = found; _cotRes = [found];
        cotReset();
        el('cotQ').value = found.modelo;
        el('cotQ').classList.add('sel');
        el('cotPanel').style.display = '';
        cotCalcular();
        openM('mCot');
      };
    })(u.modelo));
    lista.appendChild(row);
  });
  cnt.appendChild(lista);
}
