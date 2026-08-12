// ===================== MODALES =====================
// Toda la logica de apertura, llenado y guardado de modales.

// ============================================================
// FORMULARIO REPARACION
// ============================================================
function openNewRep() {
  _eid = null;
  window._garantiaOrigen = null;
  el('mFormT').textContent = 'Nuevo ingreso';
  ['fNom','fTel','fEq','fMod','fCla','fGar','fNot','fEstadoFisico','fEstadoFisicoFinal'].forEach(function(id) { setVal(id, ''); });
  setVal('fFal', ''); setVal('fPres', ''); setVal('fSen', '');
  el('fEst').value  = 'Ingresado';
  el('fPag').value  = 'Pendiente';
  el('fResultadoServicio').value = 'Pendiente de cierre';
  // Actualizar opciones de tecnico
  var selT = el('fTec');
  if (selT && typeof comOpcionesTecnicos === 'function') {
    var curVal = selT.value;
    selT.innerHTML = comOpcionesTecnicos(curVal);
  } else if (selT) { selT.value = ''; }
  el('suggBanner').style.display = 'none';
  openM('mForm');
}

function openEditRep(id) {
  var r = REPS.find(function(x) { return x.id === id; });
  if (!r) { toast('Orden no encontrada', 'var(--rd)'); return; }
  window._garantiaOrigen = null;
  _eid = id;
  el('mFormT').textContent = 'Editar ' + r.orden;
  setVal('fNom',  r.nombre       || '');
  setVal('fTel',  r.telefono     || '');
  setVal('fEq',   r.equipo       || '');
  setVal('fMod',  r.modelo       || '');
  setVal('fCla',  r.clave        || '');
  setVal('fFal',  r.falla        || '');
  setVal('fPres', r.presupuesto  || '');
  setVal('fSen',  r.sena         || '');
  el('fEst').value = r.estado    || 'Ingresado';
  el('fPag').value = r.pago      || 'Pendiente';
  el('fResultadoServicio').value = r.resultadoServicio || 'Pendiente de cierre';
  el('fTec').value = r.tecnico   || '';
  setVal('fGar',  r.garantia_ref || '');
  setVal('fEstadoFisico', r.estadoFisicoRecepcion || '');
  setVal('fEstadoFisicoFinal', r.estadoFisicoEntrega || '');
  setVal('fNot',  r.notas        || '');
  var fGremio = el('fGremio'); if (fGremio) fGremio.checked = r.gremio === 'si';
  el('suggBanner').style.display = 'none';
  openM('mForm');
}

function saveRep() {
  if (!sesionActiva() || !puede('editar_reparacion')) { toast('Necesitás una sesión activa para guardar reparaciones', 'var(--rd)'); return; }
  var nom = val('fNom');
  var eq  = val('fEq');
  if (!nom || !eq) { alert('Nombre y equipo son obligatorios.'); return; }

  var btn = el('btnSave');
  btn.disabled = true; btn.textContent = 'Guardando...';

  var est = el('fEst').value;
  var resultadoServicio = el('fResultadoServicio').value;
  if (est === 'Entregado' && (resultadoServicio === 'Pendiente de cierre' || !val('fEstadoFisicoFinal').trim())) {
    btn.disabled = false; btn.textContent = 'Guardar'; toast('Completá resultado y estado físico final antes de entregar la reparación', 'var(--rd)'); return;
  }
  if (est === 'Entregado' && el('fPag').value !== 'Pagado') {
    btn.disabled = false; btn.textContent = 'Guardar'; toast('La reparación debe estar pagada antes de entregar', 'var(--rd)'); return;
  }
  var anterior = _eid ? REPS.find(function(x) { return x.id === _eid; }) : null;
  var presupuestoNumero = Number(val('fPres') || 0);
  var d = {
    nombre:       nom,
    equipo:       eq,
    telefono:     val('fTel'),
    modelo:       val('fMod'),
    clave:        val('fCla'),
    falla:        val('fFal'),
    presupuesto:  val('fPres') || '0',
    sena:         val('fSen')  || '0',
    estado:       est,
    pago:         el('fPag').value,
    tecnico:      el('fTec').value,
    garantia_ref: val('fGar'),
    estadoFisicoRecepcion: val('fEstadoFisico'),
    estadoFisicoEntrega: val('fEstadoFisicoFinal'),
    notas:        val('fNot'),
    gremio:       el('fGremio') && el('fGremio').checked ? 'si' : 'no',
    resultadoServicio: resultadoServicio,
    controlComisionV1: true,
  };
  if (window._garantiaOrigen) {
    d.es_garantia = 'si'; d.garantiaOrigenId = window._garantiaOrigen.id; d.garantia_ref = window._garantiaOrigen.orden || '';
  }
  // Las reparaciones chicas requieren una validación individual de administración.
  // Un cambio de resultado vuelve a exigir esa revisión.
  if (presupuestoNumero < 100000 && (!anterior || anterior.resultadoServicio !== resultadoServicio || Number(anterior.presupuesto || 0) !== presupuestoNumero || !anterior.comisionVerificada)) {
    d.comisionVerificada = false;
  } else if (anterior && anterior.comisionVerificada) {
    d.comisionVerificada = true;
  }
  if (!_eid && SESION.usuario && SESION.perfil) {
    d.creadoPor = { uid: SESION.usuario.uid, nombre: SESION.perfil.nombre, email: SESION.perfil.email };
  }

  function done(err, idNuevo) {
    btn.disabled = false; btn.textContent = 'Guardar';
    if (err) { toast('Error: ' + err, 'var(--rd)'); return; }
    closeM('mForm');
    toast(_eid ? '✓ Actualizado' : '✓ Orden creada');
    if (!_eid && d.es_garantia === 'si' && idNuevo && typeof notificarEventoReparacion === 'function') {
      notificarEventoReparacion('garantia_nueva', Object.assign({ id:idNuevo, orden:orden }, d));
    }
  }

  if (_eid) {
    actualizarReparacion(_eid, d, done);
  } else {
    var orden = nextOrden();
    FB.add(Object.assign({}, d, {
      orden:    orden,
      fecha:    hoy(),
      timeline: [{ estado: est, fecha: hoy(), hora: horaActual(), usuario: usuarioActualRegistro() }],
    }), done);
  }
}

function actualizarReparacion(id, datos, done) {
  var prev = REPS.find(function(r) { return r.id === id; });
  if (!prev) { done('Orden no encontrada'); return; }

  var cambios = Object.assign({}, datos);
  var estadoFinal = cambios.estado || prev.estado;
  var resultadoFinal = Object.prototype.hasOwnProperty.call(cambios, 'resultadoServicio') ? cambios.resultadoServicio : prev.resultadoServicio;
  var fisicoFinal = Object.prototype.hasOwnProperty.call(cambios, 'estadoFisicoEntrega') ? cambios.estadoFisicoEntrega : prev.estadoFisicoEntrega;
  var pagoFinal = cambios.pago || prev.pago;
  if (prev.controlComisionV1 && estadoFinal === 'Entregado' && (!resultadoFinal || resultadoFinal === 'Pendiente de cierre' || !String(fisicoFinal || '').trim())) {
    done('Completá resultado y estado físico final antes de entregar la reparación'); return;
  }
  if (prev.controlComisionV1 && estadoFinal === 'Entregado' && pagoFinal !== 'Pagado' && !(prev.entregaExcepcion && prev.entregaExcepcion.autorizada)) {
    done('La reparación debe estar pagada antes de entregar'); return;
  }
  if (Object.prototype.hasOwnProperty.call(cambios, 'estado') && prev.estado !== cambios.estado) {
    var tl = (prev.timeline || []).slice();
    tl.push({ estado: cambios.estado, fecha: hoy(), hora: horaActual(), usuario: usuarioActualRegistro() });
    cambios.timeline = tl;
  }
  FB.upd(id, cambios, function(err) {
    if (err) { done(err); return; }
    var tecnicoFinal = Object.prototype.hasOwnProperty.call(cambios, 'tecnico') ? cambios.tecnico : prev.tecnico;
    if (tecnicoFinal && tecnicoFinal !== prev.tecnico && typeof notificarEventoReparacion === 'function') {
      notificarEventoReparacion('reparacion_asignada', Object.assign({}, prev, cambios, { id:id }), { clave:'reparacion_asignada:' + id + ':' + tecnicoFinal });
    }
    done(null);
  });
}

