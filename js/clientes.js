// Identidad e historial derivados de las fuentes originales, sin migrar históricos.
function clienteTelefono(v) { return String(v||'').replace(/\D/g,''); }
function clienteSerie(v) { return String(v||'').trim().toUpperCase().replace(/\s/g,''); }
function clienteNombreClave(v){return String(v||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ');}
function clienteFechaFuente(x){var v=x._upd||x.actualizadoEn||x._ts||x.creadoEn||x.fechaHora||x.fecha;if(v&&typeof v.toMillis==='function')return v.toMillis();if(typeof v==='string'&&/^\d{2}\/\d{2}\/\d{4}$/.test(v)){var p=v.split('/');v=p[2]+'-'+p[1]+'-'+p[0];}var n=Date.parse(v||'');return Number.isFinite(n)?n:0;}
function clienteClaveFuente(x,tipo,identidades) {
  if(x.identidadClienteV3===true&&x.clienteId)return 'id:'+x.clienteId;
  var tel=clienteTelefono(x.telefono);
  if(tel){var contacto=tel+':'+clienteNombreClave(x.nombre),ids=identidades&&identidades[contacto];return ids&&ids.size===1?'id:'+Array.from(ids)[0]:'contacto:'+contacto;}
  // Un nombre sin teléfono no demuestra que dos registros sean la misma persona.
  return tipo+':'+x.id;
}
function clientesAgrupar(reps,ventas) {
  var map={},identidades={};
  (reps||[]).concat(ventas||[]).forEach(function(x){if(x.identidadClienteV3&&x.clienteId&&clienteTelefono(x.telefono)){var k=clienteTelefono(x.telefono)+':'+clienteNombreClave(x.nombre);if(!identidades[k])identidades[k]=new Set();identidades[k].add(x.clienteId);}});
  function agregar(x,tipo){
    if(!x.nombre||!x.id)return;
    var k=clienteClaveFuente(x,tipo,identidades);
    if(!map[k])map[k]={clave:k,nombre:x.nombre,tel:x.telefono||'',ords:[],ventas:[],equipos:[],sinIdentidad:false,ultimaFecha:-1};
    var c=map[k],fecha=clienteFechaFuente(x);if(fecha>=c.ultimaFecha){c.nombre=x.nombre;c.tel=x.telefono||'';c.ultimaFecha=fecha;}
    c.sinIdentidad=c.sinIdentidad||(!x.identidadClienteV3&&!clienteTelefono(x.telefono));
    (tipo==='reparacion'?c.ords:c.ventas).push(x);
  }
  (reps||[]).forEach(function(x){agregar(x,'reparacion');});
  (ventas||[]).filter(function(x){return x.tipoRegistro!=='pos';}).forEach(function(x){agregar(x,'venta');});
  Object.values(map).forEach(function(c){
    var eq={};
    function equipo(x,tipo){var serie=clienteSerie(tipo==='reparacion'?x.modelo:x.imei),k=serie?'serie:'+serie:tipo+':'+x.id;
      if(!eq[k])eq[k]={clave:k,serie:serie,modelo:tipo==='reparacion'?x.equipo:x.modelo,capacidad:x.capacidad||'',color:x.color||'',reparaciones:[],ventas:[]};
      var e=eq[k];if(!e.capacidad)e.capacidad=x.capacidad||'';if(!e.color)e.color=x.color||'';
      (tipo==='reparacion'?e.reparaciones:e.ventas).push(x);
    }
    c.ords.forEach(function(x){equipo(x,'reparacion');});c.ventas.forEach(function(x){equipo(x,'venta');});c.equipos=Object.values(eq);
  });
  return Object.values(map).sort(function(a,b){return a.nombre.localeCompare(b.nombre)||a.clave.localeCompare(b.clave);});
}
