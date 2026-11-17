import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-auth.js';
import { getFirestore, collection, doc, getDoc, getDocs, query, orderBy, limit } from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js';
import { getFunctions, httpsCallable } from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-functions.js';
import { FIREBASE_CONFIG } from '../js/firebase-config.js';

const app = initializeApp(FIREBASE_CONFIG, 'piccolo-reservations-admin');
const auth = getAuth(app), db = getFirestore(app);
const functions = getFunctions(app, 'southamerica-east1');
const confirmDeposit = httpsCallable(functions, 'confirmDeposit');
const cancelReservation = httpsCallable(functions, 'cancelReservation');
const $ = id => document.getElementById(id);
const status = msg => { $('status').textContent = msg; };
const money = value => Number(value || 0).toLocaleString('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 });
const el = (tag, text, className = '') => {
  const node = document.createElement(tag);
  node.textContent = String(text ?? '');
  if (className) node.className = className;
  return node;
};
let proposals = new Map(), reservations = new Map(), busy = false;
async function isAdmin(user) {
  if (!user || user.isAnonymous) return false;
  const snap = await getDoc(doc(db, 'admins', user.uid));
  return snap.exists() && snap.data().active === true;
}
onAuthStateChanged(auth, async user => {
  try {
    const allowed = await isAdmin(user);
    $('login').classList.toggle('hidden', allowed);
    $('panel').classList.toggle('hidden', !allowed);
    $('logout').classList.toggle('hidden', !allowed);
    if (allowed) await load();
    else status(user ? 'Tu cuenta no tiene acceso de administrador.' : '');
  } catch (error) { status(error.message); }
});
$('loginForm').addEventListener('submit', async event => {
  event.preventDefault();
  try { await signInWithEmailAndPassword(auth, $('email').value.trim(), $('password').value); }
  catch (error) { status('No se pudo ingresar: ' + error.message); }
});
$('logout').addEventListener('click', () => signOut(auth));
$('refresh').addEventListener('click', load);
async function load() {
  status('Cargando...');
  try {
    const [p, c, inquiries, res] = await Promise.all([
      getDocs(collection(db, 'products')), getDocs(collection(db, 'combos')),
      getDocs(query(collection(db, 'inquiries'), orderBy('createdAt', 'desc'), limit(100))),
      getDocs(query(collection(db, 'reservations'), orderBy('confirmedAt', 'desc'), limit(100)))
    ]);
    proposals = new Map([...p.docs, ...c.docs].map(s => [s.id, { id: s.id, ...s.data() }]));
    reservations = new Map(res.docs.map(s => [s.id, s.data()]));
    $('inquiries').replaceChildren(...inquiries.docs.map(s => renderInquiry(s.id, s.data())));
    $('reservations').replaceChildren(...res.docs.map(s => renderReservation(s.id, s.data())));
    status('Datos actualizados. Se muestran los últimos 100 registros por sección.');
  } catch (error) { status('No se pudieron cargar los datos: ' + error.message); }
}
function renderInquiry(id, data) {
  const card = el('article', '', 'reservation-card');
  const proposal = proposals.get(data.productId);
  card.append(el('h3', data.nombre || 'Sin nombre'), el('p', (data.fecha || 'Sin fecha') + ' · ' + (proposal?.title || data.espacio || data.productId)));
  card.append(el('p', 'Teléfono: ' + (data.telefono || '—')));
  if (reservations.has(id)) {
    card.append(el('p', 'Estado: ' + reservations.get(id).status));
    return card;
  }
  if (!proposal || proposal.bookable === false || !proposal.active) {
    card.append(el('p', 'La propuesta no está habilitada para confirmar.'));
    return card;
  }
  const choices = {};
  for (const group of proposal.componentGroups || []) {
    const label = el('label', group.label || 'Elegir componente');
    const select = document.createElement('select');
    select.required = true;
    select.append(new Option('Seleccioná...', ''));
    for (const productId of group.productIds || []) {
      select.append(new Option(proposals.get(productId)?.title || productId, productId));
    }
    select.addEventListener('change', () => { choices[group.id] = select.value; });
    label.append(select); card.append(label);
  }
  const amountLabel = el('label', 'Seña recibida (ARS)');
  const amount = document.createElement('input');
  amount.type = 'number'; amount.min = '1'; amount.step = '1';
  amount.value = String(Math.ceil(Number(proposal.price || 0) * Number(data.displayedDepositPercentage || 20) / 100));
  amountLabel.append(amount); card.append(amountLabel);
  const referenceLabel = el('label', 'Referencia del pago (opcional)');
  const reference = document.createElement('input'); reference.maxLength = 160;
  referenceLabel.append(reference); card.append(referenceLabel);
  const button = el('button', 'Registrar seña y confirmar', 'button primary');
  button.addEventListener('click', async () => {
    if (busy) return;
    if ((proposal.componentGroups || []).some(g => !choices[g.id])) { status('Seleccioná todos los componentes del combo.'); return; }
    if (!window.confirm('¿Confirmás que la seña fue recibida? Se bloquearán todos los equipos durante el día completo.')) return;
    busy = true; button.disabled = true;
    try {
      await confirmDeposit({ inquiryId: id, amount: Number(amount.value), choices, paymentReference: reference.value.trim() });
      status('Reserva confirmada y equipos bloqueados.'); await load();
    } catch (error) { status('No se confirmó la reserva: ' + error.message); }
    finally { busy = false; button.disabled = false; }
  });
  card.append(button); return card;
}
function renderReservation(id, data) {
  const card = el('article', '', 'reservation-card');
  card.append(el('h3', data.customerName || data.proposalTitle || id));
  card.append(el('p', (data.date || '—') + ' · ' + (data.proposalTitle || '') + ' · ' + data.status));
  card.append(el('p', 'Seña: ' + money(data.depositAmount) + ' · Equipos: ' + (data.equipmentIds || []).join(', ')));
  if (data.status === 'confirmed') {
    const button = el('button', 'Cancelar reserva y liberar equipos', 'button secondary');
    button.addEventListener('click', async () => {
      if (busy) return;
      const reason = window.prompt('Motivo de cancelación (no devuelve automáticamente la seña):');
      if (reason === null) return;
      if (!window.confirm('¿Liberar todos los equipos de esta reserva?')) return;
      busy = true; button.disabled = true;
      try { await cancelReservation({ reservationId: id, reason }); await load(); status('Reserva cancelada; equipos liberados.'); }
      catch (error) { status('No se pudo cancelar: ' + error.message); }
      finally { busy = false; button.disabled = false; }
    });
    card.append(button);
  }
  return card;
}
