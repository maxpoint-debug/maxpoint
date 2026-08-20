/* Catálogo dinámico: Firestore con fallback al archivo inicial local. */

let currentProposal = null;

function money(value) {
  return `$${Number(value || 0).toLocaleString('es-AR')}`;
}

function waitForFirebase(timeoutMs = 5000) {
  if (window.piccoloFirebase) return Promise.resolve(window.piccoloFirebase);
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Firebase no inició')), timeoutMs);
    window.addEventListener('piccolo:firebase-ready', () => {
      clearTimeout(timeout);
      resolve(window.piccoloFirebase);
    }, { once: true });
  });
}

async function loadCatalog() {
  try {
    const firebase = await waitForFirebase();
    const catalog = await firebase.getCatalog();
    if (catalog.products.length || catalog.combos.length) return catalog;
  } catch (error) {
    console.warn('Se usa el catálogo local porque Firestore no está disponible:', error);
  }

  const response = await fetch('../data/catalog.seed.json');
  if (!response.ok) throw new Error('No se pudo cargar el catálogo local.');
  return response.json();
}

function renderCatalog(catalog) {
  window.piccoloSettings = catalog.settings || {};
  const proposals = [
    ...catalog.products.map(item => ({ ...item, kind: 'product', tag: item.category || 'Producto' })),
    ...catalog.combos.map(item => ({ ...item, kind: 'combo', tag: 'Combo' }))
  ];
  const container = document.getElementById('productsScroll');
  const select = document.getElementById('espacio');
  container.replaceChildren();
  select.innerHTML = '<option value="">Seleccioná una propuesta</option>';

  const productGroup = document.createElement('optgroup');
  productGroup.label = '— Productos —';
  const comboGroup = document.createElement('optgroup');
  comboGroup.label = '— Combos —';

  proposals.forEach(proposal => {
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'product-card';
    card.setAttribute('role', 'listitem');
    const imagePath = safeImagePath(proposal.imagePath);
    card.innerHTML = `${imagePath ? `<span class="product-card-media"><img src="${escapeHtml(imagePath)}" alt="" loading="lazy"></span>` : '<span class="product-card-media product-card-placeholder" aria-hidden="true"></span>'}<span class="product-card-body"><span class="product-card-tag">${escapeHtml(proposal.tag)}</span><span class="product-card-name">${escapeHtml(proposal.title)}</span><span class="product-card-price">${money(proposal.price)}</span>${proposal.bookable === false ? '<span class="product-card-note">Requiere confirmación</span>' : ''}</span>`;
    const cardImage = card.querySelector('img');
    cardImage?.addEventListener('error', () => {
      cardImage.parentElement.classList.add('product-card-placeholder');
      cardImage.remove();
    }, { once: true });
    card.addEventListener('click', () => openProductModal(proposal));
    container.appendChild(card);

    if (proposal.bookable !== false && proposal.outOfService !== true) {
      const option = document.createElement('option');
      option.value = `${proposal.id}|${proposal.price}`;
      option.textContent = `${proposal.title} — ${money(proposal.price)}`;
      (proposal.kind === 'combo' ? comboGroup : productGroup).appendChild(option);
    }
  });
  select.append(productGroup, comboGroup);
  window.piccoloCatalog = catalog;
  window.dispatchEvent(new CustomEvent('piccolo:catalog-ready', { detail: catalog }));
}

function openProductModal(proposal) {
  currentProposal = proposal;
  const modalImage = document.getElementById('modalImage');
  const imagePath = safeImagePath(proposal.imagePath);
  modalImage.hidden = !imagePath;
  modalImage.src = imagePath || '';
  modalImage.alt = imagePath ? `Fotografía de ${proposal.title}` : '';
  modalImage.onerror = () => {
    modalImage.hidden = true;
    modalImage.removeAttribute('src');
  };
  document.getElementById('modalTag').textContent = proposal.tag;
  document.getElementById('modalName').textContent = proposal.title;
  document.getElementById('modalPrice').textContent = money(proposal.price);
  const details = [proposal.description, proposal.dimensions && `Medidas: ${proposal.dimensions}`, ...(proposal.contents || []), ...(proposal.reviewNotes || []).map(note => `A confirmar: ${note}`)].filter(Boolean);
  document.getElementById('modalList').innerHTML = details.map(item => `<li>${escapeHtml(item)}</li>`).join('');
  const selectButton = document.getElementById('modalSelectBtn');
  selectButton.disabled = proposal.bookable === false || proposal.outOfService === true;
  selectButton.textContent = selectButton.disabled ? 'No disponible para reserva online' : 'Elegir esta propuesta →';
  document.getElementById('productModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function escapeHtml(value) {
  const div = document.createElement('div');
  div.textContent = String(value);
  return div.innerHTML;
}

function safeImagePath(value) {
  const path = String(value || '').trim().replace(/^\.\//, '');
  return /^assets\/products\/[a-zA-Z0-9][a-zA-Z0-9._/-]*$/.test(path) ? path : '';
}

function closeProductModal() {
  document.getElementById('productModal').classList.remove('open');
  document.body.style.overflow = '';
  currentProposal = null;
}

document.getElementById('modalSelectBtn').addEventListener('click', () => {
  if (!currentProposal || currentProposal.bookable === false) return;
  const select = document.getElementById('espacio');
  select.value = `${currentProposal.id}|${currentProposal.price}`;
  select.dispatchEvent(new Event('change'));
  closeProductModal();
  document.getElementById('reserva').scrollIntoView({ behavior: 'smooth' });
});

document.getElementById('modalBackdrop').addEventListener('click', closeProductModal);
document.getElementById('modalClose').addEventListener('click', closeProductModal);
document.addEventListener('keydown', event => {
  if (event.key === 'Escape') closeProductModal();
});

loadCatalog().then(renderCatalog).catch(error => {
  console.error(error);
  document.getElementById('productsScroll').innerHTML = '<p>No pudimos cargar el catálogo. Intentá nuevamente.</p>';
});
