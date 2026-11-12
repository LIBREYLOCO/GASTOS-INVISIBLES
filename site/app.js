'use strict';
// Gastos invisibles: local-only, in-memory processing for the private beta.
const $ = id => document.getElementById(id);
const state = {transactions:[], preview:[], files:[], recurring:[], decisions:{}, lastDetail:null,imports:[],dirty:false,loading:false,warnings:[]};
const pages = {movimientos:'Tus cargos importados',inicio:'Tu dinero al descubierto',importar:'Analiza tus estados de cuenta',gastos:'Tus gastos recurrentes',ahorros:'Seguimiento de bajas',cuenta:'Privacidad y control'};
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
function parseBankStatement(rows, source){
  const fold=s=>String(s).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  const months={ene:1,enero:1,feb:2,febrero:2,mar:3,marzo:3,abr:4,abril:4,may:5,mayo:5,jun:6,junio:6,jul:7,julio:7,ago:8,agosto:8,sep:9,sept:9,septiembre:9,setiembre:9,oct:10,octubre:10,nov:11,noviembre:11,dic:12,diciembre:12};
  const text=fold(rows.map(r=>r.text).join('\n'));
  let start,end;
  const numeric=text.match(/\bperiodo[^\n]*?\bdel\s+(\d{1,2}[/.\-]\d{1,2}[/.\-]\d{4})\s+al\s+(\d{1,2}[/.\-]\d{1,2}[/.\-]\d{4})/);
  if(numeric){start=parseDate(numeric[1]);end=parseDate(numeric[2]);}
  const words=text.match(/\bperiodo[^\n]*?\bdel\s+(\d{1,2})\s+de\s+(\w+)\s+al\s+(\d{1,2})\s+de\s+(\w+)\s+de\s+(\d{4})/);
  if(!start&&words){
    const a=months[words[2]],b=months[words[4]],year=+words[5];
    if(a&&b){start=parseDate(`${words[1]}/${a}/${year-(a>b?1:0)}`);end=parseDate(`${words[3]}/${b}/${year}`);}
  }
  if(!start||!end||start>end)return [];
  const datePrefix=/^(\d{1,2})(?:\s+de\s+|\s*[/\-]\s*)([A-Za-zÁÉÍÓÚáéíóú]+)\.?\b\s*/i;
  const extractDate=value=>{
    const match=value.match(datePrefix);if(!match)return null;
    const month=months[fold(match[2])];if(!month)return null;
    const candidates=[+start.slice(0,4),+end.slice(0,4)].map(y=>parseDate(`${match[1]}/${month}/${y}`)).filter(d=>d&&d>=start&&d<=end);
    if(!candidates.length)return null;
    return {date:candidates[0],rest:value.slice(match[0].length).trim()};
  };
  let columns=null,single=false,singleEdge=Infinity,lastOutputRow=-2;
  const out=[];
  for(let rowIndex=0;rowIndex<rows.length;rowIndex++){
    const row=rows[rowIndex];
    const line=String(row.text??'').replace(/\s+/g,' ').trim(),lower=fold(line);
    if(/cargos/.test(lower)&&/abonos/.test(lower)&&/descripci/.test(lower)){
      const find=word=>(row.parts||[]).find(p=>fold(p.text).trim()===word);
      const debit=find('cargos'),credit=find('abonos');
      const balance=(row.parts||[]).find(p=>/^operaci/.test(fold(p.text).trim()));
      columns=debit&&credit&&balance?{debit,credit,balance}:null;single=false;continue;
    }
    if(/fecha.*detalle.*importe/.test(lower)){single=true;columns=null;singleEdge=(row.parts||[]).find(p=>/importe/i.test(p.text))?.x??Infinity;continue;}
    if(!columns&&!single)continue;
    if(single&&lastOutputRow===rowIndex-1&&rows[lastOutputRow].page===row.page&&(row.parts||[]).some(p=>/^CR$/i.test(p.text.trim())&&p.x>=singleEdge)){out[out.length-1].amount=Math.abs(out[out.length-1].amount);continue;}
    const first=extractDate(line);if(!first)continue;
    const second=extractDate(first.rest);
    const rest=second?second.rest:first.rest;
    let amount,description;
    if(columns){
      const edge=p=>p.x+(p.width||0);
      const boundary=(edge(columns.debit)+edge(columns.credit))/2;
      const limit=(edge(columns.credit)+edge(columns.balance))/2;
      const money=(row.parts||[]).filter(p=>/^[-+]?\d[\d.,]*[.,]\d{2}$/.test(p.text.trim()));
      const debit=money.filter(p=>edge(p)>columns.debit.x-15&&edge(p)<boundary);
      const credit=money.filter(p=>edge(p)>=boundary&&edge(p)<limit);
      if(debit.length+credit.length!==1)continue;
      amount=Math.abs(numberValue((debit[0]||credit[0]).text))*(debit.length?-1:1);
      let prefix=cleanText((row.parts||[]).filter(p=>p.x<columns.debit.x-15).map(p=>p.text).join(' '));
      const a=extractDate(prefix);if(!a)continue;const b=extractDate(a.rest);
      description=b?b.rest:a.rest;
    }else{
      const value=rest.match(/(?:^|\s)([-+]?\d[\d.,]*[.,]\d{2})(?:\s*(CR))?\s*$/i);
      if(!value)continue;
      amount=Math.abs(numberValue(value[1]))*(value[2]||value[1].startsWith('-')?1:-1);
      description=cleanText(rest.slice(0,value.index));
    }
    if(!description||!Number.isFinite(amount)||Math.abs(amount)<.001)continue;
    out.push({date:first.date,description:cleanText(description),amount,source,cargoColumn:false,pdfPage:row.page});lastOutputRow=rowIndex;
  }
  return out;
}