function autorizarEntregaSaldo(id) {
  if (!puede('gestionar_comisiones')) { toast('Solo administración puede autorizar una entrega con saldo', 'var(--rd)'); return; }
  var r = REPS.find(function(x) { return x.id === id; }); if (!r) return;
  var motivo = prompt('Motivo de la entrega con saldo pendiente:'); if (!motivo || !motivo.trim()) return;
  FB.upd(id, { entregaExcepcion:{ autorizada:true, motivo:motivo.trim(), autorizadaPor:usuarioActualRegistro(), fecha:hoy(), hora:horaActual() } }, function(err) {
    if (err) { toast('Error: ' + err, 'var(--rd)'); return; } toast('Entrega con saldo autorizada');
  });
}

function crearGarantiaVinculada(id) {
  var r = REPS.find(function(x) { return x.id === id; }); if (!r) return;
  closeM('mDet'); openNewRep(); window._garantiaOrigen = r;
  el('mFormT').textContent = 'Garantía vinculada a ' + (r.orden || 'orden original');
  setVal('fNom', r.nombre || ''); setVal('fTel', r.telefono || ''); setVal('fEq', r.equipo || ''); setVal('fMod', r.modelo || '');
  setVal('fGar', r.orden || ''); setVal('fEstadoFisico', r.estadoFisicoEntrega || r.estadoFisicoRecepcion || '');
  el('fTec').value = r.tecnico || ''; el('fEst').value = 'Garantia'; el('fResultadoServicio').value = 'Garantía / retrabajo';
  setVal('fFal', 'Garantía vinculada a ' + (r.orden || 'orden original') + ': ');
}

var _incidenciaRepId = null;
function abrirIncidencia(id) {
  var r = REPS.find(function(x) { return x.id === id; }); if (!r) return;
  _incidenciaRepId = id;
  var i = r.incidencia || {};
  el('incTipo').value = i.tipo || 'Daño preexistente';
  setVal('incResponsable', i.responsable || ''); setVal('incCosto', i.costoEstimado || '');
  setVal('incDescripcion', i.descripcion || ''); setVal('incEvidencia', i.evidencia || '');
  el('incResolucion').value = i.resolucion || '';
  openM('mIncidencia');
}

function guardarIncidencia() {
  var r = REPS.find(function(x) { return x.id === _incidenciaRepId; }); if (!r) return;
  var descripcion = val('incDescripcion').trim(); if (!descripcion) { toast('Describí la incidencia', 'var(--rd)'); return; }
  var resolucion = el('incResolucion').value;
  if (resolucion && !puede('resolver_incidencias')) { toast('Solo administración puede resolver una incidencia', 'var(--rd)'); return; }
  var anterior = r.incidencia || {};
  var esNueva = !anterior.descripcion;
  var incidencia = { tipo:el('incTipo').value, responsable:val('incResponsable').trim(), costoEstimado:val('incCosto') || '0', descripcion:descripcion, evidencia:val('incEvidencia').trim(), estado:resolucion ? 'Resuelta' : 'Abierta', resolucion:resolucion, reportadaPor:anterior.reportadaPor || usuarioActualRegistro(), fechaReporte:anterior.fechaReporte || hoy() };
  if (resolucion) { incidencia.resueltaPor = usuarioActualRegistro(); incidencia.fechaResolucion = hoy(); }
  FB.upd(r.id, { incidencia:incidencia }, function(err) {
    if (err) { toast('Error: ' + err, 'var(--rd)'); return; }
    if (resolucion === 'Garantía sin costo' || resolucion === 'Acuerdo con cliente' || resolucion === 'Responsabilidad compartida' || resolucion === 'Responsabilidad individual') {
      if (typeof comGenerarAjuste === 'function') comGenerarAjuste('reparacion', r.id, 'Incidencia resuelta: ' + resolucion);
    }
    if (esNueva && typeof notificarEventoReparacion === 'function') notificarEventoReparacion('incidencia_nueva', r);
    closeM('mIncidencia'); toast(resolucion ? 'Incidencia resuelta' : 'Incidencia registrada');
  });
}

// ============================================================
// DETALLE
// ============================================================
function openDet(id) {
  _detId = id;
  _renderDet();
}

