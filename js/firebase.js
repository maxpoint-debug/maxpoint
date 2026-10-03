// ===================== FIREBASE MODULE =====================
// ES module — corre despues de que los scripts regulares definieron window.FB.
// Sobreescribe los metodos de window.FB con las funciones reales de Firestore.

import { initializeApp, deleteApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, setPersistence, browserLocalPersistence, onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword, sendPasswordResetEmail, updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  setDoc,
  getDoc,
  getDocs,
  getDocsFromServer,
  getDocFromServer,
  increment,
  writeBatch,
  onSnapshot as observarFirestore,
  query,
  where,
  orderBy,
  limit,
  runTransaction,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey:            'AIzaSyCw76jqobNfGKt4aH7ygv4iVz9ZAHxTiko',
  authDomain:        'maxpoint-taller.firebaseapp.com',
  projectId:         'maxpoint-taller',
  storageBucket:     'maxpoint-taller.firebasestorage.app',
  messagingSenderId: '591043101786',
  appId:             '1:591043101786:web:b18f78627738a22d008463',
};
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

const db  = getFirestore(app);
const onSnapshot = observarFirestore;
const cR   = collection(db, 'reparaciones');
const cRp  = collection(db, 'repuestos');
const cCat = collection(db, 'catalogo');
const cUsa = collection(db, 'usados');
const cVen = collection(db, 'ventas');
const cSt  = collection(db, 'stock');
const dCfg  = doc(db, 'config', 'catalogo');
const dCom  = doc(db, 'config', 'comisiones');
const dCot  = doc(db, 'config', 'cotizador');

// V2.1 — entidades base. Conviven con las colecciones actuales.
const cCli = collection(db, 'clientes');
const cEq  = collection(db, 'equipos');
const cMov = collection(db, 'movimientos');
const cUsr = collection(db, 'usuarios');
const cAud = collection(db, 'auditoria');
const cFx  = collection(db, 'tiposCambio');
const cLiq = collection(db, 'liquidacionesComisiones');
const cAj  = collection(db, 'ajustesComisiones');
const cNot = collection(db, 'notificaciones');
const dMon = doc(db, 'config', 'moneda');
// POS V1. Colecciones incrementales; ventas convive con documentos legacy.
const cPro = collection(db, 'productos');
const cMovSt = collection(db, 'movimientosStock');
const cPagPos = collection(db, 'pagos');
const cMovFin = collection(db, 'movimientosFinancieros');
const dContVentas = doc(db, 'contadores', 'ventas');
const cCajas = collection(db, 'cajas');
const dCajaActual = doc(db, 'config', 'cajaActual');
const cServicios = collection(db, 'serviciosMaestros');
const dPoliticasRep = doc(db, 'config', 'politicasReparacion');
const dPortalCliente = doc(db, 'config', 'portalCliente');

let authModo = 'login', bootstrapDisponible = false, ingresoExplicito = false;
const CLAVE_SESION_DIARIA = 'maxpoint_sesion_diaria_v1';
let sesionDiariaMemoria = null, cerrandoPorVencimiento = false;
function leerSesionDiaria() {
  try { return JSON.parse(localStorage.getItem(CLAVE_SESION_DIARIA)); } catch(e) { return sesionDiariaMemoria; }
}
function escribirSesionDiaria(registro) {
  sesionDiariaMemoria = registro;
  try { localStorage.setItem(CLAVE_SESION_DIARIA, JSON.stringify(registro)); } catch(e) {}
}
function vencerSesionDiaria() {
  if (cerrandoPorVencimiento) return;
  cerrandoPorVencimiento = true; escribirSesionDiaria(null); SESION.perfil = null; authUiLogin();
  signOut(auth).finally(function() { cerrandoPorVencimiento = false; authMensaje('La sesión venció. Volvé a ingresar.'); });
}
window.validarVigenciaSesion = function() {
  return !!auth.currentUser && registroSesionVigente(leerSesionDiaria(),auth.currentUser.uid,Date.now());
};
function revisarSesionDiaria(actividad) {
  if (!auth.currentUser || !SESION.usuario || !SESION.perfil || cerrandoPorVencimiento) return;
  const ahora = Date.now(), registro = leerSesionDiaria();
  if (!registroSesionVigente(registro,auth.currentUser.uid,ahora)) { vencerSesionDiaria(); return; }
  if (actividad) { registro.actividad = ahora; escribirSesionDiaria(registro); }
}
['pointerdown','keydown','scroll','touchstart'].forEach(function(evento) {
  document.addEventListener(evento,function(e) { revisarSesionDiaria(e.isTrusted); },{passive:true,capture:true});
});
let ultimoMovimientoSesion = 0;
document.addEventListener('pointermove',function(e) {
  if (e.isTrusted && Date.now()-ultimoMovimientoSesion > 1000) { ultimoMovimientoSesion=Date.now(); revisarSesionDiaria(true); }
},{passive:true});
window.addEventListener('focus',function() { revisarSesionDiaria(false); });
document.addEventListener('visibilitychange',function() { revisarSesionDiaria(false); });
window.addEventListener('storage',function(e) { if(e.key === CLAVE_SESION_DIARIA) revisarSesionDiaria(false); });
setInterval(function() { revisarSesionDiaria(false); },1000);
async function registrarDiaSesion(user, perfil) {
  const fecha = fechaDiaSesion(Date.now()), ref = doc(db,'sesionesDiarias',user.uid+'_'+fecha);
  await runTransaction(db,async function(tx) {
    const previo = await tx.get(ref);
    if (!previo.exists()) tx.set(ref,{uid:user.uid,nombre:perfil.nombre || user.email || 'Usuario',rol:perfil.rol,fecha:fecha,primerIngreso:serverTimestamp()});
  });
  EQUIPO_ASISTENCIA_ESTADO = 'pendiente';
  if (VIEW === 'equipoAdmin' && esAdministrador()) renderEquipoAdmin();
}
async function asegurarDiaSesion(user, perfil, avisar) {
  if (!sesionActiva() || !auth.currentUser || auth.currentUser.uid !== user.uid) return;
  try { await registrarDiaSesion(user,perfil); }
  catch(e) {
    if (avisar) toast('No se pudo registrar el día de ingreso. Se reintentará: '+e.message,'var(--rd)');
    setTimeout(function() { asegurarDiaSesion(user,perfil,false); },30000);
  }
}
let detenerNotificaciones = null;
function authMensaje(msg, color) { const e = document.getElementById('authErr'); if (e) { e.textContent = msg || ''; e.style.color = color || 'var(--rd)'; } }
function authError(msg) { authMensaje(msg, 'var(--rd)'); }
function authUiSesion() {
  if (!sesionActiva()) { authUiLogin(); return; }
  const shell = document.getElementById('appShell'); if (shell) shell.style.display = 'flex';
  const gate = document.getElementById('authGate'); if (gate) gate.style.display = 'none';
  const nav = document.getElementById('nav-users'); if (nav) nav.style.display = puede('crear_usuario') ? '' : 'none';
  const bal = document.getElementById('nav-balance'); if (bal) bal.style.display = 'none';
  const ventasEquipos = document.getElementById('nav-ventas-equipos'); if (ventasEquipos) ventasEquipos.style.display = puede('ver_ventas_equipos') ? '' : 'none';
  const cierresCaja = document.getElementById('nav-cierres-caja'); if (cierresCaja) cierresCaja.style.display = puede('ver_cierres_caja') ? '' : 'none';
  const adminDashboard = document.getElementById('nav-admin-dashboard'); if (adminDashboard) adminDashboard.style.display = puede('ver_balance') ? '' : 'none';
  const serviciosNav = document.getElementById('nav-servicios-maestros'); if (serviciosNav) serviciosNav.style.display = puede('gestionar_servicios_maestros') ? '' : 'none';
  const portalNav = document.getElementById('nav-portal-cliente'); if (portalNav) portalNav.style.display = puede('gestionar_portal_cliente') ? '' : 'none';
  const resumen = document.getElementById('financeSummary'); if (resumen) resumen.style.display = puede('ver_balance') ? '' : 'none';
  const info = document.getElementById('sesionInfo');
  if (info && SESION.perfil) info.textContent = SESION.perfil.nombre + ' · ' + SESION.perfil.rol;
}
function authUiLogin() {
  const shell = document.getElementById('appShell'); if (shell) shell.style.display = 'none';
  const gate = document.getElementById('authGate'); if (gate) gate.style.display = 'flex';
  const nav = document.getElementById('nav-users'); if (nav) nav.style.display = 'none';
  const ventasEquipos = document.getElementById('nav-ventas-equipos'); if (ventasEquipos) ventasEquipos.style.display = 'none';
  const cierresCaja = document.getElementById('nav-cierres-caja'); if (cierresCaja) cierresCaja.style.display = 'none';
  const adminDashboard = document.getElementById('nav-admin-dashboard'); if (adminDashboard) adminDashboard.style.display = 'none';
  const serviciosNav = document.getElementById('nav-servicios-maestros'); if (serviciosNav) serviciosNav.style.display = 'none';
  const portalNav = document.getElementById('nav-portal-cliente'); if (portalNav) portalNav.style.display = 'none';
}
async function verificarBootstrap() {
  try { bootstrapDisponible = (await getDocs(query(cUsr, limit(1)))).empty; }
  catch (e) { bootstrapDisponible = false; }
  const b = document.getElementById('authBootstrap'); if (b) b.style.display = bootstrapDisponible ? '' : 'none';
}
window.authMostrarLogin = function() {
  authModo = 'login'; authError('');
  document.getElementById('authTitle').textContent = 'Ingresar al sistema';
  document.getElementById('authNombreWrap').style.display = 'none';
  document.getElementById('authSubmit').textContent = 'Ingresar';
  document.getElementById('authRecuperar').style.display = '';
  document.getElementById('authVolver').style.display = 'none'; verificarBootstrap();
};
window.authMostrarBootstrap = function() {
  if (!bootstrapDisponible) return;
  authModo = 'bootstrap'; authError('');
  document.getElementById('authTitle').textContent = 'Crear primer administrador';
  document.getElementById('authNombreWrap').style.display = '';
  document.getElementById('authSubmit').textContent = 'Crear administrador';
  document.getElementById('authRecuperar').style.display = 'none';
  document.getElementById('authBootstrap').style.display = 'none';
  document.getElementById('authVolver').style.display = '';
};
window.authEnviar = async function() {
  const email = document.getElementById('authEmail').value.trim();
  const pass = document.getElementById('authPass').value;
  const nombre = document.getElementById('authNombre').value.trim();
  if (!email || !pass || (authModo === 'bootstrap' && !nombre)) { authError('Completá los datos requeridos.'); return; }
  authError('');
  ingresoExplicito = true;
  try {
    if (authModo === 'bootstrap') {
      if (!bootstrapDisponible) throw new Error('El administrador inicial ya fue creado.');
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      await setDoc(doc(cUsr, cred.user.uid), { uid: cred.user.uid, nombre: nombre, email: email, rol: 'administrador', activo: true, createdAt: serverTimestamp() });
    } else await signInWithEmailAndPassword(auth, email, pass);
  } catch (e) { ingresoExplicito = false; authError(e.message || 'No se pudo iniciar sesión.'); }
};
window.authTecla = function(e, input) {
  var visibles = ['authNombre', 'authEmail', 'authPass'].map(function(id) { return document.getElementById(id); })
    .filter(function(campo) { return campo && campo.offsetParent !== null; });
  var indice = visibles.indexOf(input);
  if (e.key === 'Enter') {
    e.preventDefault();
    if (indice < visibles.length - 1) visibles[indice + 1].focus();
    else window.authEnviar();
  } else if (e.key === 'ArrowDown' && indice < visibles.length - 1) {
    e.preventDefault(); visibles[indice + 1].focus();
  } else if (e.key === 'ArrowUp' && indice > 0) {
    e.preventDefault(); visibles[indice - 1].focus();
  }
};
window.authSalir = function() { escribirSesionDiaria(null); signOut(auth); };
window.authRecuperarClave = async function() {
  const email = document.getElementById('authEmail').value.trim();
  if (!email) { authError('Ingresá tu email para recibir el enlace.'); return; }
  const boton = document.getElementById('authRecuperar');
  if (boton) { boton.disabled = true; boton.textContent = 'Enviando…'; }
  try { await sendPasswordResetEmail(auth, email); authMensaje('Si existe una cuenta para este email, enviamos el enlace de recuperación.', 'var(--gr)'); }
  catch (e) { authError(e.message || 'No se pudo enviar el enlace.'); }
  finally { if (boton) { boton.disabled = false; boton.textContent = 'Olvidé mi contraseña'; } }
};
window.openPerfil = function() {
  if (!SESION.usuario || !SESION.perfil) return;
  setVal('pfNombre', SESION.perfil.nombre || ''); setVal('pfEmail', SESION.perfil.email || SESION.usuario.email || '');
  ['pfActual','pfNueva','pfNueva2'].forEach(function(id) { setVal(id, ''); }); openM('mPerfil');
};
window.authCambiarClave = async function() {
  const actual = val('pfActual'), nueva = val('pfNueva'), repetir = val('pfNueva2');
  if (!actual || !nueva || !repetir) { toast('Completá los tres campos de contraseña', 'var(--rd)'); return; }
  if (nueva !== repetir) { toast('Las nuevas contraseñas no coinciden', 'var(--rd)'); return; }
  if (nueva.length < 6) { toast('La nueva contraseña debe tener al menos 6 caracteres', 'var(--rd)'); return; }
  try {
    await reauthenticateWithCredential(auth.currentUser, EmailAuthProvider.credential(auth.currentUser.email, actual));
    await updatePassword(auth.currentUser, nueva);
    closeM('mPerfil'); toast('Contraseña actualizada');
  } catch (e) { toast('No se pudo cambiar la contraseña: ' + e.message, 'var(--rd)'); }
};

window.renderUsuarios = async function() {
  if (!puede('crear_usuario')) { toast('Sin permiso para administrar usuarios', 'var(--rd)'); return; }
  const cnt = document.getElementById('cnt');
  cnt.innerHTML = '<div class="card" style="max-width:760px"><div class="ct">Usuarios</div><div class="mu" style="margin-bottom:16px">Alta de cuentas y roles del sistema.</div><div class="fgrid"><div class="f"><label>Nombre</label><input id="usrNom"/></div><div class="f"><label>Email</label><input id="usrEmail" type="email"/></div><div class="f"><label>Contraseña temporal</label><input id="usrPass" type="password"/></div><div class="f"><label>Rol</label><select id="usrRol"><option value="tecnico">Técnico</option><option value="recepcionista">Recepcionista</option><option value="administrador">Administrador</option></select></div></div><div class="fa"><button class="btn btn-p" onclick="authCrearUsuario()">Crear usuario</button></div><div id="usrLista" style="margin-top:18px"></div></div>';
  try {
    const snap = await getDocs(cUsr);
    const lista = snap.docs.map(d => d.data()).sort((a,b) => String(a.nombre || '').localeCompare(String(b.nombre || '')));
    document.getElementById('usrLista').innerHTML = lista.length ? lista.map(u => '<div style="padding:9px 0;border-top:1px solid var(--bd)"><b>' + esc(u.nombre || '') + '</b><span class="mu"> · ' + esc(u.email || '') + ' · ' + esc(u.rol || '') + (u.activo === false ? ' · inactivo' : '') + '</span></div>').join('') : '<div class="mu">Todavía no hay usuarios.</div>';
  } catch (e) { document.getElementById('usrLista').textContent = 'No se pudieron cargar los usuarios: ' + e.message; }
};
window.authCrearUsuario = async function() {
  if (!puede('crear_usuario')) { toast('Sin permiso para crear usuarios', 'var(--rd)'); return; }
  const nombre = document.getElementById('usrNom').value.trim(), email = document.getElementById('usrEmail').value.trim(), pass = document.getElementById('usrPass').value, rol = document.getElementById('usrRol').value;
  if (['administrador','tecnico','recepcionista'].indexOf(rol) === -1) { toast('Rol inválido','var(--rd)'); return; }
  if (!nombre || !email || !pass) { toast('Completá nombre, email y contraseña', 'var(--rd)'); return; }
  const provision = initializeApp(firebaseConfig, 'provision_' + Date.now());
  try {
    const cred = await createUserWithEmailAndPassword(getAuth(provision), email, pass);
    await setDoc(doc(cUsr, cred.user.uid), { uid: cred.user.uid, nombre: nombre, email: email, rol: rol, activo: true, createdAt: serverTimestamp() });
    await registrarAuditoria('usuario', cred.user.uid, 'creado', {}, { nombre: nombre, email: email, rol: rol, activo: true });
    await signOut(getAuth(provision)); await deleteApp(provision);
    toast('Usuario creado'); window.renderUsuarios();
  } catch (e) { await deleteApp(provision); toast('Error creando usuario: ' + e.message, 'var(--rd)'); }
};