async function readPdfScanned(doc, filename){
  if(!window.Tesseract)throw new Error('El lector OCR no pudo cargarse. Comprueba la conexión y vuelve a intentarlo.');
  const limit=20;
  if(doc.numPages>limit)throw new Error('Este PDF tiene más de 20 páginas. Para evitar un análisis incompleto, divide el documento en archivos de hasta 20 páginas.');
  let worker;
  const results=[];
  try{
    $('parser-status').textContent='Iniciando OCR del PDF escaneado. La primera vez puede descargar idiomas.';
    worker=await window.Tesseract.createWorker('spa+eng',1,{workerPath:'/vendor/tesseract/worker.min.js',corePath:'/vendor/tesseract-core',langPath:'/vendor/languages',workerBlobURL:false,cacheMethod:'none',logger:m=>{
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
function assertPdfCoverage(counts){if(counts.some(n=>n<10)&&counts.some(n=>n>=10))throw new Error('PDF mixto: contiene páginas sin texto legible. No se importó parcialmente. Separa las páginas escaneadas para analizarlas con OCR y revisa el documento completo.');}
function markPdfCoverage(total,rows){const read=new Set(rows.map(r=>r.pdfPage));const missing=Array.from({length:total},(_,i)=>i+1).filter(p=>!read.has(p));if(missing.length)rows.warnings=['Páginas sin movimientos reconocidos: '+missing.join(', ')+'. Pueden contener condiciones, tablas no reconocidas o movimientos escaneados. Revisa esas páginas y analízalas por separado antes de dar el estado por completo.'];return rows;}
async function readPdf(file){if(!window.pdfjsLib){window.pdfjsLib=await import('/vendor/pdfjs/pdf.mjs');}window.pdfjsLib.GlobalWorkerOptions.workerSrc='/vendor/pdfjs/pdf.worker.mjs';const ab=await file.arrayBuffer();const pdfTask=window.pdfjsLib.getDocument({data:new Uint8Array(ab),cMapUrl:'/vendor/pdfjs/cmaps/',cMapPacked:true,standardFontDataUrl:'/vendor/pdfjs/standard_fonts/',wasmUrl:'/vendor/pdfjs/wasm/',isEvalSupported:false});const doc=await pdfTask.promise;if(doc.numPages>80){await pdfTask.destroy();throw new Error('Divide el PDF en documentos de hasta 80 páginas; no se importó parcialmente.');}try{const lines=[],linePages=[],positioned=[],pageTextCounts=[];for(let p=1;p<=doc.numPages;p++){const page=await doc.getPage(p);const content=await page.getTextContent();pageTextCounts.push(content.items.map(x=>x.str||'').join('').trim().length);const items=content.items.filter(x=>x.str&&x.transform).map(x=>({text:x.str,x:x.transform[4],y:x.transform[5],width:x.width})).sort((a,b)=>b.y-a.y||a.x-b.x);const groups=[];for(const x of items){let g=groups.find(g=>Math.abs(g.y-x.y)<3);if(!g){g={y:x.y,parts:[]};groups.push(g);}g.parts.push(x);}for(const g of groups){g.parts.sort((a,b)=>a.x-b.x);const text=g.parts.map(p=>p.text).join(' ').replace(/\s+/g,' ').trim();lines.push(text);linePages.push(p);positioned.push({text,parts:g.parts,page:p});}}
assertPdfCoverage(pageTextCounts);const bankRows=parseBankStatement(positioned,file.name);if(bankRows.length)return markPdfCoverage(doc.numPages,bankRows);
const debitOnlyHeader=lines.some(line=>/\b(?:FECHA|DATE)\b/i.test(line)&&/\b(?:CARGO|DEBITO|DÉBITO|DEBIT)\b/i.test(line)&&!/\b(?:ABONO|CREDITO|CRÉDITO|CREDIT)\b/i.test(line));const out=[];for(const [lineIndex,line] of lines.entries()){const m=line.match(/(?:^|\s)(\d{1,2}[\/.-]\d{1,2}[\/.-]\d{2,4})\s+(.+)$/);if(!m)continue;const date=parseDate(m[1]);const content=m[2];const amounts=[...content.matchAll(/(?:^|\s)([-+]?\(?\s?(?:\$|\u20ac)?\s?\d[\d.,]*\s?\)?)(?=\s|$)/g)];if(!amounts.length)continue;let match=amounts[amounts.length-1];if(amounts.length>1&&/SALDO|BALANCE/i.test(content))match=amounts[amounts.length-2];const amount=numberValue(match[1]);const description=cleanText(content.slice(0,match.index));if(date&&description&&amount!==null)out.push({date,description,amount,source:file.name,cargoColumn:debitOnlyHeader,pdfPage:linePages[lineIndex]});}
if(!out.length)return await readPdfScanned(doc,file.name);return markPdfCoverage(doc.numPages,out);}finally{await pdfTask.destroy();}}
async function readFile(file){if(file.size>15*1024*1024)throw new Error(file.name+': supera el limite de 15 MB.');const name=file.name.toLowerCase();if(name.endsWith('.pdf'))return readPdf(file);if(name.endsWith('.csv'))return tabularToMovements(parseCSV(await file.text()),file.name);if(name.endsWith('.xlsx')||name.endsWith('.xls')){if(!window.XLSX)throw new Error('No se ha cargado el lector Excel. Comprueba tu conexion.');const book=window.XLSX.read(await file.arrayBuffer(),{type:'array',cellDates:true});let results=[],errors=[];for(const sheet of book.SheetNames){const rows=window.XLSX.utils.sheet_to_json(book.Sheets[sheet],{header:1,defval:''});try{results=results.concat(tabularToMovements(rows,file.name+' / '+sheet));}catch(e){errors.push(e.message);}}if(!results.length)throw new Error(errors[0]||'No pude leer movimientos del Excel.');return results;}throw new Error('Formato no admitido: '+file.name);}
function frequencyFromIntervals(intervals){const options=[['Semanal',7,52],['Quincenal',15,24],['Mensual',30.44,12],['Bimestral',60.9,6],['Trimestral',91.3,4],['Semestral',182.6,2],['Anual',365.25,1]];if(!intervals.length)return null;const sorted=[...intervals].sort((a,b)=>a-b),median=sorted[Math.floor(sorted.length/2)];let best=null;for(const item of options){const [label,days,perYear]=item;const diff=Math.abs(median-days);const limit=days<20?3:days<100?11:days<200?23:42;if(diff<=limit&&(!best||diff<best.diff))best={label,days,perYear,diff};}return best;}
function daysBetween(a,b){return(Math.abs(new Date(b+'T00:00:00Z')-new Date(a+'T00:00:00Z')))/86400000;}
function recalculate(){state.recurring=GIRecurring.analyze(state.transactions,state.decisions);render();}
function expensesFrom(raw){const out=[];const sign=$('sign-mode').value;for(const x of raw){let isExpense=x.cargoColumn||sign==='negative'?x.cargoColumn?true:x.amount<0:sign==='positive'?x.amount>0:x.amount<0;if(sign==='auto'&&x.cargoColumn)isExpense=true;if(!isExpense||excluded(x.description))continue;out.push({...x,amount:Math.abs(x.amount)});}return out;}
function fingerprint(x){return [x.date,simplify(x.description),Math.round(x.amount*100),x.account,x.currency].join('|');}
function rowTemplate(x){return `<tr><td>${esc(x.date)}</td><td>${esc(x.description)}</td><td class="right">${esc(x.amount)}</td></tr>`;}
function preview(){const rows=state.preview;$('coverage-warning').hidden=!state.warnings.length;$('coverage-message').textContent=state.warnings.join(' | ');$('ack-coverage').checked=false;$('preview-box').hidden=!rows.length;$('preview-count').textContent=rows.length+' movimientos leídos: revisa fechas, signos e importes';$('preview-rows').innerHTML=rows.map(rowTemplate).join('');$('source-label').value=state.files.map(f=>f.name).join(', ').slice(0,120);}
async function filesSelected(event){
 if(state.loading)return;const files=[...event.target.files];if(!files.length)return;state.loading=true;event.target.disabled=true;$('confirm-import').disabled=true;state.files=files;state.preview=[];state.warnings=[];preview();const successes=[],failures=[];
 try{for(const file of files){try{const extracted=await readFile(file);if(state.preview.length+extracted.length>20000)throw new Error('Límite de 20 000 movimientos por importación. Divide los archivos.');state.preview.push(...extracted);state.warnings.push(...(extracted.warnings||[]));successes.push(file.name+': '+extracted.length);}catch(e){failures.push(String(e.message||e));}}preview();$('parser-status').textContent=successes.join(' | ')+(failures.length?' | Errores: '+failures.join('; '):'');notify(failures.length?failures.join(' | '):'Archivos leídos. Revisa la vista previa antes de confirmar.',!!failures.length);}finally{state.loading=false;event.target.disabled=false;event.target.value='';$('confirm-import').disabled=false;}
}
function confirmImport(){
 if(state.loading)return;if(state.warnings.length&&!$('ack-coverage').checked){notify('Revisa las páginas sin movimientos reconocidos y confirma la advertencia antes de importar.',true);return;}const account=cleanText($('account').value).slice(0,80)||'Cuenta sin nombre',currency=$('currency').value,accepted=expensesFrom(state.preview).map(x=>({...x,account,currency}));
 if(!accepted.length){notify('No hay cargos con el signo seleccionado. Revisa la interpretación de signos.',true);return;}
 const merged=GIRecurring.mergeTransactions(state.transactions,accepted);if(merged.transactions.length>20000){notify('El historial supera 20 000 cargos. Guarda una copia y empieza otra sesión.',true);return;}
 state.imports.push({label:state.files.map(f=>f.name).join(', ').slice(0,300),account,currency,read:state.preview.length,added:merged.added,duplicates:merged.duplicates});state.transactions=merged.transactions;state.dirty=true;state.preview=[];state.files=[];state.warnings=[];preview();recalculate();navigate('inicio');notify(`${merged.added} cargos nuevos. ${merged.duplicates} duplicados descartados. Los abonos y pagos excluidos no forman parte de los cargos.`);
}
function render(){GIProduct.render();}
function detail(id){GIProduct.detail(id);}
function exportCSV(){GIProduct.exportCSV();}
function init(){GIProduct.bind({state,recalculate,navigate,notify});document.querySelectorAll('[data-page]').forEach(btn=>btn.addEventListener('click',()=>navigate(btn.dataset.page)));document.querySelectorAll('[data-go]').forEach(btn=>btn.addEventListener('click',()=>navigate(btn.dataset.go)));$('start-import').addEventListener('click',()=>navigate('importar'));$('file-input').addEventListener('change',filesSelected);$('confirm-import').addEventListener('click',confirmImport);$('discard-import').addEventListener('click',()=>{state.preview=[];state.files=[];preview();});$('erase-data').addEventListener('click',()=>{if(!confirm('Borrar todos los movimientos de esta sesion?'))return;state.transactions=[];state.recurring=[];state.preview=[];state.decisions={};state.imports=[];state.dirty=false;preview();render();notify('Se borraron los datos de esta sesion.');});$('export-data').addEventListener('click',exportCSV);$('close-detail').addEventListener('click',()=>$('detail').close());document.addEventListener('click',e=>{const btn=e.target.closest('[data-detail]');if(btn)detail(btn.dataset.detail);});$('logout').addEventListener('click',async()=>{try{await fetch('/auth',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({action:'logout'})});}finally{location.replace('/login.html');}});render();}
document.addEventListener('DOMContentLoaded',init);