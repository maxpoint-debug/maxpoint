// ===================== COMISIONES =====================
// Tecnicos/vendedores, comisiones mensuales, garantias

// ── Config (se guarda en Firebase config/comisiones) ─
var COM_CFG = {
  tecnicos:      [],       // [{ id, nombre, activo }]
  com_rep:       5000,     // $ por reparacion
  com_ven:       10000,    // $ por venta
  com_ven_tramos: [
    { minimoUsd: 0, montoArs: 5000 },
    { minimoUsd: 100, montoArs: 10000 },
    { minimoUsd: 200, montoArs: 15000 }
  ],
};

function comLoadCfg(data) {
  if (!data) return;
  if (data.tecnicos)  COM_CFG.tecnicos  = data.tecnicos;
  if (data.com_rep)   COM_CFG.com_rep   = data.com_rep;
  if (data.com_ven)   COM_CFG.com_ven   = data.com_ven;
  if (Array.isArray(data.com_ven_tramos) && data.com_ven_tramos.length) COM_CFG.com_ven_tramos = data.com_ven_tramos;
}

function comMontoVenta(gananciaUsd) {
  var tramos = (COM_CFG.com_ven_tramos || []).slice().sort(function(a, b) { return Number(a.minimoUsd || 0) - Number(b.minimoUsd || 0); });
  var monto = 0;
  tramos.forEach(function(t) { if (Number(gananciaUsd) >= Number(t.minimoUsd || 0)) monto = Number(t.montoArs || 0); });
  return monto;
}

function comLiquidacionesBloqueadas() {
  var claves = {};
  (window.COM_LIQUIDACIONES || []).forEach(function(l) {
    if (l.estado !== 'Aprobada' && l.estado !== 'Pagada') return;
    (l.lineas || []).forEach(function(x) { if (x.clave) claves[x.clave] = l.id; });
  });
  return claves;
}

