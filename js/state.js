// ===================== ESTADO GLOBAL =====================
// Una sola fuente de verdad. Todos los otros módulos leen/escriben aquí.

var REPS = [];        // Array de reparaciones (desde Firebase)
var RPUS = [];        // Array de repuestos (desde Firebase)

var VIEW    = 'reps'; // Vista activa
var SEARCH  = '';     // Texto de búsqueda
var FILT    = '';     // Filtro de estado
var PAGE    = 1;
var PZ      = 50;     // Registros por página

// IDs de operaciones en curso
var _eid      = null;        // ID de reparación en edición
var _detId    = null;        // ID de detalle abierto (para auto-refresh)
var _recId    = null;        // ID de recibo abierto
var _pagoId   = null;        // ID de reparación con pago pendiente
var _pagoMedio = 'Efectivo'; // Medio de pago seleccionado
var _sugg     = null;        // Repuesto sugerido pendiente { nombre, equipo }
var _afterRpu = null;        // Acción post-guardado de repuesto

var PIN = '4354'; // ← CAMBIAR antes de usar

// ===================== CATALOGO =====================
var CATALOGO   = [];   // productos del proveedor (desde Firebase)
var USADOS     = [];   // equipos usados para cotizar
var VENTAS     = [];   // registro de ventas
var STOCK      = [];   // stock de equipos
var PRODUCTOS_POS = []; // catalogo comercial POS (productos y servicios)
var MOVIMIENTOS_STOCK_POS = []; // trazabilidad del inventario POS
var MOVIMIENTOS_FINANCIEROS_POS = []; // libro operativo de Caja
var MOVIMIENTOS_FINANCIEROS_ADMIN = []; // ventana administrativa ampliada
var PAGOS_ADMIN = []; // cobros estructurados; no se suman a ventas ni movimientos
var PAGOS_ADMIN_LIMITADO = false;
var MOVIMIENTOS_ADMIN_LIMITADO = false;
var CAJA_ACTUAL = null;
var CIERRES_CAJA = [];
var SERVICIOS_MAESTROS = [];
var POLITICAS_REPARACION = {};
var SERVICIOS_CARGANDO = true;
var SERVICIOS_ERROR = '';
var CIERRES_CAJA_CARGANDO = true;
var CIERRES_CAJA_ERROR = '';
var COM_LIQUIDACIONES = []; // liquidaciones mensuales de comisiones
var COM_AJUSTES = []; // ajustes aprobables para períodos posteriores
var CAT_CONFIG = { usd: 1425, mult: 3, descuento: 0 };
var COTIZADOR_CFG = window.MAXPOINT_COTIZADOR ? window.MAXPOINT_COTIZADOR.config({}) : {};
var SEGUIMIENTOS_CFG = {activo:false,beneficio:''};
var PORTAL_CLIENTE_CFG = { whatsapp:'', googleReviewUrl:'', ofertas:[], destacados:[] };

// ===================== SESION Y PERMISOS =====================
// El perfil se completa desde Firebase Authentication + usuarios/{uid}.
var SESION = { usuario: null, perfil: null, cargando: true };
var MONEDA_CFG = { blueVenta: 0, fuente: 'Blue Venta', updated: '' };
var PERMISOS_BASE = {
  ver_balance: ['administrador'],
  ver_costos: ['administrador'],
  editar_costos: ['administrador'],
  gestionar_repuestos: ['administrador', 'tecnico', 'recepcionista'],
  gestionar_seguimientos: ['administrador', 'tecnico', 'recepcionista'],
  actualizar_catalogo: ['administrador'],
  importar_reparaciones: ['administrador'],
  editar_finanzas_ventas: ['administrador'],
  editar_reparacion: ['administrador', 'tecnico', 'recepcionista'],
  eliminar_operaciones: ['administrador'],
  reasignar_reparacion_terminada: ['administrador'],
  crear_usuario: ['administrador'],
  actualizar_cotizador: ['administrador'],
  editar_tipo_cambio: ['administrador'],
  gestionar_comisiones: ['administrador'],
  resolver_incidencias: ['administrador'],
  gestionar_productos: ['administrador'],
  ajustar_stock_pos: ['administrador', 'tecnico'],
  anular_venta_pos: ['administrador'],
  operar_caja: ['administrador', 'tecnico', 'recepcionista'],
  registrar_movimiento_caja: ['administrador', 'tecnico', 'recepcionista'],
  cobrar_reparacion: ['administrador', 'tecnico', 'recepcionista'],
  vender_accesorios: ['administrador', 'tecnico', 'recepcionista'],
  gestionar_stock_equipos: ['administrador', 'tecnico'],
  vender_equipo: ['administrador', 'tecnico', 'recepcionista'],
  ver_ventas_equipos: ['administrador', 'tecnico'],
  editar_ventas_equipos: ['administrador', 'tecnico'],
  ver_cierres_caja: ['administrador'],
  gestionar_servicios_maestros: ['administrador']
  ,gestionar_portal_cliente: ['administrador']
};

