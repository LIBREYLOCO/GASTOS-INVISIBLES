'use strict';
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.GIRecurring=api;})(globalThis,function(){
  const normalize=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toUpperCase().replace(/\s+/g,' ').trim();
  const statuses=new Set(['pending','keep','investigate','cancel-requested','canceled','not-recurring']);
  const catalog=[
    [/OPENAI|CHATGPT/,'ChatGPT','Software','Suscripción'],[/NETFLIX/,'Netflix','Entretenimiento','Suscripción'],[/SPOTIFY/,'Spotify','Entretenimiento','Suscripción'],
    [/GOOGLE\s*\*?\s*WORKSPACE/,'Google Workspace','Software','Suscripción'],[/GOOGLE\s*ONE/,'Google One','Software','Suscripción'],[/YOUTUBE.*PREMIUM/,'YouTube Premium','Entretenimiento','Suscripción'],
    [/AMAZON.*PRIME|PRIME.*VIDEO/,'Amazon Prime','Entretenimiento','Suscripción'],[/MICROSOFT.*365|OFFICE.*365/,'Microsoft 365','Software','Suscripción'],[/DROPBOX/,'Dropbox','Software','Suscripción'],[/ADOBE/,'Adobe','Software','Suscripción'],[/CANVA/,'Canva','Software','Suscripción'],
    [/APPLE[.\s]*(COM|BILL)|ITUNES/,'Apple · servicio por identificar','Intermediario','Por identificar'],[/GOOGLE\s*PLAY/,'Google Play · servicio por identificar','Intermediario','Por identificar'],
    [/\bAXA\b/,'AXA','Seguros','Seguro'],[/MAPFRE/,'Mapfre','Seguros','Seguro'],[/ALLIANZ/,'Allianz','Seguros','Seguro'],[/SEGURO|ASEGURADORA/,'Seguro por identificar','Seguros','Seguro'],
    [/\bCFE\b/,'CFE','Servicios','Servicio'],[/IBERDROLA/,'Iberdrola','Servicios','Servicio'],[/ENDESA/,'Endesa','Servicios','Servicio'],[/TELMEX/,'Telmex','Servicios','Servicio'],[/TELCEL/,'Telcel','Servicios','Servicio'],[/MOVISTAR/,'Movistar','Servicios','Servicio'],[/VODAFONE/,'Vodafone','Servicios','Servicio'],[/TOTALPLAY/,'Totalplay','Servicios','Servicio'],[/\bIZZI\b/,'Izzi','Servicios','Servicio'],
    [/GIMNASIO|\bGYM\b|FITNESS/,'Gimnasio por identificar','Membresías','Suscripción'],[/COMISION.*MANEJO|MANTENIMIENTO.*CUENTA/,'Comisión de cuenta','Comisiones','Comisión']
  ];
  function merchant(description){
    const s=normalize(description);
    for(const [re,name,category,kind] of catalog)if(re.test(s))return {key:normalize(name),name,category,kind,known:true};
    const key=s.replace(/^(PAYPAL|STRIPE|MERCADOPAGO|MP)\s*[*.-]?\s*/,'').replace(/\b(?:REF|FOLIO|AUT|REFERENCIA)\s*[:#-]?\s*[A-Z0-9-]+/g,'').replace(/\b[A-Z]*\d{4,}[A-Z0-9]*\b/g,'').replace(/\b(?:COMPRA|PAGO|TARJETA|DOMICILIACION|POS)\b/g,'').replace(/[^A-Z0-9 ]/g,' ').replace(/\s+/g,' ').trim();
    return {key,name:key?key.toLowerCase().replace(/\b\w/g,c=>c.toUpperCase()):'Proveedor por identificar',category:'Otros',kind:'Pago recurrente',known:false};
  }
  const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
  const excluded=s=>/\b(NOMINA|DEPOSITO|ABONO|DEVOLUCION|REEMBOLSO|TRASPASO)\b|PAGO\s+(?:DE\s+TARJETA|A\s+TARJETA)|TRANSFERENCIA\s+(?:ENTRE|PROPIA)|RETIRO EN EFECTIVO/.test(normalize(s));
  const shopping=s=>/SUPERMERCADO|SUPERMARKET|WALMART|COSTCO|SORIANA|MERCADONA|RESTAURANTE|RESTAURANT|GASOLINERA|UBER\s*(?:TRIP|EATS)|DIDI.*VIAJE|AMAZON.*(?:MARKET|RETAIL)/.test(normalize(s));
  const validRecord=r=>r&&validDate(r.date)&&typeof r.description==='string'&&r.description.trim()&&typeof r.account==='string'&&r.account.trim()&&['MXN','EUR'].includes(r.currency)&&Number.isFinite(r.amount)&&r.amount>0;
  const median=values=>{const a=[...values].sort((a,b)=>a-b);const n=a.length;return n%2?a[(n-1)/2]:(a[n/2-1]+a[n/2])/2;};
  const dayDiff=(a,b)=>Math.round((Date.parse(b+'T00:00:00Z')-Date.parse(a+'T00:00:00Z'))/86400000);
  const iso=d=>d.toISOString().slice(0,10);
  function addMonths(date,n,anchorDay){const d=new Date(date+'T00:00:00Z');const y=d.getUTCFullYear(),m=d.getUTCMonth()+n;const day=anchorDay||d.getUTCDate();return iso(new Date(Date.UTC(y,m,Math.min(day,new Date(Date.UTC(y,m+1,0)).getUTCDate()))));}
  function advance(date,cadence,n=1,anchor){if(cadence.months)return addMonths(date,cadence.months*n,anchor);return iso(new Date(Date.parse(date+'T00:00:00Z')+cadence.days*n*86400000));}
  const cadences=[{label:'Mensual',months:1,perYear:12,tolerance:5},{label:'Bimestral',months:2,perYear:6,tolerance:7},{label:'Trimestral',months:3,perYear:4,tolerance:9},{label:'Semestral',months:6,perYear:2,tolerance:12},{label:'Anual',months:12,perYear:1,tolerance:15},{label:'Semanal',days:7,perYear:52,tolerance:1},{label:'Quincenal',days:15,perYear:24,tolerance:2}];
  function cadenceFor(items){
    if(items.length<2)return null;
    const dates=[...new Set(items.map(r=>r.date))];if(dates.length<2)return null;
    const anchor=Math.round(median(dates.map(d=>+d.slice(8))));let best=null;
    for(const c of cadences){let matched=0,missing=0,error=0;
      for(let i=1;i<dates.length;i++){let closest=null;
        for(let n=1;n<=3;n++){const delta=Math.abs(dayDiff(advance(dates[i-1],c,n,anchor),dates[i]));if(!closest||delta<closest.delta)closest={delta,n};}
        if(closest.delta<=c.tolerance){matched++;missing+=closest.n-1;error+=closest.delta/c.tolerance;}
      }
      const ratio=matched/(dates.length-1),score=ratio-(missing*.13+error*.03)/(dates.length-1);
      if(ratio>=.75&&(!best||score>best.score+.001))best={...c,ratio,score,missing,anchor};
    }
    return best;
  }
  function splitSeries(items,info){
    // Intermediaries and simultaneous substantially different prices need separate evidence.
    const simultaneous=items.some((a,i)=>items.slice(i+1).some(b=>Math.abs(dayDiff(a.date,b.date))<10&&Math.abs(a.amount-b.amount)/Math.min(a.amount,b.amount)>.3));
    if(!simultaneous)return [{key:'main',items}];
    const buckets=[];for(const item of [...items].sort((a,b)=>a.amount-b.amount)){let b=buckets.find(x=>Math.abs(x.price-item.amount)/x.price<=.12);if(!b)buckets.push(b={price:item.amount,items:[]});b.items.push(item);}
    return buckets.map(b=>({key:'price-'+Math.round(b.price*100),items:b.items}));
  }
  function analyze(records,decisions={}){
    const groups=new Map(),coverage=new Map();
    for(const raw of records){if(!validRecord(raw)||excluded(raw.description))continue;
      const row={...raw,description:raw.description.trim()};const key=JSON.stringify([row.account,row.currency]);coverage.set(key,[coverage.get(key)||'',row.date].sort().at(-1));
      const info=merchant(row.description);if(!info.key||(!info.known&&shopping(row.description)))continue;
      const id=JSON.stringify([info.key,row.account,row.currency]);if(!groups.has(id))groups.set(id,{info,account:row.account,currency:row.currency,items:[]});groups.get(id).items.push(row);
    }
    const result=[];
    for(const group of groups.values())for(const series of splitSeries(group.items,group.info)){
      const items=[...series.items].sort((a,b)=>a.date.localeCompare(b.date)||a.amount-b.amount),m=group.info;
      const cadence=cadenceFor(items),prices=items.map(x=>x.amount),middle=median(prices);
      const deviation=median(prices.map(v=>Math.abs(v-middle)))/middle;
      if(!m.known&&(!cadence||items.length<3||deviation>.15))continue;
      if(!cadence&&items.length>1)continue;
      const id=JSON.stringify([m.key,group.account,group.currency,series.key]);
      const supplied=Object.hasOwn(decisions,id)?decisions[id]:null;
      const decision=supplied&&typeof supplied==='object'?supplied:{};
      const status=statuses.has(decision.status)?decision.status:'pending';
      const last=items.at(-1),perYear=cadence?.perYear||0;
      const confidence=!cadence?'Por confirmar':items.length>=3&&cadence.ratio>=.9&&deviation<=.15?'Alta':'Probable';
      const previous=prices.slice(0,-1),oldPrice=previous.length?median(previous):null;
      const stablePrevious=previous.length>=2&&previous.every(p=>Math.abs(p-oldPrice)/oldPrice<=.08);
      const priceChange=stablePrevious&&Math.abs(last.amount-oldPrice)>=1&&last.amount>oldPrice*1.05?{from:oldPrice,to:last.amount,percent:Math.round((last.amount/oldPrice-1)*100),date:last.date}:null;
      const asOf=coverage.get(JSON.stringify([group.account,group.currency]));
      const nextDate=cadence?advance(last.date,cadence,1,cadence.anchor):null;
      const canceledAt=validDate(decision.canceledAt)?decision.canceledAt:null;
      const chargedAfterCancellation=status==='canceled'&&!!canceledAt&&items.some(x=>x.date>canceledAt);
      const active=!!cadence&&!['canceled','not-recurring'].includes(status);
      const reasons=[`${items.length} cargo${items.length===1?'':'s'} con evidencia en ${group.account}.`];
      if(cadence)reasons.push(`Patrón ${cadence.label.toLowerCase()} en fechas de cobro${cadence.missing?'; hay intervalos sin movimientos observados':''}.`);
      else reasons.push('Un solo cobro no demuestra una suscripción: falta otro período.');
      if(m.kind==='Por identificar')reasons.push('El intermediario no identifica el servicio contratado. Revisa el recibo antes de atribuir una suscripción.');
      if(!m.known)reasons.push('Proveedor sin identificar: un pago periódico no acredita por sí solo una suscripción.');
      if(cadence&&deviation>.15)reasons.push('Los importes varían; revisa el contrato o el consumo.');
      if(chargedAfterCancellation)reasons.push('Hay un cargo posterior a la fecha en que marcaste la baja.');
      result.push({id,key:id,name:typeof decision.name==='string'&&decision.name.trim()?decision.name.trim().slice(0,80):m.name,category:m.category,kind:decision.kind&&['Suscripción','Servicio','Seguro','Comisión','Pago recurrente','Por identificar'].includes(decision.kind)?decision.kind:m.kind,account:group.account,currency:group.currency,items,frequency:cadence?.label||'Sin determinar',perYear,typical:last.amount,monthly:last.amount*perYear/12,yearly:last.amount*perYear,min:Math.min(...prices),max:Math.max(...prices),confidence,reasons,lastDate:last.date,nextDate,asOf,overdue:!!nextDate&&nextDate<asOf,priceChange,status,canceledAt,chargedAfterCancellation,active,realizedSavings:0});
    }
    return result.sort((a,b)=>Number(b.chargedAfterCancellation)-Number(a.chargedAfterCancellation)||b.yearly-a.yearly||a.name.localeCompare(b.name));
  }
  function recordKey(row){return JSON.stringify([row.account,row.currency,row.date,normalize(row.description),Math.round(row.amount*100)]);}
  function mergeTransactions(existing,incoming){
    const transactions=existing.filter(validRecord).map(r=>({...r})),occurrences=new Map(),seen=new Set();
    for(const row of transactions){const k=recordKey(row),n=(occurrences.get(k)||0)+1;occurrences.set(k,n);seen.add(k+'#'+n);}
    const batchCounts=new Map();let added=0,duplicates=0;
    for(const row of incoming){if(!validRecord(row))continue;const k=recordKey(row),fileKey=JSON.stringify([row.source||'',k]),n=(batchCounts.get(fileKey)||0)+1;batchCounts.set(fileKey,n);const id=k+'#'+n;
      if(seen.has(id)){duplicates++;continue;}seen.add(id);transactions.push({...row,id});added++;
    }
    return {transactions,added,duplicates};
  }
  return {analyze,mergeTransactions,merchant,validRecord,validDate,statuses:[...statuses]};
});
