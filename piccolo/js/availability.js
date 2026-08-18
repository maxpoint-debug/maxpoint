/* Disponibilidad respaldada por Cloud Firestore. */

let _availTimer = null;

document.getElementById('fecha').addEventListener('change', function () {
  clearTimeout(_availTimer);
  const fecha = this.value;
  const espacio = document.getElementById('espacio').value;
  if (!fecha || !espacio) return;
  _availTimer = setTimeout(() => checkAvailability(fecha, espacio), 400);
});

function waitForFirebase() {
  if (window.piccoloFirebase) return Promise.resolve(window.piccoloFirebase);

  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Firebase no inició')), 8000);
    window.addEventListener('piccolo:firebase-ready', () => {
      clearTimeout(timeout);
      resolve(window.piccoloFirebase);
    }, { once: true });
  });
}

window.checkAvailability = async function (fecha, espacioVal) {
  const badge = document.getElementById('availBadge');
  const text = document.getElementById('availText');

  badge.className = 'availability-badge checking';
  text.textContent = 'Verificando disponibilidad...';

  try {
    const firebase = await waitForFirebase();
    const disponible = await firebase.isAvailable(fecha, espacioVal);

    if (disponible) {
      badge.className = 'availability-badge available';
      text.textContent = '✓ Fecha disponible — completá el resto del formulario';
    } else {
      badge.className = 'availability-badge unavailable';
      text.textContent = 'Fecha no disponible para esa propuesta. Consultanos por WhatsApp.';
    }
  } catch (error) {
    badge.className = 'availability-badge checking';
    text.textContent = 'No pudimos verificar automáticamente. Escribinos por WhatsApp.';
    console.warn('Firebase availability error:', error);
  }
};

