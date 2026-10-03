// Proyecciones públicas: nunca copiar documentos internos completos.
(function(global) {
  'use strict';
  function telefono(v) {
    var n=String(v||'').replace(/\D/g,'');
    if(/^549\d{10}$/.test(n))n=n.slice(3); else if(/^54\d{10}$/.test(n))n=n.slice(2);
    return /^\d{8,11}$/.test(n)?n:'';
  }
  function orden(v) { var s=String(v||'').trim();return /^#?\d+$/.test(s)?s.replace(/^#/,'').replace(/^0+(?=\d)/,''):''; }
  async function acceso(t,o) {
    var tel=telefono(t),ord=orden(o);if(!tel||!ord)return '';
    var bytes=await global.crypto.subtle.digest('SHA-256',new TextEncoder().encode('maxpoint:portal:v1:'+tel+':'+ord));
    return Array.from(new Uint8Array(bytes)).map(function(b){return b.toString(16).padStart(2,'0');}).join('');
  }
  function numero(v) { var n=Number(v);return Number.isFinite(n)?n:0; }
  function reparacion(r,cobrado,sinCargo) {
    return {portalVersion:1,visible:true,nombre:String(r.nombre||'Cliente'),orden:String(r.orden||''),equipo:String(r.equipo||''),capacidad:String(r.capacidad||''),fecha:String(r.fecha||''),estado:String(r.estado||'Ingresado'),falla:String(r.falla||''),diagnosticoTaller:String(r.diagnosticoTaller||''),presupuesto:numero(r.presupuesto),totalCobrado:numero(cobrado),sinCargo:!!sinCargo,es_garantia:r.es_garantia==='si'?'si':'no'};
  }
  function cotizador(usados,catalogo,core) {
    return core.consolidar([usados]).map(function(u) {
      var descuentos={};
      ['bateria','pantalla','faceid','camtras','camfront','carcasa','vidriocam','botones'].forEach(function(tipo) {
        var x=core.seleccionarCatalogo(catalogo,u.modelo,tipo,'sin_redondeo');
        if(x)descuentos[tipo]={descuentoUsd:x.costo};
      });
      return {modelo:u.modelo,modeloClave:u.modeloClave,precio_usd:u.precio_usd,descuentos:descuentos,activo:true};
    });
  }
  global.MAXPOINT_PUBLICO={telefono:telefono,orden:orden,acceso:acceso,reparacion:reparacion,cotizador:cotizador};
})(window);