function sesionActiva() {
  return !!(SESION && SESION.usuario && SESION.perfil && SESION.perfil.activo !== false)
    && (typeof window.validarVigenciaSesion !== 'function' || window.validarVigenciaSesion());
}

function usuarioActualRegistro() {
  if (!sesionActiva()) return null;
  return {
    uid: SESION.usuario.uid,
    nombre: SESION.perfil.nombre || SESION.usuario.email || 'Usuario',
    email: SESION.perfil.email || SESION.usuario.email || '',
    rol: SESION.perfil.rol || ''
  };
}

var PERMISOS_ROLES = {};
var PERMISOS_ESTADO = "pendiente";
var ASISTENCIAS_TECNICOS = [];
var EQUIPO_USUARIOS = [];
var EQUIPO_USUARIOS_ESTADO = "pendiente";
function esAdministrador() {
  var rol = String(SESION && SESION.perfil && SESION.perfil.rol || "").trim().toLowerCase();
  return sesionActiva() && (rol === "administrador" || rol === "admin");
}

function puede(permiso) {
  var roles = PERMISOS_BASE[permiso] || [];
  // Compatibilidad con perfiles creados antes de normalizar el rol.
  var rol = String(SESION && SESION.perfil && SESION.perfil.rol || '').trim().toLowerCase();
  if (rol === 'admin') rol = 'administrador';
  if (rol === 'técnico') rol = 'tecnico';
  if (!sesionActiva() || ['administrador','tecnico','recepcionista'].indexOf(rol) === -1 || !Object.prototype.hasOwnProperty.call(PERMISOS_BASE,permiso)) return false;
  if (rol !== 'administrador' && PERMISOS_ESTADO !== 'listo') return false;
  if (rol !== 'administrador' && PERMISOS_ROLES[permiso] && typeof PERMISOS_ROLES[permiso][rol] === 'boolean') return PERMISOS_ROLES[permiso][rol];
  return roles.indexOf(rol) !== -1;
}

// ===================== FIREBASE OBJECT =====================
// Este objeto es sobreescrito por js/firebase.js una vez que
// el módulo ES carga. Así el código regular puede llamar FB.add()
// sin importar si Firebase ya cargó o no.
window.FB = {
  add:   function(d, cb)      { cb('Firebase no conectado todavía'); },
  addId: function(id, d, cb)  { cb('Firebase no conectado todavía'); },
  upd:   function(id, d, cb)  { cb('Firebase no conectado todavía'); },
  del:   function(id, cb)     { cb('Firebase no conectado todavía'); },
  addR:  function(d, cb)      { cb('Firebase no conectado todavía'); },
  updR:  function(id, d, cb)  { cb('Firebase no conectado todavía'); },
  delR:     function(id, cb)     { cb('Firebase no conectado todavía'); },
  setCat:   function(items, cb)  { cb('Firebase no conectado todavía'); },
  setConfig:function(d, cb)      { cb('Firebase no conectado todavía'); },
  setSeguimientosConfig:function(d, cb) { cb('Firebase no conectado todavía'); },
  setCotizadorConfig:function(d, cb) { cb('Firebase no conectado todavía'); },
  crearLiquidacionComision:function(d, cb) { cb('Firebase no conectado todavía'); },
  anularLiquidacionComision:function(id,motivo,cb){cb('Firebase no conectado todavía');},
  actualizarLiquidacionComision:function(id, d, cb) { cb('Firebase no conectado todavía'); },
  getConfig:function(cb)         { cb(null, {}); },
  guardarProductoPos:function(d, cb) { cb('Firebase no conectado todavía'); },
  ajustarStockPos:function(d, cb) { cb('Firebase no conectado todavía'); },
  crearVentaPos:function(d, cb) { cb('Firebase no conectado todavía'); },
  crearVentaEquipo:function(d, cb) { cb('Firebase no conectado todavía'); },
  completarReservaEquipo:function(id, d, cb) { cb('Firebase no conectado todavía'); },
  anularVentaEquipo:function(id, motivo, cb) { cb('Firebase no conectado todavía'); },
  anularVentaPos:function(id, motivo, cb) { cb('Firebase no conectado todavía'); },
  registrarCobroReparacion:function(id, pagos, cb) { cb('Firebase no conectado todavía'); },
  revertirCobroReparacion:function(id, pagoId, motivo, cb) { cb('Firebase no conectado todavía'); },
  abrirCaja:function(d, cb) { cb('Firebase no conectado todavía'); },
  movimientoManualCaja:function(d, cb) { cb('Firebase no conectado todavía'); },
  cerrarCaja:function(d, cb) { cb('Firebase no conectado todavía'); },
  cargarMovimientosCaja:function(id, cb) { cb('Firebase no conectado todavía'); },
  guardarServicioMaestro:function(d, cb) { cb('Firebase no conectado todavía'); },
  guardarServiciosMaestrosLote:function(items, cb) { cb('Firebase no conectado todavía'); },
  guardarPoliticasReparacion:function(d, cb) { cb('Firebase no conectado todavía'); },
  borrarListaMaestra:function(cb) { cb('Firebase no conectado todavía'); },
};

