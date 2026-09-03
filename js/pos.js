// ===================== POS / INVENTARIO V1 =====================
// Convive con ventas y stock de equipos anteriores. No migra ni borra datos.

var POS_CARRITO = [];
var POS_PAGOS = [{ medio:'Efectivo', cuenta:'Caja efectivo', monto:0 }];
var POS_DESC_PORC = 0;
var POS_DESC_FIJO = 0;
var POS_GUARDANDO = false;
var POS_CLIENTE = { nombre:'Consumidor final', telefono:'' };

function posNumero(v) {
  var n = Number(v); return Number.isFinite(n) ? n : 0;
}

function posDinero(v, moneda) {
  return (moneda === 'USD' ? 'US$ ' : '$') + posNumero(v).toLocaleString('es-AR', { maximumFractionDigits:2 });
}

function posMonedaCarrito() { return POS_CARRITO.length ? (POS_CARRITO[0].moneda || 'ARS') : 'ARS'; }
function posResumenMonedas(ventas, campo) {
  var sumas={}; (ventas||[]).forEach(function(v){var m=v.moneda||'ARS';sumas[m]=(sumas[m]||0)+posNumero(v[campo]);});
  return Object.keys(sumas).map(function(m){return posDinero(sumas[m],m);}).join(' · ') || posDinero(0,'ARS');
}

function posProductosActivos() {
  return (window.PRODUCTOS_POS || []).filter(function(p) { return p.activo !== false; });
}

function posCalculos() {
  var subtotalLista = 0, descuentoItems = 0, costo = 0;
  var items = POS_CARRITO.map(function(i) {
    var bruto = posNumero(i.precio) * i.cantidad;
    var desc = Math.min(bruto, bruto * Math.max(0, Math.min(100, posNumero(i.descuentoPorcentaje))) / 100);
    subtotalLista += bruto; descuentoItems += desc; costo += posNumero(i.costo) * i.cantidad;
    return Object.assign({}, i, { subtotalLista:bruto, descuentoImporte:desc, subtotalFinal:bruto-desc });
  });
  var despuesItems = Math.max(0, subtotalLista - descuentoItems);
  var descGlobalPorc = Math.min(despuesItems, despuesItems * Math.max(0, Math.min(100, posNumero(POS_DESC_PORC))) / 100);
  var descGlobalFijo = Math.min(Math.max(0, despuesItems - descGlobalPorc), Math.max(0, posNumero(POS_DESC_FIJO)));
  var total = Math.max(0, despuesItems - descGlobalPorc - descGlobalFijo);
  return { items:items, subtotalLista:subtotalLista, descuentoItems:descuentoItems,
    descuentoGlobalPorcentaje:descGlobalPorc, descuentoGlobalFijo:descGlobalFijo,
    descuentoTotal:descuentoItems+descGlobalPorc+descGlobalFijo, total:total, costoTotal:costo, margenBruto:total-costo };
}

function posAgregarProducto(id) {
  var p = posProductosActivos().find(function(x) { return x.id === id; });
  if (!p) { toast('Producto no disponible', 'var(--rd)'); return; }
  if (POS_CARRITO.length && posMonedaCarrito() !== (p.moneda || 'ARS')) { toast('No se pueden mezclar productos ARS y USD en una misma venta', 'var(--rd)'); return; }
  var existente = POS_CARRITO.find(function(x) { return x.productoId === id; });
  if (existente) {
    if (p.controlaStock && existente.cantidad >= posNumero(p.stockActual)) { toast('No hay más stock disponible', 'var(--rd)'); return; }
    existente.cantidad++;
  } else {
    if (p.controlaStock && posNumero(p.stockActual) <= 0) { toast('Producto sin stock', 'var(--rd)'); return; }
    POS_CARRITO.push({ productoId:p.id, nombre:p.nombre, sku:p.sku || '', barcode:p.barcode || '', cantidad:1,
      precio:posNumero(p.precio), costo:posNumero(p.costo), moneda:p.moneda || 'ARS', controlaStock:!!p.controlaStock,
      stockDisponible:posNumero(p.stockActual), descuentoPorcentaje:0 });
  }
  posSincronizarPagoSimple(); renderPos();
}

