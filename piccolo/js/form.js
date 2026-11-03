/* ═══════════════════════════════════════════
   FORM.JS — Precio estimado + WhatsApp
═══════════════════════════════════════════ */

const DEFAULT_WA_NUMBER = '542323538825';

// ── Precio ──
function updatePrice() {
  const select  = document.getElementById('espacio');
  const preview = document.getElementById('pricePreview');
  const val     = select.value;

  if (!val) { preview.classList.remove('visible'); return; }

  const price   = parseInt(val.split('|')[1]);
  const name    = select.options[select.selectedIndex].text.split(' — ')[0];
  const depositPercentage = Number(window.piccoloSettings?.depositPercentage ?? 20);
  const seña    = Math.round(price * depositPercentage / 100);
  const horario = document.getElementById('horario').value;

  document.getElementById('priceProductName').textContent = name;
  document.getElementById('priceBase').textContent        = `$${price.toLocaleString('es-AR')}`;
  document.getElementById('priceTotal').textContent       = `$${price.toLocaleString('es-AR')}`;
  document.getElementById('priceSeñaVal').textContent     = `$${seña.toLocaleString('es-AR')}`;
  document.getElementById('depositPercentageLabel').textContent = `${depositPercentage}%`;
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
document.getElementById('submitBtn').addEventListener('click', async () => {
  const nombre    = document.getElementById('nombre').value.trim();
  const agasajado = document.getElementById('agasajado').value.trim();
  const fecha     = document.getElementById('fecha').value;
  const horario   = document.getElementById('horario').value;
  const ubicacion = document.getElementById('ubicacion').value.trim();
  const localidad = document.getElementById('localidad').value.trim();
  const cp        = document.getElementById('cp').value.trim();
  const telefono  = document.getElementById('telefono').value.trim();
  const extras    = document.getElementById('extras').value.trim();
  const termsAccepted = document.getElementById('termsAccepted').checked;
  const select    = document.getElementById('espacio');
  const espacio   = select.value
    ? select.options[select.selectedIndex].text.split(' — ')[0]
    : '';

  if (!nombre || !fecha || !espacio || !telefono) {
    alert('Por favor completá al menos: nombre, fecha, espacio deseado y WhatsApp de contacto.');
    return;
  }

  if (fecha < document.getElementById('fecha').min) {
    alert('Elegí una fecha válida con la anticipación mínima requerida.');
    return;
  }

  if (!termsAccepted) {
    alert('Para continuar, leé y aceptá las condiciones de cuidado, cancelación y reprogramación.');
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

  const submitBtn = document.getElementById('submitBtn');
  if (submitBtn.disabled) return;
  submitBtn.disabled = true;
  const originalLabel = submitBtn.innerHTML;
  submitBtn.textContent = 'Registrando consulta...';
  try {
    if (!window.piccoloFirebase) {
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('Firebase no disponible')), 8000);
        window.addEventListener('piccolo:firebase-ready', () => { clearTimeout(timer); resolve(); }, { once: true });
      });
    }
    const inquiryId = await window.piccoloFirebase.saveInquiry({
      nombre, agasajado, fecha, horario, productValue: select.value,
      espacio, ubicacion, localidad, cp, telefono, extras, termsAccepted,
      termsVersion: window.piccoloSettings?.termsVersion || 'catalogo-diciembre-v1',
      displayedPrice: Number(select.value.split('|')[1]),
      displayedDepositPercentage: Number(window.piccoloSettings?.depositPercentage ?? 20)
    });
    msg += `\n🧾 *Consulta:* ${inquiryId}`;
    const whatsappNumber = String(window.piccoloSettings?.whatsappNumber || DEFAULT_WA_NUMBER).replace(/\D/g, '');
    window.location.href = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(msg)}`;
  } catch (error) {
    console.error('Error al registrar consulta:', error);
    alert('No pudimos registrar tu consulta. Probá nuevamente o escribinos directamente por WhatsApp.');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = originalLabel;
  }
});

function applyMinimumDate() {
  const minimumDays = Number(window.piccoloSettings?.minimumAdvanceDays ?? 5);
  const minimum = new Date();
  minimum.setHours(12, 0, 0, 0);
  minimum.setDate(minimum.getDate() + minimumDays);
  document.getElementById('fecha').min = [minimum.getFullYear(), String(minimum.getMonth() + 1).padStart(2, '0'), String(minimum.getDate()).padStart(2, '0')].join('-');
}

window.addEventListener('piccolo:catalog-ready', applyMinimumDate);
applyMinimumDate();
