// ===================== BUSCADOR UNIVERSAL =====================
// V1 usa exclusivamente los datos ya cargados en memoria. No abre listeners
// ni realiza consultas Firestore por cada búsqueda.
(function() {
  var limite = 5, seleccion = -1, filas = [], ultimaBusqueda = '';

  function texto(v) {
    return String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
  }
  function coincide(q, valores) {
    var compacta = texto(q);
    return compacta && valores.some(function(v) { return texto(v).indexOf(compacta) !== -1; });
  }
  function activo(r) { return r.estado !== 'Entregado' && r.estado !== 'No aprobado'; }
  function etiquetaEquipo(x) { return [x.modelo || x.equipo, x.capacidad, x.color].filter(Boolean).join(' '); }
  function fechaOrdenable(v) { var p = String(v || '').split('/'); return p.length === 3 ? p[2] + p[1] + p[0] : String(v || ''); }
  function accion(clase, titulo, fn) {
    var b = mkBtn(clase || 'btn-g btn-sm', titulo, function(e) { if (e) e.stopPropagation(); fn(); });
    return b;
  }
  function cerrar() {
    var inp = el('globalSearchInput'), res = el('globalSearchResults');
    if (inp) inp.value = '';
    if (res) { res.innerHTML = ''; res.classList.remove('open'); }
    seleccion = -1; filas = []; ultimaBusqueda = '';
  }
  function abrirDetalle(id) { cerrar(); openDet(id); }
  function nuevaReparacion(cliente) {
    cerrar(); openNewRep();
    if (cliente) { setVal('fNom', cliente.nombre || ''); setVal('fTel', cliente.telefono || ''); }
  }
  function irClientes() { cerrar(); showView('cli', document.getElementById('nav-cli')); }
  function actualizarEstado(id, estado) {
    actualizarReparacion(id, { estado: estado }, function(err) { if (!err) { toast('Estado: ' + estado); buscar(ultimaBusqueda); } });
  }
  function clienteDesdeReps(r) {
    var map = {};
    REPS.forEach(function(x) {
      var clave = texto(x.telefono) || texto(x.nombre);
      if (!clave) return;
      if (!map[clave]) map[clave] = { nombre:x.nombre || '', telefono:x.telefono || '', reps:[] };
      map[clave].reps.push(x);
    });
    return Object.keys(map).map(function(k) { return map[k]; }).filter(function(c) {
      return coincide(r, [c.nombre, c.telefono]);
    }).sort(function(a,b) { return b.reps.filter(activo).length - a.reps.filter(activo).length; });
  }
  function equiposDesdeMemoria(q) {
    var map = {};
    REPS.forEach(function(r) {
      var key = texto(r.modelo) || (texto(r.equipo) + '_' + texto(r.telefono));
      if (!key) return;
      var actual = map[key];
      if (!actual || fechaOrdenable(actual.fecha) < fechaOrdenable(r.fecha)) {
        map[key] = { modelo:r.equipo || '', imei:r.modelo || '', nombre:r.nombre || '', telefono:r.telefono || '', rep:r, fecha:r.fecha || '' };
      }
    });
    // Si alguna integración futura expone entidades V2 en memoria, se suman
    // sin depender de ellas para conservar compatibilidad legacy.
    (window.EQUIPOS || []).forEach(function(e) {
      var key = texto(e.imei) || (texto(e.modelo) + '_' + texto(e.clienteId));
      if (!key || map[key]) return;
      map[key] = { modelo:e.modelo || '', imei:e.imei || '', nombre:e.nombre || '', telefono:e.telefono || '', rep:null, fecha:'' };
    });
    return Object.keys(map).map(function(k) { return map[k]; }).filter(function(e) {
      return coincide(q, [e.modelo, e.imei, e.nombre, e.telefono]);
    });
  }
  function agregarGrupo(contenedor, titulo, items, crear, todos) {
    if (!items.length) return;
    var grupo = document.createElement('section'); grupo.className = 'gs-group';
    var h = document.createElement('div'); h.className = 'gs-title'; h.textContent = titulo + ' (' + items.length + ')'; grupo.appendChild(h);
    var mostrar = todos ? items : items.slice(0, limite);
    mostrar.forEach(function(item) { grupo.appendChild(crear(item)); });
    if (!todos && items.length > limite) {
      var mas = document.createElement('button'); mas.className = 'gs-more'; mas.textContent = 'Ver ' + (items.length - limite) + ' más';
      mas.addEventListener('click', function(e) { e.stopPropagation(); render(ultimaBusqueda, titulo); }); grupo.appendChild(mas);
    }
    contenedor.appendChild(grupo);
  }
  function filaBase(titulo, meta, abrir) {
    var row = document.createElement('div'); row.className = 'gs-row'; row.tabIndex = -1;
    var main = document.createElement('div'); main.className = 'gs-main'; main.textContent = titulo; row.appendChild(main);
    if (meta) { var m = document.createElement('div'); m.className = 'gs-meta'; m.textContent = meta; row.appendChild(m); }
    row.addEventListener('click', abrir); filas.push({ el:row, abrir:abrir }); return row;
  }
  function filaReparacion(r) {
    var saldo = saldoReparacion(r), cobrado = totalCobradoReparacion(r);
    var row = filaBase((r.orden || 'Sin orden') + ' · ' + (r.nombre || 'Sin cliente'),
      [r.equipo, r.modelo ? 'IMEI/Serie: ' + r.modelo : '', r.estado || '', r.tecnico || '', r.fecha || '', Number(r.presupuesto || 0) ? 'Presupuesto ' + pesos(r.presupuesto) + ' · Cobrado ' + pesos(cobrado) + ' · Saldo ' + pesos(saldo) : ''].filter(Boolean).join(' · '),
      function() { abrirDetalle(r.id); });
    var a = document.createElement('div'); a.className = 'gs-actions';
    if (r.telefono) a.appendChild(accion('btn-w btn-sm','WhatsApp',function(){ abrirWA2(r.id); }));
    a.appendChild(accion('btn-g btn-sm','Abrir',function(){ abrirDetalle(r.id); }));
    if (saldo > 0 && estadoPagoReparacion(r) !== 'Pagado') a.appendChild(accion('btn-g btn-sm','Cobrar',function(){ cerrar(); openPago(r.id); }));
    if (puede('editar_reparacion') && r.estado === 'Listo') a.appendChild(accion('btn-p btn-sm','Entregar',function(){ actualizarEstado(r.id,'Entregado'); }));
    else if (puede('editar_reparacion') && r.estado !== 'Entregado') a.appendChild(accion('btn-g btn-sm','Estado',function(){ abrirDetalle(r.id); }));
    a.appendChild(accion('btn-g btn-sm','Garantía',function(){ cerrar(); marcarGarantia(r.id); }));
    var extra = document.createElement('div'); extra.className = 'gs-actions'; extra.style.display = 'none';
    if (r.telefono) extra.appendChild(accion('btn-g btn-sm','Llamar',function(){ llamarCliente(r.telefono); }));
    extra.appendChild(accion('btn-g btn-sm','Orden taller',function(){ prtOrdenTaller(r.id); }));
    extra.appendChild(accion('btn-g btn-sm','Recibo',function(){ abrirRec(r.id); }));
    if (r.modelo) extra.appendChild(accion('btn-g btn-sm','Copiar IMEI',function(){ copiarTexto(r.modelo,'IMEI / Serie copiado'); }));
    if (puede('editar_reparacion')) extra.appendChild(accion('btn-g btn-sm','Editar',function(){ cerrar(); openEditRep(r.id); }));
    var mas = accion('btn-g btn-sm','Más',function(){ extra.style.display = extra.style.display === 'none' ? 'flex' : 'none'; });
    a.appendChild(mas); row.appendChild(a); row.appendChild(extra); return row;
  }
  function filaCliente(c) {
    var activas = c.reps.filter(activo), saldo = c.reps.reduce(function(s,r){ return s + saldoReparacion(r); },0);
    var equipos = {};
    c.reps.forEach(function(r){ if(r.equipo) equipos[r.equipo] = true; });
    var ultima = c.reps.slice().sort(function(a,b){ return fechaOrdenable(b.fecha).localeCompare(fechaOrdenable(a.fecha)); })[0];
    var row = filaBase(c.nombre || 'Cliente sin nombre', [c.telefono || '', c.reps.length + ' reparación(es)', activas.length ? activas.length + ' activa(s)' : '', Object.keys(equipos).length + ' equipo(s)', saldo ? 'Saldo pendiente ' + pesos(saldo) : '', ultima ? 'Última: ' + (ultima.orden || '') + ' ' + (ultima.fecha || '') : ''].filter(Boolean).join(' · '), irClientes);
    var a=document.createElement('div'); a.className='gs-actions';
    var ref=activas[0] || ultima;
    if(c.telefono && ref) a.appendChild(accion('btn-w btn-sm','WhatsApp',function(){ abrirWA2(ref.id); }));
    if(c.telefono) a.appendChild(accion('btn-g btn-sm','Llamar',function(){ llamarCliente(c.telefono); }));
    a.appendChild(accion('btn-g btn-sm','Nueva reparación',function(){ nuevaReparacion(c); }));
    a.appendChild(accion('btn-g btn-sm','Ver cliente',irClientes)); row.appendChild(a); return row;
  }
  function filaEquipo(e) {
    var row=filaBase(e.modelo || 'Equipo', [e.imei ? 'IMEI/Serie: '+e.imei : '',e.nombre || '',e.rep ? 'Última '+(e.rep.orden||'')+' · '+(e.rep.estado||'') : ''].filter(Boolean).join(' · '), function(){ e.rep ? abrirDetalle(e.rep.id) : irClientes(); });
    var a=document.createElement('div');a.className='gs-actions';
    if(e.rep) a.appendChild(accion('btn-g btn-sm','Ver cliente',function(){ abrirDetalle(e.rep.id); }));
    a.appendChild(accion('btn-g btn-sm','Nueva reparación',function(){ nuevaReparacion({nombre:e.nombre,telefono:e.telefono}); }));
    if(e.imei) a.appendChild(accion('btn-g btn-sm','Copiar IMEI',function(){ copiarTexto(e.imei,'IMEI / Serie copiado'); }));
    row.appendChild(a);return row;
  }
  function filaVenta(v) {
    var row=filaBase((v.modelo||'Equipo')+' · '+(v.nombre||'Sin cliente'), [v.capacidad,v.color,v.imei?'IMEI: '+v.imei:'',v.estadoVenta||'Cobrada',v.vendedor||'',v.fecha||'',v.precio ? 'Venta '+pesos(v.precio):''].filter(Boolean).join(' · '), function(){ cerrar(); openEditVenta(v.id); });
    var a=document.createElement('div');a.className='gs-actions';
    if(v.telefono) a.appendChild(accion('btn-w btn-sm','WhatsApp',function(){ abrirWA(v.telefono,'Hola '+(v.nombre||'')+', te escribimos desde MaxPoint.'); }));
    a.appendChild(accion('btn-g btn-sm','Abrir',function(){ cerrar(); openEditVenta(v.id); }));
    a.appendChild(accion('btn-g btn-sm','Comprobante',function(){ prtVenta(v.id); }));
    if(v.nombre) a.appendChild(accion('btn-g btn-sm','Ver cliente',irClientes)); row.appendChild(a);return row;
  }
  function filaStock(s) {
    var row=filaBase(etiquetaEquipo(s)||'Equipo en stock',[s.imei?'IMEI: '+s.imei:'',s.estado||'',s.precio_venta?'Venta '+pesos(s.precio_venta):''].filter(Boolean).join(' · '),function(){cerrar();openEditStock(s.id);});
    var a=document.createElement('div');a.className='gs-actions';a.appendChild(accion('btn-g btn-sm','Editar',function(){cerrar();openEditStock(s.id);}));if(s.imei)a.appendChild(accion('btn-g btn-sm','Copiar IMEI',function(){copiarTexto(s.imei,'IMEI copiado');}));row.appendChild(a);return row;
  }
  function filaRepuesto(r) {
    var row=filaBase(r.nombre||'Repuesto',[r.modelo||'',r.estado||'',r.orden?'Orden '+r.orden:'',r.cliente||'',r.precio_cliente?'Cliente '+pesos(r.precio_cliente):''].filter(Boolean).join(' · '),function(){ if(r.orden){var rep=REPS.find(function(x){return x.orden===r.orden;});if(rep)abrirDetalle(rep.id);}else{cerrar();showView('rpus',document.getElementById('nav-rpus'));} });
    var a=document.createElement('div');a.className='gs-actions';if(r.orden){a.appendChild(accion('btn-g btn-sm','Abrir reparación',function(){var rep=REPS.find(function(x){return x.orden===r.orden;});if(rep)abrirDetalle(rep.id);}));}a.appendChild(accion('btn-g btn-sm','Ver repuestos',function(){cerrar();showView('rpus',document.getElementById('nav-rpus'));}));row.appendChild(a);return row;
  }
  function render(q, expandir) {
    var res=el('globalSearchResults'); if(!res) return; ultimaBusqueda=q; filas=[]; seleccion=-1; res.innerHTML='';
    if(!String(q||'').trim()){res.classList.remove('open');return;}
    var reps=REPS.filter(function(r){return coincide(q,[r.nombre,r.telefono,r.orden,r.modelo,r.equipo,r.falla]);});
    var activas=reps.filter(activo).sort(function(a,b){return fechaOrdenable(b.fecha).localeCompare(fechaOrdenable(a.fecha));});
    var historicas=reps.filter(function(r){return !activo(r);}).sort(function(a,b){return fechaOrdenable(b.fecha).localeCompare(fechaOrdenable(a.fecha));});
    var clientes=clienteDesdeReps(q), equipos=equiposDesdeMemoria(q);
    var ventas=VENTAS.filter(function(v){return coincide(q,[v.nombre,v.telefono,v.modelo,v.imei,v.capacidad,v.color]);}).sort(function(a,b){return fechaOrdenable(b.fecha).localeCompare(fechaOrdenable(a.fecha));});
    var stock=STOCK.filter(function(s){return coincide(q,[s.modelo,s.capacidad,s.color,s.imei,s.detalles,s.estado]);});
    var rpus=RPUS.filter(function(r){return coincide(q,[r.nombre,r.modelo,r.orden,r.cliente,r.estado]);});
    agregarGrupo(res,'Reparaciones activas',activas,filaReparacion,expandir==='Reparaciones activas');
    agregarGrupo(res,'Clientes',clientes,filaCliente,expandir==='Clientes');
    agregarGrupo(res,'Equipos',equipos,filaEquipo,expandir==='Equipos');
    agregarGrupo(res,'Ventas',ventas,filaVenta,expandir==='Ventas');
    agregarGrupo(res,'Stock',stock,filaStock,expandir==='Stock');
    agregarGrupo(res,'Repuestos',rpus,filaRepuesto,expandir==='Repuestos');
    agregarGrupo(res,'Histórico',historicas,filaReparacion,expandir==='Histórico');
    if(!res.children.length) res.innerHTML='<div class="gs-empty">Sin coincidencias.</div>';
    res.classList.add('open');
  }
  function buscar(q){ render(q); }
  function mover(delta){if(!filas.length)return;seleccion=(seleccion+delta+filas.length)%filas.length;filas.forEach(function(f,i){f.el.classList.toggle('sel',i===seleccion);});filas[seleccion].el.scrollIntoView({block:'nearest'});}
  document.addEventListener('DOMContentLoaded',function(){
    var inp=el('globalSearchInput'); if(!inp)return;
    inp.addEventListener('input',function(){buscar(this.value);});
    inp.addEventListener('keydown',function(e){if(e.key==='ArrowDown'){e.preventDefault();mover(1);}else if(e.key==='ArrowUp'){e.preventDefault();mover(-1);}else if(e.key==='Enter'&&seleccion>=0){e.preventDefault();filas[seleccion].abrir();}else if(e.key==='Escape'){e.preventDefault();cerrar();inp.blur();}});
    document.addEventListener('keydown',function(e){if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='k'){e.preventDefault();inp.focus();inp.select();}else if(e.key==='Escape'&&document.activeElement!==inp){cerrar();}});
    document.addEventListener('click',function(e){if(!e.target.closest('#globalSearch')) cerrar();});
  });
  window.buscarUniversal=buscar;
})();
