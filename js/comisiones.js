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

function comMotivoAjuste(tipo,item) {
  if(!item)return '';
  if((item.comisionExcepcion||{}).estado==='No comisiona')return 'Operación marcada como no comisionable después del pago';
  if(tipo==='reparacion') {
    if(item.ultimaGarantiaId||item.es_garantia==='si'||item.estado==='Garantia'||resolucionFinancieraReparacion(item)==='sin_cargo_garantia')return 'Garantía posterior a liquidación';
    if((item.pagos||[]).some(function(p){return p.estado==='revertido';})&&estadoPagoReparacion(item)!=='Pagado')return 'Reversión de cobro: la reparación quedó con saldo';
    if(estadoPagoReparacion(item)!=='Pagado'&&Number(item.presupuesto||0)>0)return 'La reparación liquidada dejó de estar completamente cobrada';
  }
  if(tipo==='venta' && (item.cajaRevertida||['anulada','devuelta','cancelada'].includes(String(item.estadoVenta||item.estado||'').toLowerCase())))return 'Anulación o devolución posterior a liquidación';
  return '';
}
function comRevisarLinea(liquidacion,linea,item,usuarios) {
  if(!item)return 'Operación de origen no disponible';
  if(linea.tipo==='ajuste') {
    if(item.estado!=='Aprobado'||Number(item.montoArs)!==Number(linea.montoArs))return 'El ajuste cambió o ya no está aprobado';
    if(liquidacion.personaUid&&comIdentidad(item.persona,item.personaUid,usuarios).uid!==liquidacion.personaUid)return 'Cambió el responsable del ajuste';
    return '';
  }
  var critico=comMotivoAjuste(linea.tipo,item);if(critico)return critico;
  if(linea.tipo==='reparacion' && item.estado!=='Entregado')return 'La reparación ya no está entregada';
  if(linea.tipo==='reparacion' && estadoPagoReparacion(item)!=='Pagado')return 'La reparación tiene saldo o no tiene cobro válido';
  if(linea.tipo==='reparacion' && item.incidencia && item.incidencia.estado!=='Resuelta')return 'Incidencia abierta';
  if(linea.tipo==='venta' && !segVentaReal(item))return 'La venta ya no está completada';
  var decision=item.comisionExcepcion||{};
  if(decision.estado==='No comisiona')return 'La operación fue marcada como no comisionable';
  if(decision.estado==='Incluida' && Number(decision.montoArs)!==Number(linea.montoArs))return 'Cambió el importe de la excepción';
  var identidad=comIdentidad(linea.tipo==='reparacion'?item.tecnico:(item.vendedor||(item.usuario||{}).nombre),linea.tipo==='reparacion'?item.tecnicoUid:(item.vendedorUid||(!item.vendedor?(item.usuario||{}).uid:'')),usuarios);
  if(liquidacion.personaUid&&identidad.uid!==liquidacion.personaUid)return 'Cambió el usuario responsable';
  if(!liquidacion.personaUid&&String(liquidacion.persona||'').trim().toLowerCase()!==String(linea.tipo==='reparacion'?item.tecnico:item.vendedor||'').trim().toLowerCase())return 'Cambió el responsable de la operación histórica';
  if(decision.estado==='Incluida')return '';
  if(linea.tipo==='reparacion' && item.gremio==='si')return 'La reparación fue marcada como gremio';
  if(linea.tipo==='reparacion' && item.controlComisionV1 && (item.resultadoServicio!=='Reparación realizada'||(Number(item.presupuesto||0)<100000&&!item.comisionVerificada)))return 'El resultado o la verificación de la reparación requieren revisión';
  if(linea.tipo==='venta' && (item.costoConfirmado===false||Number(item.costo||0)<=0||Number(item.precio||0)<=Number(item.costo||0)))return 'Costo o ganancia de la venta requieren revisión';
  if(linea.tipo==='venta' && ((linea.precioUsd!==undefined&&Number(linea.precioUsd)!==Number(item.precio))||(linea.costoUsd!==undefined&&Number(linea.costoUsd)!==Number(item.costo))))return 'Cambió el precio o costo de la venta';
  return '';
}
function comRevisionesLocales(l) {
  return (l.lineas||[]).map(function(x){
    var lista=x.tipo==='reparacion'?(window.REPS||[]):x.tipo==='venta'?(window.VENTAS||[]):(window.COM_AJUSTES||[]);
    var item=lista.find(function(r){return r.id===x.origenId;});
    if(item&&x.tipo==='reparacion'&&(window.REPS||[]).some(function(r){return r.garantiaOrigenId===x.origenId&&r.es_garantia==='si';}))item=Object.assign({},item,{ultimaGarantiaId:'vinculada'});
    var motivo=comRevisarLinea(l,x,item);return motivo?(x.referencia||x.origenId)+': '+motivo:'';
  }).filter(Boolean);
}
function comAvisoRevision(l) {
  if(!['Aprobada','Pagada'].includes(l.estado))return '';
  var motivos=comRevisionesLocales(l);
  return motivos.length?'<div style="color:var(--or);font-size:11px;margin-top:6px">'+(l.estado==='Aprobada'?'Pago bloqueado. Revisar: ':'Revisión posterior al pago: ')+esc(motivos.join(' · '))+'</div>':'';
}

