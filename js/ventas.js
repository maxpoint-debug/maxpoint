// ===================== VENTAS =====================
// Registro de ventas de equipos (nuevos y usados)

// ── Formulario nueva venta ────────────────────────
function openNewVenta(prefillCosto) {
  if (!puede('vender_equipo')) { toast('No tenés permiso para vender equipos','var(--rd)'); return; }
  _ventaId = null;
  el('mVenT').textContent = 'Nueva venta';
  ['vNom','vTel','vDni','vDir','vEmail','vMod','vCap','vCol','vImei','vPrecio','vCosto','vNot'].forEach(function(id) {
    setVal(id, '');
  });
  el('vPago').value = 'Efectivo';
  el('vEstadoVenta').value = 'Cobrada';
  ['vPrecio','vPartePago','vPpMod','vPpImei','vPpValor'].forEach(function(campo){if(el(campo))el(campo).disabled=false;});
  el('vEstadoVenta').disabled=false;
  if (el('vCajaRegistradaAviso')) el('vCajaRegistradaAviso').style.display = 'none';
  el('vPartePago').checked = false;
  el('vPartePagoWrap').style.display = 'none';
  ['vPpMod','vPpImei','vPpValor'].forEach(function(id) { setVal(id, ''); });
  setVal('vCotizacion', typeof cotizacionBlueVenta==='function' ? cotizacionBlueVenta() : '');
  ventaEquipoPrepararPagosNuevos();
  if (prefillCosto) setVal('vCosto', prefillCosto);
  var costoWrap = el('wVCosto'); if (costoWrap) costoWrap.style.display = puede('editar_costos') ? '' : 'none';
  el('btnSaveVenta').disabled = false;
  el('btnSaveVenta').textContent = 'Guardar venta';
  // Actualizar opciones de vendedor
  var selV = el('vVendedor');
  if (selV && typeof comOpcionesTecnicos === 'function') selV.innerHTML = comOpcionesTecnicos('');
  openM('mVen');
}

var _ventaId = null;
var _pagosVentaEquipo = [];

function ventaEquipoCuentaSugerida(medio) {
  if (medio === 'Efectivo') return 'Caja efectivo';
  if (medio === 'Mercado Pago') return 'Mercado Pago';
  return 'Santander MaxPoint';
}
function ventaEquipoPrepararPagosNuevos() {
  _pagosVentaEquipo = [{ medio:'Efectivo', cuenta:'Caja efectivo', moneda:'USD', monto:'' }];
  var nuevo = !_ventaId;
  if (el('vPagosLegacyWrap')) el('vPagosLegacyWrap').style.display = nuevo ? 'none' : '';
  if (el('vPagosCajaWrap')) el('vPagosCajaWrap').style.display = nuevo ? '' : 'none';
  renderPagosVentaEquipo();
}
function agregarPagoVentaEquipo() { _pagosVentaEquipo.push({ medio:'Transferencia', cuenta:'Santander MaxPoint', moneda:'ARS', monto:'' }); renderPagosVentaEquipo(); }
function quitarPagoVentaEquipo(i) { if (_pagosVentaEquipo.length > 1) _pagosVentaEquipo.splice(i,1); renderPagosVentaEquipo(); }
function cambiarPagoVentaEquipo(i, campo, valor) {
  if (!_pagosVentaEquipo[i]) return;
  _pagosVentaEquipo[i][campo] = campo === 'monto' ? Math.max(0, Number(valor)||0) : valor;
  if (campo === 'monto') { actualizarResumenPagosVentaEquipo(); return; }
  if (campo === 'medio') _pagosVentaEquipo[i].cuenta = ventaEquipoCuentaSugerida(valor);
  renderPagosVentaEquipo();
}
function ventaEquipoTotalPagosUsd() {
  var cot = Number(val('vCotizacion')||0);
  return _pagosVentaEquipo.reduce(function(s,p){ return s + (p.moneda === 'ARS' ? (cot > 0 ? Number(p.monto||0)/cot : 0) : Number(p.monto||0)); }, 0);
}
function renderPagosVentaEquipo() {
  var lista=el('vPagosCaja'), resumen=el('vPagosResumen'); if(!lista||!resumen)return;
  lista.innerHTML=_pagosVentaEquipo.map(function(p,i){return '<div class="pos-pago venta-equipo-pago"><select onchange="cambiarPagoVentaEquipo('+i+',\'medio\',this.value)">'+['Efectivo','Transferencia','Débito','Crédito','Mercado Pago','Otro'].map(function(m){return '<option'+(m===p.medio?' selected':'')+'>'+m+'</option>';}).join('')+'</select><input value="'+esc(p.cuenta)+'" placeholder="Cuenta destino" onchange="cambiarPagoVentaEquipo('+i+',\'cuenta\',this.value)"><select onchange="cambiarPagoVentaEquipo('+i+',\'moneda\',this.value)"><option'+(p.moneda==='USD'?' selected':'')+'>USD</option><option'+(p.moneda==='ARS'?' selected':'')+'>ARS</option></select><input type="number" min="0" step="0.01" value="'+p.monto+'" placeholder="Importe" oninput="cambiarPagoVentaEquipo('+i+',\'monto\',this.value)">'+(_pagosVentaEquipo.length>1?'<button type="button" class="pos-remove" onclick="quitarPagoVentaEquipo('+i+')">×</button>':'')+'</div>';}).join('');
  actualizarResumenPagosVentaEquipo();
}
function actualizarResumenPagosVentaEquipo(){var e=el('vPagosResumen');if(!e)return;var precio=Number(val('vPrecio')||0),pp=el('vPartePago')&&el('vPartePago').checked?Number(val('vPpValor')||0):0,requerido=Math.max(0,precio-pp),pagado=ventaEquipoTotalPagosUsd(),dif=requerido-pagado,reserva=el('vEstadoVenta')&&el('vEstadoVenta').value==='Reservada';e.textContent=reserva?'Reserva · seña registrada: US$ '+pagado.toLocaleString('es-AR',{maximumFractionDigits:2})+' · Saldo pendiente: US$ '+Math.max(0,dif).toLocaleString('es-AR',{maximumFractionDigits:2}):'A cobrar: US$ '+requerido.toLocaleString('es-AR')+' · Pagos equivalentes: US$ '+pagado.toLocaleString('es-AR',{maximumFractionDigits:2})+(Math.abs(dif)<0.01?' · Total cubierto':dif>0?' · Faltan US$ '+dif.toLocaleString('es-AR',{maximumFractionDigits:2}):' · Excede US$ '+(-dif).toLocaleString('es-AR',{maximumFractionDigits:2}));e.style.color=reserva?'var(--bl)':(Math.abs(dif)<0.01?'var(--gr)':(dif<0?'var(--rd)':'var(--or)'));}