function posCambiarCantidad(id, delta) {
  var i = POS_CARRITO.find(function(x) { return x.productoId === id; }); if (!i) return;
  var nueva = i.cantidad + delta;
  if (nueva <= 0) POS_CARRITO = POS_CARRITO.filter(function(x) { return x.productoId !== id; });
  else if (i.controlaStock && nueva > i.stockDisponible) toast('Stock máximo disponible: ' + i.stockDisponible, 'var(--rd)');
  else i.cantidad = nueva;
  posSincronizarPagoSimple(); renderPos();
}

function posQuitar(id) { POS_CARRITO = POS_CARRITO.filter(function(x) { return x.productoId !== id; }); posSincronizarPagoSimple(); renderPos(); }
function posDescuentoItem(id, valor) { var i=POS_CARRITO.find(function(x){return x.productoId===id;}); if(i)i.descuentoPorcentaje=Math.max(0,Math.min(100,posNumero(valor))); posSincronizarPagoSimple(); renderPos(); }
function posDescuentoGlobal(tipo, valor) { if(tipo==='porc')POS_DESC_PORC=Math.max(0,Math.min(100,posNumero(valor))); else POS_DESC_FIJO=Math.max(0,posNumero(valor)); posSincronizarPagoSimple(); renderPos(); }
function posSincronizarPagoSimple() { if (POS_PAGOS.length === 1) POS_PAGOS[0].monto = posCalculos().total; }

function posBuscarInput(ev) {
  var q = String(ev.target.value || '').trim().toLowerCase();
  if (ev.key === 'Enter') {
    ev.preventDefault();
    var exacto = posProductosActivos().find(function(p) { return String(p.barcode||'').toLowerCase()===q || String(p.sku||'').toLowerCase()===q; });
    if (exacto) { posAgregarProducto(exacto.id); return; }
    var resultados = posFiltrarProductos(q); if (resultados.length === 1) posAgregarProducto(resultados[0].id);
  }
}

function posFiltrarProductos(q) {
  q=String(q||'').trim().toLowerCase();
  return posProductosActivos().filter(function(p) {
    return !q || [p.nombre,p.sku,p.barcode,p.categoria,p.subcategoria].some(function(v){return String(v||'').toLowerCase().includes(q);});
  }).slice(0,30);
}

function posActualizarResultados(q) {
  var box=el('posResultados'); if(!box)return;
  box.innerHTML=posFiltrarProductos(q).map(function(p){
    var stock=p.controlaStock ? 'Stock '+posNumero(p.stockActual) : 'Servicio';
    return '<button class="pos-producto" type="button" data-pid="'+p.id+'" onclick="posAgregarProducto(this.dataset.pid)"><span><b>'+esc(p.nombre)+'</b><small>'+esc([p.sku,p.barcode,p.categoria].filter(Boolean).join(' · '))+'</small></span><span><b>'+posDinero(p.precio,p.moneda)+'</b><small>'+stock+'</small></span></button>';
  }).join('') || '<div class="pos-vacio">No se encontraron productos activos.</div>';
}

function posPagoCampo(indice, campo, valor) { POS_PAGOS[indice][campo]=campo==='monto'?Math.max(0,posNumero(valor)):valor; posActualizarTotalesDom(); }
function posAgregarPago() { POS_PAGOS.push({medio:'Transferencia',cuenta:'Santander MaxPoint',monto:0}); renderPos(); }
function posQuitarPago(i) { if(POS_PAGOS.length>1){POS_PAGOS.splice(i,1);posSincronizarPagoSimple();renderPos();} }
function posActualizarTotalesDom() {
  var c=posCalculos(), pagado=POS_PAGOS.reduce(function(s,p){return s+posNumero(p.monto);},0), dif=c.total-pagado;
  var e=el('posPagoDiferencia'), moneda=posMonedaCarrito(); if(e){e.textContent=Math.abs(dif)<0.01?'Pago completo':(dif>0?'Faltan '+posDinero(dif,moneda):'Excede '+posDinero(-dif,moneda));e.className='pos-diferencia '+(Math.abs(dif)<0.01?'ok':'error');}
}

