/* ═══════════════════════════════════════════
   GALLERY.JS — Fondo difuminado + Lightbox
═══════════════════════════════════════════ */

(function initGallery() {
  const items   = document.querySelectorAll('.gallery-item');
  const bg      = document.getElementById('galleryBg');
  const lightbox = document.getElementById('lightbox');
  const lbImg   = document.getElementById('lightboxImg');
  const lbLabel = document.getElementById('lightboxLabel');
  const lbClose = document.getElementById('lightboxClose');
  const lbBg    = document.getElementById('lightboxBackdrop');

  if (!items.length) return;

  // ── Fondo difuminado al hover ──
  items.forEach(item => {
    item.addEventListener('mouseenter', () => {
      const src = item.dataset.src;
      if (!src) return;
      bg.style.backgroundImage = `url('${src}')`;
      bg.classList.add('active');
    });

    item.addEventListener('mouseleave', () => {
      bg.classList.remove('active');
    });

    // ── Lightbox al click ──
    item.addEventListener('click', () => {
      const src   = item.dataset.src;
      const label = item.dataset.label || '';
      if (!src) return;
      lbImg.src       = src;
      lbImg.alt       = label;
      lbLabel.textContent = label;
      lightbox.classList.add('open');
      document.body.style.overflow = 'hidden';
    });
  });

  // ── Cerrar lightbox ──
  function closeLightbox() {
    lightbox.classList.remove('open');
    document.body.style.overflow = '';
    // Pequeño delay para evitar parpadeo al re-abrir
    setTimeout(() => { lbImg.src = ''; }, 300);
  }

  lbClose.addEventListener('click', closeLightbox);
  lbBg.addEventListener('click', closeLightbox);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && lightbox.classList.contains('open')) closeLightbox();
  });
})();