setPersistence(auth, browserLocalPersistence).catch(function() {});
let revisionSesion = 0, detenerPermisosRoles = null;
function iniciarPermisosRoles() {
  if(detenerPermisosRoles) detenerPermisosRoles();
  PERMISOS_ROLES={}; PERMISOS_ESTADO="pendiente";
  detenerPermisosRoles=onSnapshot(doc(db,"config","permisosRoles"),function(snap) {
    PERMISOS_ROLES=(snap.data() || {}).permisos || {}; PERMISOS_ESTADO="listo";
    if(sesionActiva()) { authUiSesion(); render(); reanudarPortalPendiente(); }
  },function(err) {
    PERMISOS_ROLES={}; PERMISOS_ESTADO="error";
    if(sesionActiva()) { authUiSesion(); render(); toast("No se pudieron cargar los permisos: "+err.message,"var(--rd)"); }
  });
}
onAuthStateChanged(auth, async function(user) {
  const revisionActual = ++revisionSesion;
  detenerListenersInternos();
  if(detenerPermisosRoles) { detenerPermisosRoles(); detenerPermisosRoles=null; }
  PERMISOS_ROLES={}; PERMISOS_ESTADO="pendiente";
  if (detenerNotificaciones) { detenerNotificaciones(); detenerNotificaciones = null; }
  SESION.usuario = user || null; SESION.perfil = null; SESION.cargando = true;
  if (!user) {
    ASISTENCIAS_TECNICOS = [];
    EQUIPO_ASISTENCIA_ESTADO = 'pendiente';
    window.NOTIFICACIONES = [];
    if (typeof window.notificacionesRender === 'function') window.notificacionesRender();
    SESION.cargando = false; authUiLogin(); authMostrarLogin(); return;
  }
  try {
    const perfil = (await getDoc(doc(cUsr, user.uid))).data();
    if (revisionActual !== revisionSesion || !auth.currentUser || auth.currentUser.uid !== user.uid) return;
    if (!perfil || perfil.activo === false) throw new Error(!perfil ? 'Tu cuenta no tiene un perfil habilitado.' : 'Tu usuario está inactivo.');
    if (!['administrador','admin','tecnico','técnico','recepcionista'].includes(String(perfil.rol || '').toLowerCase())) throw new Error('Tu cuenta no tiene un rol habilitado.');
    const ahora = Date.now();
    if (ingresoExplicito) {
      ingresoExplicito = false;
      escribirSesionDiaria({uid:user.uid,dia:fechaDiaSesion(ahora),actividad:ahora});
    }
    if (!registroSesionVigente(leerSesionDiaria(),user.uid,ahora)) { SESION.cargando=false; vencerSesionDiaria(); return; }
    SESION.perfil = perfil; SESION.cargando = false; iniciarPermisosRoles(); iniciarListenersInternos(); authUiSesion(); iniciarNotificaciones(user.uid);
    await asegurarDiaSesion(user,perfil,true);
  } catch (e) {
    if (revisionActual !== revisionSesion) return;
    SESION.cargando = false; authUiLogin(); authError(e.message || 'No se pudo validar la sesión.'); await signOut(auth);
  }
});

function iniciarNotificaciones(uid) {
  if (detenerNotificaciones) { detenerNotificaciones(); detenerNotificaciones = null; }
  if (!uid || !sesionActiva()) return;
  // Se ordena localmente para no exigir un índice compuesto sólo para la V1.
  detenerNotificaciones = onSnapshot(query(cNot, where('usuarioDestinoUid', '==', uid)), function(snap) {
    if (!SESION.usuario || SESION.usuario.uid !== uid) return;
    window.NOTIFICACIONES = snap.docs.map(function(d) { return Object.assign({ id:d.id }, d.data()); }).sort(function(a, b) {
      var ta = a.creadaEn && a.creadaEn.toMillis ? a.creadaEn.toMillis() : 0;
      var tb = b.creadaEn && b.creadaEn.toMillis ? b.creadaEn.toMillis() : 0;
      return tb - ta;
    });
    if (typeof window.notificacionesRender === 'function') window.notificacionesRender();
  }, function(err) { console.warn('Notificaciones:', err.message); });
}

