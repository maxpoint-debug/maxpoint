import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-auth.js';
import { collection, doc, getDoc, getDocs, getFirestore, orderBy, query, serverTimestamp, setDoc, writeBatch } from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-firestore.js';
import { getDownloadURL, getStorage, ref, uploadBytes } from 'https://www.gstatic.com/firebasejs/12.17.0/firebase-storage.js';
import { FIREBASE_CONFIG } from '../js/firebase-config.js';

const app = initializeApp(FIREBASE_CONFIG);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

const $ = selector => document.querySelector(selector);
const loginView = $('#loginView');
const adminView = $('#adminView');
const logoutBtn = $('#logoutBtn');
const dialog = $('#editorDialog');
const editorForm = $('#editorForm');
let products = [];
let combos = [];

function message(element, text, error = false) {
  element.textContent = text;
  element.classList.toggle('error', error);
}

async function userIsAdmin(user) {
  if (!user) return false;
  const snapshot = await getDoc(doc(db, 'admins', user.uid));
  return snapshot.exists() && snapshot.data().active === true;
}

onAuthStateChanged(auth, async user => {
  try {
    if (await userIsAdmin(user)) {
      loginView.classList.add('hidden');
      adminView.classList.remove('hidden');
      logoutBtn.classList.remove('hidden');
      await loadAll();
    } else {
      if (user) await signOut(auth);
      loginView.classList.remove('hidden');
      adminView.classList.add('hidden');
      logoutBtn.classList.add('hidden');
    }
  } catch (error) {
    message($('#loginMessage'), 'No se pudo verificar el acceso administrativo.', true);
    console.error(error);
  }
});

$('#loginForm').addEventListener('submit', async event => {
  event.preventDefault();
  message($('#loginMessage'), 'Ingresando...');
  try {
    const credential = await signInWithEmailAndPassword(auth, $('#email').value.trim(), $('#password').value);
    if (!await userIsAdmin(credential.user)) throw new Error('Esta cuenta no está habilitada como administradora.');
  } catch (error) {
    await signOut(auth).catch(() => {});
    message($('#loginMessage'), error.message || 'No se pudo iniciar sesión.', true);
  }
});

logoutBtn.addEventListener('click', () => signOut(auth));

document.querySelectorAll('.tab').forEach(tab => tab.addEventListener('click', () => {
  document.querySelectorAll('.tab').forEach(item => item.classList.toggle('active', item === tab));
  document.querySelectorAll('.tab-panel').forEach(panel => panel.classList.add('hidden'));
  $(`#${tab.dataset.tab}Panel`).classList.remove('hidden');
}));

async function loadCollection(name) {
  const snapshot = await getDocs(query(collection(db, name), orderBy('sortOrder')));
  return snapshot.docs.map(item => ({ id: item.id, ...item.data() }));
}

async function loadAll() {
  [products, combos] = await Promise.all([loadCollection('products'), loadCollection('combos')]);
  renderList('product', products, $('#productsList'));
  renderList('combo', combos, $('#combosList'));
  await loadSettings();
}

function money(value) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', maximumFractionDigits: 0 }).format(value || 0);
}

function renderList(kind, items, container) {
  if (!items.length) {
    container.innerHTML = '<div class="card setup-card"><p>Todavía no hay datos. Usá la pestaña Carga inicial.</p></div>';
    return;
  }
  container.replaceChildren(...items.map(item => {
    const row = document.createElement('article');
    row.className = 'item-row';
    row.innerHTML = `<div class="item-main"><strong>${escapeHtml(item.title)}</strong><span class="item-meta">${escapeHtml(item.id)} · ${money(item.price)} <span class="status ${item.active ? '' : 'off'}">${item.active ? 'Publicado' : 'Oculto'}</span>${item.bookable ? '' : '<span class="status off">No reservable</span>'}</span></div><button class="button secondary" type="button">Editar</button>`;
    row.querySelector('button').addEventListener('click', () => openEditor(kind, item));
    return row;
  }));
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = String(value ?? '');
  return div.innerHTML;
}

document.querySelectorAll('[data-new]').forEach(button => button.addEventListener('click', () => openEditor(button.dataset.new)));

function openEditor(kind, item = null) {
  editorForm.reset();
  const isCombo = kind === 'combo';
  $('#editorTitle').textContent = `${item ? 'Editar' : 'Nuevo'} ${isCombo ? 'combo' : 'producto'}`;
  editorForm.elements.kind.value = kind;
  editorForm.elements.id.readOnly = Boolean(item);
  document.querySelectorAll('.combo-only').forEach(el => el.classList.toggle('hidden', !isCombo));
  document.querySelectorAll('.product-only').forEach(el => el.classList.toggle('hidden', isCombo));

  if (item) {
    for (const name of ['id', 'title', 'description', 'dimensions', 'price', 'sortOrder', 'category', 'recommendedAge', 'capacity']) {
      if (editorForm.elements[name]) editorForm.elements[name].value = item[name] ?? '';
    }
    editorForm.elements.contents.value = (item.contents || []).join('\n');
    editorForm.elements.reviewNotes.value = (item.reviewNotes || []).join('\n');
    editorForm.elements.componentProductIds.value = (item.componentProductIds || []).join(', ');
    editorForm.elements.active.checked = item.active === true;
    editorForm.elements.bookable.checked = item.bookable === true;
    editorForm.elements.outOfService.checked = item.outOfService === true;
  } else {
    editorForm.elements.active.checked = true;
    editorForm.elements.bookable.checked = true;
    editorForm.elements.sortOrder.value = (kind === 'combo' ? combos : products).length * 10 + (kind === 'combo' ? 210 : 10);
  }
  message($('#editorMessage'), '');
  dialog.showModal();
}