function _renderDet() {
  var id = _detId;
  if (!id) return;
  var r = REPS.find(function(x) { return x.id === id; });
  if (!r) return;

if (!r) return;

  var cobrado = totalCobradoReparacion(r);
  var sal = saldoReparacion(r);
  var estadoPago = estadoPagoReparacion(r);
  var rpu = RPUS.filter(function(rp) { return rp.orden === r.orden; });
  // Las entradas históricas sin usuario se conservan en Firestore, pero no se
  // muestran: el historial visible comienza con los cambios auditables.
  var tl = (r.timeline || []).filter(function(t) { return t.usuario && t.usuario.nombre; });
  var det = el('mDetC'); det.innerHTML = '';

  // Header
  var mh = document.createElement('div'); mh.className = 'mh';
  var mhLeft = document.createElement('div');
  var mhTitle = document.createElement('div'); mhTitle.className = 'mt'; mhTitle.textContent = r.equipo || '';
  var mhSub = document.createElement('div'); mhSub.style.marginTop = '4px';
  var mhOrden = document.createElement('span'); mhOrden.className = 'on'; mhOrden.textContent = r.orden || '';
  mhSub.appendChild(mhOrden);
  if (r.tecnico) {
    var mhTec = document.createElement('span'); mhTec.className = 'mu'; mhTec.style.cssText = 'font-size:11px;margin-left:8px';
    mhTec.textContent = '· ' + r.tecnico; mhSub.appendChild(mhTec);
  }
  if (r.garantia_ref) {
    mhSub.appendChild(mkBadge('b-garantia', 'Garantia de ' + r.garantia_ref));
  }
  mhLeft.appendChild(mhTitle); mhLeft.appendChild(mhSub);
  var mhClose = document.createElement('button'); mhClose.className = 'mc'; mhClose.textContent = '✕';
  mhClose.addEventListener('click', function() { _detId = null; closeM('mDet'); });
  mh.appendChild(mhLeft); mh.appendChild(mhClose); det.appendChild(mh);

  // Grid 2 columnas
  var grid = document.createElement('div'); grid.className = 'det-grid';

  // --- Columna izquierda ---
  var col1 = document.createElement('div');

  // Cliente
  var ds1 = document.createElement('div'); ds1.className = 'ds';
  ds1.innerHTML = '<div class="dst">Cliente</div>'
    + '<div class="dr"><span class="dl">Nombre</span><span>' + esc(r.nombre) + '</span></div>'
    + '<div class="dr"><span class="dl">Telefono</span><span class="mono">' + esc(r.telefono || '—') + '</span></div>';
  col1.appendChild(ds1);

  // Falla
  var ds2 = document.createElement('div'); ds2.className = 'ds';
  var fallaBox = document.createElement('div');
  fallaBox.style.cssText = 'background:var(--s2);border-radius:8px;padding:8px 10px;font-size:13px;color:var(--mu)';
  fallaBox.textContent = r.falla || '—';
  ds2.innerHTML = '<div class="dst">Falla</div>';
  ds2.appendChild(fallaBox);
  if (r.modelo) {
    var imeiDiv = document.createElement('div'); imeiDiv.className = 'dr'; imeiDiv.style.marginTop = '4px';
    imeiDiv.innerHTML = '<span class="dl">IMEI</span><span class="mono" style="font-size:11px">' + esc(r.modelo) + '</span>';
    ds2.appendChild(imeiDiv);
  }
  if (r.clave) {
    var claveDiv = document.createElement('div'); claveDiv.className = 'dr'; claveDiv.style.marginTop = '4px';
    claveDiv.innerHTML = '<span class="dl">Clave / PIN</span><span style="font-weight:900;font-size:15px;color:var(--acc);letter-spacing:2px">' + esc(r.clave) + '</span>';
    ds2.appendChild(claveDiv);
  }
  col1.appendChild(ds2);

  // Repuestos relacionados
  if (rpu.length) {
    var dsRpu = document.createElement('div'); dsRpu.className = 'ds';
    dsRpu.innerHTML = '<div class="dst">Repuestos</div>';
    rpu.forEach(function(rp) {
      var row = document.createElement('div');
      row.style.cssText = 'display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid var(--bd);padding:4px 0;font-size:13px';
      var rpNom = document.createElement('span'); rpNom.textContent = rp.nombre || '';
      var rpEst = document.createElement('span'); rpEst.innerHTML = badgeRpu(rp.estado);
      var rpCosto = document.createElement('span'); rpCosto.className = 'mono co'; rpCosto.style.fontSize = '12px';
      if (puede('ver_costos') && rp.costo && rp.costo !== '0') rpCosto.textContent = pesos(rp.costo);
      row.appendChild(rpNom); if (puede('ver_costos')) row.appendChild(rpCosto); row.appendChild(rpEst);
      dsRpu.appendChild(row);
    });
    col1.appendChild(dsRpu);
  }

  // --- Columna derecha ---
  var col2 = document.createElement('div');

  // Estado / Pago / Montos
  var ds3 = document.createElement('div'); ds3.className = 'ds';
  ds3.innerHTML = '<div class="dst">Estado y pago</div>'
    + '<div class="dr"><span class="dl">Estado</span>' + badgeEst(r.estado) + '</div>'
    + '<div class="dr"><span class="dl">Pago</span>'   + badgePag(estadoPago)   + '</div>';
  if (Number(r.presupuesto || 0)) {
    ds3.innerHTML += '<div class="dr"><span class="dl">Presupuesto</span><span class="mono">' + pesos(r.presupuesto) + '</span></div>';
  }
  if (cobrado > 0) {
    ds3.innerHTML += '<div class="dr"><span class="dl">Cobrado</span><span class="mono cg">' + pesos(cobrado) + '</span></div>';
  }
  if (Number(r.presupuesto || 0)) {
    var salColor = sal > 0 ? 'var(--or)' : 'var(--gr)';
    ds3.innerHTML += '<div class="dr"><span class="dl">Saldo</span><span class="mono" style="color:' + salColor + '">' + pesos(sal) + '</span></div>';
  }
  if (r.controlComisionV1) {
    var resultadoCom = r.resultadoServicio || 'Pendiente de cierre';
    ds3.innerHTML += '<div class="dr"><span class="dl">Resultado</span><span>' + esc(resultadoCom) + '</span></div>';
    if (Number(r.presupuesto || 0) < 100000) {
      var verificado = !!r.comisionVerificada;
      ds3.innerHTML += '<div class="dr"><span class="dl">Comisión</span><span style="color:' + (verificado ? 'var(--gr)' : 'var(--or)') + '">' + (verificado ? 'Verificada' : 'Pendiente de verificar') + '</span></div>';
      if (!verificado && resultadoCom === 'Reparación realizada' && puede('gestionar_comisiones')) {
        var verificarBtn = mkBtn('btn-g btn-sm', 'Verificar comisión', (function(id) { return function() { comVerificarReparacion(id); }; })(r.id));
        verificarBtn.style.marginTop = '7px'; ds3.appendChild(verificarBtn);
      }
    }
  }
  // Historial de pagos registrados
  if ((r.pagos || []).length) {
    var phDiv = document.createElement('div');
    phDiv.style.cssText = 'margin-top:6px;font-size:11px;color:var(--mu);border-top:1px solid var(--bd);padding-top:5px';
    r.pagos.forEach(function(p) {
      var pRow = document.createElement('div');
      pRow.textContent = '💳 ' + (p.medio || '') + ' ' + pesos(p.monto) + ' — ' + (p.fecha || '') + (p.notas ? ' (' + p.notas + ')' : '');
      phDiv.appendChild(pRow);
    });
    ds3.appendChild(phDiv);
  }
  col2.appendChild(ds3);

  if (r.incidencia) {
    var dsInc = document.createElement('div'); dsInc.className = 'ds';
    var abierta = r.incidencia.estado !== 'Resuelta';
    dsInc.innerHTML = '<div class="dst">Incidencia <span style="color:' + (abierta ? 'var(--rd)' : 'var(--gr)') + '">' + (abierta ? '· Abierta' : '· Resuelta') + '</span></div>'
      + '<div style="font-size:12px">' + esc(r.incidencia.tipo || '') + '</div><div class="mu" style="font-size:11px;margin-top:4px">' + esc(r.incidencia.descripcion || '') + '</div>'
      + (r.incidencia.resolucion ? '<div class="mu" style="font-size:11px;margin-top:4px">Resolución: ' + esc(r.incidencia.resolucion) + '</div>' : '');
    var editarInc = mkBtn('btn-g btn-sm', abierta ? 'Resolver incidencia' : 'Ver incidencia', (function(id) { return function() { abrirIncidencia(id); }; })(r.id));
    editarInc.style.marginTop = '7px'; dsInc.appendChild(editarInc); col2.appendChild(dsInc);
  }

  // Actividad auditada: operaciones nuevas con un usuario identificado.
  var actividad = (window.AUDITORIA || []).filter(function(a) { return a.entidad === 'reparacion' && a.entidadId === r.id; })
    .sort(function(a, b) { return (b._ordenAuditoria || 0) - (a._ordenAuditoria || 0); });
  if (actividad.length) {
    var dsActividad = document.createElement('div'); dsActividad.className = 'ds';
    dsActividad.innerHTML = '<div class="dst">Actividad</div>';
    actividad.forEach(function(a, indice) {
      var fila = document.createElement('div'); fila.style.cssText = 'font-size:11px;padding:5px 0;border-bottom:1px solid var(--bd)' + (indice === 0 ? ';font-weight:700;color:var(--tx)' : '');
      var actor = a.actor && a.actor.nombre ? a.actor.nombre : 'Usuario no registrado';
      var detalle = (a.cambios || []).map(function(c) { return c.campo + ': ' + c.antes + ' → ' + c.despues; }).join(' · ');
      fila.textContent = actor + ' · ' + (a.accion || 'actualizado') + (detalle ? ' · ' + detalle : '') + ' · ' + (a.fecha || '') + (a.hora ? ' ' + a.hora : '');
      dsActividad.appendChild(fila);
    });
    col2.appendChild(dsActividad);
  }

  // Timeline
  if (false && tl.length) {
    var ds4 = document.createElement('div'); ds4.className = 'ds';
    ds4.innerHTML = '<div class="dst">Historial de estados</div>';
    tl.forEach(function(t) {
    var tliDiv = document.createElement('div'); tliDiv.className = 'tli';
    var dot = document.createElement('div'); dot.className = 'tld'; dot.style.background = colorEst(t.estado);
    var info = document.createElement('div');
    info.innerHTML = '<div class="tlt">' + esc(t.estado) + '</div>'
      + '<div class="tldt">' + esc(t.fecha || '') + (t.hora ? ' · ' + esc(t.hora) : '') + '</div>';
    if (t.usuario && t.usuario.nombre) {
      var autor = document.createElement('div'); autor.className = 'tldt'; autor.textContent = t.usuario.nombre;
      info.appendChild(autor);
    }
      tliDiv.appendChild(dot); tliDiv.appendChild(info); ds4.appendChild(tliDiv);
    });
    col2.appendChild(ds4);
  }

  // Notas
  if (r.notas) {
    var ds5 = document.createElement('div'); ds5.className = 'ds';
    var notasBox = document.createElement('div');
    notasBox.style.cssText = 'background:var(--s2);border-radius:8px;padding:8px 10px;font-size:12px;color:var(--mu)';
    notasBox.textContent = r.notas;
    ds5.innerHTML = '<div class="dst">Notas</div>';
    ds5.appendChild(notasBox);
    col2.appendChild(ds5);
  }

  grid.appendChild(col1); grid.appendChild(col2); det.appendChild(grid);

  // Botones de accion
  var fa = document.createElement('div');
  fa.style.cssText = 'display:flex;gap:7px;flex-wrap:wrap;margin-top:18px;padding-top:14px;border-top:1px solid var(--bd)';
  if (r.telefono) {
    fa.appendChild(mkBtn('btn-w', '💬 WhatsApp', (function(id) { return function() { abrirWA2(id); }; })(r.id)));
    fa.appendChild(mkBtn('btn-g btn-sm', 'Llamar', (function(tel) { return function() { llamarCliente(tel); }; })(r.telefono)));
  }
  var estadoSel = document.createElement('select');
  var estadoActual = r.estado || 'Ingresado';
  estadoSel.className = 'btn btn-g btn-sm';
  estadoSel.setAttribute('aria-label', 'Cambiar estado');
  ESTADOS.forEach(function(estado) {
    var opcion = document.createElement('option');
    opcion.value = estado; opcion.textContent = 'Estado: ' + estado;
    opcion.selected = estado === estadoActual;
    estadoSel.appendChild(opcion);
  });
  estadoSel.addEventListener('change', function() {
    var nuevoEstado = estadoSel.value;
    estadoSel.disabled = true;
    actualizarReparacion(r.id, { estado: nuevoEstado }, function(err) {
      estadoSel.disabled = false;
      if (err) { estadoSel.value = estadoActual; toast('Error: ' + err, 'var(--rd)'); return; }
      toast('Estado: ' + nuevoEstado);
    });
  });
  fa.appendChild(estadoSel);
  if (estadoPago !== 'Pagado') {
    fa.appendChild(mkBtn('btn-g', '💳 Registrar pago', (function(id) {
      return function() { closeM('mDet'); openPago(id); };
    })(r.id)));
  }
  if (estadoPago !== 'Pagado' && puede('gestionar_comisiones')) fa.appendChild(mkBtn('btn-g btn-sm', 'Autorizar entrega con saldo', (function(id) { return function() { autorizarEntregaSaldo(id); }; })(r.id)));
  if (r.modelo) {
    fa.appendChild(mkBtn('btn-g btn-sm', 'Copiar IMEI / Serie', (function(serie) { return function() { copiarTexto(serie, 'IMEI / Serie copiado'); }; })(r.modelo)));
  }
  fa.appendChild(mkBtn('btn-g', '🖨️ Recibo', (function(id) { return function() { abrirRec(id); }; })(r.id)));
  fa.appendChild(mkBtn('btn-g btn-sm', '📋 Orden Taller', (function(id) { return function() { prtOrdenTaller(id); }; })(r.id)));
  var garLabel = r.es_garantia === 'si' ? '✓ Garantia' : 'Garantia';
  var garStyle = r.es_garantia === 'si' ? 'background:rgba(242,95,92,.12);color:var(--rd);border-color:rgba(242,95,92,.3)' : '';
  fa.appendChild(mkBtn('btn-g btn-sm', garLabel, (function(id) { return function() { marcarGarantia(id); }; })(r.id), garStyle));
  fa.appendChild(mkBtn('btn-g btn-sm', 'Crear garantía vinculada', (function(id) { return function() { crearGarantiaVinculada(id); }; })(r.id)));
  fa.appendChild(mkBtn('btn-g btn-sm', r.incidencia && r.incidencia.estado !== 'Resuelta' ? 'Incidencia abierta' : 'Registrar incidencia', (function(id) { return function() { abrirIncidencia(id); }; })(r.id)));
  fa.appendChild(mkBtn('btn-p', '✏️ Editar', (function(id) {
    return function() { closeM('mDet'); openEditRep(id); };
  })(r.id)));
  det.appendChild(fa);

  openM('mDet');
}