function posClienteCampo(campo, valor) {
  POS_CLIENTE[campo] = String(valor || '');
  if (campo === 'nombre') {
    var encontrado = (window.REPS || []).concat((window.VENTAS || []).filter(function(v){return v.tipoRegistro !== 'pos';})).find(function(x){return String(x.nombre || '').toLowerCase() === POS_CLIENTE.nombre.trim().toLowerCase();});
    if (encontrado && encontrado.telefono) { POS_CLIENTE.telefono = encontrado.telefono; var tel=el('posClienteTel'); if(tel)tel.value=encontrado.telefono; }
  }
}

function renderPos() {
  var cnt=el('cnt'), c=posCalculos(), moneda=posMonedaCarrito(), clientes={}, opcionesClientes=''; cnt.innerHTML='';
  (window.REPS || []).concat((window.VENTAS || []).filter(function(v){return v.tipoRegistro !== 'pos';})).forEach(function(x){var n=String(x.nombre||'').trim();if(n)clientes[n.toLowerCase()]=n;});
  opcionesClientes=Object.keys(clientes).slice(0,500).map(function(k){return '<option value="'+esc(clientes[k])+'"></option>';}).join('');
  cnt.innerHTML='<div class="pos-layout"><section class="pos-panel"><div class="pos-search"><input id="posBuscar" autocomplete="off" placeholder="Escanear código o buscar por nombre, SKU..." oninput="posActualizarResultados(this.value)" onkeydown="posBuscarInput(event)"><span>Enter para agregar</span></div><div id="posResultados" class="pos-resultados"></div></section>'
    +'<section class="pos-panel pos-carrito"><div class="pos-section-title">Venta actual</div><div id="posCarritoItems"></div>'
    +'<div class="pos-cliente"><input id="posCliente" list="posClientesLista" placeholder="Consumidor final" value="'+esc(POS_CLIENTE.nombre)+'" oninput="posClienteCampo(\'nombre\',this.value)"><datalist id="posClientesLista">'+opcionesClientes+'</datalist><input id="posClienteTel" placeholder="Teléfono opcional" value="'+esc(POS_CLIENTE.telefono)+'" oninput="posClienteCampo(\'telefono\',this.value)"></div>'
    +'<div class="pos-desc"><label>Desc. global %<input type="number" min="0" max="100" value="'+POS_DESC_PORC+'" onchange="posDescuentoGlobal(\'porc\',this.value)"></label><label>Desc. fijo<input type="number" min="0" value="'+POS_DESC_FIJO+'" onchange="posDescuentoGlobal(\'fijo\',this.value)"></label></div>'
    +'<div class="pos-totales"><div><span>Subtotal '+moneda+'</span><b>'+posDinero(c.subtotalLista,moneda)+'</b></div><div><span>Descuentos</span><b>- '+posDinero(c.descuentoTotal,moneda)+'</b></div><div class="total"><span>Total</span><b>'+posDinero(c.total,moneda)+'</b></div></div>'
    +'<div class="pos-section-title">Pagos <button class="btn btn-g btn-sm" onclick="posAgregarPago()">+ Combinar</button></div><div id="posPagos"></div><div id="posPagoDiferencia"></div>'
    +'<div class="pos-cobrar"><button class="btn btn-g" '+(!POS_CARRITO.length?'disabled':'')+' onclick="posCobrar(false)">Cobrar</button><button class="btn btn-p" '+(!POS_CARRITO.length?'disabled':'')+' onclick="posCobrar(true)">Cobrar + imprimir</button></div></section></div>';
  el('posCarritoItems').innerHTML=c.items.map(function(i){return '<div class="pos-item"><div class="pos-item-main"><b>'+esc(i.nombre)+'</b><small>'+posDinero(i.precio,i.moneda)+' c/u'+(i.controlaStock?' · stock '+i.stockDisponible:' · servicio')+'</small></div><div class="pos-qty"><button onclick="posCambiarCantidad(\''+i.productoId+'\',-1)">−</button><b>'+i.cantidad+'</b><button onclick="posCambiarCantidad(\''+i.productoId+'\',1)">+</button></div><label class="pos-item-desc">Desc.%<input type="number" min="0" max="100" value="'+i.descuentoPorcentaje+'" onchange="posDescuentoItem(\''+i.productoId+'\',this.value)"></label><b>'+posDinero(i.subtotalFinal,i.moneda)+'</b><button class="pos-remove" onclick="posQuitar(\''+i.productoId+'\')">×</button></div>';}).join('') || '<div class="pos-vacio">Escaneá o elegí un producto para comenzar.</div>';
  el('posPagos').innerHTML=POS_PAGOS.map(function(p,i){return '<div class="pos-pago"><select onchange="posPagoCampo('+i+',\'medio\',this.value)">'+['Efectivo','Transferencia','Débito','Crédito','Mercado Pago','Otro'].map(function(x){return '<option'+(x===p.medio?' selected':'')+'>'+x+'</option>';}).join('')+'</select><input value="'+esc(p.cuenta)+'" placeholder="Cuenta destino" onchange="posPagoCampo('+i+',\'cuenta\',this.value)"><input type="number" min="0" value="'+p.monto+'" onchange="posPagoCampo('+i+',\'monto\',this.value)">'+(POS_PAGOS.length>1?'<button class="pos-remove" onclick="posQuitarPago('+i+')">×</button>':'')+'</div>';}).join('');
  posActualizarResultados(''); posActualizarTotalesDom();
  requestAnimationFrame(function(){var q=el('posBuscar');if(q)q.focus();});
}

