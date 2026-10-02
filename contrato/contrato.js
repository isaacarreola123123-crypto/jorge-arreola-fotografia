
const { createClient } = supabase;
const db = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);
const params = new URLSearchParams(location.search);
const token = params.get('token');
let contractData=null, signed=false;

function money(v){return new Intl.NumberFormat('es-MX',{style:'currency',currency:'MXN'}).format(Number(v||0))}
function fmtDate(v){if(!v)return '—'; return new Intl.DateTimeFormat('es-MX',{dateStyle:'long'}).format(new Date(v+'T12:00:00'))}

async function load(){
  if(!token){return fail('Enlace de contrato no válido.');}
  const {data,error}=await db.rpc('get_public_contract',{p_token:token});
  if(error || !data){return fail('No se pudo cargar el contrato. Verifica el enlace.');}
  contractData=data;
  $('loading').classList.add('hidden'); $('contractView').classList.remove('hidden');
  $('clientName').textContent=data.cliente_nombre||'Cliente';
  $('folio').textContent=data.folio||'';
  $('service').textContent=data.servicio||'—';
  $('eventDate').textContent=fmtDate(data.fecha_evento);
  $('place').textContent=data.lugar_evento||'—';
  $('total').textContent=money(data.costo_total);
  $('deposit').textContent=money(data.anticipo);
  $('balance').textContent=money(data.saldo);
  $('contractTitle').textContent=data.titulo||'Detalles del servicio y condiciones';
  $('contractText').textContent=data.contenido||'';
  if(data.estado==='firmado'){
    signed=true;
    $('signSection').classList.add('hidden'); $('signedSection').classList.remove('hidden');
    $('signedInfo').textContent=`Versión ${data.version_numero} · Firmado el ${new Date(data.firmado_at).toLocaleString('es-MX')}`;
  }
  initSignaturePad();
}
function fail(msg){$('loading').innerHTML=`<div class="section-kicker">CONTRATO</div><h2>No disponible</h2><p>${msg}</p>`}
$('signBtn').addEventListener('click',async()=>{
  if(signed)return;
  if(!$('accept').checked){alert('Debes aceptar el contrato antes de firmar.');return;}
  const name=$('signerName').value.trim();
  if(!name){alert('Escribe el nombre del firmante.');return;}
  if(!hasSignature()){alert('Dibuja tu firma antes de continuar.');return;}
  const signatureData=$('signaturePad').toDataURL('image/png');
  const {data,error}=await db.rpc('sign_contract',{p_token:token,p_version:contractData.version_numero,p_name:name,p_signature:signatureData});
  if(error){alert(error.message);return;}
  if(!data?.ok){alert(data?.message||'No se pudo firmar.');return;}
  contractData={...contractData,estado:'firmado',firmado_at:data.firmado_at,firmante:name,firma_data:signatureData};
  signed=true;$('signSection').classList.add('hidden');$('signedSection').classList.remove('hidden');
  $('signedInfo').textContent=`Versión ${contractData.version_numero} · Firmado el ${new Date(data.firmado_at).toLocaleString('es-MX')}`;
});
$('downloadPdf').addEventListener('click',()=>generatePdf());

let ctx,drawing=false,hasInk=false;
function initSignaturePad(){
 const c=$('signaturePad'); ctx=c.getContext('2d');ctx.lineWidth=3;ctx.lineCap='round';ctx.strokeStyle='#111';
 const pos=e=>{const r=c.getBoundingClientRect();const p=e.touches?e.touches[0]:e;return{x:(p.clientX-r.left)*c.width/r.width,y:(p.clientY-r.top)*c.height/r.height}};
 const start=e=>{e.preventDefault();drawing=true;hasInk=true;const p=pos(e);ctx.beginPath();ctx.moveTo(p.x,p.y)};
 const move=e=>{if(!drawing)return;e.preventDefault();const p=pos(e);ctx.lineTo(p.x,p.y);ctx.stroke()};
 const end=()=>{drawing=false};
 c.onpointerdown=start;c.onpointermove=move;c.onpointerup=end;c.onpointerleave=end;
 c.ontouchstart=start;c.ontouchmove=move;c.ontouchend=end;
 $('clearSignature').onclick=()=>{ctx.clearRect(0,0,c.width,c.height);hasInk=false};
}
function hasSignature(){return hasInk}
async function generatePdf(){
  const jsPDF=window.jspdf.jsPDF;
  const pdf=new jsPDF({unit:'mm',format:'a4'});
  let y=20; const left=18, width=174;
  pdf.setFont('helvetica','bold');pdf.setFontSize(9);pdf.text('JORGE ARREOLA FOTOGRAFÍA',left,y);y+=8;
  pdf.setFont('helvetica','normal');pdf.setFontSize(8);pdf.text('CONTRATO / RECIBO DE SERVICIO',left,y);
  pdf.text(`Folio: ${contractData.folio}`,150,y);y+=12;
  pdf.setFont('helvetica','bold');pdf.setFontSize(18);pdf.text(contractData.cliente_nombre||'Cliente',left,y);y+=10;
  pdf.setFont('helvetica','normal');pdf.setFontSize(9);
  const info=[
    `Servicio: ${contractData.servicio||'—'}`,
    `Evento: ${fmtDate(contractData.fecha_evento)}`,
    `Lugar: ${contractData.lugar_evento||'—'}`,
    `Total: ${money(contractData.costo_total)}    Anticipo: ${money(contractData.anticipo)}    Saldo: ${money(contractData.saldo)}`
  ];
  info.forEach(t=>{pdf.text(t,left,y);y+=6});y+=5;
  pdf.setFont('helvetica','bold');pdf.text(contractData.titulo||'Detalles del servicio y condiciones',left,y);y+=7;
  pdf.setFont('helvetica','normal');
  const lines=pdf.splitTextToSize(contractData.contenido||'',width);
  for(const line of lines){if(y>270){pdf.addPage();y=20}pdf.text(line,left,y);y+=4.5}
  if(y>235){pdf.addPage();y=20}
  y+=8;pdf.setFont('helvetica','bold');pdf.text('ACEPTACIÓN Y FIRMA ELECTRÓNICA',left,y);y+=7;
  pdf.setFont('helvetica','normal');pdf.text(`Firmante: ${contractData.firmante||'—'}`,left,y);y+=5;
  pdf.text(`Versión: ${contractData.version_numero}`,left,y);y+=5;
  pdf.text(`Fecha y hora: ${new Date(contractData.firmado_at).toLocaleString('es-MX')}`,left,y);y+=7;
  if(contractData.firma_data){pdf.addImage(contractData.firma_data,'PNG',left,y,70,20);y+=24}
  pdf.setFontSize(7);pdf.text('Documento generado desde el sistema de Jorge Arreola Fotografía.',left,285);
  pdf.save(`${contractData.folio}-contrato-firmado.pdf`);
}
const script=document.createElement('script');script.src='https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js';document.head.appendChild(script);
load();