function saveVenta() {
  var nom = val('vNom');
  var tel = val('vTel');
  var mod = val('vMod');
  var imei = val('vImei');
  var precio = val('vPrecio');
  var estadoNuevo = el('vEstadoVenta').value;
  if (!nom || !mod || (!imei && estadoNuevo !== 'Reservada') || !precio) {
    alert(estadoNuevo === 'Reservada' ? 'Nombre, modelo y precio son obligatorios para una reserva.' : 'Nombre, modelo, IMEI / número de serie y precio son obligatorios.');
    return;
  }
  var btn = el('btnSaveVenta');
  btn.disabled = true; btn.textContent = 'Guardando...';

  var partePago = el('vPartePago').checked;
  var anterior = _ventaId ? VENTAS.find(function(x) { return x.id === _ventaId; }) : null;
  var puedeCosto = puede('editar_costos');
  var costo = puedeCosto ? (val('vCosto') || '0') : ((anterior && anterior.costo) || '0');
  var d = {
    nombre:      nom,
    telefono:    tel,
    dni:         val('vDni'),
    direccion:   val('vDir'),
    email:       val('vEmail'),
    modelo:      mod,
    capacidad:   val('vCap'),
    color:       val('vCol'),
    imei:        imei,
    precio:      precio,
    costo:       costo,
    costoConfirmado: puedeCosto ? Number(costo) > 0 : !!(anterior && anterior.costoConfirmado),
    estadoVenta: el('vEstadoVenta').value,
    cotizacionBlue: _ventaId && anterior ? Number(anterior.cotizacionBlue||0) : Number(val('vCotizacion')||0),
    vendedor:    el('vVendedor') ? el('vVendedor').value : '',
    canal:       el('vCanal') ? el('vCanal').value : '',
    pago:        el('vPago').value,
    notas:       val('vNot'),
    parte_pago:  partePago ? 'Si' : 'No',
    pp_modelo:   partePago ? val('vPpMod') : '',
    pp_imei:     partePago ? val('vPpImei') : '',
    pp_valor:    partePago ? val('vPpValor') : '',
    fecha:       _ventaId ? (anterior||{}).fecha || hoy() : hoy(),
    garantia:    '6 meses',
    seguimiento: 'pendiente',
  };
  if (anterior && anterior.cajaRegistrada) {
    d.precio=anterior.precio; d.estadoVenta=anterior.estadoVenta; d.cotizacionBlue=anterior.cotizacionBlue;
    d.pago=anterior.pago; d.parte_pago=anterior.parte_pago; d.pp_modelo=anterior.pp_modelo;
    d.pp_imei=anterior.pp_imei; d.pp_valor=anterior.pp_valor;
  }

  if (_ventaId) {
    FB.updV(_ventaId, d, function(err) {
      btn.disabled = false; btn.textContent = 'Guardar venta';
      if (err) { toast('Error: ' + err, 'var(--rd)'); return; }
      if (d.estadoVenta === 'Devuelta' && anterior && anterior.estadoVenta !== 'Devuelta' && typeof comGenerarAjuste === 'function') comGenerarAjuste('venta', _ventaId, 'Devolución posterior a liquidación');
      closeM('mVen'); toast('Venta actualizada');
    });
  } else {
    if (d.estadoVenta !== 'Cobrada' && d.estadoVenta !== 'Reservada') { btn.disabled=false; btn.textContent='Guardar venta'; toast('Una operación nueva debe registrarse como Cobrada o Reservada','var(--rd)'); return; }
    var cotizacion = Number(d.cotizacionBlue || 0), requerido = Math.max(0, Number(d.precio||0) - (partePago ? Number(d.pp_valor||0) : 0));
    var pagos = _pagosVentaEquipo.filter(function(p){return Number(p.monto)>0;}).map(function(p){return {medio:p.medio,cuenta:p.cuenta,moneda:p.moneda,monto:Number(p.monto),cotizacion:p.moneda==='ARS'?cotizacion:1,montoVentaUSD:p.moneda==='ARS'&&cotizacion>0?Number(p.monto)/cotizacion:Number(p.monto)};});
    var pagado = pagos.reduce(function(s,p){return s+Number(p.montoVentaUSD||0);},0);
    if (pagos.some(function(p){return !p.medio||!p.cuenta||!(p.monto>0)||(p.moneda==='ARS'&&!(cotizacion>0));})) { btn.disabled=false; btn.textContent='Guardar venta'; toast('Revisá medio, cuenta, importe y cotización de cada pago','var(--rd)'); return; }
    if (d.estadoVenta === 'Cobrada' && Math.abs(pagado-requerido)>0.01) { btn.disabled=false; btn.textContent='Guardar venta'; toast('Los pagos deben cubrir exactamente el saldo de la venta','var(--rd)'); return; }
    if (pagado>requerido+0.01) { btn.disabled=false; btn.textContent='Guardar venta'; toast('Los pagos superan el saldo de la venta','var(--rd)'); return; }
    d.moneda='USD'; d.pagos=pagos; d.pago=pagos.map(function(p){return p.medio;}).join(' + ') || 'Pendiente'; d.totalPagadoUSD=pagado; d.saldoUSD=Math.max(0,requerido-pagado); d.tipoRegistro='equipo'; d.schemaVersion=2;
    FB.crearVentaEquipo(d, function(err) {
      btn.disabled = false; btn.textContent = 'Guardar venta';
      if (err) { toast('Error: ' + err, 'var(--rd)'); return; }
      closeM('mVen'); toast(d.estadoVenta==='Reservada'?'Reserva registrada':'Venta registrada');
      // Si tiene parte de pago, agregar al stock automaticamente
      if (d.parte_pago === 'Si' && d.pp_modelo) {
        FB.addSt({
          modelo:       d.pp_modelo,
          imei:         d.pp_imei   || '',
          precio_costo: d.pp_valor  || '',
          precio_venta: '',
          capacidad:    '',
          color:        '',
          detalles:     '',
          notas:        'Ingreso por parte de pago — ' + d.nombre,
          estado:       'A revisar',
          fecha:        hoy(),
        }, function() { toast('Equipo agregado al stock'); });
      }
    });
  }
}

