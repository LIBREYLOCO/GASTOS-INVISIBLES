'use strict';
// Gastos invisibles: local-only, in-memory processing for the private beta.
const $ = id => document.getElementById(id);
const state = {transactions:[], preview:[], files:[], recurring:[], decisions:{}, lastDetail:null};
const pages = {inicio:'Tu dinero al descubierto',importar:'Analiza tus estados de cuenta',gastos:'Tus gastos recurrentes',ahorros:'Oportunidades de ahorro',cuenta:'Privacidad y control'};
const esc = input => String(input??'').replace(/[&<>"']/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const currency = (n,c) => new Intl.NumberFormat(c==='MXN'?'es-MX':'es-ES',{style:'currency',currency:c}).format(n||0);
function notify(message,error=false){const el=$('notice');el.textContent=message;el.hidden=false;el.className='notice'+(error?' error':'');window.scrollTo({top:0,behavior:'smooth'});}
function navigate(page){if(!pages[page])return;document.querySelectorAll('.page').forEach(e=>e.classList.toggle('active',e.id===page));document.querySelectorAll('[data-page]').forEach(e=>e.classList.toggle('active',e.dataset.page===page));$('page-title').textContent=pages[page];$('notice').hidden=true;window.scrollTo({top:0,behavior:'instant'});}
function numberValue(v){if(typeof v==='number')return Number.isFinite(v)?v:null;let s=String(v??'').trim().replace(/\s/g,'').replace(/[$\u20ac]|EUR|MXN/gi,'');if(!s)return null;const negative=/^-|\((.*?)\)/.test(s);s=s.replace(/[^0-9.,]/g,'');if(!s)return null;const dot=s.lastIndexOf('.'),comma=s.lastIndexOf(',');if(dot>=0&&comma>=0){s=dot>comma?s.replace(/,/g,''):s.replace(/\./g,'').replace(',','.');}else if(comma>=0){const parts=s.split(',');s=parts.length===2&&parts[1].length<=2?s.replace(',','.'):s.replace(/,/g,'');}else if(dot>=0){const parts=s.split('.');s=parts.length===2&&parts[1].length<=2?s:s.replace(/\./g,'');}const n=Number(s);return Number.isFinite(n)?(negative?-n:n):null;}
function parseDate(value){if(value instanceof Date&&!isNaN(value))return value.toISOString().slice(0,10);if(typeof value==='number'&&value>30000&&value<95000){const d=new Date(Date.UTC(1899,11,30)+value*86400000);return d.toISOString().slice(0,10);}const s=String(value??'').trim();if(/^\d{4}-\d\d-\d\d/.test(s)){const iso=s.slice(0,10);return !isNaN(Date.parse(iso))?iso:null;}const m=s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})/);if(!m)return null;let y=+m[3];if(y<100)y+=y>=70?1900:2000;const d=new Date(Date.UTC(y,+m[2]-1,+m[1]));return d.getUTCFullYear()===y&&d.getUTCMonth()===+m[2]-1&&d.getUTCDate()===+m[1]?d.toISOString().slice(0,10):null;}
function cleanText(s){return String(s??'').replace(/\s+/g,' ').trim().slice(0,170);}
function simplify(s){return cleanText(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase();}
function merchantAndCategory(raw){const s=simplify(raw);const known=[
[/OPENAI|CHATGPT/, 'ChatGPT','Software'],[/NETFLIX/,'Netflix','Entretenimiento'],[/SPOTIFY/,'Spotify','Entretenimiento'],[/GOOGLE\s*\*?\s*WORKSPACE|GOOGLE WORKSPACE/,'Google Workspace','Software'],[/GOOGLE\s*ONE/,'Google One','Software'],[/GOOGLE\s*PLAY/,'Google Play','Software'],[/APPLE\s*(COM|BILL|SERVICES)|APPLE\.COM/,'Apple (servicio por verificar)','Software'],[/AMAZON\s*PRIME/,'Amazon Prime','Entretenimiento'],[/MICROSOFT|OFFICE\s*365/,'Microsoft','Software'],[/DROPBOX/,'Dropbox','Software'],[/ADOBE/,'Adobe','Software'],[/CANVA/,'Canva','Software'],[/GYM|GIMNASIO|FITNESS/,'Gimnasio','Membresias'],[/SEGURO|ASEGURADORA|AXA|MAPFRE|ALLIANZ/,'Seguro','Seguros'],[/CFE|IBERDROLA|ENDESA|ELECTRICIDAD/,'Electricidad','Servicios'],[/TELMEX|INTERNET|IZZI|TOTALPLAY|MOVISTAR|VODAFONE/,'Internet y telefonia','Servicios'],[/TELCEL/,'Telcel','Servicios'],[/AGUA|AQUALIA/,'Servicio de agua','Servicios']];
for(const [re,name,category] of known)if(re.test(s))return {name,category};
const fallback=s.replace(/\b\d{3,}\b/g,' ').replace(/\b(PAGO|COMPRA|DE|EN|CON|TARJETA|TRANSFERENCIA|AUT|DOMICILIACION|CARGO|POS|REF|FOLIO|A|EL|LA|LOS)\b/g,' ').replace(/[^A-Z0-9 ]/g,' ').replace(/\s+/g,' ').trim().split(' ').filter(Boolean).slice(0,4).join(' ');
return {name:fallback?fallback.toLowerCase().replace(/\b\w/g,x=>x.toUpperCase()):'Proveedor por identificar',category:'Otros'};}
function excluded(description){const s=simplify(description);return /PAGO\s+(?:DE|A|TARJETA)|TRANSFERENCIA\s+(?:ENTRE|PROPIA)|TRASPASO|RETIRO EN EFECTIVO|NOMINA|DEPOSITO|ABONO|DEVOLUCION|REEMBOLSO/.test(s);}
function parseCSV(text){let rows=[],row=[],cell='',quotes=false;const t=text.replace(/^\uFEFF/,'');const first=t.split(/\r?\n/,1)[0]||'';const sep=[';',',','\t','|'].sort((a,b)=>first.split(b).length-first.split(a).length)[0];for(let i=0;i<t.length;i++){const c=t[i];if(c==='"'){if(quotes&&t[i+1]==='"'){cell+='"';i++;}else quotes=!quotes;}else if(c===sep&&!quotes){row.push(cell);cell='';}else if((c==='\n'||c==='\r')&&!quotes){if(c==='\r'&&t[i+1]==='\n')i++;row.push(cell);if(row.some(x=>x.trim()))rows.push(row);row=[];cell='';}else cell+=c;}row.push(cell);if(row.some(x=>x.trim()))rows.push(row);return rows;}
function colIndex(headers,words){return headers.findIndex(h=>words.some(w=>h.includes(w)));}
function tabularToMovements(table,filename){let best=null;for(let i=0;i<Math.min(25,table.length);i++){const cols=(table[i]||[]).map(simplify);const date=colIndex(cols,['FECHA','DATE','F. OPER','F OPER','DIA']);const desc=colIndex(cols,['CONCEPTO','DESCRIP','DETAIL','MOVIMIENTO','COMERCIO','BENEFICIARIO','REFERENCIA']);const amount=colIndex(cols,['IMPORTE','MONTO','AMOUNT','TOTAL','VALOR']);const debit=colIndex(cols,['CARGO','DEBITO','DEBIT','RETIRO','SALIDA']);const credit=colIndex(cols,['ABONO','CREDITO','CREDIT','INGRESO']);const score=(date>=0?3:0)+(desc>=0?3:0)+(amount>=0?2:0)+(debit>=0?2:0);if(!best||score>best.score)best={i,date,desc,amount,debit,credit,score};}if(!best||best.score<6||best.date<0||best.desc<0||(best.amount<0&&best.debit<0))throw new Error('No se reconocen las columnas de fecha, concepto e importe en '+filename+'.');
const out=[];for(const row of table.slice(best.i+1)){const date=parseDate(row[best.date]);const description=cleanText(row[best.desc]);const direct=best.debit>=0?numberValue(row[best.debit]):null;const amount=best.debit>=0&&direct!==null&&direct!==0?Math.abs(direct):best.debit>=0?(best.credit>=0?null:numberValue(row[best.amount])):numberValue(row[best.amount]);if(date&&description&&amount!==null&&Math.abs(amount)>0.001)out.push({date,description,amount,source:filename,cargoColumn:best.debit>=0});}
return out;}
// OCR local en el navegador para PDF de imagen. Reutiliza un trabajador por documento.
function parseOcrLines(text, source) {
  const lines=String(text||'').split(/\r?\n/).map(cleanText).filter(Boolean);
  const rows=[];
  const dateRe=/\b(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4}|\d{4}-\d{2}-\d{2})\b/;
  const moneyRe=/(?<!\d)([-+]?\(?\s?(?:[$€])?\s?\d{1,3}(?:[., ]\d{3})*[.,]\d{2}\s?\)?|[-+]?\(?\s?(?:[$€])?\s?\d+[.,]\d{2}\s?\)?)(?!\d)/g;
  // Agrupa fragmentos que suelen quedar repartidos en varias líneas por OCR.
  let current='';
  const blocks=[];
  for(const line of lines){
    if(dateRe.test(line)){
      if(current)blocks.push(current);
      current=line;
    }else if(current){
      current+=' '+line;
    }
  }
  if(current)blocks.push(current);
  const debitOnlyHeader=lines.some(x=>/FECHA|DATE/i.test(x)&&/CARGO|DEBITO|DÉBITO|DEBIT/i.test(x)&&!/ABONO|CREDITO|CRÉDITO|CREDIT/i.test(x));
  for(const block of blocks){
    const dateMatch=block.match(dateRe);
    if(!dateMatch)continue;
    const date=parseDate(dateMatch[1]);
    if(!date)continue;
    const rest=block.slice((dateMatch.index||0)+dateMatch[0].length).trim();
    const amounts=[...rest.matchAll(moneyRe)];
    if(!amounts.length)continue;
    const hasBalance=/\b(?:SALDO|BALANCE)\b/i.test(rest);
    const chosen=hasBalance&&amounts.length>1?amounts[amounts.length-2]:amounts[amounts.length-1];
    const amount=numberValue(chosen[0]);
    const description=cleanText(rest.slice(0,chosen.index).replace(/\s*[|:]\s*$/,''));
    if(!description||amount===null||!Number.isFinite(amount)||Math.abs(amount)<.001)continue;
    if(/^(?:SALDO|TOTAL|PAGINA|PÁGINA|NUMERO DE CUENTA|NÚMERO DE CUENTA)\b/i.test(description))continue;
    rows.push({date,description,amount,source,cargoColumn:debitOnlyHeader,ocr:true});
  }
  return rows;
}
async function readPdfScanned(doc, filename){
  if(!window.Tesseract)throw new Error('El lector OCR no pudo cargarse. Comprueba la conexión y vuelve a intentarlo.');
  const limit=20;
  if(doc.numPages>limit)throw new Error('Este PDF tiene más de 20 páginas. Para evitar un análisis incompleto, divide el documento en archivos de hasta 20 páginas.');
  let worker;
  const results=[];
  try{
    $('parser-status').textContent='Iniciando OCR del PDF escaneado. La primera vez puede descargar idiomas.';
    worker=await window.Tesseract.createWorker('spa+eng',1,{logger:m=>{
      if(m.status==='recognizing text'&&Number.isFinite(m.progress)){
        $('parser-status').textContent='Reconociendo texto de PDF: '+Math.round(m.progress*100)+' % de la página actual';
      }
    }});
    for(let p=1;p<=doc.numPages;p++){
      $('parser-status').textContent='OCR: página '+p+' de '+doc.numPages+'. No cierres esta pestaña.';
      const page=await doc.getPage(p);
      const viewport=page.getViewport({scale:2});
      const canvas=document.createElement('canvas');
      canvas.width=Math.ceil(viewport.width);
      canvas.height=Math.ceil(viewport.height);
      const ctx=canvas.getContext('2d',{alpha:false});
      if(!ctx)throw new Error('No se pudo crear el área de OCR.');
      await page.render({canvasContext:ctx,viewport}).promise;
      const recognized=await worker.recognize(canvas);
      results.push(...parseOcrLines(recognized.data?.text||'',filename+' / página '+p));
      canvas.width=0;canvas.height=0;
      page.cleanup();
    }
  }finally{
    if(worker)await worker.terminate();
  }
  if(!results.length)throw new Error('El OCR terminó, pero no pudo identificar filas bancarias con fecha y cargo. No se ha importado nada. El formato puede requerir una adaptación específica.');
  notify('PDF escaneado leído mediante OCR. Revisa cuidadosamente fechas, signos e importes antes de confirmar.');
  return results;
}
async function readPdf(file){if(!window.pdfjsLib)throw new Error('No se ha cargado el lector PDF. Comprueba tu conexion y vuelve a intentarlo.');window.pdfjsLib.GlobalWorkerOptions.workerSrc='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';const ab=await file.arrayBuffer();const doc=await window.pdfjsLib.getDocument({data:new Uint8Array(ab)}).promise;const lines=[];for(let p=1;p<=Math.min(doc.numPages,80);p++){const page=await doc.getPage(p);const content=await page.getTextContent();const items=content.items.filter(x=>x.str&&x.transform).map(x=>({text:x.str,x:x.transform[4],y:x.transform[5]})).sort((a,b)=>b.y-a.y||a.x-b.x);const groups=[];for(const x of items){let g=groups.find(g=>Math.abs(g.y-x.y)<3);if(!g){g={y:x.y,parts:[]};groups.push(g);}g.parts.push(x);}for(const g of groups)lines.push(g.parts.sort((a,b)=>a.x-b.x).map(p=>p.text).join(' ').replace(/\s+/g,' ').trim());}
const debitOnlyHeader=lines.some(line=>/\b(?:FECHA|DATE)\b/i.test(line)&&/\b(?:CARGO|DEBITO|DÉBITO|DEBIT)\b/i.test(line)&&!/\b(?:ABONO|CREDITO|CRÉDITO|CREDIT)\b/i.test(line));const out=[];for(const line of lines){const m=line.match(/(?:^|\s)(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})\s+(.+)$/);if(!m)continue;const date=parseDate(m[1]);const content=m[2];const amounts=[...content.matchAll(/(?:^|\s)([-+]?\(?\s?(?:\$|\u20ac)?\s?\d[\d.,]*\s?\)?)(?=\s|$)/g)];if(!amounts.length)continue;let match=amounts[amounts.length-1];if(amounts.length>1&&/SALDO|BALANCE/i.test(content))match=amounts[amounts.length-2];const amount=numberValue(match[1]);const description=cleanText(content.slice(0,match.index));if(date&&description&&amount!==null)out.push({date,description,amount,source:file.name,cargoColumn:debitOnlyHeader});}
if(!out.length)return readPdfScanned(doc,file.name);return out;}
async function readFile(file){if(file.size>15*1024*1024)throw new Error(file.name+': supera el limite de 15 MB.');const name=file.name.toLowerCase();if(name.endsWith('.pdf'))return readPdf(file);if(name.endsWith('.csv'))return tabularToMovements(parseCSV(await file.text()),file.name);if(name.endsWith('.xlsx')||name.endsWith('.xls')){if(!window.XLSX)throw new Error('No se ha cargado el lector Excel. Comprueba tu conexion.');const book=window.XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true});let results=[],errors=[];for(const sheet of book.SheetNames){const rows=window.XLSX.utils.sheet_to_json(book.Sheets[sheet],{header:1,defval:''});try{results=results.concat(tabularToMovements(rows,file.name+' / '+sheet));}catch(e){errors.push(e.message);}}if(!results.length)throw new Error(errors[0]||'No pude leer movimientos del Excel.');return results;}throw new Error('Formato no admitido: '+file.name);}
function frequencyFromIntervals(intervals){const options=[['Semanal',7,52],['Quincenal',15,24],['Mensual',30.44,12],['Bimestral',60.9,6],['Trimestral',91.3,4],['Semestral',182.6,2],['Anual',365.25,1]];if(!intervals.length)return null;const sorted=[...intervals].sort((a,b)=>a-b),median=sorted[Math.floor(sorted.length/2)];let best=null;for(const item of options){const [label,days,perYear]=item;const diff=Math.abs(median-days);const limit=days<20?3:days<100?11:days<200?23:42;if(diff<=limit&&(!best||diff<best.diff))best={label,days,perYear,diff};}return best;}
function daysBetween(a,b){return(Math.abs(new Date(b+'T00:00:00Z')-new Date(a+'T00:00:00Z')))/86400000;}
function recalculate(){const groups=new Map();for(const tx of state.transactions){const m=merchantAndCategory(tx.description);const key=[m.name,tx.currency,tx.account].join('|');if(!groups.has(key))groups.set(key,{key,name:m.name,category:m.category,currency:tx.currency,account:tx.account,items:[]});groups.get(key).items.push(tx);}const result=[];for(const group of groups.values()){const items=group.items.sort((a,b)=>a.date.localeCompare(b.date));if(items.length<2)continue;const gaps=items.slice(1).map((x,i)=>daysBetween(items[i].date,x.date));const freq=frequencyFromIntervals(gaps);if(!freq)continue;const amounts=items.map(x=>x.amount).sort((a,b)=>a-b);const median=amounts[Math.floor(amounts.length/2)];const validGaps=gaps.filter(d=>Math.abs(d-freq.days)<Math.max(4,freq.days*.14));if(validGaps.length<Math.max(1,Math.ceil(gaps.length/2)))continue;const last=items[items.length-1];result.push({...group,frequency:freq.label,perYear:freq.perYear,typical:median,yearly:median*freq.perYear,confidence:items.length>=3&&validGaps.length>=2?'Alta':'Probable',lastDate:last.date,id:group.key});}state.recurring=result.sort((a,b)=>b.yearly-a.yearly);render();}
function expensesFrom(raw){const out=[];const sign=$('sign-mode').value;for(const x of raw){let isExpense=x.cargoColumn||sign==='negative'?x.cargoColumn?true:x.amount<0:sign==='positive'?x.amount>0:x.amount<0;if(sign==='auto'&&x.cargoColumn)isExpense=true;if(!isExpense||excluded(x.description))continue;out.push({...x,amount:Math.abs(x.amount)});}return out;}
function fingerprint(x){return [x.date,simplify(x.description),Math.round(x.amount*100),x.account,x.currency].join('|');}
function rowTemplate(x){return `<tr><td>${esc(x.date)}</td><td>${esc(x.description)}</td><td class="right">${esc(x.amount)}</td></tr>`;}
function preview(){const rows=state.preview;$('preview-box').hidden=!rows.length;$('preview-count').textContent=rows.length+' movimientos leidos';$('preview-rows').innerHTML=rows.slice(0,12).map(rowTemplate).join('');$('source-label').value=state.files.map(f=>f.name).join(', ').slice(0,120);if(rows.length)$('preview-box').scrollIntoView({behavior:'smooth',block:'start'});}
async function filesSelected(event){const files=[...event.target.files];if(!files.length)return;state.files=files;state.preview=[];const successes=[],failures=[];$('parser-status').textContent='Leyendo '+files.length+' archivo(s)...';for(const file of files){try{const extracted=await readFile(file);state.preview.push(...extracted);successes.push(file.name+': '+extracted.length);}catch(e){failures.push(String(e.message||e));}}preview();$('parser-status').textContent=successes.join(' | ')+(failures.length?' | Errores: '+failures.join('; '):'');if(failures.length)notify(failures.join(' | '),true);else if(successes.length)notify('Archivos leidos. Revisa la vista previa antes de confirmar.');event.target.value='';}
function confirmImport(){const account=cleanText($('account').value)||'Cuenta sin nombre';const curr=$('currency').value;const accepted=expensesFrom(state.preview);if(!accepted.length){notify('No hay cargos con el signo seleccionado. Cambia "Interpretacion de signos" y revisa los datos.',true);return;}const found=new Set(state.transactions.map(fingerprint));let added=0,skipped=0;for(const raw of accepted){const row={...raw,account,currency:curr};const hash=fingerprint(row);if(found.has(hash)){skipped++;continue;}found.add(hash);state.transactions.push(row);added++;}state.preview=[];state.files=[];$('preview-box').hidden=true;recalculate();navigate('inicio');notify(`${added} cargos incorporados. ${skipped} movimientos duplicados descartados.`);}
function render(){const rr=state.recurring;$('count-total').textContent=rr.length;$('transaction-count').textContent=state.transactions.length;$('expense-count').textContent=rr.length+' resultados';$('privacy-stats').textContent=state.transactions.length+' movimientos procesados en esta sesion.';
const totals={};for(const x of rr)totals[x.currency]=(totals[x.currency]||0)+x.yearly;$('yearly-totals').innerHTML=Object.keys(totals).length?Object.entries(totals).map(([c,v])=>`<div class="item"><strong>${esc(c)}</strong><span class="amount">${esc(currency(v,c))}/a&ntilde;o</span></div>`).join(''):'Importa archivos para obtener tu an&aacute;lisis.';
const line=x=>`<div class="item"><button class="entry-button merchant" data-detail="${esc(x.id)}"><span class="merchant-icon">${x.category==='Seguros'?'&#9671;':x.category==='Software'?'&#10022;':x.category==='Servicios'?'&#9680;':'&#9826;'}</span><span><strong>${esc(x.name)}</strong><small>${esc(x.category)} &middot; ${esc(x.frequency)} &middot; ${esc(x.account)}</small></span></button><div class="item-money"><span class="amount">${esc(currency(x.yearly/12,x.currency))}</span><small>al mes (equivalente)</small></div></div>`;
$('recent').innerHTML=rr.length?rr.slice(0,5).map(line).join(''):'No hay gastos recurrentes detectados.';$('expense-list').innerHTML=rr.length?rr.map(line).join(''):'Aun no hay pagos recurrentes reconocidos. Carga estados de varios meses.';
const pending=rr.filter(x=>state.decisions[x.id]==='Solicite la baja'||state.decisions[x.id]==='Baja confirmada por mi');$('saving-list').innerHTML=pending.length?pending.map(x=>`<div class="item"><span><strong>${esc(x.name)}</strong><small class="mini">${esc(state.decisions[x.id])} - no asumimos ahorro confirmado</small></span><strong>${esc(currency(x.yearly,x.currency))}/a&ntilde;o</strong></div>`).join(''):'Marca un gasto como "Solicite la baja" para incorporarlo al seguimiento.';}
const guides={
'Netflix':{url:'https://www.netflix.com/cancelplan',help:'https://help.netflix.com/es/node/407'},
'ChatGPT':{url:'https://help.openai.com/es-419/articles/7232927-canceling-your-chatgpt-subscription',help:'https://help.openai.com/es-419/articles/7232927-canceling-your-chatgpt-subscription'},
'Spotify':{url:'https://www.spotify.com/account/subscription/',help:'https://support.spotify.com/es-eu/article/cancel-premium/'},
'Google Play':{url:'https://play.google.com/store/account/subscriptions',help:'https://support.google.com/googleplay/answer/7018481?hl=es'},
'Apple (servicio por verificar)':{url:'https://support.apple.com/es-es/118428',help:'https://support.apple.com/es-es/118428'},
'Amazon Prime':{url:'https://www.amazon.es/gp/primecentral',help:'https://www.amazon.es/gp/help/customer/display.html?nodeId=G2B9L3YR7LR8J4XP'},
'Microsoft':{url:'https://account.microsoft.com/services',help:'https://support.microsoft.com/es-es/account-billing'},
'Dropbox':{url:'https://www.dropbox.com/account/plan',help:'https://help.dropbox.com/plans/cancel-subscription'},
'Adobe':{url:'https://account.adobe.com/plans',help:'https://helpx.adobe.com/es/manage-account/using/cancel-subscription.html'},
'Canva':{url:'https://www.canva.com/settings/billing-and-plans',help:'https://www.canva.com/help/cancel-canva-plan/'}
};
function detail(id){const x=state.recurring.find(r=>r.id===id);if(!x)return;state.lastDetail=id;const g=guides[x.name];const history=x.items.map(row=>`<li>${esc(row.date)} - ${esc(currency(row.amount,row.currency))}: ${esc(row.description)}</li>`).join('');const options=['Pendiente','Conservar','Investigar','Solicite la baja','Baja confirmada por mi'];const selected=state.decisions[id]||'Pendiente';const links=g?`<a href="${esc(g.url)}" target="_blank" rel="noopener noreferrer">Abrir opcion oficial de baja &nearr;</a><a class="secondary-link" href="${esc(g.help)}" target="_blank" rel="noopener noreferrer">Ver instrucciones oficiales &nearr;</a>`:`<a class="secondary-link" href="https://www.google.com/search?q=${encodeURIComponent('como cancelar '+x.name+' sitio oficial')}" target="_blank" rel="noopener noreferrer">Buscar instrucciones (enlace no verificado) &nearr;</a>`;
$('detail-content').innerHTML=`<div class="detail-top"><span class="eyebrow">DETALLE DEL GASTO</span><h2>${esc(x.name)}</h2><small>${esc(x.category)} &middot; ${esc(x.account)}</small></div><div class="detail-metric"><strong>${esc(currency(x.yearly/12,x.currency))}/mes</strong><span>Equivalente mensual estimado. ${esc(currency(x.yearly,x.currency))} al a&ntilde;o.</span></div><div class="detail-grid"><div>Frecuencia<strong>${esc(x.frequency)}</strong></div><div>Confianza<strong>${esc(x.confidence)}</strong></div><div>Cargos encontrados<strong>${x.items.length}</strong></div><div>Ultimo cargo<strong>${esc(x.lastDate)}</strong></div></div><label>Tu decision<select id="decision-select">${options.map(v=>`<option value="${esc(v)}" ${selected===v?'selected':''}>${esc(v)}</option>`).join('')}</select></label><h3 style="margin-top:22px">Evidencia bancaria</h3><ul class="detail-list">${history}</ul><div class="detail-actions"><h3>Quieres dejar de pagar este servicio?</h3>${links}<p>La cancelacion nunca se realiza automaticamente. Comprueba si contrataste desde Apple, Google Play o directamente con el proveedor. No marques la baja como confirmada sin evidencia.</p></div>`;
$('decision-select').addEventListener('change',e=>{state.decisions[id]=e.target.value;render();});$('detail').showModal();}
function exportCSV(){if(!state.recurring.length){notify('Primero importa archivos para generar resultados.',true);return;}const header=['Proveedor','Categoria','Cuenta','Moneda','Frecuencia','Importe habitual','Equivalente anual','Numero de cargos','Confianza','Decision'];const sanitize=v=>{let s=String(v??'');if(/^[=+@\-]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};const lines=[header.map(sanitize).join(';'),...state.recurring.map(x=>[x.name,x.category,x.account,x.currency,x.frequency,x.typical.toFixed(2),x.yearly.toFixed(2),x.items.length,x.confidence,state.decisions[x.id]||'Pendiente'].map(sanitize).join(';'))];const blob=new Blob(['\uFEFF'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'});const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='gastos-invisibles-recurrencias.csv';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000);}
function init(){document.querySelectorAll('[data-page]').forEach(btn=>btn.addEventListener('click',()=>navigate(btn.dataset.page)));document.querySelectorAll('[data-go]').forEach(btn=>btn.addEventListener('click',()=>navigate(btn.dataset.go)));$('start-import').addEventListener('click',()=>navigate('importar'));$('file-input').addEventListener('change',filesSelected);$('confirm-import').addEventListener('click',confirmImport);$('discard-import').addEventListener('click',()=>{state.preview=[];state.files=[];preview();});$('erase-data').addEventListener('click',()=>{if(!confirm('Borrar todos los movimientos de esta sesion?'))return;state.transactions=[];state.recurring=[];state.preview=[];state.decisions={};preview();render();notify('Se borraron los datos de esta sesion.');});$('export-data').addEventListener('click',exportCSV);$('close-detail').addEventListener('click',()=>$('detail').close());document.addEventListener('click',e=>{const btn=e.target.closest('[data-detail]');if(btn)detail(btn.dataset.detail);});render();if('serviceWorker'in navigator&&location.protocol==='https:')navigator.serviceWorker.register('/service-worker.js').catch(()=>{});}
document.addEventListener('DOMContentLoaded',init);