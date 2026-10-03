// ===================== SEGUIMIENTOS =====================
// Post-reparacion (60d), post-venta (90d y 365d)
// Estadisticas: podio clientes, modelos mas vendidos

// Fechas comerciales de Argentina: no usar ingreso como fecha de entrega.
function segFechaDia(valor) {
  if(valor && typeof valor.toDate==='function')return fechaDiaSesion(valor.toDate().getTime());
  if(valor instanceof Date)return Number.isFinite(valor.getTime())?fechaDiaSesion(valor.getTime()):'';
  var texto=String(valor||'').trim(),m=texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/),y,mes,dia;
  if(m){y=Number(m[3]);mes=Number(m[2]);dia=Number(m[1]);}
  else {m=texto.match(/^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/);if(!m)return '';y=Number(m[1]);mes=Number(m[2]);dia=Number(m[3]);}
  var fecha=new Date(Date.UTC(y,mes-1,dia));
  if(fecha.getUTCFullYear()!==y||fecha.getUTCMonth()!==mes-1||fecha.getUTCDate()!==dia)return '';
  if(texto.indexOf('T')!==-1){var instante=Date.parse(texto);return Number.isFinite(instante)?fechaDiaSesion(instante):'';}
  return y+'-'+String(mes).padStart(2,'0')+'-'+String(dia).padStart(2,'0');
}
function diasDesde(fechaStr) {
  var fecha=segFechaDia(fechaStr);if(!fecha)return null;
  return Math.round((Date.parse(fechaDiaSesion(Date.now())+'T00:00:00Z')-Date.parse(fecha+'T00:00:00Z'))/86400000);
}
function segVentaReal(v) {
  return v && v.tipoRegistro!=='pos' && ventaValidaParaMetricas(v) && !v.cajaRevertida
    && !['anulada','devuelta','cancelada'].includes(String(v.estado||'').toLowerCase());
}
function segReparacionEntregada(r) {
  return r && r.estado==='Entregado' && !['Presupuesto no aprobado','Sin intervención / no era falla del equipo'].includes(r.resultadoServicio);
}
function segFechaEntrega(r) {
  if(!segReparacionEntregada(r))return '';
  var explicita=segFechaDia(r.fechaEntrega);if(explicita)return explicita;
  var entregas=(r.timeline||[]).filter(function(t) {return t.estado==='Entregado' && (!r._imp || (t.usuario && t.usuario.uid));});
  for(var i=entregas.length-1;i>=0;i--){var fecha=segFechaDia(entregas[i].fecha);if(fecha)return fecha;}
  return '';
}
function segConfig() {
  var cfg=window.SEGUIMIENTOS_CFG||{};
  return {activo:cfg.activo===true,beneficio:String(cfg.beneficio||'').trim().slice(0,500)};
}

// ── Generar lista de seguimientos ────────────────────
function calcSeguimientos() {
  var lista = [];

  // Post-reparacion: dia 60
  (window.REPS || []).forEach(function(r) {
    if (!r.nombre || !r.telefono) return;
    if(!segReparacionEntregada(r))return;
    var fechaEntrega=segFechaEntrega(r),dias = diasDesde(fechaEntrega);
    if (dias === null) return;
    if (dias >= 55 && dias <= 120) { // ventana 55-120 dias
      var estado = r.seg_est==='enviado'?'contactado':(r.seg_est || 'pendiente');
      lista.push({
        id:       'rep_' + r.id,
        ref_id:   r.id,
        tipo:     'reparacion',
        nombre:   r.nombre,
        tel:      r.telefono,
        equipo:   [r.equipo,r.capacidad].filter(Boolean).join(' '),
        fecha:    fechaEntrega,
        dias:     dias,
        estado:   estado,
        urgencia: dias >= 60 ? 'alta' : 'proxima',
        label:    'Reparacion dia ' + dias,
      });
    }
  });

  // Post-venta: dia 90 y dia 365
  (window.VENTAS || []).forEach(function(v) {
    if (!v.nombre || !v.telefono) return;
    if(!segVentaReal(v))return;
    var fechaVenta=segFechaDia(v.completadaEn)||segFechaDia(v.fecha),dias = diasDesde(fechaVenta);
    if (dias === null) return;
    var modelo = [v.modelo, v.capacidad, v.color].filter(Boolean).join(' ');

    if (dias >= 85 && dias <= 150) { // ventana 90 dias
      lista.push({
        id:       'ven90_' + v.id,
        ref_id:   v.id,
        tipo:     'venta_90',
        nombre:   v.nombre,
        tel:      v.telefono,
        equipo:   modelo,
        fecha:    fechaVenta,
        dias:     dias,
        estado:   v.seg90_est==='enviado'?'contactado':(v.seg90_est || 'pendiente'),
        urgencia: dias >= 90 ? 'alta' : 'proxima',
        label:    'Venta 90 dias',
      });
    }
    if (dias >= 355 && dias <= 420) { // ventana 365 dias
      lista.push({
        id:       'ven365_' + v.id,
        ref_id:   v.id,
        tipo:     'venta_365',
        nombre:   v.nombre,
        tel:      v.telefono,
        equipo:   modelo,
        fecha:    fechaVenta,
        dias:     dias,
        estado:   v.seg365_est==='enviado'?'contactado':(v.seg365_est || 'pendiente'),
        urgencia: dias >= 365 ? 'alta' : 'proxima',
        label:    'Venta 1 anio',
      });
    }
  });

  // Ordenar: primero alta urgencia, luego por dias desc
  lista.sort(function(a, b) {
    if (a.urgencia !== b.urgencia) return a.urgencia === 'alta' ? -1 : 1;
    return b.dias - a.dias;
  });

  return lista;
}