function comMesSiguiente() { var d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + 1); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'); }
function comGenerarAjuste(tipo, origenId, motivo) {
  if(!puede('gestionar_comisiones'))return;
  FB.conciliarComisiones([tipo+':'+origenId],function(err,n){if(err)toast('Revisión de comisiones pendiente: '+err,'var(--rd)');else if(n)toast('Ajuste de comisión pendiente creado');});
}
function comDescartarAjuste(id) {
  if(!puede('gestionar_comisiones'))return;
  var motivo=prompt('Motivo para descartar este ajuste (quedará registrado):');if(motivo===null)return;
  if(!motivo.trim()){toast('Indicá un motivo','var(--or)');return;}
  FB.actualizarAjusteComision(id,{estado:'Descartado',motivoDescarte:motivo.trim()},function(err){toast(err?'Error: '+err:'Ajuste descartado',err?'var(--rd)':undefined);});
}
function comAprobarAjuste(id) { FB.actualizarAjusteComision(id, { estado:'Aprobado', aprobadoPor:usuarioActualRegistro(), fechaAprobacion:hoy() }, function(err) { if (err) toast('Error: ' + err, 'var(--rd)'); else toast('Ajuste aprobado'); }); }

function comIdentidad(nombre, uid, usuarios) {
  var lista=usuarios||window.EQUIPO_USUARIOS||[],claveNombre=String(nombre||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ');
  if(!uid && (usuarios || window.EQUIPO_USUARIOS_ESTADO==='listo')) {
    var coincidencias=lista.filter(function(u){return String(u.nombre||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ')===claveNombre;});
    if(coincidencias.length===1)uid=coincidencias[0].uid;
  }
  var perfil=lista.find(function(u){return u.uid===uid;}),base=perfil?perfil.nombre:(nombre||'Sin responsable'),etiqueta=base;
  if(perfil && lista.filter(function(u){return String(u.nombre||'').trim().toLowerCase()===String(perfil.nombre||'').trim().toLowerCase();}).length>1)etiqueta+=' · '+(perfil.email||perfil.uid);
  if(!uid)etiqueta+=' (sin UID)';
  return {clave:uid?'uid:'+uid:'legacy:'+claveNombre,uid:uid||'',nombre:etiqueta,nombreBase:base,valida:!!uid&&((usuarios||window.EQUIPO_USUARIOS_ESTADO==='listo')?!!perfil:true)};
}
function comFechaCobro(r) {
  if(estadoPagoReparacion(r)!=='Pagado')return '';
  var registrada=segFechaDia(r.fechaCobroCompleto);if(registrada)return registrada;
  var pagos=pagosReparacion(r),total=0,presupuesto=Number(r.presupuesto||0);
  var fechados=pagos.map(function(p){return {monto:Number(p.monto),fecha:p.legacy?'':segFechaDia(p.fechaHora||p.fecha)};});
  if(!fechados.length||fechados.some(function(p){return !p.fecha;}))return '';
  fechados.sort(function(a,b){return a.fecha.localeCompare(b.fecha);});
  for(var i=0;i<fechados.length;i++){total+=fechados[i].monto;if(total>=presupuesto)return fechados[i].fecha;}
  return '';
}
function comFechaOperacion(tipo, item) {
  if(tipo==='venta')return segFechaDia(item.completadaEn||item.fechaHora||item.fecha);
  var entrega=segFechaEntrega(item),cobro=comFechaCobro(item);
  return entrega&&cobro?(entrega>cobro?entrega:cobro):'';
}
// Criterio compartido por la vista y la validación al aprobar.
function comEvaluarOperacion(tipo, item, cfg, usuarios) {
  cfg=cfg||COM_CFG;
  var identidad=comIdentidad(tipo==='reparacion'?item.tecnico:(item.vendedor||(item.usuario||{}).nombre),tipo==='reparacion'?item.tecnicoUid:(item.vendedorUid||(!item.vendedor?(item.usuario||{}).uid:'')),usuarios);
  var fecha=comFechaOperacion(tipo,item),decision=item.comisionExcepcion||{},motivo='',monto=0;
  var periodo=fecha?fecha.slice(0,7):(/^\d{4}-(0[1-9]|1[0-2])$/.test(decision.periodo||'')?decision.periodo:'');
  if(!identidad.valida)motivo='Responsable sin usuario inequívoco';
  else if(tipo==='reparacion' && item.estado!=='Entregado')motivo='No entregada';
  else if(tipo==='reparacion' && estadoPagoReparacion(item)!=='Pagado')motivo='Saldo pendiente o sin cobro';
  else if(tipo==='venta' && !segVentaReal(item))motivo='Venta pendiente, anulada o devuelta';
  else if(!periodo)motivo='Fecha de entrega/cobro o venta no verificable';
  else if(decision.estado==='No comisiona')motivo='Resuelta: no comisiona';
  else if(decision.estado==='Incluida')monto=Number(decision.montoArs||0);
  else if(tipo==='reparacion') {
    if(item.es_garantia==='si'||resolucionFinancieraReparacion(item)==='sin_cargo_garantia')motivo='Garantía';
    else if(item.incidencia&&item.incidencia.estado!=='Resuelta')motivo='Incidencia abierta';
    else if(item.controlComisionV1&&item.resultadoServicio!=='Reparación realizada')motivo='Resultado sin comisión: '+(item.resultadoServicio||'pendiente');
    else if(item.controlComisionV1&&Number(item.presupuesto||0)<100000&&!item.comisionVerificada)motivo='Pendiente de verificación administrativa';
    else if(item.gremio==='si')motivo='Excluida por gremio';
    else monto=Number(cfg.com_rep||0);
  } else {
    var costo=Number(item.costo||0),ganancia=Number(item.precio||0)-costo;
    if(item.parte_pago==='Si')motivo='Parte de pago pendiente de valuación';
    else if(!costo||costo<=0||item.costoConfirmado===false)motivo='Sin costo confirmado';
    else if(ganancia<=0)motivo='Sin ganancia positiva';
    else (cfg.com_ven_tramos||[]).slice().sort(function(a,b){return Number(a.minimoUsd||0)-Number(b.minimoUsd||0);}).forEach(function(t){if(ganancia>=Number(t.minimoUsd||0))monto=Number(t.montoArs||0);});
  }
  if(!motivo&&(!Number.isFinite(monto)||monto<0))motivo='Importe de comisión inválido';
  return {identidad:identidad,fecha:fecha,periodo:periodo,motivo:motivo,montoArs:monto};
}
function comCalcularElegibles(mesKey) {
  var bloqueadas=comLiquidacionesBloqueadas(),personas=Object.create(null);
  function persona(i){return personas[i.clave]||(personas[i.clave]={clave:i.clave,uid:i.uid,nombre:i.nombre,nombreBase:i.nombreBase,lineas:[],excluidas:[]});}
  [['reparacion',window.REPS||[]],['venta',window.VENTAS||[]]].forEach(function(grupo){
    grupo[1].forEach(function(item){
      if(grupo[0]==='venta'&&item.tipoRegistro==='pos')return;
      var clave=grupo[0]+':'+item.id;if(bloqueadas[clave])return;
      var e=comEvaluarOperacion(grupo[0],item);
      if((e.periodo||fechaAMesKey(item.fecha)||comMesActual())!==mesKey)return;
      var p=persona(e.identidad),referencia=item.orden||item.modelo||item.id;
      if(e.motivo){p.excluidas.push({tipo:grupo[0],origenId:item.id,referencia:referencia,motivo:e.motivo,estado:(item.comisionExcepcion||{}).estado==='No comisiona'?'No comisiona':'Pendiente'});return;}
      var linea={clave:clave,tipo:grupo[0],origenId:item.id,referencia:referencia,fecha:e.fecha,montoArs:e.montoArs,detalle:(item.comisionExcepcion||{}).estado==='Incluida'?'Excepción aprobada por administración':(grupo[0]==='reparacion'?'Reparación entregada y cobrada':'Venta completada con costo confirmado')};
      if(grupo[0]==='venta'){linea.precioUsd=Number(item.precio||0);linea.costoUsd=Number(item.costo||0);linea.gananciaUsd=linea.precioUsd-linea.costoUsd;}
      p.lineas.push(linea);
    });
  });
  (window.COM_AJUSTES||[]).forEach(function(a){
    if(a.periodo!==mesKey||a.estado!=='Aprobado'||bloqueadas['ajuste:'+a.id])return;
    var i=comIdentidad(a.persona,a.personaUid),p=persona(i);
    if(!i.valida){p.excluidas.push({tipo:'ajuste',origenId:a.id,referencia:a.referencia||a.id,motivo:'Responsable del ajuste sin usuario inequívoco',estado:'Pendiente'});return;}
    p.lineas.push({clave:'ajuste:'+a.id,tipo:'ajuste',origenId:a.id,referencia:a.referencia||'Ajuste',fecha:a.fecha,montoArs:Number(a.montoArs||0),detalle:a.motivo||'Ajuste de comisión'});
  });
  return Object.values(personas).map(function(p){p.totalArs=p.lineas.reduce(function(s,x){return s+Number(x.montoArs||0);},0);return p;}).sort(function(a,b){return a.nombre.localeCompare(b.nombre);});
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
    if (!confirm('¿Incluir esta operación excepcionalmente por ' + pesos(monto) + ' en ' + comNombreMes(comMesSeleccionado()) + '? La reparación debe estar entregada y cobrada; la venta, completada.')) return;
    decision = { estado:'Incluida', montoArs:monto, periodo:comMesSeleccionado(), resueltoPor:usuarioActualRegistro(), fecha:hoy(), hora:horaActual() };
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
    var existente = comLiquidacionExistente(seleccionado, p.nombreBase, p.uid);
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
      detalle.innerHTML+=comAvisoRevision(existente);
      var estado = document.createElement('span'); estado.className = 'mu'; estado.style.fontSize = '11px';
      estado.textContent = existente.estado + (existente.fechaPago ? ' - ' + existente.fechaPago : '');
      acciones.appendChild(estado);
      if (existente.estado === 'Aprobada' && !comRevisionesLocales(existente).length) acciones.appendChild(mkBtn('btn-p btn-sm', 'Marcar pagada', (function(id) { return function() { comMarcarPagada(id); }; })(existente.id)));
    } else if (p.lineas.length) acciones.appendChild(mkBtn('btn-g btn-sm', 'Aprobar liquidación', (function(m, n) { return function() { comAprobarLiquidacion(m, n); }; })(seleccionado, p.clave)));
    card.appendChild(acciones); sec.appendChild(card);
  });
  activas.filter(function(l) { return !personas.some(function(p) { return comIdentidad(p.nombreBase,p.uid).clave === comIdentidad(l.persona,l.personaUid).clave; }); }).forEach(function(l) {
    var identidad=comIdentidad(l.persona,l.personaUid);
    var card = document.createElement('div'); card.className = 'card'; card.style.marginBottom = '8px';
    card.innerHTML = '<b>' + esc(identidad.nombre) + '</b><div class="mu" style="font-size:11px;margin-top:4px">' + esc(l.estado) + ' · ' + (l.lineas || []).length + ' operación(es)</div><div class="mono" style="font-size:17px;font-weight:800;color:var(--gr);margin-top:5px">' + pesos(l.totalArs) + '</div>';
    card.innerHTML+=comAvisoRevision(l);
    var acciones = document.createElement('div'); acciones.className = 'fa'; acciones.style.marginTop = '10px';
    acciones.appendChild(mkBtn('btn-g btn-sm', 'Copiar detalle', (function(m, n, ls, total, est) {
      return function() { comCopiarDetalle(m, n, ls, total, est); };
    })(seleccionado, identidad.nombre, l.lineas || [], Number(l.totalArs || 0), l.estado)));
    if (l.estado === 'Aprobada' && !comRevisionesLocales(l).length) acciones.appendChild(mkBtn('btn-p btn-sm', 'Marcar pagada', (function(id) { return function() { comMarcarPagada(id); }; })(l.id)));
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
      if (d.tipo === 'ajuste') acciones='<span class="mu">Revisar responsable de la liquidación de origen</span>';
      else if (d.estado === 'No comisiona') acciones += '<span class="mu" style="font-size:10px;margin-left:6px">No comisiona</span>';
      else acciones += '<button class="btn btn-p btn-sm" style="margin-left:5px" title="Incluir excepcionalmente" onclick="comResolverExcepcion(\'' + d.tipo + '\',\'' + d.origenId + '\',\'incluir\')">✓</button><button class="btn btn-g btn-sm" style="margin-left:5px" title="Marcar como no comisionable" onclick="comResolverExcepcion(\'' + d.tipo + '\',\'' + d.origenId + '\',\'excluir\')">✕</button>';
      return '<tr><td>' + esc(x.persona) + '</td><td>' + esc(d.referencia) + '<div class="mu" style="font-size:10px">' + esc(d.tipo) + '</div></td><td style="color:' + (d.estado === 'No comisiona' ? 'var(--mu)' : 'var(--or)') + '">' + esc(d.motivo) + '</td><td style="white-space:nowrap">' + acciones + '</td></tr>';
    }).join('') + '</tbody></table>';
    secEx.appendChild(tabla);
  }
  sec.appendChild(secEx);
  var ajustes = (window.COM_AJUSTES || []).filter(function(a) { return a.periodo === seleccionado && a.estado === 'Pendiente'; });
  if (ajustes.length) { var aj = document.createElement('div'); aj.style.marginTop = '16px'; aj.innerHTML = '<div class="ct" style="margin-bottom:8px">AJUSTES DE COMISIONES</div>'; ajustes.forEach(function(a) { var row=document.createElement('div'); row.className='card'; row.style.marginBottom='6px'; row.innerHTML='<b>'+esc(a.persona)+'</b><div class="mu" style="font-size:11px">'+esc(a.referencia)+' · '+esc(a.motivo)+'</div><div class="mono cr" style="margin-top:4px">'+pesos(a.montoArs)+'</div>'; row.appendChild(mkBtn('btn-p btn-sm','Aprobar ajuste',(function(id){return function(){comAprobarAjuste(id);};})(a.id))); row.appendChild(mkBtn('btn-g btn-sm','Descartar',(function(id){return function(){comDescartarAjuste(id);};})(a.id))); aj.appendChild(row); }); sec.appendChild(aj); }
  return sec;
}

