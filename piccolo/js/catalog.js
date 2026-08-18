/* ═══════════════════════════════════════════
   CATALOG.JS — Datos, cards y modal
═══════════════════════════════════════════ */

const PRODUCTS = [
  { id:'plaza-nordica|78000',   name:'Plaza blanda Nórdica',          price:78000,  tag:'Plaza',
    items:['Cubo Montessori','Triángulo Montessori','Rampa','Pata Pata','Balancín','Rodari','Piso antigolpes','Tobogán blanco'] },
  { id:'plaza-pasteles|78000',  name:'Plaza blanda Pasteles',          price:78000,  tag:'Plaza',
    items:['Cubo Montessori','Triángulo Montessori','Rampa','Pata pata','Sube y baja','Balancín','Piso antigolpe','Tobogán blanco'] },
  { id:'plaza-soft|82000',      name:'Plaza Soft',                     price:82000,  tag:'Plaza',
    items:['Puente (trepar o pasar por debajo)','Rampa','2 módulos multifunción','2 pata pata','12 bloques de goma espuma alta densidad','Piso antigolpe','Tobogán blanco'] },
  { id:'pelotero-xl|105000',    name:'Pelotero XL Blanco',             price:105000, tag:'Pelotero',
    items:['Pelotero 2×2,5 metros','Paredes de espuma con lona','2000 pelotitas plástico atóxico','Tobogán blanco plástico','Opción personalización vinilo al corte'] },
  { id:'pelotero-chico|85000',  name:'Pelotero Blanco Chico',          price:85000,  tag:'Pelotero',
    items:['Pelotero 1,80×1,80 metros','600 pelotitas plástico atóxico','2 toboganes blancos plástico','Opción personalización vinilo al corte'] },
  { id:'castillo-gigante|120000',name:'Castillo Gigante Blanco',       price:120000, tag:'Inflable',
    items:['Castillo inflable blanco 6×3,5 metros','Turbina incluida','Sillón dos cuerpos para descalzarse','Banderín de tela decorativo','Personalización + globos (costo extra)'] },
  { id:'castillo-pelotero|110000',name:'Castillo Inflable 2 en 1',     price:110000, tag:'Inflable',
    items:['Castillo inflable con pelotero 3×3,5m','Mitad saltarín / mitad pelotero','500 pelotitas colores neutros','Turbina, banderín y sillón incluidos','Personalización (costo extra)'] },
  { id:'calesita|110000',       name:'Calesita Manual',                price:110000, tag:'Especial',
    items:['Calesita manual con asiento de madera en una sola pieza','Toldo combinado en dos colores','Espacio para 6 niños simultáneo'] },
  { id:'estacion-arte|85000',   name:'Estación de Arte',               price:85000,  tag:'Actividad',
    items:['10 atriles pequeños sobre mesitas','Lápices de colores y paleta con témperas','Imágenes personalizadas con la temática','Hojas A4','Mesitas tipo picnic','Supervisión adulto para menores de 5 años'] },
  { id:'kermes|110000',         name:'Kermés Total White',             price:110000, tag:'Actividad',
    items:['3 stands blancos con techo','Juego de emboque (tabla + pelotas)','Juego de tiro con 12 aros','Tumba latas (6 latas blancas + pelota)','Personalización extra: $25.000'] },
  { id:'mesitas-curvas|85000',  name:'Mesitas Curvas',                 price:85000,  tag:'Mobiliario',
    items:['2 mesas curvas de madera laqueada','8 sillitas con respaldo de 4 varillas','Se pueden combinar en mesa redonda o larga','Ampliación: +2 mesas+4 sillas por $25.000 / +7 sillas por $35.000'] },
  { id:'mesitas-picnic|95000',  name:'Mesitas Picnic',                 price:95000,  tag:'Mobiliario',
    items:['2 mesitas bajas de 1,20m','20 almohadones gris y natural','Camino de mesa','Alfombras colores neutros'] },
  { id:'combo1|145000',         name:'Combo 1',                        price:145000, tag:'Combo',
    items:['Inflable 2en1 (3×3,5m) con tobogán y 500 pelotitas','Plaza blanda completa','Sillón + banderín decorativo','Ideal hasta 15 niños de 6m a 8 años'] },
  { id:'combo2|175000',         name:'Combo 2',                        price:175000, tag:'Combo',
    items:['Calesita manual con toldo','Mesitas curvas con sillitas','Estilo clásico y versátil'] },
  { id:'combo3|160000',         name:'Combo 3',                        price:160000, tag:'Combo',
    items:['Castillo gigante 6×3,5m con tobogán','Pelotero XL 2×2,5m con 2000 pelotitas','Sillón + banderín decorativo'] },
  { id:'combo4|135000',         name:'Combo 4',                        price:135000, tag:'Combo',
    items:['Pelotero XL 2×2,5m','Plaza blanda (pasteles o neutros a elección)','Sillón + banderín decorativo'] },
  { id:'combo5|190000',         name:'Combo 5',                        price:190000, tag:'Combo',
    items:['Castillo gigante 6×3,5m con tobogán','Mesitas curvas con sillitas','Sillón + banderín decorativo'] },
];

// ── Render cards ──
(function renderProducts() {
  const container = document.getElementById('productsScroll');
  if (!container) return;

  PRODUCTS.forEach(p => {
    const card = document.createElement('div');
    card.className = 'product-card';
    card.setAttribute('role', 'listitem');
    card.innerHTML = `
      <span class="product-card-tag">${p.tag}</span>
      <div class="product-card-name">${p.name}</div>
      <div class="product-card-price">$${p.price.toLocaleString('es-AR')}</div>
    `;
    card.addEventListener('click', () => openProductModal(p));
    container.appendChild(card);
  });
})();

// ── Modal ──
let _currentProduct = null;

function openProductModal(product) {
  _currentProduct = product;
  document.getElementById('modalTag').textContent  = product.tag;
  document.getElementById('modalName').textContent = product.name;
  document.getElementById('modalPrice').textContent = `$${product.price.toLocaleString('es-AR')}`;
  document.getElementById('modalList').innerHTML =
    product.items.map(i => `<li>${i}</li>`).join('');
  document.getElementById('productModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeProductModal() {
  document.getElementById('productModal').classList.remove('open');
  document.body.style.overflow = '';
  _currentProduct = null;
}

// Seleccionar desde modal → ir al formulario
document.getElementById('modalSelectBtn').addEventListener('click', () => {
  if (!_currentProduct) return;
  const select = document.getElementById('espacio');
  select.value = _currentProduct.id;
  select.dispatchEvent(new Event('change')); // dispara precio y disponibilidad
  closeProductModal();
  document.getElementById('reserva').scrollIntoView({ behavior: 'smooth' });
});

document.getElementById('modalBackdrop').addEventListener('click', closeProductModal);
document.getElementById('modalClose').addEventListener('click', closeProductModal);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeProductModal(); });