// ===================== CONSTANTES =====================
var ESTADOS = ['Ingresado', 'En proceso', 'Listo', 'Entregado', 'No aprobado', 'Garantia'];
var PAGOS   = ['Pendiente', 'Parcial', 'Pagado'];
var TECNICOS = ['', 'Tomas', 'Matias'];

var REGLAS_REPUESTO = [
  { palabras: ['pantalla','display','modulo','tactil','touch','lcd','vidrio'], rep: 'Modulo pantalla' },
  { palabras: ['bateria','carga lenta','no carga'],                            rep: 'Bateria' },
  { palabras: ['pin de carga','conector','puerto'],                            rep: 'Pin de carga' },
  { palabras: ['camara','foto'],                                               rep: 'Camara' },
  { palabras: ['auricular','parlante','altavoz','sonido','speaker','microfono'], rep: 'Altavoz/Microfono' },
  { palabras: ['flex','boton','power','volumen'],                              rep: 'Flex botones' },
  { palabras: ['carcasa','marco','chasis','tapa'],                             rep: 'Carcasa' },
  { palabras: ['placa','no enciende','no prende','no inicia','se apaga'],      rep: 'Reparacion de placa' },
];

// Resolver identidad solo cuando el nombre tiene una coincidencia única.
function equipoUidNombre(nombre) {
  function clave(n){return String(n||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ');}
  var buscado=clave(nombre);if(!buscado)return '';
  if(window.EQUIPO_USUARIOS_ESTADO!=="listo")return "";
  var usuarios=(window.EQUIPO_USUARIOS||[]).slice();
  var coincidencias=usuarios.filter(function(u){return clave(u.nombre)===buscado;});
  return coincidencias.length===1?coincidencias[0].uid:'';
}

function equipoUidSeleccionado(nombre,uid) {
  if(!uid)return equipoUidNombre(nombre);
  if(window.EQUIPO_USUARIOS_ESTADO!=='listo')throw new Error('Esperá a que carguen los usuarios del equipo');
  var usuario=(window.EQUIPO_USUARIOS||[]).find(function(u){return u.uid===uid;});
  function clave(n){return String(n||'').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,' ');}
  if(!usuario||clave(usuario.nombre)!==clave(nombre))throw new Error('El usuario seleccionado no coincide con el responsable');
  return uid;
}

// Una fecha comercial común para todos los dispositivos.
function fechaDiaSesion(ahora) {
  var partes = new Intl.DateTimeFormat('en-CA', {timeZone:'America/Argentina/Buenos_Aires',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date(ahora));
  function parte(tipo) { return partes.find(function(p) { return p.type === tipo; }).value; }
  return parte('year')+'-'+parte('month')+'-'+parte('day');
}
function registroSesionVigente(registro, uid, ahora) {
  return !!registro && registro.uid === uid && registro.dia === fechaDiaSesion(ahora)
    && Number.isFinite(registro.actividad) && registro.actividad <= ahora && ahora-registro.actividad < 60*60*1000;
}
