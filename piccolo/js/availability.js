/*
 * La disponibilidad definitiva requiere una Cloud Function transaccional.
 * No se consulta Google Calendar ni se simula una respuesta positiva.
 */

document.getElementById('fecha').addEventListener('change', showAvailabilityStatus);
document.getElementById('espacio').addEventListener('change', showAvailabilityStatus);

window.checkAvailability = function () {
  showAvailabilityStatus();
};

function showAvailabilityStatus() {
  const fecha = document.getElementById('fecha').value;
  const espacio = document.getElementById('espacio').value;
  const badge = document.getElementById('availBadge');
  const text = document.getElementById('availText');
  if (!fecha || !espacio) {
    badge.className = 'availability-badge';
    text.textContent = '';
    return;
  }
  badge.className = 'availability-badge checking';
  text.textContent = 'La disponibilidad online se habilitará al conectar el backend seguro. Podés continuar la consulta por WhatsApp.';
}