function llamarCliente(telefono) {
  var numero = String(telefono || '').replace(/\D/g, '');
  if (!numero) { toast('Sin numero de telefono cargado', 'var(--rd)'); return; }
  window.location.href = 'tel:' + numero;
}

function badgeRpu(estado) {
  var map = { 'Esperando': 'b-esperando', 'Encargado': 'b-encargado', 'Llego': 'b-llego', 'Usado': 'b-usado' };
  return '<span class="badge ' + (map[estado] || 'b-esperando') + '">' + esc(estado || 'Esperando') + '</span>';
}

// ============================================================
// PAGO
// ============================================================
function openPago(id) {
  var r = REPS.find(function(x) { return x.id === id; });
  if (!r) return;
  _pagoId  = id;
  _pagoMedio = 'Efectivo';

  var sal = saldoReparacion(r);
  var c   = el('mPagoC'); c.innerHTML = '';

  // Info orden
  var info = document.createElement('div'); info.style.marginBottom = '14px';
  var nom = document.createElement('div'); nom.style.fontWeight = '600'; nom.textContent = r.nombre || '';
  var sub = document.createElement('div'); sub.className = 'mu'; sub.style.fontSize = '12px';
  sub.textContent = (r.orden || '') + ' · ' + (r.equipo || '');
  info.appendChild(nom); info.appendChild(sub); c.appendChild(info);

  // Campos
  var fg = document.createElement('div'); fg.className = 'fgrid';
  fg.innerHTML = ''
    + '<div class="f"><label>Monto ($)</label><input id="pgMonto" type="number" value="' + (sal > 0 ? sal : (r.presupuesto || 0)) + '"/></div>'
    + '<div class="f"><label>Fecha</label><input id="pgFech" value="' + hoy() + '"/></div>'
    + '<div class="f full"><label>Notas</label><input id="pgNot" placeholder="Opcional"/></div>';
  c.appendChild(fg);

  // Medio de pago
  var ml = document.createElement('div'); ml.className = 'f full'; ml.style.marginTop = '10px';
  var lbl = document.createElement('label'); lbl.textContent = 'Medio de pago'; ml.appendChild(lbl);
  var po = document.createElement('div'); po.className = 'po';
  [
    { k: 'Efectivo',       l: '💵 Efectivo' },
    { k: 'Transferencia',  l: '📲 Transferencia' },
    { k: 'Debito',         l: '💳 Debito' },
    { k: 'Credito',        l: '💳 Credito' },
  ].forEach(function(op) {
    var d = document.createElement('div');
    d.className = 'po-opt' + (op.k === 'Efectivo' ? ' sel' : '');
    d.textContent = op.l;
    d.addEventListener('click', function() {
      _pagoMedio = op.k;
      po.querySelectorAll('.po-opt').forEach(function(x) { x.classList.remove('sel'); });
      d.classList.add('sel');
    });
    po.appendChild(d);
  });
  ml.appendChild(po); c.appendChild(ml);

  openM('mPago');
}