function comMesSiguiente() { var d = new Date(); d.setMonth(d.getMonth() + 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
function comGenerarAjuste(tipo, origenId, motivo) {
  if (!puede('gestionar_comisiones')) return;
  var clave = tipo + ':' + origenId;
  (window.COM_LIQUIDACIONES || []).filter(function(l) { return l.estado === 'Pagada'; }).forEach(function(l) {
    (l.lineas || []).filter(function(x) { return x.clave === clave; }).forEach(function(x) {
      if ((window.COM_AJUSTES || []).some(function(a) { return a.liquidacionId === l.id && a.claveOrigen === clave; })) return;
      FB.crearAjusteComision({ periodo:comMesSiguiente(), persona:l.persona, estado:'Pendiente', liquidacionId:l.id, claveOrigen:clave, referencia:x.referencia || origenId, motivo:motivo, montoArs:-Math.abs(Number(x.montoArs || 0)), creadoPor:usuarioActualRegistro(), fecha:hoy() }, function(err) { if (err) toast('No se pudo crear ajuste: ' + err, 'var(--rd)'); else toast('Ajuste de comisión pendiente creado'); });
    });
  });
}
function comAprobarAjuste(id) { FB.actualizarAjusteComision(id, { estado:'Aprobado', aprobadoPor:usuarioActualRegistro(), fechaAprobacion:hoy() }, function(err) { if (err) toast('Error: ' + err, 'var(--rd)'); else toast('Ajuste aprobado'); }); }

function comCalcularElegibles(mesKey) {
  var bloqueadas = comLiquidacionesBloqueadas();
  var personas = {};
  function persona(nombre) {
    if (!personas[nombre]) personas[nombre] = { nombre:nombre, lineas:[], excluidas:[] };
    return personas[nombre];
  }
  function excluir(p, tipo, origenId, referencia, motivo, estado) {
    p.excluidas.push({ tipo:tipo, origenId:origenId, referencia:referencia, motivo:motivo, estado:estado || 'Pendiente' });
  }
  (window.REPS || []).forEach(function(r) {
    if (!r.tecnico || fechaAMesKey(r.fecha) !== mesKey) return;
    var p = persona(r.tecnico), clave = 'reparacion:' + r.id;
    var decision = r.comisionExcepcion || {};
    if (decision.estado === 'No comisiona') { excluir(p, 'reparacion', r.id, r.orden || r.id, 'Resuelta: no comisiona', 'No comisiona'); return; }
    if (decision.estado === 'Incluida') {
      if (!bloqueadas[clave]) p.lineas.push({ clave:clave, tipo:'reparacion', origenId:r.id, referencia:r.orden || r.id, fecha:r.fecha, montoArs:Number(decision.montoArs || 0), detalle:'Excepción aprobada por administración' });
      return;
    }
    if (r.estado !== 'Entregado') { excluir(p, 'reparacion', r.id, r.orden || r.id, 'No entregada'); return; }
    if (estadoPagoReparacion(r) !== 'Pagado') { excluir(p, 'reparacion', r.id, r.orden || r.id, 'Saldo pendiente'); return; }
    if (r.incidencia && r.incidencia.estado !== 'Resuelta') { excluir(p, 'reparacion', r.id, r.orden || r.id, 'Incidencia abierta'); return; }
    if (r.controlComisionV1 && r.resultadoServicio !== 'Reparación realizada') { excluir(p, 'reparacion', r.id, r.orden || r.id, 'Resultado sin comisión: ' + (r.resultadoServicio || 'pendiente')); return; }
    if (r.controlComisionV1 && Number(r.presupuesto || 0) < 100000 && !r.comisionVerificada) { excluir(p, 'reparacion', r.id, r.orden || r.id, 'Pendiente de verificación administrativa'); return; }
    if (r.es_garantia === 'si') { excluir(p, 'reparacion', r.id, r.orden || r.id, 'Garantía'); return; }
    if (r.gremio === 'si') { excluir(p, 'reparacion', r.id, r.orden || r.id, 'Excluida por gremio'); return; }
    if (bloqueadas[clave]) return;
    p.lineas.push({ clave:clave, tipo:'reparacion', origenId:r.id, referencia:r.orden || r.id, fecha:r.fecha, montoArs:Number(COM_CFG.com_rep || 0), detalle:'Reparación entregada y cobrada' });
  });
  (window.VENTAS || []).forEach(function(v) {
    if (!v.vendedor || fechaAMesKey(v.fecha) !== mesKey) return;
    var p = persona(v.vendedor), clave = 'venta:' + v.id;
    var precio = Number(v.precio || 0), costo = Number(v.costo || 0), ganancia = precio - costo;
    var decision = v.comisionExcepcion || {};
    if ((v.estadoVenta || 'Cobrada') !== 'Cobrada') { excluir(p, 'venta', v.id, v.modelo || v.id, 'Venta ' + (v.estadoVenta || 'pendiente')); return; }
    if (decision.estado === 'No comisiona') { excluir(p, 'venta', v.id, v.modelo || v.id, 'Resuelta: no comisiona', 'No comisiona'); return; }
    if (decision.estado === 'Incluida') {
      if (!bloqueadas[clave]) p.lineas.push({ clave:clave, tipo:'venta', origenId:v.id, referencia:v.modelo || v.id, fecha:v.fecha, montoArs:Number(decision.montoArs || 0), precioUsd:precio, costoUsd:costo, gananciaUsd:ganancia, detalle:'Excepción aprobada por administración' });
      return;
    }
    if (v.parte_pago === 'Si') { excluir(p, 'venta', v.id, v.modelo || v.id, 'Parte de pago pendiente de valuación'); return; }
    if (!costo || costo <= 0 || v.costoConfirmado === false) { excluir(p, 'venta', v.id, v.modelo || v.id, 'Sin costo confirmado'); return; }
    if (ganancia <= 0) { excluir(p, 'venta', v.id, v.modelo || v.id, 'Sin ganancia positiva'); return; }
    if (bloqueadas[clave]) return;
    p.lineas.push({ clave:clave, tipo:'venta', origenId:v.id, referencia:v.modelo || v.id, fecha:v.fecha, montoArs:comMontoVenta(ganancia), precioUsd:precio, costoUsd:costo, gananciaUsd:ganancia, detalle:'Venta con costo confirmado' });
  });
  (window.COM_AJUSTES || []).filter(function(a) { return a.periodo === mesKey && a.estado === 'Aprobado'; }).forEach(function(a) {
    var p = persona(a.persona); p.lineas.push({ clave:'ajuste:' + a.id, tipo:'ajuste', origenId:a.id, referencia:a.referencia || 'Ajuste', fecha:a.fecha, montoArs:Number(a.montoArs || 0), detalle:a.motivo || 'Ajuste de comisión' });
  });
  return Object.keys(personas).map(function(nombre) {
    var p = personas[nombre]; p.totalArs = p.lineas.reduce(function(s, x) { return s + Number(x.montoArs || 0); }, 0); return p;
  }).filter(function(p) { return p.lineas.length || p.excluidas.length; }).sort(function(a,b) { return a.nombre.localeCompare(b.nombre); });
}

function comVerificarReparacion(id) {
  if (!puede('gestionar_comisiones')) { toast('Solo administrador puede verificar comisiones', 'var(--rd)'); return; }
  var r = (window.REPS || []).find(function(x) { return x.id === id; });
  if (!r || !r.controlComisionV1 || Number(r.presupuesto || 0) >= 100000) return;
  if (r.resultadoServicio !== 'Reparación realizada') { toast('Solo una reparación realizada puede verificarse para comisión', 'var(--or)'); return; }
  if (!confirm('Verificar esta reparación menor a ' + pesos(100000) + ' para que pueda liquidarse cuando esté entregada y cobrada?')) return;
  FB.upd(id, { comisionVerificada:true, comisionVerificadaPor:usuarioActualRegistro(), fechaVerificacionComision:hoy() }, function(err) {
    if (err) { toast('Error: ' + err, 'var(--rd)'); return; }
    toast('Reparación verificada para comisión');
  });
}

function comAbrirExcepcion(tipo, id) {
  if (tipo === 'reparacion') { openDet(id); return; }
  if (tipo === 'venta' && typeof openEditVenta === 'function') openEditVenta(id);
}

function comResolverExcepcion(tipo, id, accion) {
  if (!puede('gestionar_comisiones')) { toast('Solo administrador puede resolver excepciones', 'var(--rd)'); return; }
  var item = tipo === 'reparacion' ? (window.REPS || []).find(function(x) { return x.id === id; }) : (window.VENTAS || []).find(function(x) { return x.id === id; });
  if (!item) { toast('Operación no encontrada', 'var(--rd)'); return; }
  var decision;
  if (accion === 'incluir') {
    var sugerido = tipo === 'reparacion' ? Number(COM_CFG.com_rep || 0) : comMontoVenta(Number(item.precio || 0) - Number(item.costo || 0));
    var ingreso = prompt('Comisión excepcional a incluir (ARS):', sugerido);
    if (ingreso === null) return;
    var monto = Number(ingreso);
    if (!Number.isFinite(monto) || monto <= 0) { toast('Ingresá una comisión válida', 'var(--rd)'); return; }
    if (!confirm('¿Incluir esta operación excepcionalmente por ' + pesos(monto) + '?')) return;
    decision = { estado:'Incluida', montoArs:monto, resueltoPor:usuarioActualRegistro(), fecha:hoy(), hora:horaActual() };
  } else {
    if (!confirm('¿Marcar esta operación como no comisionable? Quedará registrada como decisión administrativa.')) return;
    decision = { estado:'No comisiona', montoArs:0, resueltoPor:usuarioActualRegistro(), fecha:hoy(), hora:horaActual() };
  }
  var done = function(err) { if (err) { toast('Error: ' + err, 'var(--rd)'); return; } toast(accion === 'incluir' ? 'Excepción incluida para comisión' : 'Excepción marcada como no comisionable'); };
  if (tipo === 'reparacion') FB.upd(id, { comisionExcepcion:decision }, done);
  else FB.updV(id, { comisionExcepcion:decision }, done);
}

function comMesActual() {
  var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
}

function comNombreMes(mes) {
  var nombres = ['','Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  var p = String(mes || '').split('-'); return (nombres[Number(p[1])] || mes) + ' ' + (p[0] || '');
}

var COM_MES_SEL = null;
function comMesSeleccionado() {
  if (COM_MES_SEL) return COM_MES_SEL;
  var d = new Date(); d.setMonth(d.getMonth() - 1);
  COM_MES_SEL = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
  return COM_MES_SEL;
}
function comCambiarMes(mes) { COM_MES_SEL = mes; if (typeof renderBal === 'function') renderBal(); }

// Texto listo para pegar en un recibo o mensaje. Usa exactamente las líneas
// que se muestran para la liquidación/periodo, sin alterar el cálculo.
function comCopiarDetalle(mes, nombre, lineas, total, estado) {
  var texto = 'MAXPOINT — COMISIONES\n'
    + 'Período: ' + comNombreMes(mes) + '\n'
    + 'Persona: ' + (nombre || 'Sin asignar') + '\n'
    + (estado ? 'Estado: ' + estado + '\n' : '')
    + '\nDetalle:\n'
    + (lineas || []).map(function(x) {
      return '- ' + (x.referencia || 'Sin referencia') + ' · ' + (x.tipo || 'operación') + ' · ' + pesos(x.montoArs || 0);
    }).join('\n')
    + '\n\nTotal comisiones: ' + pesos(total || 0);
  copiarTexto(texto, 'Detalle de comisiones copiado');
}

function comRenderControl() {
  var sec = document.createElement('div'); sec.style.marginTop = '22px';
  sec.innerHTML = '<div class="ct" style="margin-bottom:8px">COMISIONES</div>';
  if (!puede('gestionar_comisiones')) { sec.innerHTML += '<div class="mu" style="font-size:12px">Las liquidaciones de comisiones son visibles solo para administración.</div>'; return sec; }
  var disponibles = typeof calcMesesDisponibles === 'function' ? calcMesesDisponibles() : [];
  var seleccionado = comMesSeleccionado();
  if (disponibles.indexOf(seleccionado) === -1) disponibles.push(seleccionado);
  disponibles = disponibles.filter(Boolean).sort().reverse();
  var selector = document.createElement('div'); selector.style.cssText = 'display:flex;gap:8px;align-items:center;margin-bottom:10px;flex-wrap:wrap';
  selector.innerHTML = '<span class="mu" style="font-size:11px">Período</span><select class="btn btn-g btn-sm" onchange="comCambiarMes(this.value)">' + disponibles.map(function(m) { return '<option value="' + m + '"' + (m === seleccionado ? ' selected' : '') + '>' + esc(comNombreMes(m)) + '</option>'; }).join('') + '</select><span class="mu" style="font-size:11px">Se liquidan operaciones del período seleccionado.</span>';
  sec.appendChild(selector);
  var personas = comCalcularElegibles(seleccionado);
  var activas = (window.COM_LIQUIDACIONES || []).filter(function(l) { return l.periodo === seleccionado && l.estado !== 'Anulada'; });
  if (!personas.length && !activas.length) { sec.innerHTML += '<div class="empty" style="padding:18px">Sin operaciones comisionables o liquidaciones para este período.</div>'; return sec; }
  personas.forEach(function(p) {
    var existente = comLiquidacionExistente(seleccionado, p.nombre);
    var card = document.createElement('div'); card.className = 'card'; card.style.marginBottom = '8px';
    var lineasMostrar = existente ? (existente.lineas || []) : p.lineas;
    var totalMostrar = existente ? Number(existente.totalArs || 0) : p.totalArs;
    var reps = lineasMostrar.filter(function(x) { return x.tipo === 'reparacion'; });
    var ventas = lineasMostrar.filter(function(x) { return x.tipo === 'venta'; });
    var subtitulo = existente
      ? reps.length + ' reparación(es) · ' + ventas.length + ' venta(s) incluidas en la liquidación'
      : reps.length + ' reparación(es) · ' + ventas.length + ' venta(s)' + (p.excluidas.length ? ' · ' + p.excluidas.length + ' excluida(s)' : '');
    card.innerHTML = '<div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap"><div><b>' + esc(p.nombre) + '</b><div class="mu" style="font-size:11px;margin-top:3px">' + subtitulo + '</div></div><div class="mono" style="font-size:17px;font-weight:800;color:var(--gr)">' + pesos(totalMostrar) + '</div></div>';
    var detalle = document.createElement('div'); detalle.style.cssText = 'font-size:11px;color:var(--mu);margin-top:8px';
    detalle.innerHTML = lineasMostrar.map(function(x) { return '<div>' + esc(x.referencia) + ' · ' + esc(x.tipo) + ' · ' + pesos(x.montoArs) + (x.gananciaUsd !== undefined ? ' · ganancia ' + x.gananciaUsd + ' USD' : '') + '</div>'; }).join('');
    if (!existente && p.excluidas.length) detalle.innerHTML += '<div style="margin-top:5px;color:var(--or)">Excluidas: ' + esc(p.excluidas.slice(0, 3).map(function(x) { return x.referencia + ': ' + x.motivo; }).join(' · ')) + (p.excluidas.length > 3 ? '…' : '') + '</div>';
    card.appendChild(detalle);
    var acciones = document.createElement('div'); acciones.className = 'fa'; acciones.style.marginTop = '10px';
    acciones.appendChild(mkBtn('btn-g btn-sm', 'Copiar detalle', (function(m, n, ls, total, est) {
      return function() { comCopiarDetalle(m, n, ls, total, est); };
    })(seleccionado, p.nombre, lineasMostrar, totalMostrar, existente ? existente.estado : 'Pendiente de aprobación')));
    if (existente) {
      var estado = document.createElement('span'); estado.className = 'mu'; estado.style.fontSize = '11px';
      estado.textContent = existente.estado + (existente.fechaPago ? ' - ' + existente.fechaPago : '');
      acciones.appendChild(estado);
      if (existente.estado === 'Aprobada') acciones.appendChild(mkBtn('btn-p btn-sm', 'Marcar pagada', (function(id) { return function() { comMarcarPagada(id); }; })(existente.id)));
    } else if (p.lineas.length) acciones.appendChild(mkBtn('btn-g btn-sm', 'Aprobar liquidación', (function(m, n) { return function() { comAprobarLiquidacion(m, n); }; })(seleccionado, p.nombre)));
    card.appendChild(acciones); sec.appendChild(card);
  });
  activas.filter(function(l) { return !personas.some(function(p) { return p.nombre === l.persona; }); }).forEach(function(l) {
    var card = document.createElement('div'); card.className = 'card'; card.style.marginBottom = '8px';
    card.innerHTML = '<b>' + esc(l.persona) + '</b><div class="mu" style="font-size:11px;margin-top:4px">' + esc(l.estado) + ' · ' + (l.lineas || []).length + ' operación(es)</div><div class="mono" style="font-size:17px;font-weight:800;color:var(--gr);margin-top:5px">' + pesos(l.totalArs) + '</div>';
    var acciones = document.createElement('div'); acciones.className = 'fa'; acciones.style.marginTop = '10px';
    acciones.appendChild(mkBtn('btn-g btn-sm', 'Copiar detalle', (function(m, n, ls, total, est) {
      return function() { comCopiarDetalle(m, n, ls, total, est); };
    })(seleccionado, l.persona, l.lineas || [], Number(l.totalArs || 0), l.estado)));
    if (l.estado === 'Aprobada') acciones.appendChild(mkBtn('btn-p btn-sm', 'Marcar pagada', (function(id) { return function() { comMarcarPagada(id); }; })(l.id)));
    card.appendChild(acciones);
    sec.appendChild(card);
  });
  var excepciones = [];
  personas.forEach(function(p) { (p.excluidas || []).forEach(function(x) { excepciones.push({ persona:p.nombre, dato:x }); }); });
  var secEx = document.createElement('div'); secEx.style.marginTop = '16px'; secEx.innerHTML = '<div class="ct" style="margin-bottom:8px">EXCEPCIONES DE COMISIONES</div>';
  if (!excepciones.length) secEx.innerHTML += '<div class="mu" style="font-size:12px">No hay excepciones para revisar en este período.</div>';
  else {
    var tabla = document.createElement('div'); tabla.className = 'tw';
    tabla.innerHTML = '<table><thead><tr><th>Persona</th><th>Operación</th><th>Motivo</th><th></th></tr></thead><tbody>' + excepciones.map(function(x) {
      var d = x.dato;
      var acciones = '<button class="btn btn-g btn-sm" onclick="comAbrirExcepcion(\'' + d.tipo + '\',\'' + d.origenId + '\')">Revisar</button>';
      if (d.estado === 'No comisiona') acciones += '<span class="mu" style="font-size:10px;margin-left:6px">No comisiona</span>';
      else acciones += '<button class="btn btn-p btn-sm" style="margin-left:5px" title="Incluir excepcionalmente" onclick="comResolverExcepcion(\'' + d.tipo + '\',\'' + d.origenId + '\',\'incluir\')">✓</button><button class="btn btn-g btn-sm" style="margin-left:5px" title="Marcar como no comisionable" onclick="comResolverExcepcion(\'' + d.tipo + '\',\'' + d.origenId + '\',\'excluir\')">✕</button>';
      return '<tr><td>' + esc(x.persona) + '</td><td>' + esc(d.referencia) + '<div class="mu" style="font-size:10px">' + esc(d.tipo) + '</div></td><td style="color:' + (d.estado === 'No comisiona' ? 'var(--mu)' : 'var(--or)') + '">' + esc(d.motivo) + '</td><td style="white-space:nowrap">' + acciones + '</td></tr>';
    }).join('') + '</tbody></table>';
    secEx.appendChild(tabla);
  }
  sec.appendChild(secEx);
  var ajustes = (window.COM_AJUSTES || []).filter(function(a) { return a.periodo === seleccionado && a.estado === 'Pendiente'; });
  if (ajustes.length) { var aj = document.createElement('div'); aj.style.marginTop = '16px'; aj.innerHTML = '<div class="ct" style="margin-bottom:8px">AJUSTES DE COMISIONES</div>'; ajustes.forEach(function(a) { var row=document.createElement('div'); row.className='card'; row.style.marginBottom='6px'; row.innerHTML='<b>'+esc(a.persona)+'</b><div class="mu" style="font-size:11px">'+esc(a.referencia)+' · '+esc(a.motivo)+'</div><div class="mono cr" style="margin-top:4px">'+pesos(a.montoArs)+'</div>'; row.appendChild(mkBtn('btn-p btn-sm','Aprobar ajuste',(function(id){return function(){comAprobarAjuste(id);};})(a.id))); aj.appendChild(row); }); sec.appendChild(aj); }
  return sec;
}

function comLiquidacionExistente(mes, nombre) {
  return (window.COM_LIQUIDACIONES || []).find(function(x) { return x.periodo === mes && x.persona === nombre && x.estado !== 'Anulada'; });
}

function comAprobarLiquidacion(mes, nombre) {
  if (!puede('gestionar_comisiones')) { toast('Solo administrador puede liquidar comisiones', 'var(--rd)'); return; }
  if (comLiquidacionExistente(mes, nombre)) { toast('Ya existe una liquidación activa para esta persona y período', 'var(--or)'); return; }
  var persona = comCalcularElegibles(mes).find(function(x) { return x.nombre === nombre; });
  if (!persona || !persona.lineas.length) { toast('No hay comisiones elegibles para liquidar', 'var(--or)'); return; }
  if (!confirm('Aprobar ' + pesos(persona.totalArs) + ' para ' + nombre + ' (' + comNombreMes(mes) + ')? Las operaciones quedarán bloqueadas para este período.')) return;
  var actor = usuarioActualRegistro();
  FB.crearLiquidacionComision({ periodo:mes, persona:nombre, estado:'Aprobada', lineas:persona.lineas, ajustes:[], totalArs:persona.totalArs, creadoPor:actor, aprobadoPor:actor, fechaAprobacion:hoy(), reglasVersion:1 }, function(err) {
    if (err) { toast('Error: ' + err, 'var(--rd)'); return; }
    toast('Liquidación aprobada');
  });
}

function comMarcarPagada(id) {
  if (!puede('gestionar_comisiones')) return;
  var l = (window.COM_LIQUIDACIONES || []).find(function(x) { return x.id === id; });
  if (!l || l.estado !== 'Aprobada') return;
  var medio = prompt('Medio de pago de la comisión:', 'Efectivo');
  if (medio === null) return;
  FB.actualizarLiquidacionComision(id, { estado:'Pagada', medioPago:medio || 'Sin especificar', pagadoPor:usuarioActualRegistro(), fechaPago:hoy(), horaPago:horaActual() }, function(err) {
    if (err) { toast('Error: ' + err, 'var(--rd)'); return; }
    toast('Comisión marcada como pagada');
  });
}

// ── Guardar config ────────────────────────────────────
function comGuardarCfg(cb) {
  FB.setComCfg(COM_CFG, cb || function() {});
}

// ── Modal gestión de técnicos ─────────────────────────
function openGestionTecnicos() {
  comRenderTecnicos();
  openM('mTecnicos');
}

function comRenderTecnicos() {
  var wrap = el('tecListaWrap');
  if (!wrap) return;
  wrap.innerHTML = '';
  COM_CFG.tecnicos.forEach(function(t, i) {
    var row = document.createElement('div');
    row.style.cssText = 'display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid var(--bd)';
    row.innerHTML = '<input type="text" value="' + esc(t.nombre) + '" data-i="' + i + '"'
      + ' style="flex:1;background:var(--s2);border:1px solid var(--bd);border-radius:6px;padding:6px 10px;color:var(--tx);font-size:13px;outline:none"'
      + ' onchange="comEditarNombre(this)"/>'
      + '<label style="font-size:11px;color:var(--mu);display:flex;align-items:center;gap:4px;cursor:pointer">'
      + '<input type="checkbox" data-i="' + i + '" onchange="comToggleActivo(this)"' + (t.activo !== false ? ' checked' : '') + '/> Activo</label>'
      + '<button data-i="' + i + '" onclick="comEliminar(this.dataset.i)"'
      + ' style="background:none;border:none;color:var(--mu);cursor:pointer;font-size:16px;padding:0 4px">&#10006;</button>';
    wrap.appendChild(row);
  });
}

function comAgregarTecnico() {
  var nom = el('tecNuevoNom').value.trim();
  if (!nom) return;
  COM_CFG.tecnicos.push({ id: 'tec_' + Date.now(), nombre: nom, activo: true });
  el('tecNuevoNom').value = '';
  comRenderTecnicos();
}

function comEditarNombre(input) {
  var i = parseInt(input.dataset.i);
  COM_CFG.tecnicos[i].nombre = input.value.trim();
}

function comToggleActivo(chk) {
  var i = parseInt(chk.dataset.i);
  COM_CFG.tecnicos[i].activo = chk.checked;
}

function comEliminar(i) {
  COM_CFG.tecnicos.splice(parseInt(i), 1);
  comRenderTecnicos();
}

function comGuardarTecnicos() {
  comGuardarCfg(function(err) {
    if (err) { toast('Error: ' + err, 'var(--rd)'); return; }
    toast('Tecnicos guardados');
    closeM('mTecnicos');
  });
}

// ── Lista de tecnicos activos para selects ────────────
function comOpcionesTecnicos(seleccionado) {
  var opts = '<option value="">— Sin asignar —</option>';
  COM_CFG.tecnicos.filter(function(t){ return t.activo !== false; }).forEach(function(t) {
    opts += '<option value="' + esc(t.nombre) + '"' + (t.nombre === seleccionado ? ' selected' : '') + '>' + esc(t.nombre) + '</option>';
  });
  return opts;
}

// ── Marcar reparacion como garantia ──────────────────
function marcarGarantia(id) {
  var r = REPS.find(function(x) { return x.id === id; });
  if (!r) return;
  var esGar = r.es_garantia === 'si';
  var nuevo = esGar ? 'no' : 'si';
  FB.upd(id, { es_garantia: nuevo }, function(err) {
    if (err) { toast('Error: ' + err, 'var(--rd)'); return; }
    if (nuevo === 'si') comGenerarAjuste('reparacion', id, 'Garantía posterior a liquidación');
    if (nuevo === 'si' && typeof notificarEventoReparacion === 'function') notificarEventoReparacion('garantia_nueva', r);
    toast(nuevo === 'si' ? 'Marcada como garantia' : 'Garantia removida');
  });
}

// ── Calcular comisiones por mes ───────────────────────
function calcComisiones(mesKey) {
  // mesKey = 'YYYY-MM' o null para mes actual
  if (!mesKey) {
    var hoy = new Date();
    var m = String(hoy.getMonth()+1).padStart(2,'0');
    mesKey = hoy.getFullYear() + '-' + m;
  }

  var resultado = {};
  COM_CFG.tecnicos.forEach(function(t) {
    resultado[t.nombre] = { reps: 0, gar: 0, ven: 0, com_rep: 0, com_ven: 0, total: 0 };
  });

  // Reparaciones del mes — solo Pagadas o Entregadas
  (window.REPS || []).forEach(function(r) {
    if (!r.tecnico || !r.fecha) return;
    var k = fechaAMesKey(r.fecha);
    if (k !== mesKey) return;
    // Solo contar si fue cobrada o entregada
    var conta = estadoPagoReparacion(r) === 'Pagado' || r.estado === 'Entregado';
    if (!conta) return;
    if (r.gremio === 'si') return; // gremio no cuenta comision
    if (!resultado[r.tecnico]) resultado[r.tecnico] = { reps:0, gar:0, ven:0, com_rep:0, com_ven:0, total:0 };
    if (r.es_garantia === 'si') {
      resultado[r.tecnico].gar++;
    } else {
      resultado[r.tecnico].reps++;
      resultado[r.tecnico].com_rep += COM_CFG.com_rep;
    }
  });

  // Ventas del mes
  (window.VENTAS || []).forEach(function(v) {
    if (!v.vendedor || !v.fecha) return;
    var k = fechaAMesKey(v.fecha);
    if (k !== mesKey) return;
    if (!resultado[v.vendedor]) resultado[v.vendedor] = { reps:0, gar:0, ven:0, com_rep:0, com_ven:0, total:0 };
    resultado[v.vendedor].ven++;
    resultado[v.vendedor].com_ven += COM_CFG.com_ven;
  });

  // Total
  Object.keys(resultado).forEach(function(nom) {
    var d = resultado[nom];
    d.total = d.com_rep + d.com_ven;
  });

  return resultado;
}

function fechaAMesKey(fechaStr) {
  if (!fechaStr) return '';
  // DD/MM/YYYY → YYYY-MM
  if (fechaStr.includes('/')) {
    var p = fechaStr.split('/');
    return p[2] + '-' + p[1];
  }
  // YYYY-MM-DD → YYYY-MM
  return fechaStr.slice(0, 7);
}

// ── Meses disponibles ─────────────────────────────────
function calcMesesDisponibles() {
  var meses = {};
  (window.REPS || []).forEach(function(r) {
    if (r.fecha) meses[fechaAMesKey(r.fecha)] = true;
  });
  (window.VENTAS || []).forEach(function(v) {
    if (v.fecha) meses[fechaAMesKey(v.fecha)] = true;
  });
  return Object.keys(meses).filter(Boolean).sort().reverse();
}
