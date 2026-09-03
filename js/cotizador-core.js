(function(global) {
  'use strict';

  var DEFAULTS = {
    bateria: { umbral: 90, fallbackUsd: 20 },
    estetica: { leveUsd: 15, marcadaUsd: 35 },
    pantalla: { fallbackUsd: 50 },
    fallas: {
      faceIdFallbackUsd: 80,
      camaraTraseraNormalUsd: 40,
      camaraTraseraProUsd: 100,
      vidrioCamaraUsd: 20,
      botonesUsd: 30,
      piezaDesconocidaUsd: 40
    },
    sinCoincidencia: 'revision_presencial',
    redondeo: 'entero',
    totalMinimoUsd: 0
  };

  function numero(v, fallback) {
    var n = Number(v);
    return Number.isFinite(n) && n >= 0 ? n : fallback;
  }

  function config(raw) {
    raw = raw || {};
    return {
      bateria: {
        umbral: numero(raw.bateria && raw.bateria.umbral, DEFAULTS.bateria.umbral),
        fallbackUsd: numero(raw.bateria && raw.bateria.fallbackUsd, DEFAULTS.bateria.fallbackUsd)
      },
      estetica: {
        leveUsd: numero(raw.estetica && raw.estetica.leveUsd, DEFAULTS.estetica.leveUsd),
        marcadaUsd: numero(raw.estetica && raw.estetica.marcadaUsd, DEFAULTS.estetica.marcadaUsd)
      },
      pantalla: { fallbackUsd: numero(raw.pantalla && raw.pantalla.fallbackUsd, DEFAULTS.pantalla.fallbackUsd) },
      fallas: {
        faceIdFallbackUsd: numero(raw.fallas && raw.fallas.faceIdFallbackUsd, DEFAULTS.fallas.faceIdFallbackUsd),
        camaraTraseraNormalUsd: numero(raw.fallas && raw.fallas.camaraTraseraNormalUsd, DEFAULTS.fallas.camaraTraseraNormalUsd),
        camaraTraseraProUsd: numero(raw.fallas && raw.fallas.camaraTraseraProUsd, DEFAULTS.fallas.camaraTraseraProUsd),
        vidrioCamaraUsd: numero(raw.fallas && raw.fallas.vidrioCamaraUsd, DEFAULTS.fallas.vidrioCamaraUsd),
        botonesUsd: numero(raw.fallas && raw.fallas.botonesUsd, DEFAULTS.fallas.botonesUsd),
        piezaDesconocidaUsd: numero(raw.fallas && raw.fallas.piezaDesconocidaUsd, DEFAULTS.fallas.piezaDesconocidaUsd)
      },
      sinCoincidencia: raw.sinCoincidencia === 'usar_fallback' ? 'usar_fallback' : 'revision_presencial',
      redondeo: raw.redondeo === 'sin_redondeo' ? 'sin_redondeo' : 'entero',
      totalMinimoUsd: numero(raw.totalMinimoUsd, DEFAULTS.totalMinimoUsd)
    };
  }

  function sinAcentos(v) {
    return String(v || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  }

  function datosModelo(texto) {
    var limpio = sinAcentos(texto).replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
    // La lista de proveedores suele abreviar iPhone como IP/IPH y Pro/Pro Max
    // como P/PM (por ejemplo: "OLED IC IP 14P").
    var modelo = limpio.match(/(?:iphone|iph|ip)\s*(\d{1,2})\s*(pro\s*max|promax|pm|pro|p|max|plus|mini|air)?(?=\s|$)/i)
      || limpio.match(/(?:^|\s)(\d{1,2})\s*(pro\s*max|promax|pm|pro|p|max|plus|mini|air)?(?=\s|$)/i);
    var capacidad = limpio.match(/\b(\d+)\s*(gb|tb)\b/i);
    if (!modelo) return null;
    var variante = String(modelo[2] || '').replace(/\s+/g, ' ').trim();
    if (variante === 'max' || variante === 'pm' || variante === 'promax') variante = 'pro max';
    if (variante === 'p') variante = 'pro';
    return {
      generacion: String(Number(modelo[1])),
      variante: variante,
      capacidad: capacidad ? String(Number(capacidad[1])) + capacidad[2].toLowerCase() : ''
    };
  }

  function modeloClave(texto, exigirCapacidad) {
    var d = datosModelo(texto);
    if (!d || (exigirCapacidad && !d.capacidad)) return '';
    return ['iphone', d.generacion, d.variante.replace(/\s+/g, '_'), d.capacidad].filter(Boolean).join('_');
  }

  function etiquetaModelo(texto) {
    var d = datosModelo(texto); if (!d || !d.capacidad) return '';
    var variantes = { 'pro max':'Pro Max', pro:'Pro', plus:'Plus', mini:'Mini', air:'Air' };
    return ['iPhone', d.generacion, variantes[d.variante] || '', d.capacidad.toUpperCase()].filter(Boolean).join(' ');
  }

  function consolidar(listas) {
    var porClave = {};
    (listas || []).forEach(function(lista) {
      (lista || []).forEach(function(item) {
        var clave = item.modeloClave || modeloClave(item.modelo, true);
        var precio = Number(item.precio_usd);
        if (!clave || !Number.isFinite(precio) || precio <= 0) return;
        if (!porClave[clave] || precio < porClave[clave].precio_usd) {
          porClave[clave] = { modelo: etiquetaModelo(item.modelo), modeloClave: clave, precio_usd: precio };
        }
      });
    });
    return Object.keys(porClave).map(function(k) { return porClave[k]; });
  }

  function tipoCoincide(label, tipo) {
    var l = sinAcentos(label);
    var reglas = {
      bateria: function() { return /bater/.test(l); },
      pantalla: function() { return /(modulo|display|pantalla)/.test(l) && !/(vidrio|glass)/.test(l); },
      faceid: function() { return /(face\s*id|faceid)/.test(l); },
      camtras: function() { return /(camara|camera)/.test(l) && !/(frontal|front)/.test(l) && !/(vidrio|glass)/.test(l); },
      camfront: function() { return /(camara|camera)/.test(l) && /(frontal|front)/.test(l); },
      carcasa: function() { return /(carcasa|tapa|chasis|vidrio\s*trasero|back\s*glass)/.test(l); },
      vidriocam: function() { return /(vidrio|glass)/.test(l) && /(camara|camera)/.test(l); },
      botones: function() { return /(boton|flex)/.test(l) && /(power|volumen|boton)/.test(l); }
    };
    return reglas[tipo] ? reglas[tipo]() : false;
  }

  // Devuelve prioridad comercial. Un valor negativo descarta el repuesto.
  // No se elige simplemente el más barato: primero se respeta la calidad/tipo
  // que MaxPoint usa para presupuestar y recién después se compara el costo.
  function prioridadRepuesto(producto, tipo, objetivo) {
    var texto = sinAcentos([producto.label, producto.tipo].filter(Boolean).join(' '));
    var gen = Number(objetivo.generacion || 0);

    if (tipo === 'pantalla') {
      if (!/(oled)/.test(texto) || !/(^|\W)ic(\W|$)/.test(texto)) return -1;
      if (/(incell|in cell|lcd|tft|gx|soft oled|hard oled)/.test(texto)) return -1;
      return 100;
    }
    if (tipo === 'bateria') {
      if (!/ampsentrix/.test(texto) || /(con\s*flex|flex\s*incluido)/.test(texto)) return -1;
      return /sin\s*flex/.test(texto) ? 110 : 100;
    }
    if (tipo === 'carcasa') {
      if (gen >= 14) {
        if (!/(vidrio|glass|tapa)/.test(texto) || !/chapa/.test(texto)) return -1;
        return 100;
      }
      if (!/(carcasa|housing|chasis)/.test(texto) || /(con\s*flex|flex\s*incluido)/.test(texto)) return -1;
      return /sin\s*flex/.test(texto) ? 110 : 100;
    }
    return tipoCoincide(texto, tipo) ? 50 : -1;
  }

  function costoCatalogo(catalogo, modelo, tipo, redondeo) {
    var objetivo = datosModelo(modelo); if (!objetivo) return null;
    var candidatos = (catalogo || []).filter(function(p) {
      var d = datosModelo(p.label);
      return d && d.generacion === objetivo.generacion && d.variante === objetivo.variante
        && tipoCoincide([p.label, p.tipo].filter(Boolean).join(' '), tipo) && Number(p.costo_usd) > 0;
    }).map(function(p) {
      return { costo:Number(p.costo_usd), prioridad:prioridadRepuesto(p, tipo, objetivo) };
    }).filter(function(p) { return p.prioridad >= 0; });
    if (!candidatos.length) return null;
    candidatos.sort(function(a, b) { return b.prioridad - a.prioridad || a.costo - b.costo; });
    var costo = candidatos[0].costo;
    return redondeo === 'sin_redondeo' ? costo : Math.round(costo);
  }

  function calcular(entrada) {
    var cfg = config(entrada.config), modelo = entrada.modelo || '';
    var detalles = [], revision = [];
    function descuento(lbl, usd) { if (Number(usd) > 0) detalles.push({ lbl:lbl, usd:Number(usd) }); }
    function falta(lbl, fallback, usarSiempre) {
      if ((usarSiempre || cfg.sinCoincidencia === 'usar_fallback') && Number(fallback) > 0) descuento(lbl + ' (configurado)', fallback);
      else revision.push(lbl);
    }
    function catalogoO(tipo, lbl, fallback, usarSiempre) {
      var costo = costoCatalogo(entrada.catalogo, modelo, tipo, cfg.redondeo);
      if (costo != null) descuento(lbl, costo); else falta(lbl, fallback, usarSiempre);
    }

    if (Number(entrada.bateria) < cfg.bateria.umbral) catalogoO('bateria', 'Batería', cfg.bateria.fallbackUsd, true);
    if (entrada.estetica === 'leve') descuento('Estética — detalles leves', cfg.estetica.leveUsd);
    if (entrada.estetica === 'marcado') descuento('Estética — muy marcada', cfg.estetica.marcadaUsd);
    if (entrada.pantalla === 'rota') catalogoO('pantalla', 'Pantalla', cfg.pantalla.fallbackUsd);

    var p = entrada.problemas || {}, d = datosModelo(modelo) || { variante:'' }, esPro = d.variante.indexOf('pro') === 0;
    if (p.faceid && p.faceid !== 'ok') catalogoO('faceid', 'Face ID', cfg.fallas.faceIdFallbackUsd, true);
    if (p.camtras && p.camtras !== 'ok') catalogoO('camtras', 'Cámara trasera', esPro ? cfg.fallas.camaraTraseraProUsd : cfg.fallas.camaraTraseraNormalUsd, true);
    if (p.camfront && p.camfront !== 'ok') catalogoO('camfront', 'Cámara frontal', 0);
    if (p.carcasa && p.carcasa !== 'ok') catalogoO('carcasa', 'Carcasa', 0);
    if (p.vidriocam && p.vidriocam !== 'ok') catalogoO('vidriocam', 'Vidrio de cámara', cfg.fallas.vidrioCamaraUsd, true);
    if (p.botones && p.botones !== 'ok') catalogoO('botones', 'Botones', cfg.fallas.botonesUsd, true);
    if (p.pieza && p.pieza !== 'ok') descuento('Pieza desconocida' + (entrada.piezaDescripcion ? ': ' + entrada.piezaDescripcion : ''), cfg.fallas.piezaDesconocidaUsd);
    (entrada.extras || []).forEach(function(e) { descuento(e.lbl || 'Descuento', e.usd); });

    var totalDescuentos = detalles.reduce(function(s, x) { return s + x.usd; }, 0);
    var total = Math.max(cfg.totalMinimoUsd, Number(entrada.base || 0) - totalDescuentos);
    if (cfg.redondeo !== 'sin_redondeo') total = Math.round(total);
    return { total:total, totalDescuentos:totalDescuentos, descuentos:detalles, requiereRevision:revision.length > 0, revision:revision };
  }

  global.MAXPOINT_COTIZADOR = {
    defaults: DEFAULTS,
    config: config,
    datosModelo: datosModelo,
    modeloClave: modeloClave,
    etiquetaModelo: etiquetaModelo,
    consolidar: consolidar,
    costoCatalogo: costoCatalogo,
    calcular: calcular
  };
})(window);