function confPago() {
  var r = REPS.find(function(x) { return x.id === _pagoId; });
  if (!r) return;
  var monto = Number(val('pgMonto'));
  if (!Number.isFinite(monto) || monto <= 0) { toast('Ingresá un monto de pago válido', 'var(--rd)'); return; }
  // Si el registro es legacy, preservamos la seña previa como primer pago al
  // registrar el siguiente. No hay migración masiva ni se reemplazan pagos.
  var pagos = pagosReparacion(r).concat([{
    monto:  monto,
    fecha:  val('pgFech'),
    medio:  _pagoMedio,
    notas:  val('pgNot'),
  }]);
  var totalCobrado = pagos.reduce(function(total, pago) { return total + Number(pago.monto || 0); }, 0);
  var presupuesto = Number(r.presupuesto || 0);
  // Sin presupuesto no se infiere un estado financiero: se mantiene el actual.
  var nuevoEstadoPago = presupuesto > 0 ? (totalCobrado >= presupuesto ? 'Pagado' : 'Pendiente') : (r.pago || 'Pendiente');
  FB.upd(_pagoId, { pago: nuevoEstadoPago, pagos: pagos, sena: String(totalCobrado) }, function(err) {
    if (err) { toast('Error: ' + err, 'var(--rd)'); return; }
    closeM('mPago');
    toast('✓ Pago registrado — saldo ' + pesos(Math.max(0, presupuesto - totalCobrado)));
  });
}

// ============================================================
// RECIBO — usa Blob URL, sin document.write (era el SyntaxError)
// ============================================================
function mkRecHTML(r) {
  var cobrado = totalCobradoReparacion(r);
  var sal = saldoReparacion(r);
  var tienePres = Number(r.presupuesto || 0) > 0;
  var tieneSena = cobrado > 0;
  var fmt = function(n) { return '$\u202F' + Number(n).toLocaleString('es-AR'); };

  // Colores de estado
  var estadoColor = {
    'Ingresado':   '#4E9AF1', 'En proceso': '#F0B429', 'Listo':     '#2DCE89',
    'Entregado':   '#6B7280', 'No aprobado':'#F25F5C', 'Garantia':  '#A78BFA'
  };
  var ec = estadoColor[r.estado] || '#888';

  var h = [];
  h.push('<div style="max-width:440px;margin:0 auto">');

  // ── HEADER ────────────────────────────────────────────────
  h.push('<div style="background:#111;padding:18px 20px 14px;margin:-1px -1px 0;border-radius:6px 6px 0 0">');
  // Franja amarilla top
  h.push('<div style="height:4px;background:#F0B429;border-radius:2px;margin-bottom:14px"></div>');
  // Logo + info
  h.push('<table style="width:100%;border-collapse:collapse"><tr>');
  h.push('<td style="vertical-align:middle">');
  h.push('<div style="font-size:26px;font-weight:900;color:#F0B429;letter-spacing:-0.5px;line-height:1">MaxPoint</div>');
  h.push('<div style="font-size:9px;color:#aaa;letter-spacing:2px;text-transform:uppercase;margin-top:2px">Servicio T&eacute;cnico de Celulares</div>');
  h.push('</td>');
  h.push('<td style="vertical-align:middle;text-align:right">');
  h.push('<div style="font-size:9px;color:#888;line-height:1.7">Av 17 y 34, Mercedes, Bs As<br>(2324) 522082</div>');
  h.push('</td>');
  h.push('</tr></table>');
  h.push('</div>');

  // ── BANDA ORDEN ───────────────────────────────────────────
  h.push('<div style="background:#F0B429;padding:8px 20px;display:flex;justify-content:space-between;align-items:center">');
  h.push('<div>');
  h.push('<div style="font-size:8px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#7a5500">Recepci&oacute;n de Equipo</div>');
  h.push('<div style="font-size:20px;font-weight:900;color:#111;line-height:1.1">' + esc(r.orden || '') + '</div>');
  h.push('</div>');
  h.push('<div style="text-align:right">');
  h.push('<div style="font-size:8px;color:#7a5500;text-transform:uppercase;letter-spacing:1px">Fecha</div>');
  h.push('<div style="font-size:13px;font-weight:700;color:#111">' + esc(r.fecha || '') + '</div>');
  if (r.tecnico) {
    h.push('<div style="font-size:9px;color:#7a5500;margin-top:2px">T&eacute;cnico: <b>' + esc(r.tecnico) + '</b></div>');
  }
  h.push('</div>');
  h.push('</div>');

  // ── BODY ─────────────────────────────────────────────────
  h.push('<div style="padding:16px 20px">');

  // Fila cliente + equipo
  h.push('<table style="width:100%;border-collapse:collapse;margin-bottom:14px"><tr>');

  // Cliente
  h.push('<td style="vertical-align:top;width:50%;padding-right:10px;border-right:1px solid #eee">');
  h.push('<div style="font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:#bbb;margin-bottom:5px">Cliente</div>');
  h.push('<div style="font-size:15px;font-weight:800;color:#111;line-height:1.2">' + esc(r.nombre || '') + '</div>');
  if (r.telefono) h.push('<div style="font-size:11px;color:#555;margin-top:3px">' + esc(r.telefono) + '</div>');
  h.push('</td>');

  // Equipo
  h.push('<td style="vertical-align:top;padding-left:10px">');
  h.push('<div style="font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:#bbb;margin-bottom:5px">Equipo</div>');
  h.push('<div style="font-size:15px;font-weight:800;color:#111;line-height:1.2">' + esc(r.equipo || '') + '</div>');
  if (r.modelo) h.push('<div style="font-size:9px;color:#777;margin-top:3px;font-family:monospace">IMEI: ' + esc(r.modelo) + '</div>');
  h.push('</td>');

  h.push('</tr></table>');

  // Falla
  h.push('<div style="background:#f8f8f8;border-left:3px solid #F0B429;border-radius:0 4px 4px 0;padding:9px 12px;margin-bottom:14px">');
  h.push('<div style="font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:#bbb;margin-bottom:4px">Descripci&oacute;n del problema</div>');
  h.push('<div style="font-size:11.5px;color:#222;line-height:1.5">' + esc(r.falla || '—') + '</div>');
  if (r.notas) {
    h.push('<div style="font-size:10px;color:#888;margin-top:6px;padding-top:6px;border-top:1px dashed #ddd">Obs: ' + esc(r.notas) + '</div>');
  }
  h.push('</div>');

  // Estado + Presupuesto
  h.push('<table style="width:100%;border-collapse:collapse;margin-bottom:14px"><tr>');

  // Estado
  h.push('<td style="vertical-align:top;width:40%;padding-right:10px;border-right:1px solid #eee">');
  h.push('<div style="font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:#bbb;margin-bottom:6px">Estado</div>');
  h.push('<span style="display:inline-block;background:' + ec + '22;color:' + ec + ';border:1px solid ' + ec + '55;border-radius:20px;padding:3px 12px;font-size:11px;font-weight:700">' + esc(r.estado || 'Ingresado') + '</span>');
  h.push('<div style="margin-top:8px">');
  h.push('<div style="font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:#bbb;margin-bottom:4px">Pago</div>');
  h.push('<span style="font-size:11px;font-weight:700;color:#333">' + esc(estadoPagoReparacion(r)) + '</span>');
  h.push('</div>');
  h.push('</td>');

  // Presupuesto
  h.push('<td style="vertical-align:top;padding-left:10px">');
  if (tienePres) {
    h.push('<div style="font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:#bbb;margin-bottom:6px">Presupuesto</div>');
    h.push('<table style="width:100%;border-collapse:collapse;font-size:11px">');
    h.push('<tr><td style="color:#555;padding:2px 0">Total</td><td style="text-align:right;font-weight:700;color:#111">' + fmt(r.presupuesto) + '</td></tr>');
    if (tieneSena) {
      h.push('<tr><td style="color:#555;padding:2px 0">Cobrado</td><td style="text-align:right;color:#2DCE89;font-weight:600">&minus; ' + fmt(cobrado) + '</td></tr>');
      h.push('<tr style="border-top:1.5px solid #eee"><td style="font-weight:800;padding-top:4px">Saldo</td><td style="text-align:right;font-weight:900;font-size:14px;color:#111;padding-top:4px">' + fmt(sal) + '</td></tr>');
    }
    h.push('</table>');
  } else {
    h.push('<div style="font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:#bbb;margin-bottom:6px">Presupuesto</div>');
    h.push('<div style="font-size:11px;color:#aaa">A confirmar</div>');
  }
  h.push('</td>');
  h.push('</tr></table>');

  // ── FOOTER LEGAL ─────────────────────────────────────────
  h.push('<div style="border-top:1px solid #eee;padding-top:10px;font-size:8.5px;color:#888;line-height:1.65">');
  h.push('<b style="color:#555">Garant&iacute;a:</b> 90 d&iacute;as sobre la reparaci&oacute;n efectuada. No aplica a golpes, humedad ni mal uso.<br>');
  h.push('Pasados <b style="color:#555">30 d&iacute;as</b> sin retirar el equipo, el presupuesto queda sujeto a reajuste.<br>');
  h.push('MaxPoint no se responsabiliza por datos perdidos durante la reparaci&oacute;n.');
  h.push('</div>');

  h.push('</div>'); // /body

  // ── PIE INFERIOR ─────────────────────────────────────────
  h.push('<div style="background:#111;padding:8px 20px;border-radius:0 0 6px 6px;display:flex;justify-content:space-between;align-items:center">');
  h.push('<div style="font-size:9px;color:#555">Mercedes, Buenos Aires</div>');
  h.push('<div style="font-size:9px;color:#F0B429;font-weight:700">&iexcl;Gracias por elegirnos!</div>');
  h.push('</div>');

  h.push('</div>'); // /max-width wrapper
  return h.join('\n');
}

