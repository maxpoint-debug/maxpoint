const byId = id => document.getElementById(id);
const screen = byId('screen');
const dialog = byId('dialog');
const pages = {turns:'Turnos',cash:'Caja y gastos',staff:'Personal',settings:'Configuración'};
const filters = {open:'En juego',called:'Llamados',history:'Historial'};
const methods = ['QR','Transferencia','Efectivo','Cortesía'];
const cash = new Intl.NumberFormat('es-AR',{style:'currency',currency:'ARS',maximumFractionDigits:0});
const money = value => cash.format(value);
const clock = value => new Date(value).toLocaleTimeString('es-AR',{hour:'2-digit',minute:'2-digit'});
const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const open = t => !['closed','void'].includes(t.status);
const ticket = t => '#'+String(t.number).padStart(3,'0');
const sum = (rows,key='amount') => rows.reduce((total,r)=>total+r[key],0);
const now = () => Date.now()+offset;
let state, page='turns', filter='open', query='', offset=0, online=false, writing=false, sequence=0, toastTimer, audio;
let pending;
try { pending=JSON.parse(sessionStorage.getItem('saso-pending')); } catch {}
const alerts = new Map();
function message(text) {
  byId('toast').textContent=text;
  clearTimeout(toastTimer);
  toastTimer=setTimeout(()=>byId('toast').textContent='',6500);
}
function connection(value) {
  online=value;
  byId('connection').textContent=value?'Sincronizado':'Sin conexión';
  byId('connection').classList.toggle('off',!value);
}
async function request(action) {
  const response=await fetch('/api/state',{
    signal:AbortSignal.timeout(8000),
    ...(action ? {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(action)} : {})
  });
  if (response.status >= 500) throw new Error('Sin confirmación del servidor. Reintentá la misma operación.');
  const data=await response.json();
  if (!response.ok) return {rejected:true,error:data.error};
  return data;
}
function accept(data) {
  const previous=state;
  offset=data.now-Date.now();
  state=data.state;
  connection(true);
  if (!previous || previous.ops.length !== state.ops.length || page==='turns' && !byId('turn-list')) render();
  tick();
}
async function poll() {
  if (writing) return;
  const stamp=++sequence;
  try {
    const data=await request();
    if (stamp === sequence && !writing && !data.rejected) accept(data);
  } catch {
    if (stamp === sequence && !writing) connection(false);
  }
}
function savePending(action) {
  pending=action;
  try {
    if (action) sessionStorage.setItem('saso-pending',JSON.stringify(action));
    else sessionStorage.removeItem('saso-pending');
  } catch {}
}
function actionId() {
  return Array.from(crypto.getRandomValues(new Uint8Array(16)),n=>n.toString(16).padStart(2,'0')).join('');
}
async function submit(action) {
  if (writing) return;
  if (pending && action !== pending) {
    message('Resolvé primero la operación pendiente de esta tablet.');
    return;
  }
  writing=true;
  ++sequence;
  savePending(action.id ? action : {...action,id:actionId()});
  for (const button of dialog.querySelectorAll('button')) button.disabled=true;
  try {
    const data=await request(pending);
    if (data.rejected) {
      savePending(null);
      if (dialog.open && dialog.querySelector('.error')) dialog.querySelector('.error').textContent=data.error;
      else message(data.error);
      renderPending();
      return;
    }
    const confirmed=pending;
    savePending(null);
    accept(data);
    renderPending();
    if (dialog.open) dialog.close();
    const created=state.turns.find(t=>t.id===confirmed.id);
    if (created) {
      filter='open'; query=''; render();
      message('Entregá el cartel '+ticket(created)+' · 15 minutos en juego');
    } else message(confirmed.type==='renew'?'Renovado · se sumaron 15 minutos':'Guardado en ambas tablets');
  } catch {
    connection(false);
    if (dialog.open) dialog.close();
    renderPending();
    message('Operación sin confirmar. Usá Reintentar antes de volver a cobrar.');
  } finally {
    writing=false;
    for (const button of dialog.querySelectorAll('button')) button.disabled=false;
  }
}
const stat = (icon,label,value,id='') => `<div class="stat"><div class="stat-icon" aria-hidden="true">${icon}</div><span class="label">${label}</span><strong ${id?'id="'+id+'"':''}>${value}</strong></div>`;
const empty = (icon,title,body) => `<div class="empty"><span aria-hidden="true">${icon}</span><strong>${title}</strong>${body}</div>`;
const head = (title,detail) => `<div class="page-head"><h1>${title}</h1><p class="muted">${detail}</p></div>`;
const panelHead = (title,detail='',end='') => `<div class="panel-head"><div><h2>${title}</h2>${detail?'<p class="muted">'+detail+'</p>':''}</div>${end}</div>`;
function renderPending() {
  const container=byId('pending');
  if (container) container.innerHTML=pending?'<div class="notice">Hay una operación sin confirmar en esta tablet. <button class="secondary" data-do="retry">Reintentar</button></div>':'';
}
function render() {
  if (!state) {
    screen.innerHTML='<section class="panel">'+empty('◷','Conectando con el puesto','Los turnos aparecerán al recuperar la conexión.')+'</section>';
    return;
  }
  const {settings,turns,payments,expenses,staff}=state;
  const active=turns.filter(open);
  const valid=payments.filter(p=>!p.voided);
  const income=sum(valid);
  const focused=byId('search')===document.activeElement;
  const selection=focused?[byId('search').selectionStart,byId('search').selectionEnd]:null;
  if (page==='turns') {
    screen.innerHTML=`
      <div class="hero"><div><div class="eyebrow">OPERACIÓN DE FERIA</div><h1>Control de turnos</h1><p>Cobrá, asigná un número y seguí el tiempo de juego.</p></div><img class="hero-mascot" src="/zazo-mascot.webp" alt="" width="420" height="367"><button class="primary" data-do="new">＋ Nuevo turno</button></div>
      <div class="stats">${stat('◷','En el puesto',active.length+' / '+settings.capacity)}${stat('⌛','Por vencer',0,'soon-count')}${stat('!','Vencidos',0,'late-count')}${stat('$','Cobrado',money(income))}</div>
      <div id="pending"></div>
      ${settings.price?'':'<div class="notice">Configurá la tarifa para empezar a cobrar. <button class="secondary" data-do="settings">Configurar tarifa</button></div>'}
      <section class="panel">${panelHead('Tablero de turnos','Cada ingreso dura 15 minutos.','<span class="price-chip">'+(settings.price?money(settings.price)+' / turno':'Tarifa pendiente')+'</span>')}
      <div class="toolbar"><div class="tabs" aria-label="Filtrar turnos">${Object.entries(filters).map(([key,label])=>`<button data-filter="${key}" aria-pressed="${key===filter}">${label}</button>`).join('')}</div><input id="search" class="search" type="text" inputmode="search" aria-label="Buscar turno" placeholder="Buscar por número o nombre" value="${esc(query)}"></div>
      <div id="turn-list"></div></section><p class="bottom">El reloj sigue corriendo aunque la pantalla se bloquee. Las alertas se ven con el tablero abierto.</p>`;
    renderTurns();
    if(selection) { byId('search').focus(); byId('search').setSelectionRange(...selection); }
  }
  if (page==='cash') {
    screen.innerHTML=head('Caja y gastos','Ingresos, costos y resultado de la jornada.')+
    `<div class="stats">${stat('$','Ingresos',money(income))}${stat('▤','Gastos y personal',money(sum(expenses)+sum(staff)))}${stat('↗','Resultado',money(income-sum(expenses)-sum(staff)))}${stat('◷','Ingresos de chicos',turns.filter(t=>t.status!=='void').length)}</div><div id="pending"></div>
    <div class="columns"><section class="panel">${panelHead('Medios de pago','Importes confirmados','<button class="secondary" data-do="export">Exportar CSV</button>')}${methods.map(m=>`<div class="row"><span>${m}</span><strong>${money(sum(valid.filter(p=>(p.tipMethod || p.method)===m)))}</strong></div>`).join('')}</section>
    <section class="panel">${panelHead('Gastos','','<button class="secondary" data-do="expense">＋ Gasto</button>')}${expenses.map(e=>costRow(e,'expenses',e.label,clock(e.at))).join('')||empty('▤','Sin gastos cargados','Registrá los gastos del puesto acá.')}</section></div>
    <section class="panel">${panelHead('Movimientos','Incluye renovaciones y anulaciones')}${[...payments].reverse().map(p=>{const t=turns.find(t=>t.id===p.turn); return `<div class="row"><span class="turn-id">${ticket(t)}</span><div class="row-info"><strong>${p.method}</strong><small class="muted">${clock(p.at)}${p.tip?' · Propina '+money(p.tip)+(p.tipMethod?' por '+p.tipMethod:''):''}${p.voided?' · Anulado':''}</small></div><strong>${money(p.amount)}</strong></div>`;}).join('')||empty('$','Sin movimientos','Los cobros confirmados aparecen acá.')}</section>`;
  }
  if (page==='staff') {
    screen.innerHTML=head('Personal','Registrá quién trabaja en el puesto y el costo de la jornada.')+`<div id="pending"></div><section class="panel">${panelHead('Equipo',staff.length+' personas · '+money(sum(staff)),'<button class="primary" data-do="staff">＋ Agregar persona</button>')}${staff.map(e=>costRow(e,'staff',e.name,e.role)).join('')||empty('♙','Sin personal cargado','Agregá integrantes del equipo y su costo.')}</section>`;
  }
  if (page==='settings') {
    screen.innerHTML=head('Configuración','Los cambios se comparten entre las tablets.')+`<div id="pending"></div><section class="panel">${panelHead('Tarifa, cupo y cobro','Duración de cada turno y renovación · 15 minutos')}
    <form class="fields" id="settings-form"><label>Precio por turno (ARS)<input name="price" type="number" min="0" max="1000000000" inputmode="numeric" value="${settings.price}" required></label>
    <label>Cupo simultáneo<input name="capacity" type="number" min="1" max="999" inputmode="numeric" value="${settings.capacity}" required></label>
    <label>Alias de transferencia<input name="alias" maxlength="80" value="${esc(settings.alias)}" autocomplete="off"></label>
    <label>Imagen del QR de cobro<input name="qr" type="file" accept="image/png,image/jpeg,image/webp"></label>
    ${settings.qr?'<img class="qr" alt="QR configurado" src="'+esc(settings.qr)+'"><label><span><input type="checkbox" name="clear"> Quitar imagen del QR</span></label>':''}
    <button class="primary">Guardar configuración</button></form></section>`;
  }
  renderPending();
  tick();
}
function costRow(e,list,label,detail) {
  return `<div class="row"><div class="row-info"><strong>${esc(label)}</strong><small class="muted">${esc(detail)}</small></div><strong>${money(e.amount)}</strong><button class="secondary" data-do="remove" data-list="${list}" data-id="${e.id}">Quitar</button></div>`;
}
function renderTurns() {
  const list=byId('turn-list');
  if (!list) return;
  const filtered=state.turns.filter(t=>filter==='history'?!open(t):filter==='called'?t.status==='called':t.status==='active')
    .filter(t=>(ticket(t)+' '+t.number+' '+t.name).toLowerCase().includes(query.toLowerCase().trim()))
    .sort((a,b)=>filter==='history'?b.number-a.number:a.end-b.end);
  list.innerHTML=filtered.map(t=>`<article class="row"><span class="turn-id">${ticket(t)}</span><div class="row-info"><strong>${esc(t.name || 'Turno '+ticket(t))}</strong><small class="muted">${esc(t.age)}${t.age==='Sin indicar'?'':' años'} · Ingresó ${clock(t.start)}</small></div>
  ${open(t)?`<span class="timer" id="timer-${t.id}"></span><div class="actions">${t.status==='active'?'<button class="secondary" data-do="call" data-id="'+t.id+'">Llamado</button>':''}<button class="secondary" data-do="renew" data-id="${t.id}">＋15 min</button><button class="primary" data-do="close" data-id="${t.id}">Ya salió</button></div>`:
  `<span class="muted">${t.status==='void'?'Anulado · '+esc(t.reason):'Salió '+clock(t.closed)}</span>`}
  ${t.status!=='void'?'<button class="secondary" data-do="void" data-id="'+t.id+'" aria-label="Anular turno '+ticket(t)+'">Anular</button>':''}</article>`).join('') ||
    (query ? empty('⌕','Sin coincidencias','Probá otro número o nombre.') :
      filter==='open'?empty('◷','Todavía no hay turnos activos','Usá Nuevo turno para registrar el próximo ingreso.') :
      filter==='called'?empty('♬','Sin turnos llamados','Acá aparecen los chicos que esperan la salida.') :
      empty('▤','Todavía no hay salidas','Los turnos cerrados y anulados aparecen acá.'));
  tick();
}
function tick() {
  if (!state) return;
  let soon=0,late=0;
  for (const t of state.turns.filter(open)) {
    const seconds=Math.max(0,Math.ceil((t.end-now())/1000));
    const phase=seconds===0?'late':seconds<=60?'soon':'normal';
    if (phase==='late') late++;
    if (phase==='soon') soon++;
    const timer=byId('timer-'+t.id);
    const caption=seconds>0?String(Math.floor(seconds/60)).padStart(2,'0')+':'+String(seconds%60).padStart(2,'0'):'Vencido';
    if(timer && timer.textContent!==caption) timer.textContent=caption;
    if(timer) timer.className='timer '+phase;
    const key=t.id+'-'+t.end;
    if(t.status==='active' && phase!=='normal' && alerts.get(key)!==phase) {
      alerts.set(key,phase);
      message((t.name || ticket(t))+(phase==='soon'?' · queda un minuto':' · tiempo vencido'));
      beep();
    }
  }
  if(byId('soon-count')) byId('soon-count').textContent=soon;
  if(byId('late-count')) byId('late-count').textContent=late;
}
function beep() {
  if (!audio || audio.state!=='running') return;
  const oscillator=audio.createOscillator();
  const volume=audio.createGain();
  volume.gain.setValueAtTime(.16,audio.currentTime);
  volume.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.32);
  oscillator.frequency.value=660;
  oscillator.connect(volume).connect(audio.destination);
  oscillator.start();
  oscillator.stop(audio.currentTime+.34);
}
function showDialog(title,body) {
  dialog.innerHTML=panelHead(title,'','<button class="icon-button" type="button" data-do="dismiss" aria-label="Cerrar">×</button>')+body;
  if (!dialog.open) dialog.showModal();
}
function checkout(turn) {
  let age='',method='',name='';
  const price=state.settings.price;
  const alias=state.settings.alias;
  const qr=state.settings.qr;
  const title=turn?'Renovar '+ticket(turn):'Nuevo turno';
  function paymentOptions() {
    showDialog(title,`<div class="fields">${turn?'':'<label>Nombre de pila (opcional)<input id="child-name" maxlength="40" placeholder="El número se asigna al ingresar" value="'+esc(name)+'"></label>'}
      <strong>Medio de pago</strong><div class="options">${methods.map(m=>`<button class="secondary" data-method="${m}" ${m==='QR'&&!qr || m==='Transferencia'&&!alias?'disabled':''}>${m}</button>`).join('')}</div>
      ${!price?'<p class="muted">Podés ingresar el precio en este cobro o dejar una tarifa general en Configuración.</p>':!qr||!alias?'<p class="muted">Configurá el QR y el alias para habilitar esos medios.</p>':''}</div>`);
    dialog.querySelectorAll('[data-method]').forEach(btn=>btn.onclick=()=>{
      name=byId('child-name')?.value || '';
      method=btn.dataset.method;
      const courtesy=method==='Cortesía';
      const available=methods.filter(m=>m==='Efectivo' || m==='QR' && qr || m==='Transferencia' && alias);
      showDialog(title,`<form class="fields" id="pay-form"><span class="muted">${method} · ${turn?'Renovación':'15 minutos de juego'}</span>
        <div><span class="muted">Total a cobrar</span><div class="pay-amount" id="pay-total" aria-live="polite">${money(courtesy?0:price)}</div></div>
        <details class="pay-adjust" ${!courtesy&&!price?'open':''}><summary>${courtesy?'Agregar propina':'Editar precio o agregar propina'}</summary>
          ${courtesy?'<p class="muted">El turno de cortesía cuesta $0.</p>':`<label>Precio del turno (ARS)<input name="price" type="number" min="1" max="1000000000" inputmode="numeric" value="${price || ''}" required></label>`}
          <label>Propina (ARS)<input name="tip" type="number" min="0" max="1000000000" inputmode="numeric" value="0"></label>
          ${courtesy?`<label>Medio de la propina<select name="tipMethod">${available.map(m=>`<option>${m}</option>`).join('')}</select></label>`:''}
        </details>
        <div id="pay-instructions"></div>
        <div class="error" role="alert"></div><button class="primary">${courtesy?'Confirmar cortesía':'Confirmar cobro'} y ${turn?'renovar':'dar ingreso'}</button>
        <button class="secondary" type="button" id="back-pay">Cambiar medio</button></form>`);
      const form=byId('pay-form');
      function amounts() {
        const fields=new FormData(form);
        const price=Number(fields.get('price'));
        const tip=Number(fields.get('tip'));
        return {price,tip,expected:price+tip,method,tipMethod:fields.get('tipMethod')};
      }
      let shownMethod;
      function updateTotal() {
        const {tip,tipMethod,expected}=amounts();
        const channel=courtesy?(tip>0?tipMethod:''):method;
        byId('pay-total').textContent=money(expected);
        if(channel===shownMethod) return;
        shownMethod=channel;
        byId('pay-instructions').innerHTML=
          (channel==='QR'?'<img class="qr" src="'+esc(qr)+'" alt="Escaneá el QR desde la aplicación de pago">':'')+
          (channel==='Transferencia'?'<label>Alias<input readonly value="'+esc(alias)+'" onclick="this.select()"></label>':'')+
          (['QR','Transferencia'].includes(channel)?'<p class="muted">Confirmá el ingreso del dinero en tu cuenta antes de continuar.</p>':'');
      }
      updateTotal();
      form.addEventListener('input',updateTotal);
      form.addEventListener('change',updateTotal);
      byId('back-pay').onclick=paymentOptions;
      form.onsubmit=event=>{
        event.preventDefault();
        const values=amounts();
        if(values.expected>1000000000){
          form.querySelector('.error').textContent='Revisá el total del cobro.';
          return;
        }
        submit(turn?{type:'renew',turn:turn.id,previousEnd:turn.end,...values}:{type:'start',age,name,...values});
      };
    });
  }
  if(turn) { paymentOptions(); return; }
  showDialog(title,`<div class="fields"><strong>Grupo de edad</strong><div class="options">${['3–5','6–8','9+','Sin indicar'].map(a=>`<button class="secondary" data-age="${a}">${a}${a==='Sin indicar'?'':' años'}</button>`).join('')}</div></div>`);
  dialog.querySelectorAll('[data-age]').forEach(btn=>btn.onclick=()=>{age=btn.dataset.age;paymentOptions();});
}
function formDialog(type,turn,extra) {
  const forms={
    expense:['Registrar gasto','<label>Concepto<input required maxlength="80" name="label"></label><label>Importe (ARS)<input required type="number" min="1" inputmode="numeric" name="amount"></label>','Guardar gasto'],
    staff:['Agregar persona','<label>Nombre<input required maxlength="80" name="name"></label><label>Tarea<input maxlength="80" name="role"></label><label>Costo de la jornada (ARS)<input required type="number" min="0" inputmode="numeric" name="amount" value="0"></label>','Guardar persona'],
    void:['Anular turno '+(turn?ticket(turn):''),'<p>Se restarán todos los cobros del turno. Si corresponde, hacé la devolución desde el medio de pago utilizado.</p><label>Motivo<input required maxlength="80" name="reason"></label>','Anular turno'],
    remove:['Quitar registro','<p>El importe se descontará de los costos de la jornada.</p>','Confirmar']
  };
  const [title,fields,label]=forms[type];
  showDialog(title,`<form class="fields" id="entry-form">${fields}<div class="error" role="alert"></div><button class="${type==='void'||type==='remove'?'danger':'primary'}">${label}</button></form>`);
  byId('entry-form').onsubmit=event=>{
    event.preventDefault();
    const data=Object.fromEntries(new FormData(event.currentTarget));
    if('amount' in data) data.amount=Number(data.amount);
    submit({type,turn:turn?.id,...extra,...data});
  };
}
function exportCsv() {
  const {turns,payments,expenses,staff}=state;
  const rows=[['Tipo','Turno','Fecha','Concepto','Importe ARS','Estado','Propina ARS','Medio de la propina']];
  for(const p of payments) rows.push(['Cobro',ticket(turns.find(t=>t.id===p.turn)),new Date(p.at).toISOString(),p.method,p.amount,p.voided?'Anulado':'Confirmado',p.tip || 0,p.tip ? (p.tipMethod || p.method) : '']);
  for(const e of expenses) rows.push(['Gasto','',new Date(e.at).toISOString(),e.label,e.amount,'Registrado','','']);
  for(const e of staff) rows.push(['Personal','','',e.name,e.amount,'Registrado','','']);
  const csv=rows.map(row=>row.map(v=>'"'+String(v).replace(/^[=+\-@\t\r]/,c=>"'"+c).replaceAll('"','""')+'"').join(',')).join('\r\n');
  const url=URL.createObjectURL(new Blob(['\ufeff',csv],{type:'text/csv;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;link.download='zazo-caja.csv';link.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function changePage(next) {
  page=next;
  byId('crumb').textContent=pages[page];
  document.querySelectorAll('[data-page]').forEach(b=>b.classList.toggle('selected',b.dataset.page===page));
  render();
}
document.addEventListener('click',event=>{
  const button=event.target.closest('button');
  if(!button) return;
  const {page:next,filter:key,do:command,id,list}=button.dataset;
  if(next) { changePage(next); return; }
  if(key) {filter=key;render();return;}
  if(command==='dismiss') {if(!writing) dialog.close();return;}
  if(!command || !state) return;
  if(command==='retry') {submit(pending);return;}
  if(command==='settings') {changePage('settings');return;}
  if(command==='export') {exportCsv();return;}
  if(pending) {message('Reintentá la operación pendiente antes de seguir.');return;}
  const turn=state.turns.find(t=>t.id===id);
  if(command==='new') {
    if(!online) {message('Sin conexión. Usá el registro de contingencia.');return;}
    if(state.turns.filter(open).length>=state.settings.capacity) {message('Cupo completo. Registrá una salida.');return;}
    checkout();
  }
  if(command==='renew' && turn) checkout(turn);
  if(['call','close'].includes(command) && turn) submit({type:command,turn:id});
  if(['expense','staff','void','remove'].includes(command)) formDialog(command,turn,{row:id,list});
});
screen.addEventListener('input',event=>{if(event.target.id==='search'){query=event.target.value;renderTurns();}});
screen.addEventListener('submit',async event=>{
  if(event.target.id!=='settings-form') return;
  event.preventDefault();
  const form=new FormData(event.target);
  const file=form.get('qr');
  let qr=form.has('clear')?'':state.settings.qr;
  if(file.size>160000) {message('Elegí una imagen QR de hasta 160 KB.');return;}
  if(file.size) {
    try {qr=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(file);});}
    catch {message('No se pudo leer la imagen.');return;}
  }
  submit({type:'settings',price:Number(form.get('price')),capacity:Number(form.get('capacity')),alias:form.get('alias'),qr});
});
dialog.addEventListener('cancel',event=>{if(writing)event.preventDefault();});
byId('sound').onclick=async()=>{
  try {
    if(audio?.state==='running') {await audio.suspend();byId('sound').setAttribute('aria-label','Activar sonido');byId('sound').title='Activar sonido';message('Alertas sonoras desactivadas');return;}
    audio ||= new (window.AudioContext||window.webkitAudioContext)();
    await audio.resume();beep();byId('sound').setAttribute('aria-label','Desactivar sonido');byId('sound').title='Desactivar sonido';message('Alertas sonoras activadas en esta tablet');
  } catch {message('El navegador no pudo activar el sonido.');}
};
render();
poll();
setInterval(poll,3000);
setInterval(tick,500);
document.addEventListener('visibilitychange',()=>{if(!document.hidden){tick();poll();}});
