
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

const $ = (id) => document.getElementById(id);
const toast = (msg, error=false) => {
  const el=$('toast'); el.textContent=msg; el.style.border=error?'1px solid #b66':'1px solid #555';
  el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),2800);
};

let clientsCache=[];

async function init(){
  const {data:{session}}=await db.auth.getSession();
  if(session) await showApp(session);
  else showLogin();
}

function showLogin(){
  $('loginView').classList.remove('hidden'); $('appView').classList.add('hidden');
}
async function showApp(session){
  $('loginView').classList.add('hidden'); $('appView').classList.remove('hidden');
  $('adminEmail').textContent=session.user.email || '';
  await loadDashboard();
}

$('loginForm').addEventListener('submit', async e=>{
  e.preventDefault();
  const {data,error}=await db.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});
  if(error){toast(error.message,true);return;}
  await showApp(data.session);
});
$('logoutBtn').addEventListener('click',async()=>{await db.auth.signOut();showLogin()});

async function loadDashboard(){
  const [c,r,k,s]=await Promise.all([
    db.from('clientes').select('*',{count:'exact',head:true}),
    db.from('reservas').select('*',{count:'exact',head:true}),
    db.from('contratos').select('*',{count:'exact',head:true}),
    db.from('contratos').select('*',{count:'exact',head:true}).eq('estado','firmado')
  ]);
 if(c.error||r.error||k.error||s.error){
  toast(
    'CLIENTES: '+(c.error?.message||'OK')+
    ' | RESERVAS: '+(r.error?.message||'OK')+
    ' | CONTRATOS: '+(k.error?.message||'OK')+
    ' | FIRMADOS: '+(s.error?.message||'OK'),
    true
  );
}
  $('statClients').textContent=c.count??0;
  $('statReservations').textContent=r.count??0;
  $('statContracts').textContent=k.count??0;
  $('statSigned').textContent=s.count??0;
  await loadClients();
}

async function loadClients(){
  const {data,error}=await db.from('clientes').select('*').order('created_at',{ascending:false});
 if(error){$('#clientsList').innerHTML='<p class="client-meta">ERROR: '+error.message+'</p>';return;}
  clientsCache=data||[]; renderClients();
}
function renderClients(){
  const q=$('clientSearch').value.trim().toLowerCase();
  const rows=clientsCache.filter(c=>(c.nombre_completo+' '+(c.telefono||'')+' '+(c.email||'')).toLowerCase().includes(q));
  if(!rows.length){$('clientsList').innerHTML='<p class="client-meta">Aún no hay clientes. Crea el primero.</p>';return;}
  $('clientsList').innerHTML=rows.map(c=>{
    const r=c.reservas?.[0];
    return `<div class="client-card">
      <div><div class="client-name">${esc(c.nombre_completo)}</div><div class="client-meta">${esc(c.telefono||'')} ${c.email?'· '+esc(c.email):''}</div></div>
      <div class="client-meta">${r?esc(r.servicio)+'<br>'+money(r.costo_total):'Sin reserva'}</div>
      <div>${r?`<span class="badge">${esc(r.estado)}</span>`:'—'}</div>
      <div class="client-actions">${r?`<button class="admin-button" data-contract="${r.id}">Contrato</button>`:''}</div>
    </div>`;
  }).join('');
  document.querySelectorAll('[data-contract]').forEach(b=>b.addEventListener('click',()=>openContractModal(b.dataset.contract)));
}
$('clientSearch').addEventListener('input',renderClients);
$('newClientBtn').addEventListener('click',()=>openModal('clientModal'));
document.querySelectorAll('[data-close]').forEach(b=>b.addEventListener('click',()=>closeModal(b.dataset.close)));

$('clientForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const total=Number($('totalCost').value||0), dep=Number($('deposit').value||0);
  const {data:client,error:ce}=await db.from('clientes').insert({
    nombre_completo:$('clientName').value.trim(),telefono:$('clientPhone').value.trim()||null,email:$('clientEmail').value.trim()||null
  }).select().single();
  if(ce){toast(ce.message,true);return;}
  const year=new Date().getFullYear();
  const folio=`JAF-${year}-${String(Date.now()).slice(-5)}`;
  const {data:res,error:re}=await db.from('reservas').insert({
    folio,cliente_id:client.id,servicio:$('service').value.trim(),paquete:$('packageName').value.trim()||null,
    fecha_evento:$('eventDate').value||null,hora_evento:$('eventTime').value||null,lugar_evento:$('eventPlace').value.trim()||null,
    costo_total:total,anticipo:dep,saldo:Math.max(0,total-dep),estado:dep>0?'apartado':'cotizacion'
  }).select().single();
  if(re){toast(re.message,true);return;}
  closeModal('clientModal'); e.target.reset(); $('totalCost').value='0'; $('deposit').value='0'; $('balance').value='0';
  toast('Cliente y reserva creados.');
  await loadDashboard();
});

function openContractModal(resId){
  $('contractReservationId').value=resId; $('contractContent').value=''; $('contractLinkBox').classList.add('hidden');
  openModal('contractModal');
}
$('contractForm').addEventListener('submit',async e=>{
  e.preventDefault();
  const reservationId=$('contractReservationId').value;
  const {data:reservation,error:re}=await db.from('reservas').select('*').eq('id',reservationId).single();
  if(re){toast(re.message,true);return;}
  const folio=reservation.folio;
  const {data:contract,error:ce}=await db.from('contratos').insert({
    reserva_id:reservationId,folio,estado:'finalizado'
  }).select().single();
  if(ce){toast(ce.message,true);return;}
  const {error:ve}=await db.from('contrato_versiones').insert({
    contrato_id:contract.id,numero_version:1,contenido:$('contractContent').value
  });
  if(ve){toast(ve.message,true);return;}
  const url=new URL('../contrato/',window.location.href);
  url.searchParams.set('token',contract.token_acceso);
  $('contractLink').value=url.toString();
  $('contractLinkBox').classList.remove('hidden');
  toast('Contrato guardado.');
  await loadDashboard();
});
$('copyLink').addEventListener('click',async()=>{
  await navigator.clipboard.writeText($('contractLink').value);toast('Enlace copiado.');
});
function openModal(id){$(id).classList.remove('hidden')}
function closeModal(id){$(id).classList.add('hidden')}
function money(v){return new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(Number(v||0))}
function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
init();