function abrirRec(id) {
  var r = REPS.find(function(x) { return x.id === id; });
  if (!r) return;
  _recId = id;
  el('mRecC').innerHTML = '<div style="font-family:\'Inter\',Arial,sans-serif;font-size:12px;color:#111;background:white;border-radius:6px;border:1px solid #ddd;overflow:hidden;line-height:1.5">' + mkRecHTML(r) + '</div>';
  closeM('mDet');
  openM('mRec');
}

function abrirRecFromDet() {
  // llamado desde el boton en detalle — _recId ya seteado
  abrirRec(_recId);
}

function prtRec() {
  var r = REPS.find(function(x) { return x.id === _recId; });
  if (!r) return;
  var css = [
    
    '@page { size: A5; margin: 10mm; }',
    'body { font-family: system-ui, -apple-system, "Segoe UI", Arial, sans-serif; font-size: 11px; color: #111; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }',
    'table { border-collapse: collapse; width: 100%; }',
    '@media print { .np { display: none !important; } }',
  ].join(' ');
  var body = '<div style="max-width:440px;margin:20px auto;font-family:system-ui,-apple-system,Segoe UI,Arial,sans-serif">'
    + '<div style="border:1px solid #ddd;border-radius:6px;overflow:hidden;background:#fff">'
    + mkRecHTML(r)
    + '</div>'
    + '<div class="np" style="margin-top:16px;text-align:center;padding:10px">'
    + '<button onclick="window.print()" style="background:#111;color:white;border:none;padding:9px 28px;border-radius:6px;cursor:pointer;font-size:13px;margin-right:8px">Imprimir A5</button>'
    + '<button onclick="window.close()" style="background:#f0f0f0;border:none;padding:9px 18px;border-radius:6px;cursor:pointer;font-size:13px">Cerrar</button>'
    + '</div>'
    + '</div>';
  var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>' + css + '</style></head><body>' + body + '</body></html>';
  var blob = new Blob([html], { type: 'text/html' });
  window.open(URL.createObjectURL(blob), '_blank', 'width=560,height=820');
}

function prtEtiq() {
  var r = REPS.find(function(x) { return x.id === _recId; });
  if (!r) return;
  var falla = (r.falla || '').substring(0, 30);
  var clave = (r.clave || r.modelo || '').substring(0, 15);
  var css = '@page{size:40mm 30mm;margin:0.8mm}body{width:40mm;height:30mm;font-family:Courier New,monospace;font-size:6.5pt;color:#000;padding:1.5mm;overflow:hidden;box-sizing:border-box}.t{font-size:8.5pt;font-weight:700;border-bottom:.5pt solid #000;padding-bottom:0.5mm;margin-bottom:0.5mm;display:flex;justify-content:space-between}.r{display:flex;justify-content:space-between}@media print{.np{display:none}}';
  var body = '<div class="t"><span>MaxPoint</span><span>' + (r.orden || '') + '</span></div>'
    + '<div style="font-weight:700;font-size:7.5pt">' + (r.nombre || '') + '</div>'
    + '<div style="font-size:7pt">' + (r.equipo || '') + '</div>'
    + '<div style="font-size:6pt;color:#333;margin-top:0.3mm">' + falla + '</div>'
    + (clave ? '<div style="font-size:6pt"><b>Clave:</b> ' + clave + '</div>' : '')
    + '<div class="r" style="margin-top:0.5mm;font-size:6pt"><span>' + (r.fecha || '') + '</span><span>' + (r.tecnico || '') + '</span></div>'
    + '<div class="np" style="margin-top:6px"><button onclick="window.print()">Imprimir etiqueta</button></div>';
  var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><style>' + css + '</style></head><body>' + body + '</body></html>';
  var blob = new Blob([html], { type: 'text/html' });
  window.open(URL.createObjectURL(blob), '_blank', 'width=300,height=220');
}

// ============================================================
// REPUESTO
// ============================================================
function openNewRepuesto() {
  el('mRpuT').textContent = 'Nuevo repuesto';
  ['rpNom','rpMod','rpCli','rpOrd','rpNot'].forEach(function(id) { setVal(id, ''); });
  setVal('rpCos', ''); setVal('rpPrecio', ''); setVal('rpCant', '1');
  el('rpEst').value = 'Esperando';
  var verCostos = puede('ver_costos');
  ['wRpCos','catCostoUsd','catCostoArs'].forEach(function(id) { var campo = el(id); if (campo) campo.style.display = verCostos ? '' : 'none'; });
  setVal('rpPro', '');
  _afterRpu = null;
  openM('mRpu');
}

function saveRepuesto() {
  var nom = val('rpNom');
  if (!nom) { alert('El nombre del repuesto es obligatorio.'); return; }
  var btn = el('btnSaveRpu');
  btn.disabled = true; btn.textContent = 'Guardando...';
  var d = {
    nombre:         nom,
    modelo:         val('rpMod'),
    costo:          val('rpCos') || '0',
    precio_cliente: val('rpPrecio') || '0',
    proveedor:      val('rpPro'),
    estado:         el('rpEst').value,
    orden:          val('rpOrd'),
    cliente:        val('rpCli'),
    notas:          val('rpNot'),
    fecha:          hoy(),
  };
  var cant = Math.max(1, parseInt(val('rpCant')) || 1);
  var guardados = 0;
  var errores   = 0;
  function guardarUno() {
    FB.addR(d, function(err) {
      if (err) errores++;
      guardados++;
      if (guardados < cant) {
        guardarUno();
      } else {
        btn.disabled = false; btn.textContent = 'Guardar';
        if (errores) { toast('Error guardando ' + errores + ' repuesto/s', 'var(--rd)'); return; }
        closeM('mRpu');
        if (_afterRpu === 'reopen') { _afterRpu = null; openM('mForm'); }
        toast(cant > 1 ? cant + ' repuestos guardados' : 'Repuesto guardado', 'var(--pu)');
      }
    });
  }
  guardarUno();
}

// Sugerencia desde formulario de reparacion
function chkSugg() {
  var falla = val('fFal');
  var equipo = val('fEq');
  _sugg = detectarRepuesto(falla, equipo);
  var banner = el('suggBanner');
  if (_sugg) {
    el('suggT').textContent = _sugg.nombre;
    banner.style.display = 'flex';
  } else {
    banner.style.display = 'none';
  }
}