function openEditVenta(id) {
  if (!puede('editar_ventas_equipos')) { toast('Sólo administración puede editar ventas anteriores','var(--rd)'); return; }
  var v = VENTAS.find(function(x) { return x.id === id; });
  if (!v) return;
  _ventaId = id;
  ventaEquipoPrepararPagosNuevos();
  el('mVenT').textContent = 'Editar venta';
  el('vEstadoVenta').value = v.estadoVenta || 'Cobrada';
  setVal('vNom',    v.nombre    || '');
  setVal('vTel',    v.telefono  || '');
  setVal('vDni',    v.dni       || '');
  setVal('vDir',    v.direccion || '');
  setVal('vEmail',  v.email     || '');
  setVal('vMod',    v.modelo    || '');
  setVal('vCap',    v.capacidad || '');
  setVal('vCol',    v.color     || '');
  setVal('vImei',   v.imei      || '');
  setVal('vPrecio', v.precio    || '');
  setVal('vCosto',  v.costo     || '');
  setVal('vCotizacion', v.cotizacionBlue || '');
  var costoWrap = el('wVCosto'); if (costoWrap) costoWrap.style.display = puede('editar_costos') ? '' : 'none';
  // Actualizar opciones del select antes de setear el valor
  var selVed = el('vVendedor');
  if (selVed && typeof comOpcionesTecnicos === 'function') selVed.innerHTML = comOpcionesTecnicos(v.vendedor || '');
  else if (selVed) selVed.value = v.vendedor || '';
  if (el('vCanal'))    el('vCanal').value    = v.canal    || '';
  el('vPago').value = v.pago || 'Efectivo';
  setVal('vNot',    v.notas     || '');
  var pp = v.parte_pago === 'Si';
  el('vPartePago').checked = pp;
  el('vPartePagoWrap').style.display = pp ? '' : 'none';
  if (pp) {
    setVal('vPpMod',   v.pp_modelo || '');
    setVal('vPpImei',  v.pp_imei   || '');
    setVal('vPpValor', v.pp_valor  || '');
  }
  el('btnSaveVenta').disabled = false;
  el('btnSaveVenta').textContent = 'Guardar venta';
  var integrada = !!v.cajaRegistrada || Number(v.schemaVersion||0)>=2, anulada = v.estadoVenta === 'Anulada';
  ['vPrecio','vPartePago','vPpMod','vPpImei','vPpValor'].forEach(function(campo){if(el(campo))el(campo).disabled=integrada;});
  el('vEstadoVenta').disabled=integrada||anulada;
  if (el('vPagosLegacyWrap')) el('vPagosLegacyWrap').style.display = integrada ? 'none' : '';
  if (el('vCajaRegistradaAviso')) el('vCajaRegistradaAviso').style.display = integrada ? '' : 'none';
  openM('mVen');
}