editorForm.addEventListener('submit', async event => {
  event.preventDefault();
  if (event.submitter?.value === 'cancel') {
    dialog.close();
    return;
  }
  const button = $('#saveItemBtn');
  button.disabled = true;
  message($('#editorMessage'), 'Guardando...');
  try {
    const values = new FormData(editorForm);
    const kind = values.get('kind');
    const id = String(values.get('id')).trim();
    const collectionName = kind === 'combo' ? 'combos' : 'products';
    const previous = (kind === 'combo' ? combos : products).find(item => item.id === id) || {};
    let imagePath = previous.imagePath || '';
    let imageUrl = previous.imageUrl || '';
    const image = values.get('image');
    if (image?.size) {
      const safeName = image.name.replace(/[^a-zA-Z0-9._-]/g, '-');
      imagePath = `catalog/${collectionName}/${id}/${Date.now()}-${safeName}`;
      const imageRef = ref(storage, imagePath);
      await uploadBytes(imageRef, image, { contentType: image.type });
      imageUrl = await getDownloadURL(imageRef);
    }
    const payload = {
      title: String(values.get('title')).trim(),
      description: String(values.get('description')).trim(),
      dimensions: String(values.get('dimensions')).trim(),
      price: Number(values.get('price')),
      sortOrder: Number(values.get('sortOrder')),
      category: String(values.get('category')).trim(),
      recommendedAge: String(values.get('recommendedAge')).trim(),
      capacity: String(values.get('capacity')).trim(),
      contents: String(values.get('contents')).split('\n').map(x => x.trim()).filter(Boolean),
      reviewNotes: String(values.get('reviewNotes')).split('\n').map(x => x.trim()).filter(Boolean),
      active: values.get('active') === 'on',
      bookable: values.get('bookable') === 'on',
      imagePath,
      imageUrl,
      updatedAt: serverTimestamp(),
      createdAt: previous.createdAt || serverTimestamp()
    };
    if (kind === 'product') payload.outOfService = values.get('outOfService') === 'on';
    if (kind === 'combo') {
      payload.componentProductIds = String(values.get('componentProductIds')).split(',').map(x => x.trim()).filter(Boolean);
      payload.componentGroups = previous.componentGroups || [];
    }
    await setDoc(doc(db, collectionName, id), payload, { merge: true });
    dialog.close();
    await loadAll();
  } catch (error) {
    message($('#editorMessage'), error.message || 'No se pudo guardar.', true);
    console.error(error);
  } finally {
    button.disabled = false;
  }
});

async function loadSettings() {
  const snapshot = await getDoc(doc(db, 'settings', 'public'));
  if (!snapshot.exists()) return;
  const data = snapshot.data();
  for (const name of ['baseAddress', 'freeRadiusKm', 'extraKmPrice', 'depositPercentage', 'holdMinutes', 'minimumAdvanceDays', 'usualStartTime', 'usualEndTime', 'whatsappNumber']) {
    $('#settingsForm').elements[name].value = data[name] ?? '';
  }
}

$('#settingsForm').addEventListener('submit', async event => {
  event.preventDefault();
  const values = new FormData(event.currentTarget);
  message($('#settingsMessage'), 'Guardando...');
  try {
    await setDoc(doc(db, 'settings', 'public'), {
      baseAddress: String(values.get('baseAddress')).trim(),
      freeRadiusKm: Number(values.get('freeRadiusKm')),
      extraKmPrice: Number(values.get('extraKmPrice')),
      depositPercentage: Number(values.get('depositPercentage')),
      holdMinutes: Number(values.get('holdMinutes')),
      minimumAdvanceDays: Number(values.get('minimumAdvanceDays')),
      usualStartTime: values.get('usualStartTime'),
      usualEndTime: values.get('usualEndTime'),
      whatsappNumber: String(values.get('whatsappNumber')).trim(),
      updatedAt: serverTimestamp()
    }, { merge: true });
    message($('#settingsMessage'), 'Configuración guardada.');
  } catch (error) {
    message($('#settingsMessage'), error.message || 'No se pudo guardar.', true);
  }
});

$('#seedBtn').addEventListener('click', async event => {
  const button = event.currentTarget;
  button.disabled = true;
  message($('#seedMessage'), 'Importando catálogo...');
  try {
    const response = await fetch('../../data/catalog.seed.json');
    if (!response.ok) throw new Error('No se encontró data/catalog.seed.json.');
    const seed = await response.json();
    const batch = writeBatch(db);
    seed.products.forEach(item => {
      const { id, ...data } = item;
      batch.set(doc(db, 'products', id), { ...data, schemaVersion: seed.schemaVersion, updatedAt: serverTimestamp() }, { merge: true });
    });
    seed.combos.forEach(item => {
      const { id, ...data } = item;
      batch.set(doc(db, 'combos', id), { ...data, schemaVersion: seed.schemaVersion, updatedAt: serverTimestamp() }, { merge: true });
    });
    batch.set(doc(db, 'settings', 'public'), { ...seed.settings, schemaVersion: seed.schemaVersion, updatedAt: serverTimestamp() }, { merge: true });
    await batch.commit();
    message($('#seedMessage'), `Carga terminada: ${seed.products.length} productos y ${seed.combos.length} combos.`);
    await loadAll();
  } catch (error) {
    message($('#seedMessage'), error.message || 'No se pudo importar.', true);
    console.error(error);
  } finally {
    button.disabled = false;
  }
});