function posCobrar(imprimir) {
  if(POS_GUARDANDO)return;
  var c=posCalculos(), pagado=POS_PAGOS.reduce(function(s,p){return s+posNumero(p.monto);},0);
  if(!c.items.length){toast('Agregá al menos un producto','var(--rd)');return;}
  if(c.total<=0){toast('El total debe ser mayor a cero','var(--rd)');return;}
  if(Math.abs(c.total-pagado)>0.01){toast('Los pagos no coinciden con el total','var(--rd)');return;}
  var moneda=posMonedaCarrito();
  var venta={ items:c.items.map(function(i){return {productoId:i.productoId,nombre:i.nombre,sku:i.sku,barcode:i.barcode,cantidad:i.cantidad,precioLista:i.precio,descuentoPorcentaje:i.descuentoPorcentaje,descuentoImporte:i.descuentoImporte,precioFinal:i.subtotalFinal/i.cantidad,costoUnitario:i.costo,costoTotal:i.costo*i.cantidad,controlaStock:i.controlaStock,moneda:i.moneda};}),
    pagos:POS_PAGOS.map(function(p){return {medio:p.medio,cuenta:p.cuenta,monto:posNumero(p.monto),moneda:moneda,cotizacion:0};}),
    cliente:{nombre:(POS_CLIENTE.nombre||'Consumidor final').trim()||'Consumidor final',telefono:(POS_CLIENTE.telefono||'').trim()},
    moneda:moneda,cotizacion:0,subtotal:c.subtotalLista,descuentoItems:c.descuentoItems,
    descuentoGlobal:{porcentaje:posNumero(POS_DESC_PORC),importePorcentaje:c.descuentoGlobalPorcentaje,importeFijo:c.descuentoGlobalFijo},
    descuentoTotal:c.descuentoTotal,total:c.total,costoTotal:c.costoTotal,margenBruto:c.margenBruto };
  POS_GUARDANDO=true; document.querySelectorAll('.pos-cobrar button').forEach(function(b){b.disabled=true;});
  FB.crearVentaPos(venta,function(err,res){
    POS_GUARDANDO=false;
    if(err){toast('No se pudo cobrar: '+err,'var(--rd)');renderPos();return;}
    var guardada=Object.assign({id:res.id,numeroVenta:res.numeroVenta,numeroHumano:'Venta #'+String(res.numeroVenta).padStart(6,'0'),fechaHora:new Date().toISOString(),estado:'activa',usuario:usuarioActualRegistro()},venta);
    POS_CARRITO=[];POS_PAGOS=[{medio:'Efectivo',cuenta:'Caja efectivo',monto:0}];POS_DESC_PORC=0;POS_DESC_FIJO=0;POS_CLIENTE={nombre:'Consumidor final',telefono:''};
    toast('Venta #'+String(res.numeroVenta).padStart(6,'0')+' registrada');
    if(imprimir)posImprimirTicketVenta(guardada); renderPos();
  });
}