// ── Badge contador ────────────────────────────────────
function segContarPendientes() {
  return calcSeguimientos().filter(function(s) {
    return s.estado === 'pendiente' && s.urgencia === 'alta';
  }).length;
}

// ── Guardar estado en Firebase ────────────────────────
function segCambiarEstado(seg, nuevoEst) {
  if(!['pendiente','contactado','enviado','interesado','compro','no_interesa'].includes(nuevoEst)) {toast('Estado de seguimiento inválido','var(--rd)');return;}
  if(!puede('gestionar_seguimientos')) { toast('Sin permiso para gestionar seguimientos','var(--rd)'); return; }
  function done(err) { if(err)toast('No se pudo guardar el seguimiento: '+err,'var(--rd)'); else {if(typeof actualizarBadgeSeg==='function')actualizarBadgeSeg();if(VIEW==='seg')render();} }
  if(seg.tipo==='reparacion')FB.upd(seg.ref_id,{seg_est:nuevoEst},done);
  else if(seg.tipo==='venta_90')FB.updV(seg.ref_id,{seg90_est:nuevoEst},done);
  else if(seg.tipo==='venta_365')FB.updV(seg.ref_id,{seg365_est:nuevoEst},done);
}

// ── Mensajes WhatsApp ─────────────────────────────────
function segMensaje(seg) {
  var nombre=String(seg.nombre||'').trim().split(/\s+/)[0]||'¿cómo estás?',equipo=seg.equipo||'equipo',cfg=segConfig();
  var beneficio=cfg.activo && cfg.beneficio ? cfg.beneficio : '';
  if(seg.tipo==='reparacion')return 'Hola '+nombre+', ¿cómo estás?\n\n'
    +'Ya pasaron '+seg.dias+' días desde que retiraste tu '+equipo+' de MaxPoint. Queríamos saber cómo te está funcionando después de la reparación.\n\n'
    +'Nos importa que sigas disfrutando tu equipo. Si notaste algo o tenés alguna consulta, contanos y te ayudamos.'
    +(beneficio?'\n\nAdemás, tenemos este beneficio para vos: '+beneficio:'')+'\n\n¡Gracias por confiar en nosotros!\nMaxPoint';
  if(seg.tipo!=='venta_90' && seg.tipo!=='venta_365')return '';
  return 'Hola '+nombre+', ¿cómo estás?\n\n'
    +(seg.tipo==='venta_365'?'¡Tu '+equipo+' ya te acompaña hace '+seg.dias+' días!':'¡Ya pasaron '+seg.dias+' días desde la compra de tu '+equipo+'!')
    +'\n\nEn MaxPoint nos importa tu experiencia. ¿Cómo te está resultando el equipo?\n\nTe queríamos compartir dos cosas:\n'
    +'- Revisá que la funda y el templado sigan en buen estado. Si tenés dudas, te ayudamos a elegir la protección para tu celu.\n'
    +'- '+(beneficio?beneficio:(seg.tipo==='venta_365'?'Si estás pensando en renovar, podemos ayudarte a evaluar tu equipo y las opciones.':'Si hay algo del celu que todavía no sabés usar o no te convence, escribinos y lo vemos juntos.'))
    +'\n\n¡Gracias por elegirnos!\nMaxPoint';
}
function segTelefonoWA(valor) {
  var texto=String(valor||'').trim(),n=texto.replace(/\D/g,'');
  if(/^549\d{10}$/.test(n))return n;
  if(/^54\d{10}$/.test(n))return '549'+n.slice(2);
  if(/^\+/.test(texto)&&/^\d{8,15}$/.test(n))return n;
  if(/^0\d{10}$/.test(n))n=n.slice(1);
  if(/^\d{10}$/.test(n))return '549'+n;
  return /^\+/.test(texto)&&/^\d{8,15}$/.test(n)?n:'';
}
function segEnviarWA(seg) {
  if(!puede('gestionar_seguimientos')) {toast('Sin permiso para gestionar seguimientos','var(--rd)');return;}
  var vigente=calcSeguimientos().find(function(s){return s.id===seg.id;});
  if(!vigente){toast('La operación ya no corresponde a seguimiento','var(--rd)');return;}
  var tel=segTelefonoWA(vigente.tel);
  if(!tel){toast('Revisá el teléfono: ingresá celular con código de área o formato internacional','var(--rd)');return;}
  var ventana=window.open('https://wa.me/'+tel+'?text='+encodeURIComponent(waTextoPlano(segMensaje(vigente))),'_blank');
  if(!ventana){toast('No se pudo abrir WhatsApp. Revisá el bloqueo de ventanas','var(--rd)');return;}
  try{ventana.opener=null;}catch(e){}
  toast('Después de enviar, confirmá Contactado en el seguimiento');
}
// Nombre conservado para botones existentes. Beneficio guardado por administración.
function segEditarDescuento() {
  if(!esAdministrador()){toast('Solo administración puede configurar el beneficio','var(--rd)');return;}
  var nuevo=prompt('Beneficio para seguimientos (ej.: 2x1 en fundas). Dejá vacío para no ofrecer una promoción:',segConfig().beneficio);
  if(nuevo===null)return;
  nuevo=nuevo.trim();if(nuevo.length>500){toast('El beneficio no puede superar 500 caracteres','var(--rd)');return;}
  FB.setSeguimientosConfig({activo:!!nuevo,beneficio:nuevo},function(err){if(err)toast('No se pudo guardar el beneficio: '+err,'var(--rd)');else toast(nuevo?'Beneficio actualizado':'Seguimientos sin promoción comercial');});
}

