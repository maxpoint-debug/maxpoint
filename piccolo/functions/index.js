const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { initializeApp } = require('firebase-admin/app');
const { getFirestore, FieldValue } = require('firebase-admin/firestore');
initializeApp();
const db = getFirestore();
const region = 'southamerica-east1';

function fail(code, message) { throw new HttpsError(code, message); }
async function requireAdmin(auth) {
  if (!auth || auth.token.firebase?.sign_in_provider === 'anonymous') fail('unauthenticated', 'Iniciá sesión como administrador.');
  const snap = await db.doc('admins/' + auth.uid).get();
  if (!snap.exists || snap.data().active !== true) fail('permission-denied', 'No sos administrador activo.');
}
function validDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(value + 'T12:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}
function uniqueIds(ids) { return [...new Set(ids)]; }
function resolveEquipment(proposal, kind, choices) {
  if (kind === 'product') return [proposal.id];
  const ids = [...(proposal.componentProductIds || [])];
  for (const group of proposal.componentGroups || []) {
    const chosen = choices?.[group.id];
    if (typeof chosen !== 'string' || !group.productIds.includes(chosen)) fail('invalid-argument', 'Seleccioná ' + group.label);
    ids.push(chosen);
  }
  if (!ids.length) fail('failed-precondition', 'El combo no tiene equipos configurados.');
  return uniqueIds(ids);
}
exports.confirmDeposit = onCall({ region, enforceAppCheck: false }, async request => {
  await requireAdmin(request.auth);
  const { inquiryId, amount, choices = {}, paymentReference = '' } = request.data || {};
  if (typeof inquiryId !== 'string' || !/^[A-Za-z0-9_-]{1,120}$/.test(inquiryId)) fail('invalid-argument', 'Consulta inválida.');
  if (!Number.isSafeInteger(amount) || amount <= 0) fail('invalid-argument', 'Importe de seña inválido.');
  if (typeof paymentReference !== 'string' || paymentReference.length > 160) fail('invalid-argument', 'Referencia inválida.');
  if (!choices || typeof choices !== 'object' || Array.isArray(choices)) fail('invalid-argument', 'Selección inválida.');
  const inquiryRef = db.doc('inquiries/' + inquiryId);
  const reservationRef = db.doc('reservations/' + inquiryId);
  return db.runTransaction(async tx => {
    const [inquirySnap, existing] = await Promise.all([tx.get(inquiryRef), tx.get(reservationRef)]);
    if (!inquirySnap.exists) fail('not-found', 'No existe la consulta.');
    if (existing.exists) fail('already-exists', 'La consulta ya tiene una reserva.');
    const inquiry = inquirySnap.data();
    if (!validDate(inquiry.fecha)) fail('invalid-argument', 'La fecha de la consulta no es válida.');
    const id = inquiry.productId;
    if (typeof id !== 'string' || !/^[a-z0-9-]+$/.test(id)) fail('invalid-argument', 'Producto inválido.');
    const productRef = db.doc('products/' + id);
    const comboRef = db.doc('combos/' + id);
    const [product, combo, settings, dateBlock] = await Promise.all([
      tx.get(productRef), tx.get(comboRef), tx.get(db.doc('settings/public')), tx.get(db.doc('dateBlocks/' + inquiry.fecha))
    ]);
    if (dateBlock.exists && dateBlock.data().blocked !== false) fail('failed-precondition', 'La fecha está bloqueada.');
    const kind = product.exists ? 'product' : 'combo';
    const snap = product.exists ? product : combo;
    if (!snap.exists) fail('not-found', 'La propuesta ya no existe.');
    const proposal = { id, ...snap.data() };
    if (!proposal.active || !proposal.bookable || proposal.outOfService === true) fail('failed-precondition', 'La propuesta no está disponible.');
    const equipmentIds = resolveEquipment(proposal, kind, choices);
    const equipmentRefs = equipmentIds.map(e => db.doc('products/' + e));
    const equipmentSnaps = await Promise.all(equipmentRefs.map(r => tx.get(r)));
    for (const e of equipmentSnaps) {
      if (!e.exists || !e.data().active || e.data().outOfService === true || e.data().bookable === false)
        fail('failed-precondition', 'Uno de los equipos está fuera de servicio.');
    }
    const locks = equipmentIds.map(e => db.doc('inventoryLocks/' + inquiry.fecha + '_' + e));
    const lockSnaps = await Promise.all(locks.map(r => tx.get(r)));
    if (lockSnaps.some(s => s.exists)) fail('already-exists', 'Uno de los equipos ya está reservado para esa fecha.');
    const percent = Number(settings.data()?.depositPercentage ?? 20);
    if (!Number.isFinite(percent) || percent <= 0 || percent > 100) fail('failed-precondition', 'Configuración de seña inválida.');
    const price = Number(proposal.price);
    if (!Number.isSafeInteger(price) || price < 0) fail('failed-precondition', 'Precio de catálogo inválido.');
    const requiredDeposit = Math.ceil(price * percent / 100);
    if (amount < requiredDeposit) fail('failed-precondition', 'La seña mínima es $' + requiredDeposit + '.');
    const reservation = {
      inquiryId, date: inquiry.fecha, productId: id, proposalTitle: proposal.title,
      equipmentIds, choices, price, requiredDeposit, depositAmount: amount,
      paymentReference, status: 'confirmed', customerName: inquiry.nombre || '',
      customerPhone: inquiry.telefono || '', confirmedBy: request.auth.uid,
      confirmedAt: FieldValue.serverTimestamp()
    };
    tx.create(reservationRef, reservation);
    for (let i = 0; i < locks.length; i++) tx.create(locks[i], {
      date: inquiry.fecha, equipmentId: equipmentIds[i], reservationId: inquiryId,
      createdAt: FieldValue.serverTimestamp()
    });
    return { reservationId: inquiryId, equipmentIds, requiredDeposit };
  });
});

exports.cancelReservation = onCall({ region, enforceAppCheck: false }, async request => {
  await requireAdmin(request.auth);
  const { reservationId, reason = '' } = request.data || {};
  if (typeof reservationId !== 'string' || !/^[A-Za-z0-9_-]{1,120}$/.test(reservationId)) fail('invalid-argument', 'Reserva inválida.');
  if (typeof reason !== 'string' || reason.length > 500) fail('invalid-argument', 'Motivo inválido.');
  const ref = db.doc('reservations/' + reservationId);
  return db.runTransaction(async tx => {
    const snap = await tx.get(ref);
    if (!snap.exists) fail('not-found', 'No existe la reserva.');
    const reservation = snap.data();
    if (reservation.status !== 'confirmed') fail('failed-precondition', 'La reserva no está confirmada.');
    const locks = reservation.equipmentIds.map(e => db.doc('inventoryLocks/' + reservation.date + '_' + e));
    const lockSnaps = await Promise.all(locks.map(r => tx.get(r)));
    if (lockSnaps.some(s => !s.exists || s.data().reservationId !== reservationId))
      fail('failed-precondition', 'Los bloqueos no coinciden; requiere revisión manual.');
    for (const lock of locks) tx.delete(lock);
    tx.update(ref, { status: 'cancelled', cancellationReason: reason, cancelledBy: request.auth.uid, cancelledAt: FieldValue.serverTimestamp() });
    return { cancelled: true };
  });
});
