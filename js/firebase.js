// ===================== FIREBASE MODULE =====================
// ES module — corre despues de que los scripts regulares definieron window.FB.
// Sobreescribe los metodos de window.FB con las funciones reales de Firestore.

import { initializeApp }    from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  setDoc,
  getDocs,
  writeBatch,
  onSnapshot,
  query,
  orderBy,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const app = initializeApp({
  apiKey:            'AIzaSyCw76jqobNfGKt4aH7ygv4iVz9ZAHxTiko',
  authDomain:        'maxpoint-taller.firebaseapp.com',
  projectId:         'maxpoint-taller',
  storageBucket:     'maxpoint-taller.firebasestorage.app',
  messagingSenderId: '591043101786',
  appId:             '1:591043101786:web:b18f78627738a22d008463',
});

const db  = getFirestore(app);
const cR   = collection(db, 'reparaciones');
const cRp  = collection(db, 'repuestos');
const cCat = collection(db, 'catalogo');
const cUsa = collection(db, 'usados');
const cVen = collection(db, 'ventas');
const dCfg = doc(db, 'config', 'catalogo');

// --- Sobreescribir FB con funciones reales ---
window.FB.add   = (d, cb)      => addDoc(cR,  { ...d, _ts: serverTimestamp() }).then(() => cb(null)).catch(e => cb(e.message));
window.FB.addId = (id, d, cb)  => setDoc(doc(db, 'reparaciones', id), { ...d, _ts: serverTimestamp() }).then(() => cb(null)).catch(e => cb(e.message));
window.FB.upd   = (id, d, cb)  => updateDoc(doc(db, 'reparaciones', id), { ...d, _upd: serverTimestamp() }).then(() => cb(null)).catch(e => cb(e.message));
window.FB.del   = (id, cb)     => deleteDoc(doc(db, 'reparaciones', id)).then(() => cb(null)).catch(e => cb(e.message));
window.FB.addR  = (d, cb)      => addDoc(cRp, { ...d, _ts: serverTimestamp() }).then(() => cb(null)).catch(e => cb(e.message));
window.FB.updR  = (id, d, cb)  => updateDoc(doc(db, 'repuestos', id), { ...d, _upd: serverTimestamp() }).then(() => cb(null)).catch(e => cb(e.message));
window.FB.delR    = (id, cb)     => deleteDoc(doc(db, 'repuestos', id)).then(() => cb(null)).catch(e => cb(e.message));

// --- Catalogo y config ---
window.FB.setConfig = (d, cb) => setDoc(dCfg, d).then(() => cb(null)).catch(e => cb(e.message));

window.FB.addV   = (d,  cb) => addDoc(cVen, d).then(() => cb(null)).catch(e => cb(e.message));
window.FB.updV   = (id, d, cb) => updateDoc(doc(cVen,id), d).then(() => cb(null)).catch(e => cb(e.message));
window.FB.delV   = (id, cb)    => deleteDoc(doc(cVen,id)).then(() => cb(null)).catch(e => cb(e.message));

window.FB.setUsados = async (items, cb) => {
  try {
    const old = await getDocs(cUsa);
    const b1 = writeBatch(db);
    old.docs.forEach(d => b1.delete(d.ref));
    await b1.commit();
    const b2 = writeBatch(db);
    items.forEach(u => {
      const ref = doc(cUsa, u.modelo.replace(/[^a-zA-Z0-9]/g,'_'));
      b2.set(ref, u);
    });
    await b2.commit();
    cb(null);
  } catch(e) { cb(e.message); }
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

// --- Listener catalogo ---
onSnapshot(cCat, (snap) => {
  window.CATALOGO = snap.docs.map(d => d.data());
}, () => {});

// --- Listener ventas ---
onSnapshot(query(cVen, orderBy('fecha','desc')), (snap) => {
  window.VENTAS = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  if (window.VIEW === 'ven') render();
}, () => {});

// --- Listener usados ---
onSnapshot(cUsa, (snap) => {
  window.USADOS = snap.docs.map(d => d.data());
  if (typeof cotLoadUsados === 'function') cotLoadUsados(window.USADOS);
}, () => {});

// --- Listener config catalogo ---
import('https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js').then(({ onSnapshot: os }) => {
  os(dCfg, (snap) => {
    if (snap.exists() && typeof catLoadConfig === 'function') catLoadConfig(snap.data());
  }, () => {});
});

// --- Listener repuestos ---
onSnapshot(
  query(cRp, orderBy('_ts', 'asc')),
  (snap) => {
    window.RPUS = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (window.VIEW === 'rpus') renderRpus();
    updSidebar();
  },
  () => {} // repuestos no criticos, silencia errores
);