function posAbrirProducto(id) {
  var p=(window.PRODUCTOS_POS||[]).find(function(x){return x.id===id;})||{};
  posModal('Producto', '<div class="pos-form"><label>Nombre *<input id="ppNombre" value="'+esc(p.nombre||'')+'"></label><label>Categoría<input id="ppCategoria" value="'+esc(p.categoria||'')+'"></label><label>Subcategoría<input id="ppSubcategoria" value="'+esc(p.subcategoria||'')+'"></label><label>SKU<input id="ppSku" value="'+esc(p.sku||'')+'"></label><label>Barcode<input id="ppBarcode" value="'+esc(p.barcode||'')+'"></label><label>Moneda<select id="ppMoneda"><option value="ARS"'+((p.moneda||'ARS')==='ARS'?' selected':'')+'>Pesos (ARS)</option><option value="USD"'+(p.moneda==='USD'?' selected':'')+'>Dólares (USD)</option></select></label><label>Costo<input id="ppCosto" type="number" min="0" step="0.01" value="'+posNumero(p.costo)+'"></label><label>Precio<input id="ppPrecio" type="number" min="0" step="0.01" value="'+posNumero(p.precio)+'"></label>'+(p.id?'':'<label>Stock inicial<input id="ppStock" type="number" min="0" value="0"></label>')+'<label class="check"><input id="ppControla" type="checkbox" '+(p.id?(p.controlaStock?'checked':''):'checked')+'> Controla stock</label><label class="check"><input id="ppActivo" type="checkbox" '+(p.activo===false?'':'checked')+'> Activo</label></div>', function(){posGuardarProducto(p.id||null);});
}

function posGuardarProducto(id) {
  var d={id:id,nombre:val('ppNombre'),categoria:val('ppCategoria'),subcategoria:val('ppSubcategoria'),sku:val('ppSku'),barcode:val('ppBarcode'),costo:posNumero(val('ppCosto')),precio:posNumero(val('ppPrecio')),stockInicial:el('ppStock')?posNumero(val('ppStock')):0,controlaStock:el('ppControla').checked,activo:el('ppActivo').checked,moneda:val('ppMoneda')||'ARS'};
  var b=el('posModalGuardar');b.disabled=true;FB.guardarProductoPos(d,function(err){b.disabled=false;if(err){toast(err,'var(--rd)');return;}posCerrarModal();toast('Producto guardado');});
}

function renderProductosPos() {
  var cnt=el('cnt'), ps=window.PRODUCTOS_POS||[];
  cnt.innerHTML='<div class="toolbar"><div class="si"><span class="si-ico">🔍</span><input placeholder="Buscar producto, SKU o barcode" oninput="posFiltrarTablaProductos(this.value)"></div></div><div id="posProductosTabla" class="pos-lista"></div>';
  posFiltrarTablaProductos('');
}
function posFiltrarTablaProductos(q){var box=el('posProductosTabla');if(!box)return;q=String(q||'').toLowerCase();var ps=(window.PRODUCTOS_POS||[]).filter(function(p){return [p.nombre,p.sku,p.barcode,p.categoria].some(function(x){return String(x||'').toLowerCase().includes(q);});});box.innerHTML=ps.map(function(p){return '<div class="pos-list-row"><span><b>'+esc(p.nombre)+'</b><small>'+esc([p.categoria,p.sku,p.barcode].filter(Boolean).join(' · '))+'</small></span><span><b>'+posDinero(p.precio,p.moneda)+'</b><small>'+(p.moneda||'ARS')+' · '+(p.controlaStock?'Stock '+posNumero(p.stockActual):'Sin control de stock')+(p.activo===false?' · Inactivo':'')+'</small></span>'+(puede('gestionar_productos')?'<button class="btn btn-g btn-sm" onclick="posAbrirProducto(\''+p.id+'\')">Editar</button>':'')+'</div>';}).join('')||'<div class="pos-vacio">Todavía no hay productos.</div>';}