function togglePartePago() {
  var pp = el('vPartePago').checked;
  el('vPartePagoWrap').style.display = pp ? '' : 'none';
  actualizarResumenPagosVentaEquipo();
}

function anularVentaEquipo(id) {
  if (!puede('eliminar_operaciones')) { toast('Solo administración puede anular ventas','var(--rd)'); return; }
  var venta=VENTAS.find(function(x){return x.id===id;}); if(!venta)return;
  if (venta.estadoVenta==='Anulada'||venta.estadoVenta==='Devuelta') { toast('La venta ya no está activa','var(--rd)'); return; }
  var motivo=prompt('Motivo de la anulación (opcional):'); if(motivo===null)return;
  var aviso='La venta quedará anulada y seguirá visible en el historial.'+(venta.cajaRegistrada?' Sus pagos serán revertidos en Caja.':'')+(venta.parte_pago==='Si'?' El equipo recibido en parte de pago NO se quitará automáticamente del stock.':'');
  if(!confirm(aviso+' ¿Continuar?'))return;
  FB.anularVentaEquipo(id,motivo,function(err){if(err){toast('Error: '+err,'var(--rd)');return;}toast(venta.cajaRegistrada?'Venta anulada y Caja revertida':'Venta histórica anulada');});
}

// ── Comprobante de venta (imprimible A5) ──────────
function prtVenta(id) {
  var v = VENTAS.find(function(x) { return x.id === id; });
  if (!v) return;

  var esc2 = function(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); };
  var fmt  = function(n) { return 'US$\u202F' + Number(n||0).toLocaleString('es-AR'); };
  var esReserva = v.estadoVenta === 'Reservada';

  var desc = esc2(v.modelo)
    + (v.capacidad ? ' ' + esc2(v.capacidad) : '')
    + (v.color     ? ' ' + esc2(v.color)     : '')
    + ' \u2014 ' + v.garantia + ' de Garantia';

  var html = '<!DOCTYPE html><html><head><meta charset="UTF-8">'
    + '<title>Comprobante Venta ' + esc2(v.id||'') + '</title>'
    + '<style>'
    + '@page{size:A5;margin:8mm}'
    + 'body{font-family:system-ui,sans-serif;font-size:12px;color:#111;background:white;margin:0}'
    + '@media print{button{display:none}}'
    + '</style></head><body>'

    // Header negro
    + '<div style="background:#111;padding:14px 18px 12px;border-radius:6px 6px 0 0">'
    + '<div style="height:3px;background:#F0B429;border-radius:2px;margin-bottom:12px"></div>'
    + '<table style="width:100%;border-collapse:collapse"><tr>'
    + '<td><div style="font-size:22px;font-weight:900;color:#F0B429">MaxPoint</div>'
    + '<div style="font-size:8px;color:#aaa;letter-spacing:2px;text-transform:uppercase;margin-top:2px">Tienda Apple \u2014 Taller de Celulares</div></td>'
    + '<td style="text-align:right"><div style="font-size:8px;color:#888;line-height:1.7">Av 17 y 34, Mercedes, Bs As<br>(2324) 522082</div></td>'
    + '</tr></table></div>'

    // Banda amarilla
    + '<div style="background:#F0B429;padding:7px 18px;display:flex;justify-content:space-between;align-items:center">'
    + '<div><div style="font-size:7px;font-weight:700;text-transform:uppercase;letter-spacing:2px;color:#7a5500">Comprobante de '+(esReserva?'Reserva':'Venta')+'</div>'
    + '<div style="font-size:18px;font-weight:900;color:#111">VTA-' + esc2(v.id ? v.id.slice(-5).toUpperCase() : '') + '</div></div>'
    + '<div style="text-align:right"><div style="font-size:8px;color:#7a5500">Fecha: <b>' + esc2(v.fecha||'') + '</b></div></div>'
    + '</div>'

    // Body
    + '<div style="padding:12px 18px;background:white">'

    // Cliente
    + '<table style="width:100%;border-collapse:collapse;margin-bottom:12px"><tr>'
    + '<td style="vertical-align:top;width:50%;padding-right:10px;border-right:1px solid #eee">'
    + '<div style="font-size:7px;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:#bbb;margin-bottom:4px">Cliente</div>'
    + '<div style="font-size:14px;font-weight:800">' + esc2(v.nombre||'') + '</div>'
    + (v.telefono ? '<div style="font-size:10px;color:#555;margin-top:2px">' + esc2(v.telefono) + '</div>' : '')
    + (v.dni      ? '<div style="font-size:10px;color:#555">DNI: ' + esc2(v.dni) + '</div>' : '')
    + (v.direccion ? '<div style="font-size:10px;color:#555">' + esc2(v.direccion) + '</div>' : '')
    + '</td>'
    + '<td style="vertical-align:top;padding-left:10px">'
    + '<div style="font-size:7px;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:#bbb;margin-bottom:4px">Equipo vendido</div>'
    + '<div style="font-size:13px;font-weight:800">' + esc2(v.modelo||'') + (v.capacidad?' '+esc2(v.capacidad):'') + (v.color?' '+esc2(v.color):'') + '</div>'
    + '<div style="font-size:9px;color:#777;font-family:monospace;margin-top:2px">IMEI / Serie: ' + esc2(v.imei||'') + '</div>'
    + '<div style="font-size:9px;color:#2DCE89;font-weight:700;margin-top:2px">' + esc2(v.garantia||'6 meses') + ' de garantia</div>'
    + '</td>'
    + '</tr></table>'

    // Precio
    + '<div style="background:#f8f8f8;border-left:3px solid #F0B429;padding:8px 12px;border-radius:0 4px 4px 0;margin-bottom:10px;display:flex;justify-content:space-between;align-items:center">'
    + '<div><div style="font-size:8px;color:#aaa;text-transform:uppercase;letter-spacing:1px">Precio de venta</div>'
    + '<div style="font-size:22px;font-weight:900;color:#111">' + fmt(v.precio) + '</div></div>'
    + '<div style="font-size:10px;color:#555">' + esc2(v.pago||'Efectivo') + '</div>'
    + '</div>'
    + (esReserva ? '<div style="background:#eef6ff;border:1px solid #93c5fd;border-radius:6px;padding:8px 12px;margin-bottom:10px"><b>Equipo reservado</b><br><span style="font-size:10px">Seña: '+fmt(v.totalPagadoUSD||0)+' · Saldo pendiente: '+fmt(v.saldoUSD||0)+'</span></div>' : '')

    // Parte de pago
    + (v.parte_pago === 'Si' && v.pp_modelo ?
      '<div style="background:#f0f9ff;border:1px solid #7dd3fc;border-radius:6px;padding:8px 12px;margin-bottom:10px">'
      + '<div style="font-size:7px;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:#0284c7;margin-bottom:4px">Equipo entregado en parte de pago</div>'
      + '<div style="font-size:11px;font-weight:700">' + esc2(v.pp_modelo) + '</div>'
      + (v.pp_imei  ? '<div style="font-size:9px;color:#777;font-family:monospace">IMEI: ' + esc2(v.pp_imei) + '</div>' : '')
      + (v.pp_valor ? '<div style="font-size:11px;font-weight:700;color:#0284c7;margin-top:2px">Valor: ' + fmt(v.pp_valor) + '</div>' : '')
      + '</div>' : '')

    // Texto legal
    + '<div style="font-size:8px;color:#888;line-height:1.65;border-top:1px solid #eee;padding-top:8px;margin-bottom:12px">'
    + 'Se detalló el estado en que se entrega el equipo; cualquier otro inconveniente no mencionado queda a responsabilidad del comprador. '
    + 'El equipo cuenta con <b style="color:#555">' + esc2(v.garantia||'6 meses') + ' de garantía</b> por defectos de funcionamiento. '
    + 'No aplica a golpes, humedad, mal uso ni accesorios en mal estado.'
    + '</div>'

    // Firma
    + '<div style="border-top:1px dashed #ddd;padding-top:10px">'
    + '<div style="font-size:7px;font-weight:800;text-transform:uppercase;letter-spacing:2px;color:#bbb;margin-bottom:18px">Conformidad del comprador</div>'
    + '<div style="display:flex;justify-content:space-between;align-items:flex-end;gap:20px">'
    + '<div style="flex:1;border-bottom:1px solid #333;height:32px"></div>'
    + '<div style="font-size:8px;color:#999;white-space:nowrap">Firma y aclaracion</div>'
    + '</div></div>'

    + '</div>'

    // Pie
    + '<div style="background:#111;padding:6px 18px;border-radius:0 0 6px 6px;display:flex;justify-content:space-between">'
    + '<div style="font-size:8px;color:#555">Gracias por tu compra</div>'
    + '<div style="font-size:8px;color:#F0B429;font-weight:700">MaxPoint</div>'
    + '</div>'

    + '<br><button onclick="window.print()" style="width:100%;padding:10px;background:#111;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:14px">Imprimir A5</button>'
    + '</body></html>';

  var w = window.open('', '_blank', 'width=600,height=850,scrollbars=yes');
  w.document.write(html);
  w.document.close();
}