function confSugg() {
  if (!_sugg) return;
  setVal('rpNom', _sugg.nombre);
  setVal('rpMod', _sugg.equipo);
  setVal('rpCli', val('fNom'));
  setVal('rpOrd', '');
  setVal('rpCos', ''); setVal('rpPrecio', '');
  setVal('rpPro', '');
  setVal('rpNot', '');
  el('rpEst').value = 'Esperando';
  _afterRpu = 'reopen';
  closeM('mForm');
  openM('mRpu');
}

// ============================================================
// WHATSAPP
// ============================================================
function abrirWA(tel, msg) {
  var n    = String(tel).replace(/\D/g, '');
  var base = n.startsWith('54') ? n : '54' + n;
  var url  = 'https://wa.me/' + base + (msg ? '?text=' + encodeURIComponent(msg) : '');
  window.open(url, '_blank');
}

function abrirWA2(id) {
  var r = REPS.find(function(x) { return x.id === id; });
  if (!r || !r.telefono) { toast('Sin numero de telefono cargado', 'var(--rd)'); return; }

  var mensajes = {
    'Ingresado':   'recibimos tu equipo y quedo registrado. Te avisamos cuando tengamos novedades.',
    'En proceso':  'tu equipo esta siendo reparado. Te avisamos en cuanto este listo.',
    'Listo':       'tu equipo esta *LISTO para retirar* 🎉. Podes pasar cuando quieras por Av 17 y 34.',
    'Entregado':   'gracias por tu visita. Ante cualquier consulta, avisanos.',
    'No aprobado': 'necesitamos hablar sobre el presupuesto. Por favor comunicate con nosotros.',
    'Garantia':    'tu equipo ingreso por garantia. Te informamos en cuanto tengamos novedades.',
  };

  var nombreCorto = (r.nombre || '').split(' ')[0];
  var lineas = [];

  lineas.push('Hola *' + nombreCorto + '*! 👋 Te escribimos desde *MaxPoint* (Av 17 y 34, Mercedes).');
  lineas.push('');
  lineas.push('Sobre tu *' + (r.equipo || '') + '* (Orden ' + (r.orden || '') + '):');
  lineas.push(mensajes[r.estado] || 'Tenemos novedades sobre tu equipo.');

  if (r.presupuesto && r.presupuesto !== '0') {
    lineas.push('');
    lineas.push('💰 Presupuesto: $' + Number(r.presupuesto).toLocaleString());
    if (estadoPagoReparacion(r) !== 'Pagado') {
      var saldo = saldoReparacion(r);
      var cobrado = totalCobradoReparacion(r);
      if (cobrado > 0) {
        lineas.push('✅ Cobrado: $' + cobrado.toLocaleString());
      }
      lineas.push('💳 Saldo pendiente: $' + saldo.toLocaleString());
    } else {
      lineas.push('✅ Pago completo');
    }
  }

  if (r.estado === 'Listo') {
    lineas.push('');
    lineas.push('_Recorda que tu reparacion tiene *90 dias de garantia* (no aplica a golpes, humedad o mal uso)._');
  }

  lineas.push('');
  lineas.push('🙏 Gracias por elegirnos!');

  var msg = lineas.join('\n');
  abrirWA(r.telefono, msg);
}

// ============================================================
// AUTOCOMPLETE
// ============================================================
function acNom() {
  var v  = val('fNom').toLowerCase();
  var ac = el('acNomL');
  if (v.length < 2) { ac.style.display = 'none'; return; }
  var map = {};
  REPS.forEach(function(r) {
    var k = (r.nombre || '').trim().toLowerCase();
    if (!map[k]) map[k] = { nombre: r.nombre, tel: r.telefono, n: 0 };
    map[k].n++;
  });
  var matches = Object.values(map).filter(function(c) { return c.nombre.toLowerCase().includes(v); }).slice(0, 6);
  if (!matches.length) { ac.style.display = 'none'; return; }
  ac.innerHTML = '';
  matches.forEach(function(c) {
    var d = document.createElement('div'); d.className = 'aci';
    var b = document.createElement('b'); b.textContent = c.nombre;
    var s = document.createElement('div'); s.className = 'aci-sub';
    s.textContent = (c.tel || 'Sin tel') + ' · ' + c.n + ' orden' + (c.n !== 1 ? 'es' : '');
    d.appendChild(b); d.appendChild(s);
    d.addEventListener('click', function() {
      setVal('fNom', c.nombre);
      setVal('fTel', c.tel || '');
      ac.style.display = 'none';
    });
    ac.appendChild(d);
  });
  ac.style.display = 'block';
}

function acEq() {
  var v  = val('fEq').toLowerCase();
  var ac = el('acEqL');
  if (v.length < 2) { ac.style.display = 'none'; return; }
  var matches = EQUIPOS_APPLE.filter(function(e) { return e.toLowerCase().includes(v); });
  matches.sort(function(a, b) { return String(a).localeCompare(String(b), 'es', { numeric: true, sensitivity: 'base' }); });
  matches = matches.slice(0, 8);
  if (!matches.length) { ac.style.display = 'none'; return; }
  ac.innerHTML = '';
  matches.forEach(function(e) {
    var d = document.createElement('div'); d.className = 'aci'; d.textContent = e;
    d.addEventListener('click', function() {
      setVal('fEq', e);
      ac.style.display = 'none';
      chkSugg();
    });
    ac.appendChild(d);
  });
  ac.style.display = 'block';
}

// ============================================================
// IMPORTAR / PIN
// ============================================================
function importarHist() {
  if (!DATOS_HISTORICOS.length) { toast('No hay datos para importar', 'var(--or)'); return; }
  if (!confirm('Importar ' + DATOS_HISTORICOS.length + ' ordenes al sistema. Solo hacer una vez. Continuar?')) return;
  syncLoad('Importando ' + DATOS_HISTORICOS.length + ' ordenes...');
  var i = 0, tot = DATOS_HISTORICOS.length;
  function next() {
    if (i >= tot) {
      syncOk('Importacion completa: ' + tot + ' ordenes');
      toast('✓ ' + tot + ' ordenes importadas');
      return;
    }
    var d = DATOS_HISTORICOS[i];
    FB.addId(d.id || ('h' + i), Object.assign({}, d, {
      timeline: [{ estado: d.estado || 'Entregado', fecha: d.fecha || '', hora: '' }],
      _imp: true,
    }), function() { i++; setTimeout(next, 0); });
  }
  next();
}

function openLock()  {
  if (!puede('ver_balance')) { toast('Sin permiso para ver el balance', 'var(--rd)'); return; }
  setVal('pinIn', '');
  el('pinErr').textContent = '';
  el('lockSc').style.display = 'flex';
  setTimeout(function() { el('pinIn').focus(); }, 100);
}
function closeLock() { el('lockSc').style.display = 'none'; }
function chkPin() {
  if (!puede('ver_balance')) { closeLock(); return; }
  var v = val('pinIn');
  if (v.length < 4) return;
  if (v === PIN) {
    closeLock();
    showView('bal', el('nav-balance'));
  } else {
    el('pinErr').textContent = 'PIN incorrecto';
    setVal('pinIn', '');
  }
}