function posAbrirAjuste(id) {
  var conStock=(window.PRODUCTOS_POS||[]).filter(function(p){return p.controlaStock;});
  if(!conStock.length){toast('Primero creá un producto que controle stock','var(--rd)');return;}
  var opciones=conStock.map(function(p){return '<option value="'+p.id+'"'+(p.id===id?' selected':'')+'>'+esc(p.nombre)+' · stock '+posNumero(p.stockActual)+'</option>';}).join('');
  posModal('Movimiento de stock','<div class="pos-form"><label>Producto<select id="paProducto">'+opciones+'</select></label><label>Tipo<select id="paTipo"><option value="entrada">Entrada</option><option value="ajuste_positivo">Ajuste positivo</option><option value="ajuste_negativo">Ajuste negativo</option></select></label><label>Cantidad<input id="paCantidad" type="number" min="1" value="1"></label><label class="full">Motivo<input id="paMotivo" placeholder="Opcional"></label></div>',posGuardarAjuste);
}
function posGuardarAjuste(){var tipo=val('paTipo'),cantidad=Math.abs(posNumero(val('paCantidad')));if(tipo==='ajuste_negativo')cantidad=-cantidad;var b=el('posModalGuardar');b.disabled=true;FB.ajustarStockPos({productoId:val('paProducto'),tipo:tipo,cantidad:cantidad,motivo:val('paMotivo')},function(err){b.disabled=false;if(err){toast(err,'var(--rd)');return;}posCerrarModal();toast('Stock actualizado');});}

function renderInventarioPos(){var cnt=el('cnt'),ps=(window.PRODUCTOS_POS||[]).filter(function(p){return p.controlaStock;});var unidades=ps.reduce(function(s,p){return s+posNumero(p.stockActual);},0);cnt.innerHTML='<div class="sc-row"><div class="sc"><div class="scl">Productos</div><div class="scv cb">'+ps.length+'</div></div><div class="sc"><div class="scl">Unidades</div><div class="scv cg">'+unidades+'</div></div></div><div class="pos-lista">'+ps.map(function(p){return '<div class="pos-list-row"><span><b>'+esc(p.nombre)+'</b><small>'+esc([p.sku,p.barcode].filter(Boolean).join(' · '))+'</small></span><strong class="pos-stock '+(posNumero(p.stockActual)<=0?'sin':'')+'">'+posNumero(p.stockActual)+'</strong>'+(puede('ajustar_stock_pos')?'<button class="btn btn-g btn-sm" onclick="posAbrirAjuste(\''+p.id+'\')">Mover</button>':'')+'</div>';}).join('')+'</div><div class="pos-section-title pos-mov-title">Últimos movimientos</div><div class="pos-lista">'+(window.MOVIMIENTOS_STOCK_POS||[]).slice(0,100).map(function(m){return '<div class="pos-list-row"><span><b>'+esc(m.productoNombre||'Producto')+'</b><small>'+esc(m.tipo||'')+(m.motivo?' · '+esc(m.motivo):'')+' · '+posFecha(m.fechaHora)+'</small></span><b class="'+(posNumero(m.cantidad)>=0?'pos-in':'pos-out')+'">'+(posNumero(m.cantidad)>0?'+':'')+posNumero(m.cantidad)+'</b><small>'+m.stockAnterior+' → '+m.stockResultante+'</small></div>';}).join('')+'</div>';}

