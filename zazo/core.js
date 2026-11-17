export const initial = () => ({
  settings: {price:0, capacity:20, alias:'', qr:''},
  sequence:0, turns:[], payments:[], expenses:[], staff:[], ops:[]
});
const methods = ['QR','Transferencia','Efectivo','Cortesía'];
const amount = n => Number.isSafeInteger(n) && n >= 0 && n <= 1000000000;
const short = (s,n=80) => typeof s === 'string' ? s.trim().slice(0,n) : '';
const assert = (ok, message) => { if (!ok) throw new Error(message); };
export function apply(state, action, now) {
  assert(typeof action?.id === 'string' && /^[a-z0-9-]{12,80}$/i.test(action.id), 'Identificador inválido.');
  if (state.ops.includes(action.id)) return state;
  const next = structuredClone(state);
  const turn = next.turns.find(t => t.id === action.turn);
  const open = t => t && !['closed','void'].includes(t.status);
  const payment = t => {
    assert(methods.includes(action.method), 'Elegí un medio de pago.');
    const courtesy = action.method === 'Cortesía';
    const value = action.price ?? (courtesy ? 0 : next.settings.price);
    const tip = action.tip ?? 0;
    assert(amount(value) && (courtesy ? value === 0 : value > 0), 'Ingresá un precio válido o elegí Cortesía.');
    assert(amount(tip) && amount(value + tip), 'Revisá el importe de la propina.');
    assert(!courtesy || !tip || methods.slice(0, 3).includes(action.tipMethod), 'Elegí cómo se recibió la propina.');
    assert(action.expected === value + tip, 'Cambió el importe. Revisalo y volvé a confirmar.');
    next.payments.push({
      id:action.id, turn:t.id, method:action.method, amount:value + tip, tip,
      tipMethod:courtesy && tip ? action.tipMethod : undefined, at:now
    });
  };
  switch (action.type) {
    case 'settings': {
      const {price,capacity,alias,qr} = action;
      assert(amount(price) && Number.isInteger(capacity) && capacity >= 1 && capacity <= 999, 'Revisá el precio y el cupo.');
      assert(!qr || (typeof qr === 'string' && qr.length <= 220000 && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(qr)), 'Elegí una imagen PNG, JPG o WebP de hasta 160 KB.');
      next.settings = {price,capacity,alias:short(alias),qr:qr || ''};
      break;
    }
    case 'start': {
      assert(next.turns.filter(open).length < next.settings.capacity, 'Cupo completo. Registrá una salida antes de ingresar otro turno.');
      assert(['3–5','6–8','9+','Sin indicar'].includes(action.age), 'Elegí un grupo de edad.');
      const t = {id:action.id, number:++next.sequence, name:short(action.name,40), age:action.age, start:now, end:now+900000, status:'active'};
      payment(t);
      next.turns.push(t);
      break;
    }
    case 'call':
      assert(open(turn) && turn.status === 'active', 'El turno ya cambió.');
      turn.status = 'called';
      turn.called = now;
      break;
    case 'close':
      assert(open(turn), 'El turno ya cambió.');
      turn.status = 'closed';
      turn.closed = now;
      break;
    case 'renew':
      assert(open(turn) && turn.end === action.previousEnd, 'El turno ya cambió. Revisá el reloj.');
      payment(turn);
      turn.end = Math.max(now,turn.end)+900000;
      turn.status = 'active';
      break;
    case 'void':
      assert(turn && turn.status !== 'void', 'El turno ya está anulado.');
      assert(short(action.reason), 'Ingresá el motivo de la anulación.');
      turn.status = 'void';
      turn.closed = now;
      turn.reason = short(action.reason);
      for (const p of next.payments.filter(p => p.turn === turn.id)) p.voided = now;
      break;
    case 'expense':
      assert(short(action.label) && amount(action.amount) && action.amount > 0, 'Ingresá un concepto y un importe válido.');
      next.expenses.push({id:action.id, label:short(action.label), amount:action.amount, at:now});
      break;
    case 'staff':
      assert(short(action.name) && amount(action.amount), 'Ingresá un nombre y un importe válido.');
      next.staff.push({id:action.id, name:short(action.name), role:short(action.role), amount:action.amount});
      break;
    case 'remove':
      assert(['expenses','staff'].includes(action.list) && next[action.list].some(row => row.id === action.row), 'Registro inexistente.');
      next[action.list] = next[action.list].filter(row => row.id !== action.row);
      break;
    default: throw new Error('Operación desconocida.');
  }
  next.ops.push(action.id);
  return next;
}
const json = (body,status=200) => Response.json(body,{status,headers:{'Cache-Control':'no-store'}});
export async function route(request, db, assets) {
  const path = new URL(request.url).pathname;
  if (path !== '/api/state') {
    const asset = assets[path];
    return asset ? new Response(asset[0],{headers:{'Content-Type':asset[1],'Cache-Control':'no-cache'}}) : new Response('Página inexistente',{status:404});
  }
  try {
    await db.prepare('INSERT OR IGNORE INTO event_state VALUES (1, 0, ?)').bind(JSON.stringify(initial())).run();
    const read = () => db.prepare('SELECT version, body FROM event_state WHERE id=1').first();
    if (request.method === 'GET') {
      const row = await read();
      return json({state:JSON.parse(row.body),now:Date.now()});
    }
    if (request.method !== 'POST') return json({error:'Método inválido.'},405);
    if (!request.headers.get('Content-Type')?.startsWith('application/json')) return json({error:'Formato inválido.'},415);
    const raw = await request.text();
    if (raw.length > 250000) return json({error:'El archivo supera el límite.'},413);
    let action;
    try { action = JSON.parse(raw); } catch { return json({error:'Solicitud inválida.'},400); }
    for (let attempt=0;attempt<5;attempt++) {
      const row = await read();
      const previous = JSON.parse(row.body);
      const now = Date.now();
      let state;
      try { state = apply(previous,action,now); } catch (error) { return json({error:error.message},409); }
      if (state === previous) return json({state,now});
      const result = await db.prepare('UPDATE event_state SET body=?, version=version+1 WHERE id=1 AND version=?').bind(JSON.stringify(state),row.version).run();
      if (result.meta.changes === 1) return json({state,now});
    }
    return json({error:'Hubo varias operaciones simultáneas. Reintentá.'},503);
  } catch {
    return json({error:'No se pudo acceder a los datos. Reintentá.'},503);
  }
}