// ── IMPRIMIR ORDEN DE TALLER ─────────────────────────────
function prtOrdenTaller(id) {
  var r = REPS.find(function(x) { return x.id === id; });
  if (!r) return;

  var e2 = function(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); };
  var fmt = function(n) { return '$\u202F' + Number(n||0).toLocaleString('es-AR'); };

  var chkItems = [
    ['Bateria',         r.bat ? r.bat + '%' : ''],
    ['Pantalla',        r.pantalla  || ''],
    ['Carcasa',         r.carcasa   || ''],
    ['Camara',          r.camara    || ''],
    ['Botones',         r.botones   || ''],
    ['Touch / Face ID', r.faceid    || ''],
    ['Humedad',         r.mojado    || ''],
    ['Abierto prev.',   r.abierto   || ''],
    ['iCloud',          r.icloud    || ''],
  ].filter(function(x){ return x[1] && x[1] !== ''; });

  var filaChk = chkItems.map(function(ci) {
    var color = (ci[1]==='Rota'||ci[1]==='Si'||ci[1]==='No funciona'||ci[1]==='Muy danada'||ci[1]==='Falla alguno')
      ? '#dc2626' : (ci[1]==='OK'||ci[1]==='No') ? '#16a34a' : '#555';
    return '<tr><td style="color:#aaa;padding:3px 8px 3px 0;font-size:10px;width:45%">' + ci[0] + '</td>'
      + '<td style="font-weight:700;color:' + color + ';font-size:10px">' + ci[1] + '</td></tr>';
  }).join('');

  var cobrado = totalCobradoReparacion(r);
  var sal = saldoReparacion(r);

  var html = '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Orden Taller ' + e2(r.orden||'') + '</title>'
    + '<style>@page{size:A5;margin:8mm}body{font-family:system-ui,sans-serif;font-size:12px;color:#111;background:white;margin:0}@media print{button{display:none}}</style>'
    + '</head><body>'
    + '<div style="background:#111;padding:14px 18px 12px;border-radius:6px 6px 0 0">'
    + '<div style="height:3px;background:#F0B429;border-radius:2px;margin-bottom:12px"></div>'
    + '<table style="width:100%;border-collapse:collapse"><tr>'
    + '<td><div style="font-size:22px;font-weight:900;color:#F0B429">MaxPoint</div>'
    + '<div style="font-size:8px;color:#aaa;letter-spacing:2px;text-transform:uppercase;margin-top:2px">Orden Interna de Taller</div></td>'
    + '<td style="text-align:right"><div style="font-size:8px;color:#888;line-height:1.7">Av 17 y 34, Mercedes, Bs As<br>(2324) 522082</div></td>'
    + '</tr></table></div>'
    + '<div style="background:#F0B429;padding:7px 18px;display:flex;justify-content:space-between;align-items:center">'
    + '<div><div style="font-size:7px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#7a5500">Orden de Reparacion</div>'
    + '<div style="font-size:18px;font-weight:900;color:#111">' + e2(r.orden||'') + '</div></div>'
    + '<div style="text-align:right"><div style="font-size:8px;color:#7a5500">Fecha: <b>' + e2(r.fecha||'') + '</b></div>'
    + '<div style="font-size:8px;color:#7a5500">Tecnico: <b>' + e2(r.tecnico||'Sin asignar') + '</b></div></div>'
    + '</div>'
    + '<div style="padding:12px 18px">'
    + '<table style="width:100%;border-collapse:collapse;margin-bottom:10px"><tr>'
    + '<td style="vertical-align:top;width:50%;padding-right:10px;border-right:1px solid #eee">'
    + '<div style="font-size:7px;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:#bbb;margin-bottom:4px">Cliente</div>'
    + '<div style="font-size:14px;font-weight:800">' + e2(r.nombre||'') + '</div>'
    + (r.telefono ? '<div style="font-size:10px;color:#555;margin-top:2px">' + e2(r.telefono) + '</div>' : '')
    + '</td>'
    + '<td style="vertical-align:top;padding-left:10px">'
    + '<div style="font-size:7px;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:#bbb;margin-bottom:4px">Equipo</div>'
    + '<div style="font-size:14px;font-weight:800">' + e2(r.equipo||'') + '</div>'
    + (r.modelo ? '<div style="font-size:9px;color:#777;font-family:monospace;margin-top:2px">IMEI: ' + e2(r.modelo) + '</div>' : '')
    + '</td></tr></table>'
    + '<div style="background:#fff3cd;border:1px solid #F0B429;border-radius:6px;padding:7px 12px;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center">'
    + '<div style="font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:#7a5500">Clave / PIN</div>'
    + '<div style="font-size:18px;font-weight:900;color:#111;letter-spacing:3px">' + e2(r.clave||'\u2014') + '</div>'
    + '</div>'
    + '<div style="background:#f8f8f8;border-left:3px solid #F0B429;padding:8px 12px;margin-bottom:10px;border-radius:0 4px 4px 0">'
    + '<div style="font-size:7px;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:#bbb;margin-bottom:3px">Falla declarada</div>'
    + '<div style="font-size:11px;color:#222;line-height:1.5">' + e2(r.falla||'\u2014') + '</div>'
    + '</div>'
    + (r.notas ? '<div style="background:#f0f9ff;border:1px solid #7dd3fc;border-radius:6px;padding:8px 12px;margin-bottom:10px">'
      + '<div style="font-size:7px;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:#0284c7;margin-bottom:3px">Notas del tecnico</div>'
      + '<div style="font-size:10px;color:#0c4a6e;line-height:1.5">' + e2(r.notas) + '</div></div>' : '')
    + '<table style="width:100%;border-collapse:collapse;margin-bottom:10px"><tr>'
    + '<td style="font-size:10px;color:#555;padding:3px 0">Presupuesto</td>'
    + '<td style="text-align:right;font-weight:700;font-size:10px">' + (Number(r.presupuesto||0) ? fmt(r.presupuesto) : 'A confirmar') + '</td></tr>'
    + (cobrado > 0 ? '<tr><td style="font-size:10px;color:#555;padding:3px 0">Cobrado</td><td style="text-align:right;font-size:10px;color:#2DCE89">- ' + fmt(cobrado) + '</td></tr>'
      + '<tr style="border-top:1px solid #eee"><td style="font-weight:800;font-size:10px;padding-top:3px">Saldo</td><td style="text-align:right;font-weight:900;font-size:12px;padding-top:3px">' + fmt(sal) + '</td></tr>' : '')
    + '</table>'
    + (chkItems.length ? '<div style="border-top:1px solid #eee;padding-top:8px;margin-bottom:10px">'
      + '<div style="font-size:7px;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:#bbb;margin-bottom:6px">Checklist de recepcion</div>'
      + '<table style="width:100%;border-collapse:collapse">' + filaChk + '</table>'
      + (r.obs_recep ? '<div style="margin-top:5px;font-size:9px;color:#666;background:#fef2f2;border-radius:4px;padding:5px 8px"><b>Obs:</b> ' + e2(r.obs_recep) + '</div>' : '')
      + '</div>' : '')
    + '<div style="border-top:1px dashed #ddd;padding-top:8px;margin-bottom:10px">'
    + '<div style="font-size:7px;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:#bbb;margin-bottom:6px">Novedades durante la reparacion</div>'
    + '<div style="border:1px dashed #ddd;border-radius:4px;height:50px"></div>'
    + '</div>'
    + '<div style="border-top:1px dashed #ddd;padding-top:10px">'
    + '<div style="font-size:7px;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:#bbb;margin-bottom:18px">Firma del cliente conforme</div>'
    + '<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:20px">'
    + '<div style="flex:1;border-bottom:1px solid #333;height:32px"></div>'
    + '<div style="font-size:8px;color:#999;white-space:nowrap">Firma y aclaracion</div>'
    + '</div></div>'
    + '</div>'
    + '<div style="background:#111;padding:6px 18px;border-radius:0 0 6px 6px;display:flex;justify-content:space-between">'
    + '<div style="font-size:8px;color:#555">USO INTERNO</div>'
    + '<div style="font-size:8px;color:#F0B429;font-weight:700">MaxPoint</div>'
    + '</div>'
    + '<br><button onclick="window.print()" style="width:100%;padding:10px;background:#111;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px">Imprimir A5</button>'
    + '</body></html>';

  var w = window.open('', '_blank', 'width=600,height=850,scrollbars=yes');
  w.document.write(html);
  w.document.close();
}