// ── Autocomplete cliente desde historial ──────────
function vNomSugg(q) {
  var drop = el('vNomDrop');
  if (!drop) return;
  q = (q||'').trim();
  if (q.length < 2) { drop.classList.remove('open'); return; }
  var ql = q.toLowerCase();
  var vistos = {}, sugs = [];
  (window.REPS || []).concat(window.VENTAS || []).forEach(function(r) {
    var n = (r.nombre||'').trim();
    if (!n) return;
    var key = n.toLowerCase();
    if (!vistos[key] && key.includes(ql)) {
      vistos[key] = true;
      sugs.push({ nom: n, tel: r.telefono||'' });
    }
  });
  sugs = sugs.slice(0, 8);
  if (!sugs.length) { drop.classList.remove('open'); return; }
  drop.innerHTML = sugs.map(function(s) {
    return '<div class="cat-item" data-nom="' + s.nom.replace(/"/g,'&quot;') + '" data-tel="' + s.tel + '" onmousedown="vNomElegir(this)">'
      + '<span style="flex:1;font-size:13px">' + s.nom + '</span>'
      + (s.tel ? '<span style="font-size:11px;color:var(--mu)">' + s.tel + '</span>' : '')
      + '</div>';
  }).join('');
  drop.classList.add('open');
}

function vNomElegir(el) {
  setVal('vNom', el.dataset.nom);
  if (el.dataset.tel) setVal('vTel', el.dataset.tel);
  var drop = document.getElementById('vNomDrop');
  if (drop) drop.classList.remove('open');
}