function posVentas(){return (window.VENTAS||[]).filter(function(v){return v.tipoRegistro==='pos';}).sort(function(a,b){return String(b.fechaHora||'').localeCompare(String(a.fechaHora||''));});}
function posFecha(v){if(!v)return '';var d=new Date(v);return isNaN(d)?String(v):d.toLocaleString('es-AR');}
function posEsHoy(v){var d=new Date(v),h=new Date();return !isNaN(d)&&d.getFullYear()===h.getFullYear()&&d.getMonth()===h.getMonth()&&d.getDate()===h.getDate();}
function renderPosHistorial(){var cnt=el('cnt'),vs=posVentas(),hoyVentas=vs.filter(function(v){return v.estado==='activa'&&posEsHoy(v.fechaHora);}),unidades=hoyVentas.reduce(function(s,v){return s+(v.items||[]).reduce(function(a,i){return a+posNumero(i.cantidad);},0);},0),medios={};hoyVentas.forEach(function(v){(v.pagos||[]).forEach(function(p){var moneda=p.moneda||v.moneda||'ARS',k=p.medio+' · '+p.cuenta+' · '+moneda;medios[k]=(medios[k]||0)+posNumero(p.monto);});});cnt.innerHTML='<div class="sc-row"><div class="sc"><div class="scl">Vendido hoy</div><div class="scv cg">'+posResumenMonedas(hoyVentas,'total')+'</div></div><div class="sc"><div class="scl">Operaciones</div><div class="scv cb">'+hoyVentas.length+'</div></div><div class="sc"><div class="scl">Productos</div><div class="scv cp">'+unidades+'</div></div>'+(puede('ver_costos')?'<div class="sc"><div class="scl">Margen estimado</div><div class="scv cg">'+posResumenMonedas(hoyVentas,'margenBruto')+'</div></div>':'')+'</div><div class="pos-medios">'+Object.keys(medios).map(function(k){var moneda=k.slice(-3);return '<span>'+esc(k)+' <b>'+posDinero(medios[k],moneda)+'</b></span>';}).join('')+'</div><div class="pos-lista">'+vs.map(function(v){return '<div class="pos-list-row pos-venta-row"><span><b>'+esc(v.numeroHumano||('Venta #'+v.numeroVenta))+'</b><small>'+posFecha(v.fechaHora)+' · '+esc((v.cliente&&v.cliente.nombre)||'Consumidor final')+' · '+esc((v.pagos||[]).map(function(p){return p.medio;}).join(' + '))+' · '+esc(v.moneda||'ARS')+'</small></span><b class="'+(v.estado==='anulada'?'pos-anulada':'')+'">'+posDinero(v.total,v.moneda)+'</b><button class="btn btn-g btn-sm" onclick="posVerVenta(\''+v.id+'\')">Ver</button></div>';}).join('')+'</div>'+posRenderVentasLegacy();}

function posRenderVentasLegacy(){var legacy=(window.VENTAS||[]).filter(function(v){return v.tipoRegistro!=='pos';});if(!legacy.length)return '';return '<div class="pos-section-title pos-mov-title">Ventas de equipos anteriores</div><div class="pos-lista">'+legacy.slice(0,100).map(function(v){return '<div class="pos-list-row"><span><b>'+esc(v.nombre||'Venta anterior')+'</b><small>'+esc([v.modelo,v.capacidad,v.fecha].filter(Boolean).join(' · '))+'</small></span><b>'+pesos(v.precio||0)+'</b><span><button class="btn btn-g btn-sm" data-vid="'+v.id+'" onclick="prtVenta(this.dataset.vid)">Comprobante</button> <button class="btn btn-g btn-sm" data-vid="'+v.id+'" onclick="openEditVenta(this.dataset.vid)">Editar</button>'+(puede('eliminar_operaciones')?' <button class="btn btn-d btn-sm" data-vid="'+v.id+'" onclick="eliminarVenta(this.dataset.vid)">×</button>':'')+'</span></div>';}).join('')+'</div>';}

