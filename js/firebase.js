// ===================== FIREBASE MODULE =====================
// ES module — corre despues de que los scripts regulares definieron window.FB.
// Sobreescribe los metodos de window.FB con las funciones reales de Firestore.

import { initializeApp, deleteApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, setPersistence, browserLocalPersistence, onAuthStateChanged, signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
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
  orderBy,
  limit,
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

// V2.1 — entidades base. Conviven con las colecciones actuales.
const cCli = collection(db, 'clientes');
const cEq  = collection(db, 'equipos');
const cMov = collection(db, 'movimientos');
const cUsr = collection(db, 'usuarios');

let authModo = 'login', bootstrapDisponible = false;
function authError(msg) { const e = document.getElementById('authErr'); if (e) e.textContent = msg || ''; }
function authUiSesion() {
  const gate = document.getElementById('authGate'); if (gate) gate.style.display = 'none';
  const nav = document.getElementById('nav-users'); if (nav) nav.style.display = puede('crear_usuario') ? '' : 'none';
  const info = document.getElementById('sesionInfo');
  if (info && SESION.perfil) info.textContent = SESION.perfil.nombre + ' · ' + SESION.perfil.rol;
}
function authUiLogin() {
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
  document.getElementById('authVolver').style.display = 'none'; verificarBootstrap();
};
window.authMostrarBootstrap = function() {
  if (!bootstrapDisponible) return;
  authModo = 'bootstrap'; authError('');
  document.getElementById('authTitle').textContent = 'Crear primer administrador';
  document.getElementById('authNombreWrap').style.display = '';
  document.getElementById('authSubmit').textContent = 'Crear administrador';
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
window.authSalir = function() { signOut(auth); };

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
    await signOut(getAuth(provision)); await deleteApp(provision);
    toast('Usuario creado'); window.renderUsuarios();
  } catch (e) { await deleteApp(provision); toast('Error creando usuario: ' + e.message, 'var(--rd)'); }
};

setPersistence(auth, browserLocalPersistence).catch(function() {});
onAuthStateChanged(auth, async function(user) {
  SESION.usuario = user || null; SESION.perfil = null; SESION.cargando = false;
  if (!user) { authUiLogin(); authMostrarLogin(); return; }
  try {
    const perfil = (await getDoc(doc(cUsr, user.uid))).data();
    if (!perfil || perfil.activo === false) throw new Error(!perfil ? 'Tu cuenta no tiene un perfil habilitado.' : 'Tu usuario está inactivo.');
    SESION.perfil = perfil; authUiSesion();
  } catch (e) { authError(e.message || 'No se pudo validar la sesión.'); await signOut(auth); }
});

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


// --- Sobreescribir FB con funciones reales ---
window.FB.add = (d, cb) => addDoc(cR, { ...d, _ts: serverTimestamp() })
  .then(ref => { cb(null); v21Sync('reparacion', ref.id, d, 'reparacion_creada'); })
  .catch(e => cb(e.message));
// Importacion historica queda intacta: no migra masivamente datos a V2.1.
window.FB.addId = (id, d, cb) => setDoc(doc(db, 'reparaciones', id), { ...d, _ts: serverTimestamp() })
  .then(() => cb(null)).catch(e => cb(e.message));
window.FB.upd = (id, d, cb) => updateDoc(doc(db, 'reparaciones', id), { ...d, _upd: serverTimestamp() })
  .then(() => { cb(null); v21Sync('reparacion', id, d, 'reparacion_actualizada'); })
  .catch(e => cb(e.message));
window.FB.del   = (id, cb)     => deleteDoc(doc(db, 'reparaciones', id)).then(() => cb(null)).catch(e => cb(e.message));
window.FB.addR  = (d, cb)      => addDoc(cRp, { ...d, _ts: serverTimestamp() }).then(() => cb(null)).catch(e => cb(e.message));
window.FB.updR  = (id, d, cb)  => updateDoc(doc(db, 'repuestos', id), { ...d, _upd: serverTimestamp() }).then(() => cb(null)).catch(e => cb(e.message));
window.FB.delR    = (id, cb)     => deleteDoc(doc(db, 'repuestos', id)).then(() => cb(null)).catch(e => cb(e.message));

// --- Catalogo y config ---
window.FB.setConfig = (d, cb) => setDoc(dCfg, d).then(() => cb(null)).catch(e => cb(e.message));

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

// ── Config comisiones ──
window.FB.setComCfg = (d, cb) => setDoc(dCom, d).then(()=>cb(null)).catch(e=>cb(e.message));

// ── CRUD ventas ──
window.FB.addV = (d, cb) => addDoc(cVen, { ...d, _ts: serverTimestamp() })
  .then(ref => { cb(null); v21Sync('venta', ref.id, d, 'venta_creada'); })
  .catch(e => cb(e.message));
window.FB.updV = (id, d, cb) => updateDoc(doc(cVen,id), { ...d, _upd: serverTimestamp() })
  .then(() => { cb(null); v21Sync('venta', id, d, 'venta_actualizada'); })
  .catch(e => cb(e.message));
window.FB.delV  = (id, cb)     => deleteDoc(doc(cVen,id)).then(()=>cb(null)).catch(e=>cb(e.message));

// ── CRUD stock ──
window.FB.addSt = (d, cb) => addDoc(cSt, { ...d, _ts: serverTimestamp() })
  .then(ref => { cb(null); v21Sync('stock', ref.id, d, 'stock_creado'); })
  .catch(e => cb(e.message));
window.FB.updSt = (id, d, cb) => updateDoc(doc(cSt,id), { ...d, _upd: serverTimestamp() })
  .then(() => { cb(null); v21Sync('stock', id, d, 'stock_actualizado'); })
  .catch(e => cb(e.message));
window.FB.delSt = (id, cb)     => deleteDoc(doc(cSt,id)).then(()=>cb(null)).catch(e=>cb(e.message));

// ── setUsados ──
window.FB.setUsados = async (items, cb) => {
  try {
    const old = await getDocs(cUsa);
    const b1 = writeBatch(db); old.docs.forEach(d => b1.delete(d.ref)); await b1.commit();
    const b2 = writeBatch(db);
    items.forEach(u => { const r = doc(cUsa, u.modelo.replace(/[^a-zA-Z0-9]/g,'_')); b2.set(r, u); });
    await b2.commit(); cb(null);
  } catch(e) { cb(e.message); }
};

// ── setCat ──