function comLiquidacionExistente(mes, nombre, uid) {
  var identidad=comIdentidad(nombre,uid);
  return (window.COM_LIQUIDACIONES||[]).find(function(x){return x.periodo===mes&&x.estado!=='Anulada'&&comIdentidad(x.persona,x.personaUid).clave===identidad.clave;});
}
function comAprobarLiquidacion(mes, clave) {
  if(!puede('gestionar_comisiones')){toast('Solo administrador puede liquidar comisiones','var(--rd)');return;}
  var persona=comCalcularElegibles(mes).find(function(x){return x.clave===clave;});
  if(!persona||!persona.uid||!persona.lineas.length){toast('No hay comisiones elegibles con responsable identificado','var(--or)');return;}
  if(comLiquidacionExistente(mes,persona.nombreBase,persona.uid)){toast('Ya existe una liquidación activa para esta persona y período','var(--or)');return;}
  if(!confirm('Aprobar '+pesos(persona.totalArs)+' para '+persona.nombre+' ('+comNombreMes(mes)+')?'))return;
  var actor=usuarioActualRegistro();
  FB.crearLiquidacionComision({periodo:mes,persona:persona.nombreBase,personaUid:persona.uid,estado:'Aprobada',lineas:persona.lineas,ajustes:[],totalArs:persona.totalArs,creadoPor:actor,aprobadoPor:actor,fechaAprobacion:hoy(),reglasVersion:2},function(err){toast(err?'Error: '+err:'Liquidación aprobada',err?'var(--rd)':undefined);});
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
function comOpcionesTecnicos(seleccionado,uid) {
  var opts='<option value="">— Sin asignar —</option>',usados={},seleccionadoIncluido=false;
  function agregar(nombre,personaUid){
    var clave=personaUid?'uid:'+personaUid:'nombre:'+nombre;if(usados[clave])return;usados[clave]=true;
    var seleccionadoAhora=uid?personaUid===uid:nombre===seleccionado;
    // Conservar el nombre guardado al editar; la identidad se conserva por UID.
    var valor=seleccionadoAhora&&seleccionado?seleccionado:nombre;
    if(seleccionadoAhora)seleccionadoIncluido=true;
    var identidad=comIdentidad(nombre,personaUid);
    opts+='<option value="'+esc(valor)+'" data-uid="'+esc(personaUid||'')+'"'+(seleccionadoAhora?' selected':'')+'>'+esc(personaUid?identidad.nombre:nombre)+'</option>';
  }
  (COM_CFG.tecnicos||[]).filter(function(t){return t.activo!==false;}).forEach(function(t){
    var i=comIdentidad(t.nombre,t.uid),matches=(window.EQUIPO_USUARIOS||[]).filter(function(u){return comIdentidad(u.nombre,'').clave===i.clave||(!t.uid&&String(u.nombre||'').trim().toLowerCase()===String(t.nombre||'').trim().toLowerCase());});
    if(i.uid){var cuenta=(window.EQUIPO_USUARIOS||[]).find(function(u){return u.uid===i.uid;});if(!cuenta||cuenta.activo!==false||uid===i.uid)agregar(i.nombreBase,i.uid);}
    else if(matches.length)matches.forEach(function(u){agregar(u.nombre,u.uid);});
    else agregar(t.nombre,'');
  });
  (window.EQUIPO_USUARIOS||[]).filter(function(u){return u.activo!==false&&['administrador','admin','tecnico','técnico','recepcionista'].includes(String(u.rol||'').toLowerCase())&&!(COM_CFG.tecnicos||[]).some(function(t){return t.activo===false&&(t.uid===u.uid||(!t.uid&&comIdentidad(t.nombre,'').clave===comIdentidad(u.nombre,'').clave));});}).forEach(function(u){agregar(u.nombre,u.uid);});
  if(seleccionado&&!seleccionadoIncluido)agregar(seleccionado,uid||'');
  return opts;
}
function comUidSelect(select) {var opcion=select&&select.selectedOptions&&select.selectedOptions[0];return opcion?opcion.getAttribute('data-uid')||'':'';}

// ── Marcar reparacion como garantia ──────────────────
function marcarGarantia(id) {
  var r = REPS.find(function(x) { return x.id === id; });
  if (!r) return;
  var esGar = r.es_garantia === 'si';
  var nuevo = esGar ? 'no' : 'si';
  if (nuevo === 'si' && totalCobradoReparacion(r) > 0) {
    toast('Esta orden tiene cobros. Creá una garantía vinculada para no alterar su historial financiero', 'var(--rd)'); return;
  }
  FB.upd(id, { es_garantia: nuevo, resolucionFinanciera:nuevo === 'si' ? 'sin_cargo_garantia' : 'cobrable' }, function(err) {
    if (err) { toast('Error: ' + err, 'var(--rd)'); return; }
    if (nuevo === 'si') comGenerarAjuste('reparacion', id, 'Garantía posterior a liquidación');
    if (nuevo === 'si' && typeof notificarEventoReparacion === 'function') notificarEventoReparacion('garantia_nueva', r);
    toast(nuevo === 'si' ? 'Marcada como garantia' : 'Garantia removida');
  });
}

// ── Calcular comisiones por mes ───────────────────────
function calcComisiones(mesKey) {
  mesKey=mesKey||comMesActual();var resultado=Object.create(null);
  function sumar(nombre,lineas,totalGuardado){var p=resultado[nombre]||(resultado[nombre]={reps:0,gar:0,ven:0,ajustes:0,com_rep:0,com_ven:0,com_ajustes:0,total:0}),totalLineas=0;lineas.forEach(function(x){var monto=Number(x.montoArs||0);if(x.tipo==='reparacion'){p.reps++;p.com_rep+=monto;}if(x.tipo==='venta'){p.ven++;p.com_ven+=monto;}if(x.tipo==='ajuste'){p.ajustes++;p.com_ajustes+=monto;}totalLineas+=monto;});p.total+=totalGuardado!==undefined?Number(totalGuardado):totalLineas;}
  comCalcularElegibles(mesKey).forEach(function(p){sumar(p.nombre,p.lineas);});
  (window.COM_LIQUIDACIONES||[]).filter(function(l){return l.periodo===mesKey&&['Aprobada','Pagada'].includes(l.estado);}).forEach(function(l){var i=comIdentidad(l.persona,l.personaUid);sumar(i.nombre,l.lineas||[],l.totalArs);});
  return resultado;
}

function fechaAMesKey(fecha) {var dia=segFechaDia(fecha);return dia?dia.slice(0,7):'';}
function calcMesesDisponibles() {
  var meses={};
  (window.REPS||[]).forEach(function(r){meses[fechaAMesKey(comFechaOperacion('reparacion',r))||fechaAMesKey(r.fecha)]=true;});
  (window.VENTAS||[]).forEach(function(v){meses[fechaAMesKey(comFechaOperacion('venta',v))||fechaAMesKey(v.fecha)]=true;});
  (window.COM_LIQUIDACIONES||[]).concat(window.COM_AJUSTES||[]).forEach(function(x){if(x.periodo)meses[x.periodo]=true;});
  return Object.keys(meses).filter(Boolean).sort().reverse();
}