function normKey(v) {
  return String(v || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
}
function phoneKey(v) { return String(v || '').replace(/\D/g, ''); }
function conTelefonoClave(data) {
  var salida = Object.assign({}, data || {});
  if (Object.prototype.hasOwnProperty.call(salida, 'telefono')) salida.telefonoClave = phoneKey(salida.telefono);
  return salida;
}
function safeId(prefix, key) { return prefix + '_' + (key || Math.random().toString(36).slice(2, 12)).slice(0, 80); }

// Normaliza los campos V1 sin modificar los documentos de origen.
// En reparaciones, `equipo` es el modelo comercial y `modelo` es IMEI/serie.
function v22DatosEquipo(data, origen) {
  return {
    imei: origen === 'reparacion' ? (data.modelo || '') : (data.imei || ''),
    modelo: origen === 'reparacion' ? (data.equipo || '') : (data.modelo || data.equipo || ''),
    capacidad: data.capacidad || '',
    color: data.color || '',
    estadoActual: data.estado || '',
  };
}

async function v22Upsert(ref, data) {
  const previo = await getDoc(ref);
  const meta = { schemaVersion: 2, updatedAt: serverTimestamp() };
  if (!previo.exists() || !previo.data().createdAt) meta.createdAt = serverTimestamp();
  await setDoc(ref, Object.assign({}, data, meta), { merge: true });
}

async function v21Cliente(data) {
  const tel = phoneKey(data.telefono);
  const key = tel || normKey(data.nombre);
  if (!key) return null;
  const id = safeId('cli', key);
  await v22Upsert(doc(db, 'clientes', id), {
    nombre: data.nombre || '', telefono: data.telefono || '', dni: data.dni || '',
    direccion: data.direccion || '', email: data.email || ''
  });
  return id;
}

async function v21Equipo(data, origen, origenId, clienteId) {
  const equipo = v22DatosEquipo(data, origen);
  const imei = normKey(equipo.imei);
  const key = imei || normKey(origen + '_' + origenId);
  if (!key) return null;
  const id = safeId('eq', key);
  await v22Upsert(doc(db, 'equipos', id), Object.assign({}, equipo, {
    origen: origen, origenId: origenId, clienteId: clienteId || ''
  }));
  return id;
}

async function v21Movimiento(tipo, origen, origenId, data, extra) {
  await addDoc(cMov, {
    schemaVersion: 2,
    tipo: tipo, origen: origen, origenId: origenId,
    clienteId: (extra && extra.clienteId) || '', equipoId: (extra && extra.equipoId) || '',
    estado: data.estado || '', detalle: (extra && extra.detalle) || '',
    fecha: serverTimestamp(),
    createdAt: serverTimestamp()
  });
}

async function v21Sync(origen, origenId, data, tipo, extra) {
  if(origen==='reparacion')actualizarPortalEnSegundoPlano(origenId);
  try {
    // Las actualizaciones parciales usan el documento actual para conservar
    // clienteId y equipoId en cada movimiento V2.2.
    const col = origen === 'reparacion' ? 'reparaciones' : (origen === 'venta' ? 'ventas' : 'stock');
    const origenRef = doc(db, col, origenId);
    const previo = await getDoc(origenRef);
    const actual = previo.exists() ? previo.data() : {};
    const completo = Object.assign({}, actual, data);
    const tieneIdentidad = !!(completo.nombre || completo.telefono || completo.imei || completo.modelo || completo.equipo);
    let clienteId = actual.clienteId || null;
    let equipoId = actual.equipoId || null;
    if (tieneIdentidad) {
      clienteId = await v21Cliente(completo) || clienteId;
      equipoId = await v21Equipo(completo, origen, origenId, clienteId) || equipoId;
      const links = { _v2: 2 };
      if (clienteId) links.clienteId = clienteId;
      if (equipoId) links.equipoId = equipoId;
      await updateDoc(origenRef, links);
    }
    await v21Movimiento(tipo, origen, origenId, completo, { clienteId, equipoId, detalle: extra && extra.detalle });
  } catch (e) {
    // V2.1 nunca debe impedir la operacion principal de V1.
    console.warn('MaxPoint V2.1 sync:', e);
  }
}


// --- Auditoría centralizada de operaciones con datos ---
const CAMPOS_PRIVADOS = ['clave', 'pin', 'password', 'contrasena', 'contraseña'];
function valorAuditable(valor) {
  if (valor === undefined || valor === null || valor === '') return '—';
  if (Array.isArray(valor)) return valor.length + ' elemento(s)';
  if (typeof valor === 'object') return 'Actualizado';
  return String(valor).slice(0, 180);
}
function cambiosAuditables(antes, despues) {
  return Object.keys(despues || {}).filter(function(campo) {
    return campo.charAt(0) !== '_' && campo !== 'timeline' && CAMPOS_PRIVADOS.indexOf(campo.toLowerCase()) === -1
      && JSON.stringify((antes || {})[campo]) !== JSON.stringify(despues[campo]);
  }).map(function(campo) {
    return { campo: campo, antes: valorAuditable((antes || {})[campo]), despues: valorAuditable(despues[campo]) };
  });
}
async function registrarAuditoria(entidad, entidadId, accion, antes, despues) {
  var actor = usuarioActualRegistro();
  if (!actor) throw new Error('Sesión activa requerida para registrar cambios');
  await addDoc(cAud, {
    entidad: entidad, entidadId: entidadId, accion: accion, actor: actor,
    cambios: cambiosAuditables(antes, despues), fecha: hoy(), hora: horaActual(), creadoEn: serverTimestamp()
  });
}
async function agregarAuditable(coleccion, entidad, datos, id) {
  var actor = usuarioActualRegistro();
  if (!actor) throw new Error('Sesión activa requerida para guardar');
  var ref = id ? doc(db, coleccion, id) : doc(collection(db, coleccion));
  var batch = writeBatch(db);
  batch.set(ref, Object.assign({}, datos, { _ts: serverTimestamp() }));
  batch.set(doc(cAud), { entidad: entidad, entidadId: ref.id, accion: 'creado', actor: actor, cambios: [], fecha: hoy(), hora: horaActual(), creadoEn: serverTimestamp() });
  await batch.commit(); return ref.id;
}
async function actualizarAuditable(coleccion, entidad, id, datos) {
  var actor = usuarioActualRegistro();
  if (!actor) throw new Error('Sesión activa requerida para guardar');
  var ref = doc(db, coleccion, id), previo = await getDoc(ref);
  var batch = writeBatch(db);
  var existe = previo.exists(), anteriores = existe ? previo.data() : {};
  if (existe) batch.update(ref, Object.assign({}, datos, { _upd: serverTimestamp() }));
  else batch.set(ref, Object.assign({}, datos, { _ts: serverTimestamp() }));
  batch.set(doc(cAud), { entidad: entidad, entidadId: id, accion: existe ? 'actualizado' : 'creado', actor: actor, cambios: cambiosAuditables(anteriores, datos), fecha: hoy(), hora: horaActual(), creadoEn: serverTimestamp() });
  await batch.commit();
}
async function eliminarAuditable(coleccion, entidad, id) {
  var actor = usuarioActualRegistro();
  if (!actor) throw new Error('Sesión activa requerida para eliminar');
  var ref = doc(db, coleccion, id), previo = await getDoc(ref);
  var batch = writeBatch(db); batch.delete(ref);
  batch.set(doc(cAud), { entidad: entidad, entidadId: id, accion: 'eliminado', actor: actor, cambios: [], fecha: hoy(), hora: horaActual(), creadoEn: serverTimestamp() });
  await batch.commit();
}

// --- Notificaciones internas -------------------------------------------------
// Se persiste un documento por destinatario. La clave de evento determina la
// idempotencia: reintentar la misma transición no duplica avisos.
function notificacionId(clave, uid) { return safeId('not', normKey(clave + '_' + uid)); }
async function destinatariosNotificacion(reglas, reparacion) {
  var snap = await getDocs(cUsr);
  var usuarios = snap.docs.map(function(d) { return Object.assign({ uid:d.id }, d.data()); }).filter(function(u) { return u.activo !== false; });
  var salida = [];
  if (reglas.tecnico && reparacion && reparacion.tecnico) {
    // El campo legacy `tecnico` guarda nombre, no UID. Se normalizan acentos,
    // espacios y mayúsculas para resolver el perfil activo correspondiente.
    var tecnicoClave = normKey(reparacion.tecnico);
    usuarios.filter(function(u) { return tecnicoClave && normKey(u.nombre) === tecnicoClave; }).forEach(function(u) { salida.push(u); });
  }
  if (reglas.administradores) usuarios.filter(function(u) { return u.rol === 'administrador'; }).forEach(function(u) { salida.push(u); });
  if (reglas.recepcionistas) usuarios.filter(function(u) { return u.rol === 'recepcionista'; }).forEach(function(u) { salida.push(u); });
  var excluirUid = reglas.excluirUid || '';
  var vistos = {}; return salida.filter(function(u) { if (!u.uid || u.uid === excluirUid || vistos[u.uid]) return false; vistos[u.uid] = true; return true; });
}
async function crearNotificaciones(evento) {
  if (!evento || !evento.clave) return;
  var destinos = await destinatariosNotificacion(evento.destinos || {}, evento.reparacion);
  if (!destinos.length) throw new Error('No se encontró un usuario activo destinatario para esta notificación');
  await Promise.all(destinos.map(async function(u) {
    var ref = doc(cNot, notificacionId(evento.clave, u.uid));
    // La clave determinista conserva la lectura individual ante reintentos.
    await runTransaction(db, async function(tx) {
      if ((await tx.get(ref)).exists()) return;
      tx.set(ref, {
        tipo:evento.tipo, titulo:evento.titulo, mensaje:evento.mensaje,
        usuarioDestinoUid:u.uid, usuarioDestinoNombre:u.nombre || '', usuarioDestinoRol:u.rol || '',
        entidad:evento.entidad || 'reparacion', entidadId:evento.entidadId || '',
        prioridad:evento.prioridad === 'importante' ? 'importante' : 'normal', origen:evento.origen || 'sistema',
        leida:false, leidaEn:null, creadaEn:serverTimestamp(), creadaPor:usuarioActualRegistro() || null,
        eventoClave:evento.clave
      });
    });
  }));
}
function datosMensajeReparacion(r) { return (r.orden || 'Sin orden') + ' · ' + (r.equipo || 'Equipo') + ' · ' + (r.nombre || 'Cliente'); }
function dispararNotificacionReparacion(tipo, r, opciones) {
  if (!r || !r.id) return Promise.resolve();
  var cfg = {
    reparacion_asignada:{ titulo:'Nueva reparación asignada', prioridad:'normal', destinos:{ tecnico:true }, origen:'sistema', mensaje:'Te asignaron ' + datosMensajeReparacion(r) },
    presupuesto_aprobado:{ titulo:'Presupuesto aprobado', prioridad:'importante', destinos:{ tecnico:true, administradores:true }, origen:'portal_cliente', mensaje:(r.nombre || 'Cliente') + ' aprobó la reparación ' + (r.orden || '') + ' · ' + (r.equipo || '') },
    presupuesto_rechazado:{ titulo:'Presupuesto rechazado', prioridad:'importante', destinos:{ tecnico:true, administradores:true }, origen:'portal_cliente', mensaje:(r.nombre || 'Cliente') + ' rechazó la reparación ' + (r.orden || '') + ' · ' + (r.equipo || '') },
    cliente_viene_retirar:{ titulo:'Cliente viene a retirar', prioridad:'importante', destinos:{ administradores:true, recepcionistas:true }, origen:'portal_cliente', mensaje:(r.nombre || 'Cliente') + ' avisó que va a retirar ' + (r.orden || '') + ' · ' + (r.equipo || '') },
    garantia_nueva:{ titulo:'Nueva garantía', prioridad:'importante', destinos:{ tecnico:true, administradores:true }, origen:'sistema', mensaje:'Se abrió una garantía para ' + datosMensajeReparacion(r) },
    incidencia_nueva:{ titulo:'Nueva incidencia', prioridad:'importante', destinos:{ tecnico:true, administradores:true }, origen:'sistema', mensaje:'Se abrió una incidencia para ' + datosMensajeReparacion(r) }
  }[tipo];
  if (!cfg) return Promise.resolve();
  if (opciones && opciones.excluirUid) cfg.destinos.excluirUid = opciones.excluirUid;
  return crearNotificaciones(Object.assign(cfg, { tipo:tipo, reparacion:r, entidad:'reparacion', entidadId:r.id, clave:(opciones && opciones.clave) || (tipo + ':' + r.id) }));
}
function dispararNotificacionRepuesto(tipo, repuesto) {
  var vinculadas = (window.REPS || []).filter(function(r) { return repuesto && repuesto.orden && r.orden === repuesto.orden; });
  // La orden es el único enlace disponible; sólo se usa si es exacto y único.
  if (vinculadas.length !== 1) return Promise.resolve(false);
  var r = vinculadas[0], llego = tipo === 'repuesto_llego';
  return crearNotificaciones({
    tipo:tipo, titulo:llego ? 'Llegó un repuesto' : 'Repuesto encargado',
    mensaje:(llego ? 'Llegó ' : 'Se encargó ') + (repuesto.nombre || 'un repuesto') + ' para ' + (r.orden || ''),
    prioridad:llego ? 'importante' : 'normal', destinos:{ tecnico:true, administradores:true },
    entidad:'reparacion', entidadId:r.id, origen:'sistema', reparacion:r,
    clave:tipo + ':' + repuesto.id + ':' + Date.now()
  }).then(function() { return true; });
}
window.notificarEventoReparacion = function(tipo, reparacion, opciones) { return dispararNotificacionReparacion(tipo, reparacion, opciones).catch(function(e) { console.error('Notificación no creada:', e); toast('No se pudo crear la notificación: ' + e.message, 'var(--rd)'); return false; }); };
window.notificarEventoRepuesto = function(tipo, repuesto) { return dispararNotificacionRepuesto(tipo, repuesto).catch(function(e) { console.error('Notificación no creada:', e); toast('No se pudo crear la notificación: ' + e.message, 'var(--rd)'); return false; }); };
// API preparada para el portal cliente. El portal deberá invocarla con el ID
// real de reparación; la misma clave por evento evita avisos duplicados.
window.notificarEventoPortal = async function(tipo, reparacionId) {
  if (['presupuesto_aprobado','presupuesto_rechazado','cliente_viene_retirar'].indexOf(tipo) === -1) return false;
  var snap = await getDoc(doc(cR, reparacionId)); if (!snap.exists()) return false;
  await dispararNotificacionReparacion(tipo, Object.assign({ id:snap.id }, snap.data()), { clave:'portal:' + tipo + ':' + reparacionId }); return true;
};
window.FB.marcarNotificacionLeida = function(id, cb) {
  var n = (window.NOTIFICACIONES || []).find(function(x) { return x.id === id; });
  if (!n || n.usuarioDestinoUid !== (SESION.usuario && SESION.usuario.uid)) { if (cb) cb('Notificación no disponible'); return; }
  updateDoc(doc(cNot, id), { leida:true, leidaEn:serverTimestamp() }).then(function() { if (cb) cb(null); }).catch(function(e) { if (cb) cb(e.message); });
};

// --- Sobreescribir FB con funciones reales ---
function sinCredencialesCliente(d) {
  if(Array.isArray(d)) return d.map(sinCredencialesCliente);
  if(!d || typeof d !== 'object')return d;
  const limpio={}; Object.keys(d).forEach(k=>{if(CAMPOS_PRIVADOS.indexOf(k.toLowerCase())===-1)limpio[k]=sinCredencialesCliente(d[k]);}); return limpio;
}
function camposElegidos(d, campos) { const x={}; campos.forEach(k=>{if(Object.prototype.hasOwnProperty.call(d,k))x[k]=d[k];}); return x; }
function datosRepuestoPermitidos(d) {
  const x=camposElegidos(d,['nombre','modelo','precio_cliente','proveedor','estado','orden','cliente','notas','fecha']);
  if(puede('editar_costos') && Object.prototype.hasOwnProperty.call(d,'costo'))x.costo=d.costo;
  return x;
}
function validarCambioReparacion(previo, datos) {
  const permitidos=['nombre','equipo','telefono','modelo','falla','presupuesto','estado','resolucionFinanciera','tecnico','garantia_ref','estadoFisicoRecepcion','estadoFisicoEntrega','notas','diagnosticoTaller','gremio','resultadoServicio','controlComisionV1','cobroHistoricoNoConciliado','servicioSnapshot','es_garantia','garantiaOrigenId','comisionVerificada','comisionVerificadaPor','fechaVerificacionComision','comisionExcepcion','entregaExcepcion','incidencia','seg_est','orden','fecha','timeline','sena','pagos','creadoPor'];
  const d=camposElegidos(sinCredencialesCliente(datos),permitidos), final=Object.assign({},previo,d);
  if(Object.prototype.hasOwnProperty.call(d,'seg_est') && !['pendiente','contactado','enviado','interesado','compro','no_interesa'].includes(d.seg_est))throw new Error('Estado de seguimiento inválido');
  if(Object.prototype.hasOwnProperty.call(d,'tecnico') && d.tecnico!==previo.tecnico && ['Entregado','No aprobado'].includes(previo.estado) && !puede('reasignar_reparacion_terminada'))throw new Error('Sin permiso para reasignar una reparación terminada');
  ['pagos','sena','creadoPor'].forEach(k=>{if(Object.prototype.hasOwnProperty.call(d,k) && JSON.stringify(d[k])!==JSON.stringify(previo[k]) && !(k==='sena' && Number(d[k]||0)===Number(previo[k]||0)))throw new Error('Los cobros y la autoría se conservan; usá Registrar pago o Revertir cobro');});
  if(d.controlComisionV1===false && previo.controlComisionV1===true)throw new Error('No se puede desactivar el control operativo');
  if(Object.prototype.hasOwnProperty.call(d,'cobroHistoricoNoConciliado') && Number(d.cobroHistoricoNoConciliado)!==Number(previo.cobroHistoricoNoConciliado||previo.sena||0))throw new Error('No se puede inventar un cobro histórico');
  ['comisionVerificadaPor','fechaVerificacionComision','comisionExcepcion','entregaExcepcion'].forEach(k=>{if(Object.prototype.hasOwnProperty.call(d,k) && !puede('gestionar_comisiones'))throw new Error('Sin permiso para autorizar comisiones o entregas');});
  if(d.comisionVerificada===true && !previo.comisionVerificada && !puede('gestionar_comisiones'))throw new Error('Sin permiso para verificar comisión');
  if(final.resolucionFinanciera==='saldo_autorizado' && previo.resolucionFinanciera!==final.resolucionFinanciera && !puede('gestionar_comisiones'))throw new Error('Sin permiso para autorizar saldo pendiente');
  if(final.resolucionFinanciera==='sin_cargo_cortesia' && previo.resolucionFinanciera!==final.resolucionFinanciera && !puede('gestionar_comisiones'))throw new Error('Sin permiso para autorizar cortesía');
  if(d.incidencia && (d.incidencia.estado==='Resuelta' || d.incidencia.resolucion) && !puede('resolver_incidencias') && JSON.stringify(d.incidencia)!==JSON.stringify(previo.incidencia))throw new Error('Sin permiso para resolver incidencias');
  const cobrado=totalCobradoReparacion(previo);
  if(Number(final.presupuesto||0)+.01<cobrado)throw new Error('El presupuesto no puede quedar por debajo de lo cobrado');
  if(reparacionEsSinCargo(final) && cobrado>0 && !reparacionEsSinCargo(previo))throw new Error('Primero revertí los cobros antes de definir sin cargo');
  if(final.controlComisionV1 && final.estado==='Entregado') {
    if(!final.resultadoServicio || final.resultadoServicio==='Pendiente de cierre' || !String(final.estadoFisicoEntrega||'').trim())throw new Error('Completá resultado y estado físico final antes de entregar');
    if(!reparacionPuedeEntregarseFinancieramente(final))throw new Error('Registrá el cobro o autorizá la entrega con saldo');
  }
  if(d.estado==='Entregado' && previo.estado!=='Entregado') {d.fechaEntrega=fechaDiaSesion(Date.now());d.seg_est='pendiente';}
  Object.assign(d,resumenFinancieroReparacion(final));
  if(d.estado && d.estado!==previo.estado)d.timeline=(previo.timeline||[]).concat([{estado:d.estado,fecha:hoy(),hora:horaActual(),usuario:usuarioActualRegistro()}]);
  else delete d.timeline;
  return d;
}
window.FB.add = (d, cb) => {
  if(!puede('editar_reparacion')) { cb('Sin permiso para crear reparaciones'); return; }
  try {
    const limpio=sinCredencialesCliente(d);
    const datos=validarCambioReparacion({},Object.assign({},limpio,{sena:'0',creadoPor:undefined}));
    delete datos.creadoPor; datos.creadoPor=usuarioActualRegistro();
    agregarAuditable('reparaciones','reparacion',conTelefonoClave(datos)).then(id=>{cb(null,id);v21Sync('reparacion',id,datos,'reparacion_creada');}).catch(e=>cb(e.message));
  }catch(e){cb(e.message);}
};
window.FB.addId = (id, d, cb) => {
  if(!puede('importar_reparaciones')) { cb('Sin permiso para importar reparaciones'); return; }
  agregarAuditable('reparaciones','reparacion',conTelefonoClave(sinCredencialesCliente(d)),id).then(()=>{actualizarPortalEnSegundoPlano(id);cb(null);}).catch(e=>cb(e.message));
};
window.FB.upd = async (id, d, cb) => {
  const keys=Object.keys(d),soloSeguimiento=keys.length>0 && keys.every(k=>k==='seg_est');
  if(!puede(soloSeguimiento?'gestionar_seguimientos':'editar_reparacion')) { cb('Sin permiso para actualizar reparación'); return; }
  try {
    let guardado;
    await runTransaction(db,async tx=>{
      const ref=doc(cR,id),snap=await tx.get(ref);if(!snap.exists())throw new Error('Orden no encontrada');
      if(soloSeguimiento && !['pendiente','contactado','enviado','interesado','compro','no_interesa'].includes(d.seg_est))throw new Error('Estado de seguimiento inválido');
      guardado=soloSeguimiento ? camposElegidos(d,['seg_est']) : conTelefonoClave(validarCambioReparacion(snap.data(),d));
      tx.update(ref,Object.assign({},guardado,{_upd:serverTimestamp()}));
      tx.set(doc(cAud),{entidad:'reparacion',entidadId:id,accion:'actualizado',actor:usuarioActualRegistro(),cambios:cambiosAuditables(snap.data(),guardado),fecha:hoy(),hora:horaActual(),creadoEn:serverTimestamp()});
    });
    cb(null);v21Sync('reparacion',id,guardado,'reparacion_actualizada');
  }catch(e){cb(e.message);}
};
window.FB.del = (id, cb) => { if (!puede('eliminar_operaciones')) { cb('Solo administrador puede eliminar operaciones'); return; } eliminarAuditable('reparaciones', 'reparacion', id).then(() => { actualizarPortalEnSegundoPlano(id); cb(null); }).catch(e => cb(e.message)); };
window.FB.addR = (d, cb) => { if(!puede('gestionar_repuestos')) { cb('Sin permiso para gestionar repuestos'); return; } agregarAuditable('repuestos', 'repuesto', datosRepuestoPermitidos(d)).then(() => cb(null)).catch(e => cb(e.message)); };
window.FB.updR = (id, d, cb) => { if(!puede('gestionar_repuestos')) { cb('Sin permiso para gestionar repuestos'); return; } actualizarAuditable('repuestos', 'repuesto', id, datosRepuestoPermitidos(d)).then(() => cb(null)).catch(e => cb(e.message)); };
window.FB.delR = (id, cb) => { if (!puede('eliminar_operaciones')) { cb('Solo administrador puede eliminar operaciones'); return; } eliminarAuditable('repuestos', 'repuesto', id).then(() => cb(null)).catch(e => cb(e.message)); };

window.FB.setSeguimientosConfig = (d, cb) => {
  if(!esAdministrador()){cb('Solo administración puede configurar el beneficio');return;}
  const beneficio=String(d.beneficio||'').trim();
  if(beneficio.length>500){cb('El beneficio no puede superar 500 caracteres');return;}
  actualizarAuditable('config','config_seguimientos','seguimientos',{activo:d.activo===true && !!beneficio,beneficio:beneficio}).then(()=>cb(null)).catch(e=>cb(e.message));
};

// --- Catalogo y config ---
window.FB.setConfig = (d, cb) => { if(!puede('actualizar_catalogo')) { cb('Sin permiso para configurar catálogo'); return; } actualizarAuditable('config', 'config_catalogo', 'catalogo', d).then(() => cb(null)).catch(e => cb(e.message)); };
window.FB.setCotizadorConfig = (d, cb) => {
  if (!puede('actualizar_cotizador')) { cb('Solo administrador puede modificar el cotizador'); return; }
  actualizarAuditable('config', 'config_cotizador', 'cotizador', d).then(() => publicarCotizadorPublico()).then(() => cb(null)).catch(e => cb(e.message));
};
window.FB.setPortalClienteConfig = (d, cb) => {
  if (!puede('gestionar_portal_cliente')) { cb('Solo administrador puede configurar el Portal Cliente'); return; }
  actualizarAuditable('config', 'config_portal_cliente', 'portalCliente', d).then(() => cb(null)).catch(e => cb(e.message));
};

window.FB.setCat = async (items, cb) => {
  if(!puede('actualizar_catalogo')) { cb('Sin permiso para actualizar catálogo'); return; }
  let etapa = 'inicio';
  try {
    // Actualizacion incremental por codigo. Nunca borra el catalogo tecnico.
    etapa = 'leer catálogo existente';
    const codigos = new Set(items.map(item => String(item.cod || '')));
    const existentes = await getDocs(cCat), porCodigo = new Map();
    existentes.forEach(d => { const x=d.data(); if(x.cod) porCodigo.set(String(x.cod),d.ref); });
    const chunkSize = 400;
    etapa = 'guardar catálogo técnico';
    for (let i = 0; i < items.length; i += chunkSize) {
      const batch2 = writeBatch(db);
      items.slice(i, i + chunkSize).forEach(item => {
        const ref=porCodigo.get(String(item.cod)) || doc(cCat,'cat_'+String(item.cod).replace(/[^a-zA-Z0-9_-]/g,'_'));
        batch2.set(ref,Object.assign({},item,{disponibleFuente:true,actualizadoEn:serverTimestamp()}),{merge:true});
      });
      await batch2.commit();
    }
    etapa = 'marcar productos ausentes';
    const ausentes=[]; existentes.forEach(d=>{const x=d.data();if(x.cod&&!codigos.has(String(x.cod)))ausentes.push(d.ref);});
    for(let i=0;i<ausentes.length;i+=chunkSize){const batch=writeBatch(db);ausentes.slice(i,i+chunkSize).forEach(ref=>batch.set(ref,{disponibleFuente:false,ultimaAusenciaEn:serverTimestamp()},{merge:true}));await batch.commit();}
    etapa = 'auditar catálogo';
    await registrarAuditoria('catalogo','catalogo','base_actualizada_incremental',{}, { productos:items.length,ausentes:ausentes.length });
    etapa = 'generar Lista Maestra';
    const resumenServicios=puede('gestionar_servicios_maestros') && window.FB.sincronizarServiciosDesdeCatalogo?await window.FB.sincronizarServiciosDesdeCatalogo(items,{cotizacion:Number(CFG_CAT.usd||0),archivo:items[0]&&items[0].archivoOrigen||''}):null;
    await publicarCotizadorPublico();
    cb(null,resumenServicios);
  } catch(e) {
    console.error('Actualización de catálogo falló en "'+etapa+'":',e);
    cb('Etapa "'+etapa+'": '+(e && e.message ? e.message : String(e)));
  }
};

let listenersInternos=[];
function detenerListenersInternos() {
  listenersInternos.forEach(detener=>detener()); listenersInternos=[];
  ['REPS','RPUS','VENTAS','STOCK','AUDITORIA','PRODUCTOS_POS','MOVIMIENTOS_STOCK','MOVIMIENTOS_FINANCIEROS_POS','MOVIMIENTOS_FINANCIEROS_ADMIN','PAGOS_ADMIN','CIERRES_CAJA','SERVICIOS_MAESTROS','COM_LIQUIDACIONES','COM_AJUSTES'].forEach(k=>{window[k]=[];});
  window.DATOS_HISTORICOS=[];
  window.SEGUIMIENTOS_CFG={activo:false,beneficio:''};
  window.CAJA_ACTUAL=null;window.MOVIMIENTOS_CAJA_ACTUAL=[];window.MOVIMIENTOS_CAJA_ID=null;
}
function iniciarListenersInternos() {
  detenerListenersInternos();
  function onSnapshot(...args) { const detener=observarFirestore(...args);listenersInternos.push(detener);return detener; }
// --- Listener reparaciones ---
onSnapshot(
  query(cR, orderBy('_ts', 'asc')),
  (snap) => {
    window.REPS = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    render();
    updSidebar();
    syncOk();
    // Si el modal de detalle esta abierto, refrescarlo con datos nuevos
    if (window._detId && document.getElementById('mDet').classList.contains('open')) {
      _renderDet();
    }
  },
  (err) => syncErr('Firestore error: ' + err.message)
);

// Registro de auditoría: se mantiene separado de los documentos operativos.
onSnapshot(cAud, (snap) => {
  window.AUDITORIA = snap.docs.map(d => Object.assign({ id: d.id }, d.data(), {
    _ordenAuditoria: d.data().creadoEn && d.data().creadoEn.toMillis ? d.data().creadoEn.toMillis() : 0
  }));
  if (window._detId && document.getElementById('mDet').classList.contains('open')) _renderDet();
}, () => {});

// --- Listener repuestos ---
onSnapshot(query(cRp, orderBy('_ts','asc')), (snap) => {
  window.RPUS = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  if (window.VIEW === 'rpus') render();
  if (typeof updSidebar === 'function') updSidebar();
}, () => {});

// --- Listener ventas ---
onSnapshot(query(cVen, orderBy('fecha','desc')), (snap) => {
  window.VENTAS = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  if (['ven','ops','seg','equipoAdmin','admin','bal'].includes(window.VIEW)) render();
  if (typeof actualizarBadgeSeg === 'function') actualizarBadgeSeg();
}, () => {});

// --- Listener stock ---
onSnapshot(query(cSt, orderBy('fecha','desc')), (snap) => {
  window.STOCK = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  if (window.VIEW === 'stock') render();
}, () => {});

// --- Listener usados ---
onSnapshot(cUsa, (snap) => {
  window.USADOS = snap.docs.map(d => d.data());
  if (typeof cotLoadUsados === 'function') cotLoadUsados(window.USADOS);
}, () => {});

// --- Listener catalogo ---
onSnapshot(cCat, (snap) => {
  window.CATALOGO = snap.docs.map(d => d.data());
}, () => {});

// --- Listener config comisiones ---
onSnapshot(dCom, (snap) => {
  if (snap.exists() && typeof comLoadCfg === 'function') comLoadCfg(snap.data());
}, () => {});

// --- Listener config catalogo ---
onSnapshot(dCfg, (snap) => {
  if (snap.exists() && typeof catLoadConfig === 'function') catLoadConfig(snap.data());
}, () => {});
onSnapshot(doc(db,'config','seguimientos'),snap=>{
  window.SEGUIMIENTOS_CFG=snap.exists()?{activo:snap.data().activo===true,beneficio:String(snap.data().beneficio||'')}:{activo:false,beneficio:''};
  if(window.VIEW==='seg')render();
},err=>{window.SEGUIMIENTOS_CFG={activo:false,beneficio:''};if(window.VIEW==='seg'){render();toast('No se pudo cargar el beneficio: '+err.message,'var(--rd)');}});
onSnapshot(dPortalCliente, (snap) => {
  window.PORTAL_CLIENTE_CFG = snap.exists() ? Object.assign({ whatsapp:'', googleReviewUrl:'', ofertas:[], destacados:[] }, snap.data()) : { whatsapp:'', googleReviewUrl:'', ofertas:[], destacados:[] };
  if (window.VIEW === 'portal' && typeof renderPortalAdmin === 'function') renderPortalAdmin();
}, () => {});
onSnapshot(cPro, (snap) => {
  window.PRODUCTOS_POS = snap.docs.map(d => Object.assign({ id:d.id }, d.data())).sort((a,b) => String(a.nombre||'').localeCompare(String(b.nombre||''), 'es'));
  if ((window.VIEW === 'pos' || window.VIEW === 'prod' || window.VIEW === 'inv') && typeof render === 'function') render();
}, () => {});
onSnapshot(cMovSt, (snap) => {
  window.MOVIMIENTOS_STOCK_POS = snap.docs.map(d => Object.assign({ id:d.id }, d.data())).sort((a,b) => String(b.fechaHora||'').localeCompare(String(a.fechaHora||'')));
  if (window.VIEW === 'inv' && typeof render === 'function') render();
}, () => {});
onSnapshot(query(cMovFin, orderBy('fechaHora','desc'), limit(250)), (snap) => {
  window.MOVIMIENTOS_FINANCIEROS_POS = snap.docs.map(d => Object.assign({ id:d.id }, d.data()));
  if ((window.VIEW === 'ops' || window.VIEW === 'pos') && typeof render === 'function') render();
}, () => {});
onSnapshot(query(cPagPos, orderBy('fechaHora','desc'), limit(2000)), (snap) => {
  window.PAGOS_ADMIN=snap.docs.map(d=>Object.assign({id:d.id},d.data()));
  window.PAGOS_ADMIN_LIMITADO=snap.size===2000;
  if(window.VIEW==='admin'&&typeof render==='function')render();
}, (err) => { console.error('Pagos administrativos:',err); });
onSnapshot(query(cMovFin, orderBy('fechaHora','desc'), limit(2000)), (snap) => {
  window.MOVIMIENTOS_FINANCIEROS_ADMIN=snap.docs.map(d=>Object.assign({id:d.id},d.data()));
  window.MOVIMIENTOS_ADMIN_LIMITADO=snap.size===2000;
  if(window.VIEW==='admin'&&typeof render==='function')render();
}, (err) => { console.error('Movimientos administrativos:',err); });
let detenerMovimientosCaja = null, cajaEscuchada = null;
onSnapshot(dCajaActual, (snap) => {
  const d=snap.exists()?snap.data():null;
  window.CAJA_ACTUAL=d&&d.estado==='abierta'?Object.assign({id:d.cajaId},d):null;
  const id=window.CAJA_ACTUAL && window.CAJA_ACTUAL.id;
  if (id !== cajaEscuchada) {
    if (detenerMovimientosCaja) detenerMovimientosCaja();
    cajaEscuchada=id; window.MOVIMIENTOS_CAJA_ACTUAL=[]; window.MOVIMIENTOS_CAJA_ID=id;
    window.MOVIMIENTOS_CAJA_CARGANDO=!!id; window.MOVIMIENTOS_CAJA_ERROR='';
    if(id) detenerMovimientosCaja=onSnapshot(query(cMovFin,where('cajaId','==',id)), {includeMetadataChanges:true}, function(ms) {
      if(cajaEscuchada !== id)return;
      window.MOVIMIENTOS_CAJA_ACTUAL=ms.docs.map(d=>({id:d.id,...d.data()}));
      window.MOVIMIENTOS_CAJA_CARGANDO=ms.metadata.fromCache; window.MOVIMIENTOS_CAJA_ERROR='';
      if(window.VIEW==='pos')render();
    },function(err) {
      if(cajaEscuchada !== id)return;
      window.MOVIMIENTOS_CAJA_CARGANDO=false; window.MOVIMIENTOS_CAJA_ERROR=err.message;
      if(window.VIEW==='pos')render();
    });
  }
  if (window.VIEW==='pos') { if(typeof setTopActions==='function')setTopActions('pos'); if(typeof render==='function')render(); }
}, () => {});
onSnapshot(query(cCajas, orderBy('aperturaFechaHora','desc'), limit(500)), (snap) => {
  window.CIERRES_CAJA=snap.docs.map(d=>Object.assign({id:d.id},d.data()));
  window.CIERRES_CAJA_CARGANDO=false; window.CIERRES_CAJA_ERROR='';
  if(window.VIEW==='cierres'&&typeof render==='function')render();
}, (err) => {
  window.CIERRES_CAJA_CARGANDO=false;
  window.CIERRES_CAJA_ERROR=(err.code ? err.code + ': ' : '') + (err.message || 'No se pudieron cargar los cierres');
  console.error('Cierres de caja:', err);
  if(window.VIEW==='cierres'&&typeof render==='function')render();
});
onSnapshot(cServicios,(snap)=>{
  window.SERVICIOS_MAESTROS=snap.docs.map(d=>Object.assign({id:d.id},d.data())).sort((a,b)=>String(a.nombrePublico||'').localeCompare(String(b.nombrePublico||''),'es'));
  window.SERVICIOS_CARGANDO=false; window.SERVICIOS_ERROR='';
  if((window.VIEW==='servicios'||window.VIEW==='pos')&&typeof render==='function')render();
},(err)=>{
  window.SERVICIOS_CARGANDO=false;
  window.SERVICIOS_ERROR=(err.code ? err.code + ': ' : '') + (err.message || 'No se pudo cargar la Lista Maestra');
  console.error('Servicios maestros:',err);
  if(window.VIEW==='servicios'&&typeof render==='function')render();
});
onSnapshot(dPoliticasRep,(snap)=>{
  window.POLITICAS_REPARACION=snap.exists()?snap.data():{};
  if(window.VIEW==='servicios'&&typeof render==='function')render();
},(err)=>console.error('Políticas de reparación:',err));
onSnapshot(dCot, (snap) => {
  if (typeof cotLoadConfig === 'function') cotLoadConfig(snap.exists() ? snap.data() : {});
}, () => {});

// --- Tipo de cambio de referencia e historial ---
onSnapshot(dMon, (snap) => {
  if (snap.exists() && typeof monedaLoadConfig === 'function') monedaLoadConfig(snap.data());
}, () => {});
onSnapshot(cFx, (snap) => {
  window.TIPOS_CAMBIO = snap.docs.map(d => Object.assign({ id: d.id }, d.data(), {
    _ordenFx: d.data().createdAt && d.data().createdAt.toMillis ? d.data().createdAt.toMillis() : 0
  }));
}, () => {});
onSnapshot(cLiq, (snap) => {
  window.COM_LIQUIDACIONES = snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
  if (window.VIEW === 'bal' && typeof renderBal === 'function') renderBal();
}, () => {});
onSnapshot(cAj, (snap) => {
  window.COM_AJUSTES = snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
  if (window.VIEW === 'bal' && typeof renderBal === 'function') renderBal();
}, () => {});

// ── Config comisiones ──

}

window.FB.setComCfg = (d, cb) => { if(!puede('gestionar_comisiones')) { cb('Sin permiso para configurar comisiones'); return; } actualizarAuditable('config', 'config_comisiones', 'comisiones', d).then(()=>cb(null)).catch(e=>cb(e.message)); };

function fechaNegocioIso(){const d=new Date();return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');}
window.FB.abrirCaja = async (data, cb) => {
  if(!puede('operar_caja')){cb('Sin permiso para abrir caja');return;}
  try{const inicial=Number(data.efectivoInicial),moneda=data.moneda==='USD'?'USD':'ARS',actor=usuarioActualRegistro(),ahora=new Date().toISOString(),ref=doc(cCajas);
    if(!Number.isFinite(inicial)||inicial<0)throw new Error('El efectivo inicial debe ser válido');
    await runTransaction(db,async tx=>{const actual=await tx.get(dCajaActual);if(actual.exists()&&actual.data().estado==='abierta')throw new Error('Ya existe una caja abierta');const caja={schemaVersion:1,fechaNegocio:fechaNegocioIso(),aperturaFechaHora:ahora,usuarioApertura:actor,efectivoInicial:inicial,moneda:moneda,observacionApertura:String(data.observacion||'').trim(),estado:'abierta',creadoEn:serverTimestamp()};tx.set(ref,caja);tx.set(dCajaActual,Object.assign({cajaId:ref.id},caja));tx.set(doc(cAud),{entidad:'caja',entidadId:ref.id,accion:'abierta',actor:actor,cambios:[],fecha:hoy(),hora:horaActual(),creadoEn:serverTimestamp()});});cb(null,ref.id);
  }catch(e){cb((e.code?e.code+': ':'')+e.message);}
};

window.FB.sincronizarServiciosDesdeCatalogo = async (items,meta) => {
  if(!puede('gestionar_servicios_maestros'))throw new Error('El usuario actual no tiene permiso para gestionar la Lista Maestra');
  if(typeof window.serviciosCandidatosCatalogo!=='function')throw new Error('No se cargó el módulo de Lista Maestra');
  const candidatos=window.serviciosCandidatosCatalogo(items,meta);
  if(!candidatos.length)throw new Error('El Excel no produjo servicios candidatos');
  const snap=await getDocs(cServicios),existentes=new Map();
  snap.forEach(d=>{const x=d.data();if(x.repuestoFuenteId)existentes.set(String(x.repuestoFuenteId),Object.assign({id:d.id},x));});
  let nuevos=0,actualizados=0,revision=0;const chunk=350;
  for(let i=0;i<candidatos.length;i+=chunk){const batch=writeBatch(db);candidatos.slice(i,i+chunk).forEach(c=>{const previo=existentes.get(c.repuestoFuenteId);let mezcla=Object.assign({},c);if(previo){['nombrePublico','calidadComercial','activo','recomendado','precioPublico','precioManual','modoPrecio','tipoReglaPrecio','markupUsdObjetivo','margenPorcentualObjetivo','incentivoTecnico','reservaGarantia','costoLogisticoDefault'].forEach(k=>{if(previo[k]!==undefined)mezcla[k]=previo[k];});if(previo.costoManual===true){mezcla.costoRepuestoFuenteUltimo=Number(c.costoRepuestoActual||0);mezcla.costoRepuestoActual=Number(previo.costoRepuestoActual||0);mezcla.costoManual=true;}else mezcla.costoManual=false;mezcla.necesitaRevision=!!previo.necesitaRevision||(previo.costoManual!==true&&Math.abs(Number(previo.costoRepuestoActual||0)-Number(c.costoRepuestoActual||0))>.01);actualizados++;}else nuevos++;if(mezcla.necesitaRevision)revision++;if(typeof window.servicioRecalcular==='function')mezcla=window.servicioRecalcular(mezcla,window.POLITICAS_REPARACION||{});mezcla.fechaUltimoCosto=serverTimestamp();batch.set(doc(cServicios,previo?previo.id:'srv_'+c.codigoProveedor.replace(/[^a-zA-Z0-9_-]/g,'_')),mezcla,{merge:true});});await batch.commit();}
  // Los candidatos automáticos anteriores que ya no cumplen la regla comercial
  // se conservan, pero dejan de ofrecerse. Nunca se eliminan servicios ni manuales.
  const fuentesVigentes=new Set(candidatos.map(c=>String(c.repuestoFuenteId)));
  const excluidos=snap.docs.filter(d=>{const x=d.data();return x.repuestoFuenteId&&x.origen!=='manual'&&!fuentesVigentes.has(String(x.repuestoFuenteId));});
  for(let i=0;i<excluidos.length;i+=chunk){const batch=writeBatch(db);excluidos.slice(i,i+chunk).forEach(d=>batch.set(d.ref,{activo:false,excluidoPorReglaFuente:true,necesitaRevision:true,actualizadoEn:serverTimestamp()},{merge:true}));await batch.commit();}
  await registrarAuditoria('servicios_maestros','sincronizacion_excel','actualizada',{}, {nuevos:nuevos,actualizados:actualizados,requierenRevision:revision,excluidosPorRegla:excluidos.length,archivo:meta&&meta.archivo||''});
  const confirmacion=await getDocs(cServicios);
  window.SERVICIOS_MAESTROS=confirmacion.docs.map(d=>Object.assign({id:d.id},d.data())).sort((a,b)=>String(a.nombrePublico||'').localeCompare(String(b.nombrePublico||''),'es'));
  window.SERVICIOS_CARGANDO=false; window.SERVICIOS_ERROR='';
  if(window.VIEW==='servicios'&&typeof render==='function')render();
  return {nuevos:nuevos,actualizados:actualizados,requierenRevision:revision,excluidosPorRegla:excluidos.length,total:confirmacion.size};
};
window.FB.guardarServicioMaestro = async (data,cb) => {if(!puede('gestionar_servicios_maestros')){cb('Sin permiso');return;}try{const id=data.id,guardar=Object.assign({},data,{actualizadoEn:serverTimestamp(),actualizadoPor:usuarioActualRegistro()});delete guardar.id;if(id)await setDoc(doc(cServicios,id),guardar,{merge:true});else await addDoc(cServicios,Object.assign({creadoEn:serverTimestamp(),origen:'manual',repuestoFuenteId:null},guardar));cb(null);}catch(e){cb(e.message);}};
window.FB.guardarServiciosMaestrosLote = async (items,cb) => {
  if(!puede('gestionar_servicios_maestros')){cb('Sin permiso');return;}
  try{
    const lista=Array.isArray(items)?items:[];
    if(!lista.length)throw new Error('No hay servicios para actualizar');
    if(lista.length>450)throw new Error('El grupo supera 450 servicios; aplicá un filtro más específico');
    const actor=usuarioActualRegistro(),permitidos=['tipoReglaPrecio','markupUsdObjetivo','margenPorcentualObjetivo','precioCalculado','precioPublico','precioManual','modoPrecio','gananciaEstimada','margenActual','precioParaRevisar','necesitaRevision'];
    const batch=writeBatch(db);
    lista.forEach(x=>{if(!x||!x.id)throw new Error('Hay un servicio sin identificador');const guardar={actualizadoEn:serverTimestamp(),actualizadoPor:actor};permitidos.forEach(k=>{if(Object.prototype.hasOwnProperty.call(x,k))guardar[k]=x[k];});batch.set(doc(cServicios,String(x.id)),guardar,{merge:true});});
    batch.set(doc(cAud),{entidad:'servicios_maestros',entidadId:'actualizacion_grupal',accion:'precios_actualizados_en_lote',actor:actor,cantidad:lista.length,fecha:hoy(),hora:horaActual(),creadoEn:serverTimestamp()});
    await batch.commit();cb(null,{cantidad:lista.length});
  }catch(e){cb((e.code?e.code+': ':'')+(e.message||String(e)));}
};
window.FB.borrarListaMaestra = async (cb) => {if(!puede('gestionar_servicios_maestros')){cb('Sin permiso');return;}try{const snap=await getDocs(cServicios),docs=snap.docs,chunk=350;for(let i=0;i<docs.length;i+=chunk){const batch=writeBatch(db);docs.slice(i,i+chunk).forEach(d=>batch.delete(d.ref));await batch.commit();}window.SERVICIOS_MAESTROS=[];window.SERVICIOS_CARGANDO=false;window.SERVICIOS_ERROR='';try{await registrarAuditoria('servicios_maestros','lista_completa','eliminada',{}, {cantidad:docs.length,actor:usuarioActualRegistro()});}catch(auditErr){console.warn('La lista se borró pero no pudo registrarse la auditoría:',auditErr);}if(window.VIEW==='servicios'&&typeof render==='function')render();cb(null,docs.length);}catch(e){console.error('Borrar Lista Maestra:',e);cb((e.code?e.code+': ':'')+(e.message||String(e)));}};
window.FB.guardarPoliticasReparacion = async (data,cb) => {if(!puede('gestionar_servicios_maestros')){cb('Sin permiso');return;}try{await setDoc(dPoliticasRep,Object.assign({},data,{actualizadoEn:serverTimestamp(),actualizadoPor:usuarioActualRegistro()}),{merge:true});if(typeof servicioRecalcular==='function'){const snap=await getDocs(cServicios),docs=snap.docs;for(let i=0;i<docs.length;i+=350){const batch=writeBatch(db);docs.slice(i,i+350).forEach(d=>{const r=servicioRecalcular(Object.assign({id:d.id},d.data()),data);batch.set(d.ref,{precioCalculado:r.precioCalculado,costoDirectoEstimado:r.costoDirectoEstimado,gananciaEstimada:r.gananciaEstimada,margenActual:r.margenActual,necesitaRevision:r.necesitaRevision,fechaUltimaRevisionPrecio:serverTimestamp()},{merge:true});});await batch.commit();}}cb(null);}catch(e){cb(e.message);}};
window.FB.movimientoManualCaja = async (data, cb) => {
  if(!puede('registrar_movimiento_caja')){cb('Sin permiso para registrar movimientos de caja');return;}
  try{const monto=Number(data.monto),actor=usuarioActualRegistro(),ahora=new Date().toISOString();if(!Number.isFinite(monto)||monto===0)throw new Error('Ingresá un importe válido');if(!data.medio||!data.cuenta||!data.categoria)throw new Error('Completá medio, cuenta y categoría');if(!String(data.descripcion||'').trim())throw new Error('Indicá el motivo del movimiento');
    await runTransaction(db,async tx=>{const actual=await tx.get(dCajaActual);if(!actual.exists()||actual.data().estado!=='abierta')throw new Error('No hay una caja abierta');const cajaId=actual.data().cajaId;const mov={schemaVersion:2,tipo:monto>0?'ingreso_manual':'egreso_manual',tipoEgreso:monto<0?String(data.tipoEgreso||'gasto_operativo'):'',referenciaTipo:'caja_manual',referenciaId:cajaId,cajaId:cajaId,monto:monto,moneda:data.moneda==='USD'?'USD':'ARS',medio:String(data.medio),cuenta:String(data.cuenta),categoria:String(data.categoria).trim(),subcategoria:String(data.subcategoria||'').trim(),descripcion:String(data.descripcion||'').trim(),usuario:actor,fecha:hoy(),fechaHora:ahora,creadoEn:serverTimestamp()};tx.update(dCajaActual,{revisionMovimientos:increment(1)});
      tx.set(doc(cMovFin),mov);tx.set(doc(cAud),{entidad:'caja',entidadId:cajaId,accion:monto>0?'ingreso_manual':'egreso_manual',actor:actor,cambios:[],monto:monto,moneda:mov.moneda,tipoEgreso:mov.tipoEgreso,categoria:mov.categoria,fecha:hoy(),hora:horaActual(),creadoEn:serverTimestamp()});});cb(null);
  }catch(e){cb((e.code?e.code+': ':'')+e.message);}
};
window.FB.cerrarCaja = async (data, cb) => {
  if(!puede('operar_caja')){cb('Sin permiso para cerrar caja');return;}
  try{
    if(data.efectivoContado === null || data.efectivoContado === undefined || String(data.efectivoContado).trim()==='')throw new Error('Ingresá el efectivo contado');
    const actualPrevio=await getDocFromServer(dCajaActual);
    if(!actualPrevio.exists() || actualPrevio.data().estado!=='abierta')throw new Error('La caja ya está cerrada');
    const base=actualPrevio.data(), id=base.cajaId;
    if(data.cajaId && data.cajaId !== id)throw new Error('La caja cambió. Volvé a abrir el cierre');
    const movimientos=await getDocsFromServer(query(cMovFin,where('cajaId','==',id)));
    const r=cajaResumenDesdeMovimientos(base,movimientos.docs.map(d=>({id:d.id,...d.data()})));
    const actor=usuarioActualRegistro(),ahora=new Date().toISOString(),contado=Number(data.efectivoContado),esperado=r.efectivoEsperado,dif=contado-esperado;if(!Number.isFinite(contado)||contado<0)throw new Error('El efectivo contado debe ser válido');if(Math.abs(dif)>.009&&!String(data.observacion||'').trim())throw new Error('Indicá el motivo de la diferencia');
    await runTransaction(db,async tx=>{const actual=await tx.get(dCajaActual);if(!actual.exists()||actual.data().estado!=='abierta')throw new Error('La caja ya está cerrada');const a=actual.data();if(a.cajaId!==id || Number(a.revisionMovimientos||0)!==Number(base.revisionMovimientos||0))throw new Error('La caja recibió movimientos durante el cierre. Revisá el efectivo y volvé a confirmar');const ref=doc(cCajas,a.cajaId),snap=await tx.get(ref);if(!snap.exists()||snap.data().estado!=='abierta')throw new Error('La sesión de caja no está disponible');const cierre={estado:'cerrada',cierreFechaHora:ahora,usuarioCierre:actor,ingresosEfectivo:Number(r.ingresosEfectivo||0),egresosEfectivo:Number(r.egresosEfectivo||0),efectivoEsperado:esperado,efectivoContado:contado,diferencia:dif,totalesPorMedio:r.totalesPorMedio||{},totalesPorCuenta:r.totalesPorCuenta||{},totalIngresos:Number(r.totalIngresos||0),totalEgresos:Number(r.totalEgresos||0),cantidadMovimientos:Array.isArray(r.movimientos)?r.movimientos.length:0,observacionCierre:String(data.observacion||'').trim(),cerradoEn:serverTimestamp()};tx.update(ref,cierre);tx.set(dCajaActual,{estado:'cerrada',cajaId:null,ultimoCierreId:ref.id,ultimoEfectivoContado:contado,moneda:a.moneda||'ARS',actualizadoEn:serverTimestamp()});tx.set(doc(cAud),{entidad:'caja',entidadId:ref.id,accion:'cerrada',actor:actor,cambios:[],diferencia:dif,fecha:hoy(),hora:horaActual(),creadoEn:serverTimestamp()});});cb(null);
  }catch(e){cb((e.code?e.code+': ':'')+e.message);}
};

// Compatibilidad con cierres anteriores, que guardaban los totales pero no el
// detalle dentro del documento de caja. La consulta no modifica datos.
window.FB.cargarMovimientosCaja = async (cajaId, cb) => {
  if (!puede('ver_cierres_caja')) { cb('Sin permiso para consultar cierres'); return; }
  try {
    const snap = await getDocs(query(cMovFin, where('cajaId', '==', cajaId)));
    const movimientos = snap.docs.map(d => Object.assign({ id:d.id }, d.data()))
      .sort((a, b) => String(a.fechaHora || '').localeCompare(String(b.fechaHora || '')));
    cb(null, movimientos);
  } catch (e) { cb((e.code ? e.code + ': ' : '') + e.message); }
};

window.FB.setMoneda = async (d, cb) => {
  var actor = usuarioActualRegistro();
  if (!actor || !puede('editar_tipo_cambio')) { cb('Sin permiso para actualizar la cotización'); return; }
  try {
    var previo = await getDoc(dMon);
    var batch = writeBatch(db);
    batch.set(dMon, Object.assign({}, d, { updatedAt: serverTimestamp(), updatedBy: actor }), { merge: true });
    batch.set(doc(cFx), Object.assign({}, d, { usuario: actor, fecha: hoy(), hora: horaActual(), createdAt: serverTimestamp() }));
    batch.set(doc(cAud), { entidad: 'tipo_cambio', entidadId: 'blue_venta', accion: 'actualizado', actor: actor,
      cambios: cambiosAuditables(previo.exists() ? previo.data() : {}, d), fecha: hoy(), hora: horaActual(), creadoEn: serverTimestamp() });
    await batch.commit(); cb(null);
  } catch (e) { cb(e.message); }
};

window.FB.crearLiquidacionComision = (d, cb) => {
  if (!puede('gestionar_comisiones')) { cb('Sin permiso para gestionar comisiones'); return; }
  agregarAuditable('liquidacionesComisiones', 'liquidacion_comision', d).then(id => cb(null, id)).catch(e => cb(e.message));
};
window.FB.actualizarLiquidacionComision = (id, d, cb) => {
  if (!puede('gestionar_comisiones')) { cb('Sin permiso para gestionar comisiones'); return; }
  actualizarAuditable('liquidacionesComisiones', 'liquidacion_comision', id, d).then(() => cb(null)).catch(e => cb(e.message));
};
window.FB.crearAjusteComision = (d, cb) => {
  if (!puede('gestionar_comisiones')) { cb('Sin permiso para gestionar ajustes'); return; }
  agregarAuditable('ajustesComisiones', 'ajuste_comision', d).then(id => cb(null, id)).catch(e => cb(e.message));
};
window.FB.actualizarAjusteComision = (id, d, cb) => {
  if (!puede('gestionar_comisiones')) { cb('Sin permiso para gestionar ajustes'); return; }
  actualizarAuditable('ajustesComisiones', 'ajuste_comision', id, d).then(() => cb(null)).catch(e => cb(e.message));
};

// Validaciones compartidas del circuito de equipos.
function pagosVentaEquipo(datos) {
  return (Array.isArray(datos)?datos:[]).map(p=>{
    const monto=Number(p.monto),cotizacion=p.moneda==='ARS'?Number(p.cotizacion):1;
    if(!Number.isFinite(monto)||monto<=0||!p.medio||!p.cuenta||!['ARS','USD'].includes(p.moneda)||!Number.isFinite(cotizacion)||cotizacion<=0)throw new Error('Cada pago necesita medio, cuenta, moneda, importe y cotización válida');
    const usd=monto/cotizacion;
    if(p.montoVentaUSD!=null && (!Number.isFinite(Number(p.montoVentaUSD))||Math.abs(Number(p.montoVentaUSD)-usd)>.01))throw new Error('El equivalente en dólares del pago no coincide con el importe y la cotización');
    return Object.assign({},p,{monto:monto,cotizacion:cotizacion,montoVentaUSD:usd});
  });
}
function regalosVentaEquipo(datos) {
  const regalos=(Array.isArray(datos)?datos:[]).filter(r=>r&&r.productoId).map(r=>({productoId:String(r.productoId),nombre:String(r.nombre||''),cantidad:1}));
  if(new Set(regalos.map(r=>r.productoId)).size!==regalos.length)throw new Error('El mismo regalo está seleccionado más de una vez');
  return regalos;
}
async function stockParaVentaEquipo(imei) {
  const serie=String(imei||'').trim();if(!serie)return null;
  const snap=await getDocsFromServer(query(cSt,where('imei','==',serie),limit(2)));
  if(snap.docs.length>1)throw new Error('Hay más de un equipo en stock con ese IMEI; revisá el stock antes de vender');
  return snap.docs.length?snap.docs[0].ref:null;
}
function validarStockVentaEquipo(snap,modelo,ventaId) {
  if(!snap || !snap.exists())throw new Error('El equipo seleccionado ya no existe en stock');
  const stock=snap.data(),propio=stock.ventaActivaId===ventaId;
  if((stock.ventaActivaId&&!propio)||!(stock.estado==='Disponible'||(propio&&stock.estado==='Reservado')))throw new Error('El equipo no está disponible para esta venta');
  const core=window.MAXPOINT_COTIZADOR, a=core.claveModeloBase(stock.modelo), b=core.claveModeloBase(modelo);
  if(a&&b&&a!==b)throw new Error('El IMEI corresponde a otro modelo en stock');
}
// ── CRUD ventas ──
window.FB.addV = (d, cb) => { if(!puede('editar_finanzas_ventas')) { cb('Sin permiso para crear ventas históricas'); return; } agregarAuditable('ventas', 'venta', d).then(id => { cb(null); v21Sync('venta', id, d, 'venta_creada'); }).catch(e => cb(e.message)); };
window.FB.crearVentaEquipo = async (data, cb) => {
  if (!puede('vender_equipo')) { cb('Sin permiso para vender equipos'); return; }
  try {
    const pagos = pagosVentaEquipo(data.pagos);
    const regalos=regalosVentaEquipo(data.regalos);
    const precio = Number(data.precio || 0), partePago = data.parte_pago === 'Si' ? Number(data.pp_valor || 0) : 0;
    const requerido = Math.max(0, precio - partePago), pagado = pagos.reduce((s,p) => s + Number(p.montoVentaUSD || 0), 0);
    if (!Number.isFinite(precio) || !(precio > 0)) throw new Error('El precio debe ser mayor a cero');
    if(data.parte_pago==='Si' && (!String(data.pp_modelo||'').trim() || !Number.isFinite(partePago) || partePago<=0 || partePago>precio))throw new Error('Revisá modelo y valor del equipo recibido: debe ser mayor a cero y no superar el precio');
    if(data.estadoVenta==='Cobrada'&&!String(data.imei||'').trim())throw new Error('El IMEI / número de serie es obligatorio');
    if (!['Cobrada','Reservada'].includes(data.estadoVenta)) throw new Error('El estado debe ser Cobrada o Reservada');
    if (pagos.some(p => !(Number(p.monto) > 0) || !p.medio || !p.cuenta || !['ARS','USD'].includes(p.moneda) || (p.moneda === 'ARS' && !(Number(p.cotizacion) > 0)))) throw new Error('Cada pago necesita medio, cuenta, moneda, importe y cotización válida');
    if (data.estadoVenta === 'Cobrada' && Math.abs(pagado - requerido) > 0.01) throw new Error('Los pagos deben cubrir exactamente el saldo de la venta');
    if (pagado > requerido + 0.01) throw new Error('Los pagos superan el saldo de la venta');
    const ventaRef = doc(cVen), pagoRefs = pagos.map(() => doc(cPagPos)), regaloRefs=regalos.map(r=>doc(cPro,r.productoId)), partePagoRef=data.parte_pago==='Si'&&String(data.pp_modelo||'').trim()?doc(cSt):null;
    const stockRef=await stockParaVentaEquipo(data.imei);
    const actor = usuarioActualRegistro(), ahora = new Date().toISOString();
    const requiereCaja=pagos.length>0;
    const venta = Object.assign({}, data, {
      costo:puede('editar_costos') ? (data.costo || '0') : '0',
      costoConfirmado:puede('editar_costos') && Number(data.costo||0)>0,
      tipoRegistro:'equipo', schemaVersion:2, moneda:'USD', cajaRegistrada:requiereCaja,
      imei:String(data.imei||'').trim(), stockEquipoId:stockRef?stockRef.id:'', partePagoStockId:partePagoRef?partePagoRef.id:'', regalos:regalos,
      pagos:pagos.map((p,i) => Object.assign({},p,{pagoId:pagoRefs[i].id,estado:'aplicado'})),
      totalPagadoUSD:pagado, saldoUSD:Math.max(0,requerido-pagado), usuario:actor,
      fechaHora:ahora, creadoEn:serverTimestamp()
    });
    await runTransaction(db, async tx => {
      const cajaSnap=requiereCaja?await tx.get(dCajaActual):null;
      const stockSnap=stockRef?await tx.get(stockRef):null;
      if(stockRef)validarStockVentaEquipo(stockSnap,data.modelo,ventaRef.id);
      const regaloSnaps=data.estadoVenta==='Cobrada'?await Promise.all(regaloRefs.map(ref=>tx.get(ref))):[];
      if(requiereCaja&&(!cajaSnap.exists()||cajaSnap.data().estado!=='abierta'))throw new Error('Primero abrí la caja para registrar la seña');
      const cajaId=requiereCaja?cajaSnap.data().cajaId:null;
      regaloSnaps.forEach((s,i)=>{if(!s.exists())throw new Error('El regalo seleccionado ya no existe');if(s.data().activo===false || !s.data().controlaStock)throw new Error('El regalo no está habilitado para stock');if(Number(s.data().stockActual||0)<1)throw new Error('Sin stock de '+(s.data().nombre||regalos[i].nombre));});
      if (requiereCaja) tx.update(dCajaActual,{revisionMovimientos:increment(1)});
      tx.set(ventaRef, venta);
      if(stockRef)tx.update(stockRef,{estado:data.estadoVenta==='Reservada'?'Reservado':'Vendido',ventaActivaId:ventaRef.id,actualizadoPor:actor,actualizadoEn:serverTimestamp()});
      if(partePagoRef)tx.set(partePagoRef,{modelo:String(data.pp_modelo).trim(),imei:String(data.pp_imei||''),precio_costo:data.pp_valor||'',precio_venta:'',capacidad:'',color:'',detalles:'',notas:'Ingreso por parte de pago — '+String(data.nombre||''),estado:'A revisar',fecha:hoy(),ventaOrigenId:ventaRef.id,creadoEn:serverTimestamp()});
      pagos.forEach((p,i) => {
        const pago = { schemaVersion:2, pagoId:pagoRefs[i].id, origenTipo:'venta_equipo', origenId:ventaRef.id,
          ventaId:ventaRef.id, clienteNombre:data.nombre || '', equipoModelo:data.modelo || '', medio:p.medio, cuenta:p.cuenta,
          monto:Number(p.monto), moneda:p.moneda, cotizacion:Number(p.cotizacion || 1), montoVentaUSD:Number(p.montoVentaUSD || 0),
          estado:'aplicado', usuario:actor, fecha:data.fecha || hoy(), fechaHora:ahora, creadoEn:serverTimestamp() };
        tx.set(pagoRefs[i], pago);
        tx.set(doc(cMovFin), Object.assign({}, pago, { cajaId:cajaId, tipo:'ingreso_venta_equipo', referenciaTipo:'venta_equipo', referenciaId:ventaRef.id }));
      });
      regaloSnaps.forEach((s,i)=>{const antes=Number(s.data().stockActual||0),despues=antes-1;tx.update(regaloRefs[i],{stockActual:despues,actualizadoPor:actor,actualizadoEn:serverTimestamp()});tx.set(doc(cMovSt),{schemaVersion:1,productoId:regaloRefs[i].id,productoNombre:s.data().nombre||regalos[i].nombre,tipo:'regalo_venta_equipo',cantidad:-1,stockAnterior:antes,stockResultante:despues,motivo:'Regalo con venta de equipo',referenciaTipo:'venta_equipo',referenciaId:ventaRef.id,usuario:actor,fechaHora:ahora,creadoEn:serverTimestamp()});});
      tx.set(doc(cAud), { entidad:'venta_equipo', entidadId:ventaRef.id, accion:'creada', actor:actor,
        cambios:[], totalUSD:precio, totalPagadoUSD:pagado, fecha:hoy(), hora:horaActual(), creadoEn:serverTimestamp() });
    });
    cb(null, { id:ventaRef.id });
    v21Sync('venta', ventaRef.id, data, 'venta_creada');
  } catch (e) { cb((e.code ? e.code + ': ' : '') + e.message); }
};
window.FB.completarReservaEquipo = async (id, data, cb) => {
  if (!puede('vender_equipo')) { cb('Sin permiso para completar reservas'); return; }
  try {
    const pagos=pagosVentaEquipo(data.pagos),regalos=regalosVentaEquipo(data.regalos);
    if(!String(data.imei||'').trim())throw new Error('El IMEI / número de serie es obligatorio');
    if(pagos.some(p=>!(Number(p.monto)>0)||!p.medio||!p.cuenta||!['ARS','USD'].includes(p.moneda)||(p.moneda==='ARS'&&!(Number(p.cotizacion)>0))))throw new Error('Revisá los pagos de la reserva');
    const stockRef=await stockParaVentaEquipo(data.imei);
    const ventaRef=doc(cVen,id),pagoRefs=pagos.map(()=>doc(cPagPos)),regaloRefs=regalos.map(r=>doc(cPro,r.productoId)),actor=usuarioActualRegistro(),ahora=new Date().toISOString();
    const requiereCaja=pagos.length>0;
    let completada;
    await runTransaction(db,async tx=>{
      const ventaSnap=await tx.get(ventaRef),cajaSnap=requiereCaja?await tx.get(dCajaActual):null,stockSnap=stockRef?await tx.get(stockRef):null,regaloSnaps=await Promise.all(regaloRefs.map(ref=>tx.get(ref)));
      if(!ventaSnap.exists())throw new Error('La reserva ya no existe');const v=ventaSnap.data();if(v.estadoVenta!=='Reservada')throw new Error('La operación ya no está reservada');
      if(requiereCaja&&(!cajaSnap.exists()||cajaSnap.data().estado!=='abierta'))throw new Error('Primero abrí la caja');
      if(v.stockEquipoId && (!stockRef || stockRef.id!==v.stockEquipoId))throw new Error('El IMEI debe corresponder al equipo reservado en stock');
      if(stockRef)validarStockVentaEquipo(stockSnap,v.modelo,id);
      if(v.saldoUSD==null || !Number.isFinite(Number(v.saldoUSD)) || Number(v.saldoUSD)<0)throw new Error('La reserva no tiene un saldo válido; revisá sus pagos antes de completarla');
      const saldo=Number(v.saldoUSD||0),pagado=pagos.reduce((s,p)=>s+Number(p.montoVentaUSD||0),0);if(Math.abs(saldo-pagado)>.01)throw new Error('Los pagos deben cubrir exactamente el saldo de la reserva');
      regaloSnaps.forEach((s,i)=>{if(!s.exists())throw new Error('El regalo seleccionado ya no existe');if(s.data().activo===false || !s.data().controlaStock)throw new Error('El regalo no está habilitado para stock');if(Number(s.data().stockActual||0)<1)throw new Error('Sin stock de '+(s.data().nombre||regalos[i].nombre));});
      const cajaId=requiereCaja?cajaSnap.data().cajaId:null,nuevos=pagos.map((p,i)=>Object.assign({},p,{pagoId:pagoRefs[i].id,estado:'aplicado'})),todos=(v.pagos||[]).concat(nuevos),total=Number(v.totalPagadoUSD||0)+pagado;
      if(requiereCaja)tx.update(dCajaActual,{revisionMovimientos:increment(1)});
      completada=Object.assign({},v,{estadoVenta:'Cobrada',imei:String(data.imei).trim(),fechaReserva:v.fechaReserva||v.fecha||'',fecha:hoy(),stockEquipoId:stockRef?stockRef.id:'',pagos:todos,totalPagadoUSD:total,saldoUSD:0});
      if(stockRef)tx.update(stockRef,{estado:'Vendido',ventaActivaId:id,actualizadoPor:actor,actualizadoEn:serverTimestamp()});
      tx.update(ventaRef,{estadoVenta:'Cobrada',imei:String(data.imei).trim(),fechaReserva:v.fechaReserva||v.fecha||'',fecha:hoy(),stockEquipoId:stockRef?stockRef.id:'',pagos:todos,pago:todos.map(p=>p.medio).join(' + '),totalPagadoUSD:total,saldoUSD:0,cajaRegistrada:!!v.cajaRegistrada||requiereCaja,cotizacionBlue:Number(data.cotizacionBlue||v.cotizacionBlue||0),regalos:regalos,completadaEn:serverTimestamp(),completadaPor:actor,actualizadoEn:serverTimestamp()});
      pagos.forEach((p,i)=>{const pd={schemaVersion:2,pagoId:pagoRefs[i].id,origenTipo:'venta_equipo',origenId:id,ventaId:id,clienteNombre:v.nombre||'',equipoModelo:v.modelo||'',medio:p.medio,cuenta:p.cuenta,monto:Number(p.monto),moneda:p.moneda,cotizacion:Number(p.cotizacion||1),montoVentaUSD:Number(p.montoVentaUSD||0),estado:'aplicado',usuario:actor,fecha:hoy(),fechaHora:ahora,creadoEn:serverTimestamp()};tx.set(pagoRefs[i],pd);tx.set(doc(cMovFin),Object.assign({},pd,{cajaId:cajaId,tipo:'ingreso_venta_equipo',referenciaTipo:'venta_equipo',referenciaId:id}));});
      regaloSnaps.forEach((s,i)=>{const antes=Number(s.data().stockActual||0),despues=antes-1;tx.update(regaloRefs[i],{stockActual:despues,actualizadoPor:actor,actualizadoEn:serverTimestamp()});tx.set(doc(cMovSt),{schemaVersion:1,productoId:regaloRefs[i].id,productoNombre:s.data().nombre||regalos[i].nombre,tipo:'regalo_venta_equipo',cantidad:-1,stockAnterior:antes,stockResultante:despues,motivo:'Regalo al completar reserva',referenciaTipo:'venta_equipo',referenciaId:id,usuario:actor,fechaHora:ahora,creadoEn:serverTimestamp()});});
      tx.set(doc(cAud),{entidad:'venta_equipo',entidadId:id,accion:'reserva_completada',actor:actor,cambios:[{campo:'estadoVenta',antes:'Reservada',despues:'Cobrada'}],fecha:hoy(),hora:horaActual(),creadoEn:serverTimestamp()});
    });cb(null);v21Sync('venta',id,completada,'reserva_completada');
  }catch(e){cb((e.code?e.code+': ':'')+e.message);}
};
window.FB.anularVentaEquipo = async (id, motivo, cb) => {
  if (!puede('eliminar_operaciones')) { cb('Solo administración puede anular ventas de equipos'); return; }
  try {
    if(!String(motivo||'').trim())throw new Error('El motivo de anulación es obligatorio');
    const ventaRef = doc(cVen, id), actor = usuarioActualRegistro(), ahora = new Date().toISOString();
    const partes=await getDocsFromServer(query(cSt,where('ventaOrigenId','==',id)));
    await runTransaction(db, async tx => {
      const snap = await tx.get(ventaRef);
      if (!snap.exists()) throw new Error('La venta ya no existe');
      const venta = snap.data();
      if (venta.tipoRegistro === 'pos') throw new Error('Las ventas de accesorios se anulan desde Operaciones de caja');
      if (venta.estadoVenta === 'Anulada') throw new Error('La venta ya está anulada');
      if (venta.estadoVenta === 'Devuelta') throw new Error('La venta ya figura como devuelta');
      const stockRef=venta.stockEquipoId?doc(cSt,venta.stockEquipoId):null,stockSnap=stockRef?await tx.get(stockRef):null;
      const parteRefs=Array.from(new Map(partes.docs.map(d=>[d.id,d.ref]).concat(venta.partePagoStockId?[[venta.partePagoStockId,doc(cSt,venta.partePagoStockId)]]:[])).values());
      const parteSnaps=await Promise.all(parteRefs.map(ref=>tx.get(ref)));
      if(stockRef && (!stockSnap.exists()||stockSnap.data().ventaActivaId!==id))throw new Error('El vínculo con el equipo vendido cambió; revisá el stock antes de anular');
      parteSnaps.forEach(p=>{if(!p.exists()||p.data().ventaOrigenId!==id)throw new Error('No se encontró el equipo recibido en parte de pago');if(p.data().ventaActivaId||['Vendido','Reservado','Prestado'].includes(p.data().estado))throw new Error('El equipo recibido en parte de pago ya está comprometido; resolvé su operación antes de anular');});
      const cajaSnap = venta.cajaRegistrada ? await tx.get(dCajaActual) : null;
      const regalos=(Array.isArray(venta.regalos)?venta.regalos:[]).filter(r=>r&&r.productoId),regaloRefs=regalos.map(r=>doc(cPro,r.productoId));
      const regaloSnaps=venta.estadoVenta==='Cobrada'?await Promise.all(regaloRefs.map(ref=>tx.get(ref))):[];
      if (venta.cajaRegistrada && (!cajaSnap.exists() || cajaSnap.data().estado !== 'abierta')) throw new Error('Primero abrí la caja');
      const cajaId = venta.cajaRegistrada ? cajaSnap.data().cajaId : null;
      const anulacion = { motivo:String(motivo || '').trim(), usuario:actor, fechaHora:ahora };
      const cambiosVenta = { estadoVenta:'Anulada', anulacion:anulacion, actualizadoEn:serverTimestamp() };
      if (venta.cajaRegistrada) {
        cambiosVenta.cajaRevertida = true;
        cambiosVenta.pagos = (venta.pagos || []).map(p => Object.assign({}, p, { estado:'revertido', revertidoEn:ahora, revertidoPor:actor }));
      }
      if (venta.cajaRegistrada) tx.update(dCajaActual,{revisionMovimientos:increment(1)});
      regaloSnaps.forEach((s,i)=>{if(!s.exists())return;const antes=Number(s.data().stockActual||0),despues=antes+1;tx.update(regaloRefs[i],{stockActual:despues,actualizadoPor:actor,actualizadoEn:serverTimestamp()});tx.set(doc(cMovSt),{schemaVersion:1,productoId:regaloRefs[i].id,productoNombre:s.data().nombre||regalos[i].nombre||'',tipo:'reversion_regalo_venta_equipo',cantidad:1,stockAnterior:antes,stockResultante:despues,motivo:'Anulación de venta de equipo',referenciaTipo:'venta_equipo',referenciaId:id,usuario:actor,fechaHora:ahora,creadoEn:serverTimestamp()});});
      if(stockRef)tx.update(stockRef,{estado:venta.estadoVenta==='Reservada'?'Disponible':'A revisar',ventaActivaId:'',actualizadoPor:actor,actualizadoEn:serverTimestamp()});
      parteSnaps.forEach((p,i)=>tx.update(parteRefs[i],{estado:'Pendiente de devolución',partePagoAnulado:true,actualizadoPor:actor,actualizadoEn:serverTimestamp()}));
      tx.update(ventaRef, cambiosVenta);
      if (venta.cajaRegistrada) {
        (venta.pagos || []).forEach(p => {
          if (p.pagoId) tx.update(doc(cPagPos, p.pagoId), { estado:'revertido', revertidoEn:serverTimestamp(), revertidoPor:actor, motivoReversion:anulacion.motivo });
          tx.set(doc(cMovFin), { schemaVersion:2, cajaId:cajaId, tipo:'reversion_venta_equipo', referenciaTipo:'venta_equipo', referenciaId:id,
            ventaId:id, pagoId:p.pagoId || '', clienteNombre:venta.nombre || '', equipoModelo:venta.modelo || '', medio:p.medio || '', cuenta:p.cuenta || '',
            monto:-Number(p.monto || 0), moneda:p.moneda || 'USD', cotizacion:Number(p.cotizacion || 1), montoVentaUSD:-Number(p.montoVentaUSD || 0),
            motivo:anulacion.motivo, usuario:actor, fecha:hoy(), fechaHora:ahora, creadoEn:serverTimestamp() });
        });
      }
      tx.set(doc(cAud), { entidad:'venta_equipo', entidadId:id, accion:'anulada', actor:actor, cambios:[{campo:'estadoVenta',antes:venta.estadoVenta || 'Cobrada',despues:'Anulada'}],
        motivo:anulacion.motivo, cajaRevertida:!!venta.cajaRegistrada, fecha:hoy(), hora:horaActual(), creadoEn:serverTimestamp() });
    });
    cb(null);
  } catch (e) { cb((e.code ? e.code + ': ' : '') + e.message); }
};
window.FB.updV = async (id, d, cb) => {
  const keys=Object.keys(d),soloSeguimiento=keys.length>0 && keys.every(k=>['seg90_est','seg365_est','seguimiento'].includes(k));
  if(!puede(soloSeguimiento?'gestionar_seguimientos':'editar_ventas_equipos')) { cb('Sin permiso para editar venta'); return; }
  try {
    let cambios;
    await runTransaction(db,async tx=>{
    const ref=doc(cVen,id),snap=await tx.get(ref); if(!snap.exists())throw new Error('Venta no encontrada');
    const previo=snap.data();
    ['seg90_est','seg365_est'].forEach(k=>{if(Object.prototype.hasOwnProperty.call(d,k)&&!['pendiente','contactado','enviado','interesado','compro','no_interesa'].includes(d[k]))throw new Error('Estado de seguimiento inválido');});
    const operativos=['nombre','telefono','dni','direccion','email','modelo','capacidad','color','imei','vendedor','canal','notas','fecha','garantia','seguimiento','seg90_est','seg365_est'];
    if(previo.stockEquipoId && ['imei','modelo'].some(k=>Object.prototype.hasOwnProperty.call(d,k)&&String(d[k]||'').trim()!==String(previo[k]||'').trim()))throw new Error('El equipo está vinculado al stock y no puede cambiarse desde la venta');
    cambios=camposElegidos(d,soloSeguimiento?['seg90_est','seg365_est','seguimiento']:operativos);
    if(!soloSeguimiento && puede('editar_costos'))Object.assign(cambios,camposElegidos(d,['costo','costoConfirmado']));
    if(!soloSeguimiento && puede('gestionar_comisiones'))Object.assign(cambios,camposElegidos(d,['comisionExcepcion']));
    if(!soloSeguimiento && !previo.cajaRegistrada && Number(previo.schemaVersion||0)<2 && puede('editar_finanzas_ventas'))Object.assign(cambios,camposElegidos(d,['precio','estadoVenta','parte_pago','pp_modelo','pp_imei','pp_valor','pago']));
    tx.update(ref,Object.assign({},cambios,{_upd:serverTimestamp()}));
    tx.set(doc(cAud),{entidad:'venta',entidadId:id,accion:'actualizado',actor:usuarioActualRegistro(),cambios:cambiosAuditables(previo,cambios),fecha:hoy(),hora:horaActual(),creadoEn:serverTimestamp()});
    });
    cb(null);v21Sync('venta',id,cambios,'venta_actualizada');
  }catch(e){cb(e.message);}
};
window.FB.delV = (id, cb) => { if (!puede('eliminar_operaciones')) { cb('Solo administrador puede eliminar operaciones'); return; } eliminarAuditable('ventas', 'venta', id).then(()=>cb(null)).catch(e=>cb(e.message)); };

// ── CRUD stock ──
window.FB.addSt = (d, cb) => {
  if (!puede('gestionar_stock_equipos')) { cb('Sin permiso para agregar equipos al stock'); return; }
  const guardar=camposElegidos(d,['modelo','capacidad','color','detalles','imei','notas','estado','fecha']);
  if(puede('editar_costos'))Object.assign(guardar,camposElegidos(d,['precio_costo','precio_venta']));
  agregarAuditable('stock', 'stock', guardar).then(id => { cb(null, id); v21Sync('stock', id, guardar, 'stock_creado'); }).catch(e => cb(e.message));
};
window.FB.updSt = async (id, d, cb) => {
  if (!puede('gestionar_stock_equipos')) { cb('Sin permiso para editar equipos del stock'); return; }
  try {
    const cambios=camposElegidos(d,['modelo','capacidad','color','detalles','imei','notas','estado','fecha']);
    if(puede('editar_costos'))Object.assign(cambios,camposElegidos(d,['precio_costo','precio_venta']));
    await runTransaction(db,async tx=>{
      const ref=doc(cSt,id),snap=await tx.get(ref);if(!snap.exists())throw new Error('El equipo ya no existe');
      const previo=snap.data();
      if(previo.ventaActivaId && ['estado','imei','modelo'].some(k=>Object.prototype.hasOwnProperty.call(cambios,k)&&cambios[k]!==previo[k]))throw new Error('El equipo está vinculado a una venta/reserva; completá o anulá esa operación para liberarlo');
      if(previo.partePagoAnulado && cambios.estado && !['Pendiente de devolución','Devuelto al cliente'].includes(cambios.estado))throw new Error('La parte de pago está anulada; confirmá su devolución al cliente');
      tx.update(ref,Object.assign({},cambios,{_upd:serverTimestamp()}));
      tx.set(doc(cAud),{entidad:'stock',entidadId:id,accion:'actualizado',actor:usuarioActualRegistro(),cambios:cambiosAuditables(previo,cambios),fecha:hoy(),hora:horaActual(),creadoEn:serverTimestamp()});
    });cb(null);v21Sync('stock',id,cambios,'stock_actualizado');
  }catch(e){cb(e.message);}
};
window.FB.delSt = async (id, cb) => {
  if (!puede('eliminar_operaciones')) { cb('Solo administrador puede eliminar operaciones'); return; }
  try {
    await runTransaction(db,async tx=>{
      const ref=doc(cSt,id),snap=await tx.get(ref);if(!snap.exists())throw new Error('El equipo ya no existe');
      if(snap.data().ventaActivaId || snap.data().ventaOrigenId)throw new Error('Este equipo está vinculado a una operación; conservá el registro y actualizá su estado');
      tx.delete(ref);tx.set(doc(cAud),{entidad:'stock',entidadId:id,accion:'eliminado',actor:usuarioActualRegistro(),cambios:cambiosAuditables(snap.data(),{}),fecha:hoy(),hora:horaActual(),creadoEn:serverTimestamp()});
    });cb(null);
  }catch(e){cb(e.message);}
};

// ── POS V1: productos, inventario y ventas atomicas ──
window.FB.guardarProductoPos = async (data, cb) => {
  if (!puede('gestionar_productos')) { cb('Solo administración puede gestionar productos'); return; }
  try {
    const id = data.id || doc(cPro).id, ref = doc(cPro, id);
    const nombre = String(data.nombre || '').trim(), sku = String(data.sku || '').trim(), barcode = String(data.barcode || '').trim();
    const stockInicial = Number(data.stockInicial || 0);
    if (!nombre) throw new Error('El nombre es obligatorio');
    if (![data.costo, data.precio, stockInicial].every(v => Number.isFinite(Number(v)) && Number(v) >= 0)) throw new Error('Costo, precio y stock deben ser números positivos');
    const consultas = [];
    if (sku) consultas.push(getDocs(query(cPro, where('sku', '==', sku))));
    if (barcode) consultas.push(getDocs(query(cPro, where('barcode', '==', barcode))));
    const duplicados = await Promise.all(consultas);
    if (duplicados.some(s => s.docs.some(d => d.id !== id))) throw new Error('El SKU o código de barras ya pertenece a otro producto');
    const actor = usuarioActualRegistro(), ahora = new Date().toISOString();
    await runTransaction(db, async tx => {
      const previoSnap = await tx.get(ref), previo = previoSnap.exists() ? previoSnap.data() : null;
      const stockActual = previo ? Number(previo.stockActual || 0) : (data.controlaStock ? stockInicial : 0);
      const moneda = data.moneda === 'USD' ? 'USD' : 'ARS';
      const guardar = { schemaVersion:1, nombre:nombre, categoria:String(data.categoria || '').trim(), subcategoria:String(data.subcategoria || '').trim(),
        sku:sku, barcode:barcode, costo:puede('editar_costos') ? Number(data.costo || 0) : Number(previo && previo.costo || 0), precio:Number(data.precio || 0), moneda:moneda,
        controlaStock:!!data.controlaStock, stockActual:stockActual, activo:data.activo !== false,
        proveedorId:data.proveedorId || null, ecommerce:{ publicado:false }, variantes:[], actualizadoPor:actor, actualizadoEn:serverTimestamp() };
      if (!previo) guardar.creadoEn = serverTimestamp();
      tx.set(ref, guardar, { merge:true });
      if (!previo && guardar.controlaStock && stockInicial !== 0) {
        tx.set(doc(cMovSt), { schemaVersion:1, productoId:id, productoNombre:nombre, tipo:'stock_inicial', cantidad:stockInicial,
          stockAnterior:0, stockResultante:stockInicial, motivo:'Alta de producto', referenciaTipo:'producto', referenciaId:id,
          usuario:actor, fechaHora:ahora, creadoEn:serverTimestamp() });
      }
      tx.set(doc(cAud), { entidad:'producto', entidadId:id, accion:previo?'actualizado':'creado', actor:actor,
        cambios:cambiosAuditables(previo || {}, guardar), fecha:hoy(), hora:horaActual(), creadoEn:serverTimestamp() });
    });
    cb(null, id);
  } catch (e) { cb((e.code ? e.code + ': ' : '') + e.message); }
};

window.FB.ajustarStockPos = async (data, cb) => {
  if (!puede('ajustar_stock_pos')) { cb('Sin permiso para ajustar stock'); return; }
  try {
    const ref = doc(cPro, data.productoId), cantidad = Number(data.cantidad);
    if (!Number.isFinite(cantidad) || cantidad === 0) throw new Error('La cantidad debe ser distinta de cero');
    if (!String(data.motivo || '').trim()) throw new Error('Indicá el motivo del movimiento de stock');
    const actor = usuarioActualRegistro(), ahora = new Date().toISOString();
    await runTransaction(db, async tx => {
      const snap = await tx.get(ref);
      if (!snap.exists()) throw new Error('Producto inexistente');
      const p = snap.data();
      if (!p.controlaStock) throw new Error('Este producto no controla stock');
      const anterior = Number(p.stockActual || 0), resultante = anterior + cantidad;
      if (resultante < 0) throw new Error('El ajuste dejaría stock negativo');
      tx.update(ref, { stockActual:resultante, actualizadoPor:actor, actualizadoEn:serverTimestamp() });
      tx.set(doc(cMovSt), { schemaVersion:1, productoId:ref.id, productoNombre:p.nombre || '', tipo:data.tipo || (cantidad > 0 ? 'ajuste_positivo' : 'ajuste_negativo'),
        cantidad:cantidad, stockAnterior:anterior, stockResultante:resultante, motivo:String(data.motivo || '').trim(),
        referenciaTipo:'ajuste', referenciaId:null, usuario:actor, fechaHora:ahora, creadoEn:serverTimestamp() });
      tx.set(doc(cAud), { entidad:'stock_producto', entidadId:ref.id, accion:'ajustado', actor:actor,
        cambios:[{ campo:'stockActual', antes:anterior, despues:resultante }], fecha:hoy(), hora:horaActual(), creadoEn:serverTimestamp() });
    });
    cb(null);
  } catch (e) { cb(e.message); }
};

window.FB.registrarCobroReparacion = async (id, nuevosPagos, cb) => {
  if (!puede('cobrar_reparacion')) { cb('Sin permiso para cobrar reparaciones'); return; }
  try {
    const pagosEntrada = Array.isArray(nuevosPagos) ? nuevosPagos : [];
    if (!pagosEntrada.length || pagosEntrada.some(p => !(Number(p.monto) > 0) || !p.medio || !p.cuenta)) throw new Error('Cada pago necesita medio, cuenta e importe');
    const reparacionRef = doc(cR, id), pagoRefs = pagosEntrada.map(() => doc(cPagPos));
    const movimientoRefs = pagoRefs.map(p => doc(cMovFin, 'mov_rep_' + p.id));
    const actor = usuarioActualRegistro(), ahora = new Date().toISOString();
    let saldoFinal = 0;
    await runTransaction(db, async tx => {
      const snap = await tx.get(reparacionRef);
      const cajaSnap = await tx.get(dCajaActual);
      if (!snap.exists()) throw new Error('La reparación ya no existe');
      if (!cajaSnap.exists() || cajaSnap.data().estado !== 'abierta') throw new Error('Primero abrí la caja');
      const cajaId = cajaSnap.data().cajaId;
      const r = snap.data(), presupuesto = Number(r.presupuesto || 0),vistos=new Set();
      if (typeof reparacionEsSinCargo === 'function' && reparacionEsSinCargo(r)) throw new Error('La reparación está definida sin cargo');
      if (!(presupuesto > 0)) throw new Error('Definí el presupuesto antes de registrar un cobro');
      const existentesRaw = Array.isArray(r.pagos) && r.pagos.length ? r.pagos.slice() : (r.controlComisionV1!==true&&Number(r.sena||0)>0 ? [{ monto:Number(r.sena), fecha:r.fecha || '', medio:'Registro previo', cuenta:'Sin especificar', moneda:'ARS', legacy:true }] : []);
      const existentes=existentesRaw.filter(p=>{if(!(Number(p&&p.monto||0)>0)||p.estado==='revertido')return false;if(p.pagoId){if(vistos.has(p.pagoId))return false;vistos.add(p.pagoId);}return true;});
      const cobradoAnterior = existentes.reduce((s,p) => s + Number(p.monto || 0), 0);
      const ingreso = pagosEntrada.reduce((s,p) => s + Number(p.monto || 0), 0);
      if (presupuesto > 0 && cobradoAnterior + ingreso > presupuesto + 0.01) throw new Error('El cobro supera el saldo pendiente');
      const embebidos = pagosEntrada.map((p,idx) => ({ pagoId:pagoRefs[idx].id, movimientoFinancieroId:movimientoRefs[idx].id, monto:Number(p.monto), fecha:p.fecha || hoy(),
        medio:p.medio, cuenta:p.cuenta, moneda:'ARS', notas:String(p.notas || ''), estado:'aplicado', usuario:actor, fechaHora:ahora }));
      const pagosFinales = existentes.concat(embebidos), totalCobrado = cobradoAnterior + ingreso;
      saldoFinal = Math.max(0, presupuesto-totalCobrado);
      const financieros = { pagos:pagosFinales, totalCobrado:totalCobrado, saldo:saldoFinal,
        pago:presupuesto > 0 ? (totalCobrado >= presupuesto ? 'Pagado' : 'Pendiente') : (r.pago || 'Pendiente') };
      tx.update(dCajaActual,{revisionMovimientos:increment(1)});
      tx.update(reparacionRef, Object.assign({}, financieros, { actualizadoEn:serverTimestamp() }));
      embebidos.forEach((p,idx) => {
        const pagoDoc = Object.assign({}, p, { schemaVersion:1, cajaId:cajaId, origenTipo:'reparacion', origenId:id, reparacionId:id,
          orden:r.orden || '', clienteNombre:r.nombre || '', creadoEn:serverTimestamp() });
        tx.set(pagoRefs[idx], pagoDoc);
        tx.set(movimientoRefs[idx], Object.assign({}, pagoDoc, { movimientoFinancieroId:movimientoRefs[idx].id, cajaId:cajaId, tipo:'ingreso_reparacion', referenciaTipo:'reparacion', referenciaId:id }));
      });
      tx.set(doc(cAud), { entidad:'reparacion', entidadId:id, accion:'cobro_registrado', actor:actor,
        cambios:[{campo:'totalCobrado',antes:cobradoAnterior,despues:totalCobrado},{campo:'saldo',antes:Math.max(0,presupuesto-cobradoAnterior),despues:saldoFinal}],
        fecha:hoy(), hora:horaActual(), creadoEn:serverTimestamp() });
    });
    actualizarPortalEnSegundoPlano(id);
    cb(null, { saldo:saldoFinal, movimientosCreados:pagosEntrada.length });
  } catch (e) { cb((e.code ? e.code + ': ' : '') + e.message); }
};

window.FB.revertirCobroReparacion = async (id, pagoId, motivo, cb) => {
  if (!puede('gestionar_comisiones')) { cb('Sólo administración puede revertir cobros'); return; }
  try {
    motivo=String(motivo||'').trim(); if(!motivo)throw new Error('El motivo es obligatorio');
    const reparacionRef=doc(cR,id),pagoRef=doc(cPagPos,pagoId),reversionRef=doc(cMovFin),actor=usuarioActualRegistro(),ahora=new Date().toISOString();
    await runTransaction(db,async tx=>{
      const repSnap=await tx.get(reparacionRef),pagoSnap=await tx.get(pagoRef),cajaSnap=await tx.get(dCajaActual);
      if(!repSnap.exists())throw new Error('La reparación ya no existe');
      if(!pagoSnap.exists())throw new Error('El pago no existe o es histórico');
      if(!cajaSnap.exists()||cajaSnap.data().estado!=='abierta')throw new Error('Primero abrí la caja');
      const r=repSnap.data(),p=pagoSnap.data(); if(p.estado==='revertido')throw new Error('El pago ya fue revertido');
      if((p.reparacionId||p.origenId)!==id)throw new Error('El pago no pertenece a esta reparación');
      const pagos=(Array.isArray(r.pagos)?r.pagos:[]).map(x=>x.pagoId===pagoId?Object.assign({},x,{estado:'revertido',revertidoEn:ahora,revertidoPor:actor,motivoReversion:motivo}):x);
      const activos=pagos.filter(x=>x.estado!=='revertido'),total=activos.reduce((s,x)=>s+Number(x.monto||0),0),presupuesto=Number(r.presupuesto||0);
      tx.update(dCajaActual,{revisionMovimientos:increment(1)});
      tx.update(pagoRef,{estado:'revertido',revertidoEn:serverTimestamp(),revertidoPor:actor,motivoReversion:motivo,reversionMovimientoId:reversionRef.id});
      tx.update(reparacionRef,{pagos:pagos,totalCobrado:total,saldo:Math.max(0,presupuesto-total),pago:total>=presupuesto&&presupuesto>0?'Pagado':(total>0?'Parcial':'Pendiente'),actualizadoEn:serverTimestamp()});
      tx.set(reversionRef,{schemaVersion:2,cajaId:cajaSnap.data().cajaId,tipo:'reversion_cobro_reparacion',referenciaTipo:'reparacion',referenciaId:id,reparacionId:id,pagoOriginalId:pagoId,orden:r.orden||'',clienteNombre:r.nombre||'',medio:p.medio||'',cuenta:p.cuenta||'',monto:-Number(p.monto||0),moneda:p.moneda||'ARS',motivo:motivo,usuario:actor,fecha:hoy(),fechaHora:ahora,creadoEn:serverTimestamp()});
      tx.set(doc(cAud),{entidad:'reparacion',entidadId:id,accion:'cobro_revertido',actor:actor,cambios:[{campo:'totalCobrado',antes:Number(r.totalCobrado||0),despues:total}],pagoId:pagoId,motivo:motivo,fecha:hoy(),hora:horaActual(),creadoEn:serverTimestamp()});
    }); actualizarPortalEnSegundoPlano(id); cb(null);
  } catch(e){cb((e.code?e.code+': ':'')+e.message);}
};

window.FB.crearVentaPos = async (data, cb) => {
  if (!puede('vender_accesorios')) { cb('Sin permiso para vender accesorios'); return; }
  try {
    const items = Array.isArray(data.items) ? data.items : [], pagos = Array.isArray(data.pagos) ? data.pagos : [];
    if (!items.length) throw new Error('La venta no tiene productos');
    const total = Number(data.total || 0), totalPagos = pagos.reduce((s,p) => s + Number(p.monto || 0), 0);
    const monedaVenta = data.moneda === 'USD' ? 'USD' : 'ARS';
    if (!(total > 0) || Math.abs(totalPagos - total) > 0.01) throw new Error('Los pagos deben coincidir con el total');
    if (pagos.some(p => !(Number(p.monto) > 0) || !p.medio || !p.cuenta || (p.moneda || monedaVenta) !== monedaVenta)) throw new Error('Cada pago necesita medio, cuenta, importe y la moneda de la venta');
    const refs = items.map(i => i.servicioMaestroId ? doc(cServicios,i.servicioMaestroId) : doc(cPro, i.productoId)), ventaRef = doc(cVen), pagoRefs = pagos.map(() => doc(cPagPos));
    const actor = usuarioActualRegistro(), ahora = new Date().toISOString();
    let numero = 0;
    await runTransaction(db, async tx => {
      const contadorSnap = await tx.get(dContVentas), cajaSnap = await tx.get(dCajaActual), productosSnaps = [];
      if (!cajaSnap.exists() || cajaSnap.data().estado !== 'abierta') throw new Error('Primero abrí la caja');
      const cajaId = cajaSnap.data().cajaId;
      for (const ref of refs) productosSnaps.push(await tx.get(ref));
      numero = Number(contadorSnap.exists() ? contadorSnap.data().ultimoNumero || 0 : 0) + 1;
      const snapshots = [];
      items.forEach((item, idx) => {
        const snap = productosSnaps[idx];
        if (!snap.exists()) throw new Error('Un producto ya no existe');
        const p = snap.data(), cantidad = Number(item.cantidad || 0),esServicio=!!item.servicioMaestroId;
        if (p.activo === false || !(cantidad > 0)) throw new Error('Producto inactivo o cantidad inválida: ' + (p.nombre || ''));
        if ((esServicio?'ARS':(p.moneda || 'ARS')) !== monedaVenta) throw new Error('No se pueden mezclar productos ARS y USD');
        const anterior = Number(p.stockActual || 0);
        if (p.controlaStock && anterior < cantidad) throw new Error('Stock insuficiente: ' + p.nombre);
        snapshots.push({ ref:refs[idx], p:p, cantidad:cantidad, anterior:anterior, esServicio:esServicio, solicitado:item });
      });
      let subtotalValidado = 0, descuentoItemsValidado = 0, costoValidado = 0;
      const itemsVenta = snapshots.map((x, idx) => {
        const solicitado = items[idx], precioLista = Number(x.esServicio?x.p.precioPublico:x.p.precio || 0), costoUnitario = Number(x.esServicio?x.p.costoDirectoEstimado:x.p.costo || 0);
        const porcentaje = Math.max(0, Math.min(100, Number(solicitado.descuentoPorcentaje || 0)));
        const bruto = precioLista * x.cantidad, descuentoImporte = bruto * porcentaje / 100, subtotalFinal = bruto - descuentoImporte;
        subtotalValidado += bruto; descuentoItemsValidado += descuentoImporte; costoValidado += costoUnitario * x.cantidad;
        return { productoId:x.esServicio?null:x.ref.id, servicioMaestroId:x.esServicio?x.ref.id:null, servicioSnapshot:x.esServicio?solicitado.servicioSnapshot:null, nombre:x.esServicio?(x.p.nombrePublico||'Servicio'):x.p.nombre || '', sku:x.p.sku || '', barcode:x.p.barcode || '', cantidad:x.cantidad,
          precioLista:precioLista, descuentoPorcentaje:porcentaje, descuentoImporte:descuentoImporte,
          precioFinal:subtotalFinal / x.cantidad, costoUnitario:costoUnitario, costoTotal:costoUnitario*x.cantidad,
          controlaStock:!!x.p.controlaStock, moneda:x.p.moneda || data.moneda || 'ARS' };
      });
      const baseGlobal = Math.max(0, subtotalValidado - descuentoItemsValidado);
      const porcGlobal = Math.max(0, Math.min(100, Number(data.descuentoGlobal && data.descuentoGlobal.porcentaje || 0)));
      const importePorcentaje = Math.min(baseGlobal, baseGlobal * porcGlobal / 100);
      const importeFijo = Math.min(Math.max(0, baseGlobal - importePorcentaje), Math.max(0, Number(data.descuentoGlobal && data.descuentoGlobal.importeFijo || 0)));
      const totalValidado = Math.max(0, baseGlobal - importePorcentaje - importeFijo);
      if (Math.abs(totalValidado - total) > 0.01) throw new Error('El precio o descuento cambió; revisá la venta antes de cobrar');
      tx.update(dCajaActual,{revisionMovimientos:increment(1)});
      tx.set(dContVentas, { ultimoNumero:numero, actualizadoEn:serverTimestamp() }, { merge:true });
      const pagosVenta = pagos.map((p, idx) => Object.assign({}, p, { pagoId:pagoRefs[idx].id }));
      const venta = Object.assign({}, data, { items:itemsVenta, pagos:pagosVenta, subtotal:subtotalValidado,
        descuentoItems:descuentoItemsValidado, descuentoGlobal:{ porcentaje:porcGlobal, importePorcentaje:importePorcentaje, importeFijo:importeFijo },
        descuentoTotal:descuentoItemsValidado+importePorcentaje+importeFijo, total:totalValidado,
        costoTotal:costoValidado, margenBruto:totalValidado-costoValidado, schemaVersion:1, tipoRegistro:'pos', numeroVenta:numero,
        numeroHumano:'Venta #' + String(numero).padStart(6, '0'), estado:'activa', usuario:actor, fechaHora:ahora, creadoEn:serverTimestamp() });
      venta.fecha = hoy(); venta.hora = horaActual();
      tx.set(ventaRef, venta);
      snapshots.forEach(x => {
        if (!x.p.controlaStock) return;
        const resultante = x.anterior - x.cantidad;
        tx.update(x.ref, { stockActual:resultante, actualizadoPor:actor, actualizadoEn:serverTimestamp() });
        tx.set(doc(cMovSt), { schemaVersion:1, productoId:x.ref.id, productoNombre:x.p.nombre || '', tipo:'venta', cantidad:-x.cantidad,
          stockAnterior:x.anterior, stockResultante:resultante, referenciaTipo:'venta', referenciaId:ventaRef.id,
          numeroVenta:numero, usuario:actor, fechaHora:ahora, creadoEn:serverTimestamp() });
      });
      pagos.forEach((p, idx) => {
        const pagoRef = pagoRefs[idx];
        const pago = { schemaVersion:1, ventaId:ventaRef.id, numeroVenta:numero, medio:p.medio, cuenta:p.cuenta,
          monto:Number(p.monto), moneda:p.moneda || data.moneda || 'ARS', cotizacion:Number(p.cotizacion || data.cotizacion || 0),
          estado:'aplicado', usuario:actor, fechaHora:ahora, creadoEn:serverTimestamp() };
        tx.set(pagoRef, pago);
        tx.set(doc(cMovFin), Object.assign({}, pago, { cajaId:cajaId, pagoId:pagoRef.id, tipo:'ingreso_venta', referenciaTipo:'venta', referenciaId:ventaRef.id }));
      });
      tx.set(doc(cAud), { entidad:'venta_pos', entidadId:ventaRef.id, accion:'creada', actor:actor,
        cambios:[], numeroVenta:numero, total:total, fecha:hoy(), hora:horaActual(), creadoEn:serverTimestamp() });
    });
    cb(null, { id:ventaRef.id, numeroVenta:numero });
  } catch (e) { cb((e.code ? e.code + ': ' : '') + e.message); }
};

window.FB.anularVentaPos = async (id, motivo, cb) => {
  if (!puede('anular_venta_pos')) { cb('Solo administración puede anular ventas'); return; }
  try {
    const ventaRef = doc(cVen, id), actor = usuarioActualRegistro(), ahora = new Date().toISOString();
    await runTransaction(db, async tx => {
      const ventaSnap = await tx.get(ventaRef);
      if (!ventaSnap.exists()) throw new Error('Venta inexistente');
      const v = ventaSnap.data();
      const cajaSnap = await tx.get(dCajaActual);
      if (!cajaSnap.exists() || cajaSnap.data().estado !== 'abierta') throw new Error('Primero abrí la caja');
      const cajaId = cajaSnap.data().cajaId;
      if (v.tipoRegistro !== 'pos') throw new Error('La venta anterior debe anularse desde su flujo original');
      if (v.estado !== 'activa') throw new Error('La venta ya no está activa');
      const items = Array.isArray(v.items) ? v.items : [], refs = items.map(i => doc(cPro, i.productoId)), snaps = [];
      for (const ref of refs) snaps.push(await tx.get(ref));
      tx.update(dCajaActual,{revisionMovimientos:increment(1)});
      tx.update(ventaRef, { estado:'anulada', anulacion:{ motivo:String(motivo || '').trim(), usuario:actor, fechaHora:ahora }, actualizadoEn:serverTimestamp() });
      items.forEach((item, idx) => {
        if (!item.controlaStock) return;
        if (!snaps[idx].exists()) throw new Error('No se puede restituir un producto inexistente');
        const anterior = Number(snaps[idx].data().stockActual || 0), cantidad = Number(item.cantidad || 0), resultante = anterior + cantidad;
        tx.update(refs[idx], { stockActual:resultante, actualizadoPor:actor, actualizadoEn:serverTimestamp() });
        tx.set(doc(cMovSt), { schemaVersion:1, productoId:item.productoId, productoNombre:item.nombre || '', tipo:'anulacion_venta', cantidad:cantidad,
          stockAnterior:anterior, stockResultante:resultante, referenciaTipo:'venta', referenciaId:id, numeroVenta:v.numeroVenta,
          motivo:String(motivo || '').trim(), usuario:actor, fechaHora:ahora, creadoEn:serverTimestamp() });
      });
      (v.pagos || []).forEach(p => {
        if (p.pagoId) tx.update(doc(cPagPos, p.pagoId), { estado:'revertido', revertidoEn:serverTimestamp(), revertidoPor:actor, motivoReversion:String(motivo || '').trim() });
        tx.set(doc(cMovFin), { schemaVersion:1, cajaId:cajaId, ventaId:id, numeroVenta:v.numeroVenta, tipo:'reversion_venta', medio:p.medio,
          cuenta:p.cuenta, monto:-Number(p.monto || 0), moneda:p.moneda || v.moneda || 'ARS', referenciaTipo:'venta', referenciaId:id,
          motivo:String(motivo || '').trim(), usuario:actor, fechaHora:ahora, creadoEn:serverTimestamp() });
      });
      tx.set(doc(cAud), { entidad:'venta_pos', entidadId:id, accion:'anulada', actor:actor, cambios:[], motivo:String(motivo || '').trim(),
        numeroVenta:v.numeroVenta, fecha:hoy(), hora:horaActual(), creadoEn:serverTimestamp() });
    });
    cb(null);
  } catch (e) { cb(e.message); }
};

// ── setUsados ──
window.FB.setUsados = async (items, cb) => {
  if (!puede('actualizar_cotizador')) { cb('Sin permiso para actualizar la base del cotizador'); return; }
  try {
    const old = await getDocs(cUsa);
    const b1 = writeBatch(db); old.docs.forEach(d => b1.delete(d.ref)); await b1.commit();
    const b2 = writeBatch(db);
    items.forEach(u => {
      const clave = u.modeloClave || (window.MAXPOINT_COTIZADOR && window.MAXPOINT_COTIZADOR.modeloClave(u.modelo, true)) || u.modelo.replace(/[^a-zA-Z0-9]/g,'_');
      const r = doc(cUsa, clave); b2.set(r, Object.assign({}, u, { modeloClave:clave }));
    });
    await b2.commit(); await registrarAuditoria('cotizador', 'usados', 'base_reemplazada', {}, { modelos: items.length }); await publicarCotizadorPublico(); cb(null);
  } catch(e) { cb(e.message); }
};

// ── setCat ──

// Configuración incremental de roles y asistencia, sin alterar datos operativos.
window.FB.guardarPermisosRoles = async function(permisos, cb) {
  if (!esAdministrador()) { cb('Solo administración puede configurar permisos'); return; }
  const limpio = {};
  Object.keys(PERMISOS_BASE).forEach(function(k) {
    limpio[k] = {};
    ['tecnico','recepcionista'].forEach(function(rol) {
      limpio[k][rol] = !!(permisos[k] && permisos[k][rol]);
    });
  });
  try { await actualizarAuditable('config', 'permisos_roles', 'permisosRoles', { permisos:limpio }); cb(null); }
  catch(e) { cb(e.message); }
};
window.FB.cargarAsistenciasTecnicos = async function(cb) {
  if (!esAdministrador()) { cb('Solo administración puede consultar asistencia'); return; }
  try {
    const snap = await getDocs(collection(db,'sesionesDiarias'));
    ASISTENCIAS_TECNICOS = snap.docs.map(d => ({id:d.id, ...d.data()})); cb(null);
  } catch(e) { cb(e.message); }
};

// Lecturas públicas separadas de datos internos. No se eliminan registros.
let colaPortalPublico=Promise.resolve(), portalProcesando=false;
let portalPersistenciaDisponible=true, portalPersistenciaAvisada=false;
const portalPendienteMemoria={};
const portalAvisosPendientes=new Set();
function leerPortalPendiente(uid) {
  if(!portalPersistenciaDisponible)return portalPendienteMemoria[uid] || {};
  try {
    const datos=JSON.parse(localStorage.getItem('maxpoint_portal_pendiente_v1_'+uid) || '{}');
    const limpio={};
    if(datos && typeof datos==='object' && !Array.isArray(datos))Object.keys(datos).forEach(id=>{
      if(typeof datos[id]==='string')limpio[id]=datos[id];
    });
    portalPendienteMemoria[uid]=limpio;
    return limpio;
  }catch(e){portalPersistenciaDisponible=false;return portalPendienteMemoria[uid] || {};}
}
function guardarPortalPendiente(uid,datos) {
  portalPendienteMemoria[uid]=datos;
  try {localStorage.setItem('maxpoint_portal_pendiente_v1_'+uid,JSON.stringify(datos));}
  catch(e) {
    if(!portalPersistenciaAvisada) {portalPersistenciaAvisada=true;toast('No se pudo conservar la actualización pendiente del portal al cerrar este navegador','var(--rd)');}
    portalPersistenciaDisponible=false;
  }
}
function actualizarPortalEnSegundoPlano(id) {
  if(!SESION.usuario || !id)return;
  const uid=SESION.usuario.uid, pendientes=leerPortalPendiente(uid);
  pendientes[id]=Date.now().toString(36)+'_'+Math.random().toString(36).slice(2);
  guardarPortalPendiente(uid,pendientes);
  return reanudarPortalPendiente();
}
function reanudarPortalPendiente() {
  if(portalProcesando || !sesionActiva() || PERMISOS_ESTADO!=='listo')return colaPortalPublico;
  if(!['gestionar_portal_cliente','editar_reparacion','cobrar_reparacion','gestionar_comisiones','eliminar_operaciones','importar_reparaciones','gestionar_seguimientos'].some(p=>puede(p)))return colaPortalPublico;
  const uid=SESION.usuario.uid, pendientes=Object.assign({},leerPortalPendiente(uid));
  if(!Object.keys(pendientes).length)return colaPortalPublico;
  portalProcesando=true;
  colaPortalPublico=(async function() {
    for(const id of Object.keys(pendientes)) {
      if(!sesionActiva() || SESION.usuario.uid!==uid)break;
      try {
        await publicarPortalReparacion(id);
        const actuales=leerPortalPendiente(uid);
        // No borrar una actualización más reciente del mismo equipo/pestaña.
        if(actuales[id]===pendientes[id]) {delete actuales[id];guardarPortalPendiente(uid,actuales);}
        portalAvisosPendientes.delete(uid+'_'+id);
      }catch(e) {
        console.error('Actualización del portal pendiente:',e);
        if(!portalAvisosPendientes.has(uid+'_'+id)) {
          portalAvisosPendientes.add(uid+'_'+id);
          toast('La operación se guardó; se reintentará actualizar el portal: '+e.message,'var(--rd)');
        }
      }
    }
  })().finally(()=>{portalProcesando=false;});
  return colaPortalPublico;
}
window.addEventListener('online',()=>reanudarPortalPendiente());
setInterval(()=>reanudarPortalPendiente(),30000);
async function publicarGrupoPortal(tel,extraIds,baseReps) {
  const core=window.MAXPOINT_PUBLICO;
  const indices=await getDocsFromServer(query(collection(db,'portalIndices'),where('telefonoClave','==',tel)));
  const ids=Array.from(new Set((baseReps||window.REPS||[]).filter(r=>core.telefono(r.telefono)===tel).map(r=>r.id).concat(indices.docs.map(d=>d.id),extraIds||[])));
  if(ids.length>400)throw new Error('Este cliente supera 400 órdenes; requiere publicación paginada');
  for(const id of ids) {
    const origen=await getDocFromServer(doc(cR,id)), indice=await getDocFromServer(doc(db,'portalIndices',id));
    const actual=origen.exists()?origen.data():null, anterior=indice.exists()?indice.data():null;
    const claveActual=actual&&core.telefono(actual.telefono)===tel?await core.acceso(actual.telefono,actual.orden):'';
    const claves=Array.from(new Set([claveActual,anterior&&anterior.telefonoClave===tel?anterior.accesoId:''].filter(Boolean)));
    for(const clave of claves)await runTransaction(db,async tx=>{
      const refs=ids.map(i=>doc(cR,i)), snapshots=[];
      for(const ref of refs)snapshots.push(await tx.get(ref));
      const propio=snapshots[ids.indexOf(id)], datos=propio.exists()?propio.data():null;
      const habilitado=!!datos&&core.telefono(datos.telefono)===tel&&(await core.acceso(datos.telefono,datos.orden))===clave;
      const raiz=doc(db,'portalAccesos',clave);
      tx.set(raiz,{activo:habilitado,actualizadoEn:serverTimestamp()});
      if(!habilitado)return;
      snapshots.forEach((snap,i)=>{
        const r=snap.exists()?snap.data():null;
        const vista=r&&core.telefono(r.telefono)===tel?core.reparacion(r,totalCobradoReparacion(r),reparacionEsSinCargo(r)):{visible:false};
        tx.set(doc(db,'portalAccesos',clave,'reparaciones',ids[i]),Object.assign({},vista,{actualizadoEn:serverTimestamp()}));
      });
      tx.set(doc(db,'portalIndices',id),{telefonoClave:tel,accesoId:clave,actualizadoEn:serverTimestamp()});
    });
  }
}
async function publicarPortalReparacion(id) {
  if(!sesionActiva())throw new Error('Sesión activa requerida');
  const [origen,indice]=await Promise.all([getDocFromServer(doc(cR,id)),getDocFromServer(doc(db,'portalIndices',id))]);
  const tel=origen.exists()?window.MAXPOINT_PUBLICO.telefono(origen.data().telefono):'';
  const previo=indice.exists()?indice.data().telefonoClave:'';
  for(const t of Array.from(new Set([previo,tel].filter(Boolean))))await publicarGrupoPortal(t,[id]);
}
async function publicarCotizadorPublico() {
  const [usados,cat,publicado]=await Promise.all([getDocsFromServer(cUsa),getDocsFromServer(cCat),getDocsFromServer(collection(db,'cotizadorPublico'))]);
  const datos=window.MAXPOINT_PUBLICO.cotizador(usados.docs.map(d=>d.data()),cat.docs.map(d=>d.data()),window.MAXPOINT_COTIZADOR);
  const vigentes=new Set(datos.map(d=>d.modeloClave));
  const tareas=datos.map(d=>({id:d.modeloClave,data:d})).concat(publicado.docs.filter(d=>!vigentes.has(d.id)).map(d=>({id:d.id,data:{activo:false}})));
  for(let i=0;i<tareas.length;i+=350) {
    const batch=writeBatch(db);
    tareas.slice(i,i+350).forEach(x=>batch.set(doc(db,'cotizadorPublico',x.id),Object.assign({},x.data,{actualizadoEn:serverTimestamp()}),{merge:true}));
    await batch.commit();
  }
}
window.FB.actualizarLecturasPublicas=async function(cb) {
  if(!esAdministrador()){cb('Solo administración puede inicializar las lecturas públicas');return;}
  try {
    const snap=await getDocsFromServer(cR), reps=snap.docs.map(d=>({id:d.id,...d.data()}));
    const telefonos=Array.from(new Set(reps.map(r=>window.MAXPOINT_PUBLICO.telefono(r.telefono)).filter(Boolean)));
    // Incluye accesos anteriores para desactivar órdenes retiradas/cambiadas.
    const indices=await getDocsFromServer(collection(db,'portalIndices'));
    const porId=new Map(reps.map(r=>[r.id,r]));
    for(const indice of indices.docs) {
      const previo=indice.data(), actual=porId.get(indice.id);
      if(!previo.accesoId)continue;
      if(actual && await window.MAXPOINT_PUBLICO.acceso(actual.telefono,actual.orden)===previo.accesoId)continue;
      await runTransaction(db,async tx=>{
        const origen=await tx.get(doc(cR,indice.id)), r=origen.exists()?origen.data():null;
        const claveActual=r?await window.MAXPOINT_PUBLICO.acceso(r.telefono,r.orden):'';
        if(claveActual!==previo.accesoId)tx.set(doc(db,'portalAccesos',previo.accesoId),{activo:false,actualizadoEn:serverTimestamp()});
      });
    }
    indices.docs.forEach(d=>{if(d.data().telefonoClave&&!telefonos.includes(d.data().telefonoClave))telefonos.push(d.data().telefonoClave);});
    for(const tel of telefonos)await publicarGrupoPortal(tel,[],reps);
    await publicarCotizadorPublico();
    await registrarAuditoria('publicacion','lecturas_publicas','actualizadas',{}, {clientes:telefonos.length});
    cb(null);
  }catch(e){cb(e.message);}
};