// ── Estadisticas ──────────────────────────────────────
function calcPodio() {
  var counts = {};
  (window.REPS || []).forEach(function(r) {
    if (!r.nombre) return;
    counts[r.nombre] = (counts[r.nombre] || 0) + 1;
  });
  (window.VENTAS || []).forEach(function(v) {
    if (!v.nombre || !segVentaReal(v)) return;
    counts[v.nombre] = (counts[v.nombre] || 0) + 1;
  });
  return Object.keys(counts)
    .map(function(n) { return { nombre: n, total: counts[n] }; })
    .sort(function(a,b) { return b.total - a.total; })
    .slice(0, 3);
}

function calcModelos() {
  var modelos = {};
  (window.VENTAS || []).forEach(function(v) {
    if(!segVentaReal(v))return;
    var key = (v.modelo || '').trim();
    if (!key) return;
    if (!modelos[key]) modelos[key] = { ventas: 0, tiempos: [] };
    modelos[key].ventas++;
    // Tiempo en stock: si vino del stock, calcular dias entre ingreso y venta
    if (v.fecha) {
      var diasVenta = diasDesde(v.fecha);
      if (diasVenta !== null && diasVenta >= 0) modelos[key].tiempos.push(diasVenta);
    }
  });
  return Object.keys(modelos).map(function(m) {
    var data = modelos[m];
    var promDias = data.tiempos.length
      ? Math.round(data.tiempos.reduce(function(s,x){return s+x;},0) / data.tiempos.length)
      : null;
    return { modelo: m, ventas: data.ventas, promDias: promDias };
  }).sort(function(a,b) { return b.ventas - a.ventas; }).slice(0, 10);
}

// Helper para llamar desde data-sid en botones
function segWA(sid) {
  var lista = calcSeguimientos();
  var seg = lista.find(function(s) { return s.id === sid; });
  if (seg) segEnviarWA(seg);
  else toast('Seguimiento no encontrado', 'var(--rd)');
}

function actualizarBadgeSeg() {
  var badge = el('nb-seg');
  if (!badge) return;
  var n = segContarPendientes();
  badge.textContent = n;
  badge.style.display = n > 0 ? '' : 'none';
}
