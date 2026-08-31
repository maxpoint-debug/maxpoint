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
  writeBatch,
  onSnapshot,
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

let authModo = 'login', bootstrapDisponible = false;
let detenerNotificaciones = null;
function authMensaje(msg, color) { const e = document.getElementById('authErr'); if (e) { e.textContent = msg || ''; e.style.color = color || 'var(--rd)'; } }
function authError(msg) { authMensaje(msg, 'var(--rd)'); }
function authUiSesion() {
  if (!sesionActiva()) { authUiLogin(); return; }
  const shell = document.getElementById('appShell'); if (shell) shell.style.display = 'flex';
  const gate = document.getElementById('authGate'); if (gate) gate.style.display = 'none';
  const nav = document.getElementById('nav-users'); if (nav) nav.style.display = puede('crear_usuario') ? '' : 'none';
  const bal = document.getElementById('nav-balance'); if (bal) bal.style.display = puede('ver_balance') ? '' : 'none';
  const resumen = document.getElementById('financeSummary'); if (resumen) resumen.style.display = puede('ver_balance') ? '' : 'none';
  const info = document.getElementById('sesionInfo');
  if (info && SESION.perfil) info.textContent = SESION.perfil.nombre + ' · ' + SESION.perfil.rol;
}
function authUiLogin() {
  const shell = document.getElementById('appShell'); if (shell) shell.style.display = 'none';
  const gate = document.getElementById('authGate'); if (gate) gate.style.display = 'flex';
  const nav = document.getElementById('nav-users'); if (nav) nav.style.display = 'none';
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
  try {
    if (authModo === 'bootstrap') {
      if (!bootstrapDisponible) throw new Error('El administrador inicial ya fue creado.');
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      await setDoc(doc(cUsr, cred.user.uid), { uid: cred.user.uid, nombre: nombre, email: email, rol: 'administrador', activo: true, createdAt: serverTimestamp() });
    } else await signInWithEmailAndPassword(auth, email, pass);
  } catch (e) { authError(e.message || 'No se pudo iniciar sesión.'); }
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
window.authSalir = function() { signOut(auth); };
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
let revisionSesion = 0;
onAuthStateChanged(auth, async function(user) {
  const revisionActual = ++revisionSesion;
  if (detenerNotificaciones) { detenerNotificaciones(); detenerNotificaciones = null; }
  SESION.usuario = user || null; SESION.perfil = null; SESION.cargando = true;
  if (!user) {
    window.NOTIFICACIONES = [];
    if (typeof window.notificacionesRender === 'function') window.notificacionesRender();
    SESION.cargando = false; authUiLogin(); authMostrarLogin(); return;
  }
  try {
    const perfil = (await getDoc(doc(cUsr, user.uid))).data();
    if (revisionActual !== revisionSesion || !auth.currentUser || auth.currentUser.uid !== user.uid) return;
    if (!perfil || perfil.activo === false) throw new Error(!perfil ? 'Tu cuenta no tiene un perfil habilitado.' : 'Tu usuario está inactivo.');
    SESION.perfil = perfil; SESION.cargando = false; authUiSesion(); iniciarNotificaciones(user.uid);
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
window.FB.add = (d, cb) => agregarAuditable('reparaciones', 'reparacion', d).then(id => { cb(null, id); v21Sync('reparacion', id, d, 'reparacion_creada'); }).catch(e => cb(e.message));
window.FB.addId = (id, d, cb) => agregarAuditable('reparaciones', 'reparacion', d, id).then(() => cb(null)).catch(e => cb(e.message));
window.FB.upd = (id, d, cb) => actualizarAuditable('reparaciones', 'reparacion', id, d).then(() => { cb(null); v21Sync('reparacion', id, d, 'reparacion_actualizada'); }).catch(e => cb(e.message));
window.FB.del = (id, cb) => { if (!puede('eliminar_operaciones')) { cb('Solo administrador puede eliminar operaciones'); return; } eliminarAuditable('reparaciones', 'reparacion', id).then(() => cb(null)).catch(e => cb(e.message)); };
window.FB.addR = (d, cb) => agregarAuditable('repuestos', 'repuesto', d).then(() => cb(null)).catch(e => cb(e.message));
window.FB.updR = (id, d, cb) => actualizarAuditable('repuestos', 'repuesto', id, d).then(() => cb(null)).catch(e => cb(e.message));
window.FB.delR = (id, cb) => { if (!puede('eliminar_operaciones')) { cb('Solo administrador puede eliminar operaciones'); return; } eliminarAuditable('repuestos', 'repuesto', id).then(() => cb(null)).catch(e => cb(e.message)); };

// --- Catalogo y config ---
window.FB.setConfig = (d, cb) => actualizarAuditable('config', 'config_catalogo', 'catalogo', d).then(() => cb(null)).catch(e => cb(e.message));
window.FB.setCotizadorConfig = (d, cb) => {
  if (!puede('actualizar_cotizador')) { cb('Solo administrador puede modificar el cotizador'); return; }
  actualizarAuditable('config', 'config_cotizador', 'cotizador', d).then(() => cb(null)).catch(e => cb(e.message));
};

window.FB.setCat = async (items, cb) => {
  try {
    // 1. Backup: guardar config con timestamp de ultima actualizacion
    const snap = await import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js');
    const { getDocs, writeBatch } = snap;
    const batch1 = writeBatch(db);
    // Borrar catalogo viejo
    const oldDocs = await getDocs(cCat);
    oldDocs.forEach(d => batch1.delete(d.ref));
    await batch1.commit();
    // Subir nuevo catalogo en batches de 400
    const chunkSize = 400;
    for (let i = 0; i < items.length; i += chunkSize) {
      const batch2 = writeBatch(db);
      items.slice(i, i + chunkSize).forEach(item => {
        batch2.set(doc(cCat), item);
      });
      await batch2.commit();
    }
    await registrarAuditoria('catalogo', 'catalogo', 'base_reemplazada', {}, { productos: items.length });
    cb(null);
  } catch(e) { cb(e.message); }
};

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
  if (window.VIEW === 'ven') render();
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
window.FB.setComCfg = (d, cb) => actualizarAuditable('config', 'config_comisiones', 'comisiones', d).then(()=>cb(null)).catch(e=>cb(e.message));

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

// ── CRUD ventas ──
window.FB.addV = (d, cb) => agregarAuditable('ventas', 'venta', d).then(id => { cb(null); v21Sync('venta', id, d, 'venta_creada'); }).catch(e => cb(e.message));
window.FB.updV = (id, d, cb) => actualizarAuditable('ventas', 'venta', id, d).then(() => { cb(null); v21Sync('venta', id, d, 'venta_actualizada'); }).catch(e => cb(e.message));
window.FB.delV = (id, cb) => { if (!puede('eliminar_operaciones')) { cb('Solo administrador puede eliminar operaciones'); return; } eliminarAuditable('ventas', 'venta', id).then(()=>cb(null)).catch(e=>cb(e.message)); };

// ── CRUD stock ──
window.FB.addSt = (d, cb) => agregarAuditable('stock', 'stock', d).then(id => { cb(null); v21Sync('stock', id, d, 'stock_creado'); }).catch(e => cb(e.message));
window.FB.updSt = (id, d, cb) => actualizarAuditable('stock', 'stock', id, d).then(() => { cb(null); v21Sync('stock', id, d, 'stock_actualizado'); }).catch(e => cb(e.message));
window.FB.delSt = (id, cb) => { if (!puede('eliminar_operaciones')) { cb('Solo administrador puede eliminar operaciones'); return; } eliminarAuditable('stock', 'stock', id).then(()=>cb(null)).catch(e=>cb(e.message)); };

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
    await b2.commit(); await registrarAuditoria('cotizador', 'usados', 'base_reemplazada', {}, { modelos: items.length }); cb(null);
  } catch(e) { cb(e.message); }
};

// ── setCat ──
