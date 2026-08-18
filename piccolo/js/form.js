/* ═══════════════════════════════════════════
   FORM.JS — Precio estimado + WhatsApp
═══════════════════════════════════════════ */

const WA_NUMBER = '542323538825';

// ── Precio ──
function updatePrice() {
  const select  = document.getElementById('espacio');
  const preview = document.getElementById('pricePreview');
  const val     = select.value;

  if (!val) { preview.classList.remove('visible'); return; }

  const price   = parseInt(val.split('|')[1]);
  const name    = select.options[select.selectedIndex].text.split(' — ')[0];
  const seña    = Math.round(price * 0.2);
  const horario = document.getElementById('horario').value;

  document.getElementById('priceProductName').textContent = name;
  document.getElementById('priceBase').textContent        = `$${price.toLocaleString('es-AR')}`;
  document.getElementById('priceTotal').textContent       = `$${price.toLocaleString('es-AR')}`;
  document.getElementById('priceSeñaVal').textContent     = `$${seña.toLocaleString('es-AR')}`;
  document.getElementById('priceNocheRow').style.display  = horario === 'noche' ? 'flex' : 'none';

  preview.classList.add('visible');
}

document.getElementById('espacio').addEventListener('change', () => {
  updatePrice();
  // dispara verificación de disponibilidad si ya hay fecha
  const fecha = document.getElementById('fecha').value;
  if (fecha && document.getElementById('espacio').value) {
    checkAvailability(fecha, document.getElementById('espacio').value);
  }
});

document.getElementById('horario').addEventListener('change', updatePrice);

// ── WhatsApp ──
document.getElementById('submitBtn').addEventListener('click', () => {
  const nombre    = document.getElementById('nombre').value.trim();
  const agasajado = document.getElementById('agasajado').value.trim();
  const fecha     = document.getElementById('fecha').value;
  const horario   = document.getElementById('horario').value;
  const ubicacion = document.getElementById('ubicacion').value.trim();
  const localidad = document.getElementById('localidad').value.trim();
  const cp        = document.getElementById('cp').value.trim();
  const telefono  = document.getElementById('telefono').value.trim();
  const extras    = document.getElementById('extras').value.trim();
  const select    = document.getElementById('espacio');
  const espacio   = select.value
    ? select.options[select.selectedIndex].text.split(' — ')[0]
    : '';

  if (!nombre || !fecha || !espacio || !telefono) {
    alert('Por favor completá al menos: nombre, fecha, espacio deseado y WhatsApp de contacto.');
    return;
  }

  const fechaFmt = new Date(fecha + 'T12:00:00')
    .toLocaleDateString('es-AR', { weekday:'long', year:'numeric', month:'long', day:'numeric' });

  let ubicFull = ubicacion;
  if (localidad) ubicFull += ubicacion ? `, ${localidad}` : localidad;
  if (cp)        ubicFull += ` (CP ${cp})`;

  let msg = `🎉 *CONSULTA DE RESERVA – PICCOLO*\n\n`;
  msg += `👤 *Nombre:* ${nombre}\n`;
  if (agasajado) msg += `🎂 *Agasajado/a:* ${agasajado}\n`;
  msg += `📅 *Fecha:* ${fechaFmt}\n`;
  if (horario)   msg += `🕐 *Horario:* ${horario === 'noche' ? 'Nocturno' : horario + ' hs'}\n`;
  msg += `🎠 *Espacio:* ${espacio}\n`;
  if (ubicFull)  msg += `📍 *Dirección:* ${ubicFull}\n`;
  msg += `📱 *Contacto:* ${telefono}\n`;
  if (extras)    msg += `\n💬 *Consulta adicional:*\n${extras}`;
  msg += `\n\n_Enviado desde maxpoint-debug.github.io/maxpoint/piccolo_`;

  if (window.piccoloFirebase) {
    window.piccoloFirebase.saveInquiry({
        nombre,
        agasajado,
        fecha,
        horario,
        productValue: select.value,
        espacio,
        ubicacion,
        localidad,
        cp,
        telefono,
        extras
      }).catch(error => {
      console.warn('No se pudo guardar la consulta en Firebase:', error);
      });
  }

  window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(msg)}`, '_blank');
});