function posVerVenta(id){var v=posVentas().find(function(x){return x.id===id;});if(!v)return;var body='<div class="pos-ticket-preview"><b>'+esc(v.numeroHumano||'Venta')+'</b><small>'+posFecha(v.fechaHora)+' · '+esc((v.cliente&&v.cliente.nombre)||'Consumidor final')+' · '+esc(v.moneda||'ARS')+'</small>'+(v.items||[]).map(function(i){return '<div><span>'+i.cantidad+' × '+esc(i.nombre)+'</span><b>'+posDinero(i.precioFinal*i.cantidad,i.moneda||v.moneda)+'</b></div>';}).join('')+'<div class="total"><span>Total</span><b>'+posDinero(v.total,v.moneda)+'</b></div>'+(v.pagos||[]).map(function(p){return '<div><span>'+esc(p.medio)+' · '+esc(p.cuenta)+'</span><b>'+posDinero(p.monto,p.moneda||v.moneda)+'</b></div>';}).join('')+(v.estado==='anulada'?'<p class="pos-anulada">ANULADA'+(v.anulacion&&v.anulacion.motivo?' · '+esc(v.anulacion.motivo):'')+'</p>':'')+'</div>';
  posModal('Detalle de venta',body,function(){posImprimirTicketVenta(v);},'Reimprimir');var foot=el('posModalExtra');if(foot&&v.estado==='activa'&&puede('anular_venta_pos'))foot.innerHTML='<button class="btn btn-d" onclick="posAnularVenta(\''+v.id+'\')">Anular venta</button>';}
function posAnularVenta(id){var motivo=prompt('Motivo de la anulación (opcional):');if(motivo===null)return;if(!confirm('La venta se anulará y el stock será restituido. ¿Continuar?'))return;FB.anularVentaPos(id,motivo,function(err){if(err){toast(err,'var(--rd)');return;}posCerrarModal();toast('Venta anulada y stock restituido');});}

function posImprimirTicketVenta(v){var e=esc,items=(v.items||[]).map(function(i){return '<tr><td>'+i.cantidad+' × '+e(i.nombre)+'</td><td>'+posDinero(i.precioFinal*i.cantidad,i.moneda||v.moneda)+'</td></tr>';}).join(''),pagos=(v.pagos||[]).map(function(p){return '<tr><td>'+e(p.medio)+' · '+e(p.cuenta)+'</td><td>'+posDinero(p.monto,p.moneda||v.moneda)+'</td></tr>';}).join('');var html='<!doctype html><html><head><meta charset="utf-8"><title>'+e(v.numeroHumano||'Ticket')+'</title><style>@page{size:80mm auto;margin:4mm}body{font-family:monospace;width:72mm;margin:0 auto;font-size:11px;color:#000}h1{text-align:center;font-size:20px;margin:0}p{text-align:center;margin:3px 0 12px}table{width:100%;border-collapse:collapse}td{padding:3px 0;border-bottom:1px dashed #bbb}td:last-child{text-align:right}.total{font-size:15px;font-weight:bold;border-top:2px solid #000;margin-top:8px;padding-top:7px;display:flex;justify-content:space-between}.no-print{width:100%;margin-top:12px;padding:8px}@media print{.no-print{display:none}}</style></head><body><h1>MaxPoint</h1><p>'+e(v.numeroHumano||'Venta')+'<br>'+e(posFecha(v.fechaHora))+' · '+e(v.moneda||'ARS')+'</p><table>'+items+'</table><div class="total"><span>Total</span><span>'+posDinero(v.total,v.moneda)+'</span></div><table>'+pagos+'</table><p>Atendió: '+e(v.usuario&&v.usuario.nombre||'MaxPoint')+'<br>Comprobante interno no fiscal</p><button class="no-print" onclick="window.print()">Imprimir</button></body></html>';var w=window.open('','_blank','width=420,height=700');if(!w){toast('El navegador bloqueó la ventana de impresión','var(--rd)');return;}w.document.write(html);w.document.close();}

function posModal(titulo,contenido,guardar,label){posCerrarModal();var ov=document.createElement('div');ov.id='posModal';ov.className='ov open';ov.innerHTML='<div class="modal pos-modal"><div class="mh"><div class="mt">'+esc(titulo)+'</div><button class="mc" onclick="posCerrarModal()">×</button></div><div class="mb">'+contenido+'</div><div class="mf"><div id="posModalExtra"></div><button class="btn btn-g" onclick="posCerrarModal()">Cerrar</button><button class="btn btn-p" id="posModalGuardar">'+esc(label||'Guardar')+'</button></div></div>';document.body.appendChild(ov);el('posModalGuardar').addEventListener('click',guardar);}
function posCerrarModal(){var m=el('posModal');if(m)m.remove();}
