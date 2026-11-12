'use strict';
window.GIProduct=(function(){
  let app,pendingVault=null,vaultMode='save';
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const labels={pending:'Pendiente de revisar',keep:'Conservar',investigate:'Investigar','cancel-requested':'Solicité la baja',canceled:'Baja confirmada por mí','not-recurring':'No es recurrente'};
  const money=(n,c)=>new Intl.NumberFormat(c==='MXN'?'es-MX':'es-ES',{style:'currency',currency:c}).format(n||0);
  const date=s=>s?new Intl.DateTimeFormat('es',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(s+'T00:00:00Z')):'Sin determinar';
  const guides={Netflix:'https://help.netflix.com/es/node/407',Spotify:'https://support.spotify.com/es-eu/article/cancel-premium/',ChatGPT:'https://help.openai.com/es-419/articles/7232927-canceling-your-chatgpt-subscription','Amazon Prime':'https://www.amazon.es/gp/primecentral','Microsoft 365':'https://account.microsoft.com/services',Dropbox:'https://help.dropbox.com/plans/cancel-subscription',Adobe:'https://helpx.adobe.com/es/manage-account/using/cancel-subscription.html',Canva:'https://www.canva.com/help/cancel-canva-plan/'};
  function totals(list){const out={};for(const r of list){if(!out[r.currency])out[r.currency]={monthly:0,yearly:0};out[r.currency].monthly+=r.monthly;out[r.currency].yearly+=r.yearly;}return out;}
  const status=r=>r.chargedAfterCancellation?'<span class="badge danger-badge">Cobro después de la baja</span>':r.status==='canceled'?'<span class="badge">Baja marcada</span>':r.priceChange?'<span class="badge warm">Subida de precio</span>':`<span class="badge ${r.confidence==='Por confirmar'?'warm':''}">${esc(r.confidence)}</span>`;
  function entry(r){return `<article class="subscription-card"><button class="entry-button" data-detail="${esc(r.id)}"><span class="provider-icon">${esc(r.name.slice(0,1))}</span><span class="entry-label"><strong>${esc(r.name)}</strong><small>${esc(r.kind)} · ${esc(r.account)}</small><span class="evidence-caption">${r.items.length} cargo${r.items.length===1?'':'s'} · ${esc(r.frequency)} · último ${esc(date(r.lastDate))}</span></span><span class="entry-price"><strong>${r.perYear?esc(money(r.monthly,r.currency)):'—'}</strong><small>${r.perYear?'al mes, equivalente':'Falta otro período'}</small>${status(r)}</span></button></article>`;}
  function visible(){
    let list=[...app.state.recurring];const query=($('expense-search').value||'').toLocaleLowerCase(),kind=$('kind-filter').value,st=$('status-filter').value;
    list=list.filter(r=>(!query||[r.name,r.account,...r.items.map(x=>x.description)].join(' ').toLocaleLowerCase().includes(query))&&(!kind||r.kind===kind)&&(st==='all'||st==='review'?st==='all'||['pending','investigate'].includes(r.status):st==='active'?r.active:st==='candidates'?r.confidence==='Por confirmar':r.status===st));
    if($('expense-sort').value==='next')list.sort((a,b)=>(a.nextDate||'9999').localeCompare(b.nextDate||'9999'));
    else if($('expense-sort').value==='name')list.sort((a,b)=>a.name.localeCompare(b.name));
    return list;
  }
  function render(){
    const {state}=app,rr=state.recurring,active=rr.filter(r=>r.active),uncertain=rr.filter(r=>r.confidence==='Por confirmar'&&r.status!=='not-recurring'),alerts=rr.filter(r=>r.chargedAfterCancellation||r.priceChange);
    $('count-total').textContent=active.length;$('transaction-count').textContent=state.transactions.length;$('review-count').textContent=rr.filter(r=>['pending','investigate'].includes(r.status)).length;
    $('session-state').textContent=state.dirty?'Cambios sin guardar':'Sesión sin cambios pendientes';$('session-state').classList.toggle('unsaved',state.dirty);
    $('save-vault-top').disabled=!state.transactions.length;
    $('privacy-stats').textContent=`${state.transactions.length} cargos y ${state.imports.length} importaciones en esta sesión. Los originales no se guardan.`;
    $('yearly-totals').innerHTML=Object.entries(totals(active)).map(([c,v])=>`<div class="cost-line"><div><span class="eyebrow">${esc(c)}</span><strong>${esc(money(v.monthly,c))}<small>/mes</small></strong></div><span>${esc(money(v.yearly,c))} al año</span></div>`).join('')||'<p class="placeholder">Importa varios meses para estimar tus pagos recurrentes.</p>';
    $('candidate-summary').textContent=uncertain.length?`${uncertain.length} proveedor${uncertain.length===1?'':'es'} con un solo cargo: necesitan revisión y no se suman a la proyección.`:'Las estimaciones se basan en tus movimientos importados; no acreditan contratos vigentes.';
    $('recent').innerHTML=active.slice(0,5).map(entry).join('')||'<p class="placeholder">Aquí aparecerán las suscripciones y pagos con evidencia de repetición.</p>';
    $('alerts').innerHTML=alerts.map(r=>`<button class="alert-item" data-detail="${esc(r.id)}"><strong>${esc(r.name)}</strong><span>${r.chargedAfterCancellation?'Se encontró un cargo posterior a la baja marcada.':`Último precio: ${esc(money(r.priceChange.to,r.currency))}; antes ${esc(money(r.priceChange.from,r.currency))} (+${r.priceChange.percent} %).`}</span></button>`).join('')||'<p class="hint">Sin subidas o cobros posteriores a una baja en los datos importados.</p>';
    const upcoming=active.filter(r=>r.nextDate).sort((a,b)=>a.nextDate.localeCompare(b.nextDate)).slice(0,6);
    $('upcoming').innerHTML=upcoming.map(r=>`<button class="upcoming-row" data-detail="${esc(r.id)}"><span><strong>${esc(r.name)}</strong><small>${esc(r.account)}</small></span><span>${esc(date(r.nextDate))}<small>${r.overdue?'No visto en los movimientos recientes':'Fecha estimada'} · ${esc(money(r.typical,r.currency))}</small></span></button>`).join('')||'<p class="hint">Faltan períodos para estimar próximas fechas.</p>';
    const list=visible();$('expense-count').textContent=`${list.length} resultados`;$('expense-list').innerHTML=list.map(entry).join('')||'<p class="placeholder">No hay resultados para estos filtros.</p>';
    const pending=rr.filter(r=>['cancel-requested','canceled'].includes(r.status));
    $('saving-list').innerHTML=pending.map(r=>`<div class="followup-row"><button class="entry-button" data-detail="${esc(r.id)}"><strong>${esc(r.name)}</strong><small>${esc(labels[r.status])}${r.canceledAt?' · '+esc(date(r.canceledAt)):''}</small>${status(r)}</button><span>${esc(money(r.yearly,r.currency))}/año<small>Coste observado equivalente, no ahorro realizado</small></span></div>`).join('')||'<p class="placeholder">Abre un proveedor y registra tu decisión para seguir su baja.</p>';
    $('import-history').innerHTML=state.imports.slice().reverse().map(r=>`<li><strong>${esc(r.label)}</strong><span>${esc(r.account)} · ${esc(r.currency)} · ${r.read} leídos · ${r.added} cargos nuevos · ${r.duplicates} duplicados</span></li>`).join('')||'<li>No hay importaciones en esta sesión.</li>';
    const q=($('movement-search').value||'').toLocaleLowerCase();const rows=state.transactions.filter(r=>!q||[r.description,r.account,r.source,r.date].join(' ').toLocaleLowerCase().includes(q)).slice().sort((a,b)=>b.date.localeCompare(a.date));
    $('movement-count').textContent=`${rows.length} cargos`;$('movement-rows').innerHTML=rows.slice(0,500).map(r=>`<tr><td>${esc(r.date)}</td><td>${esc(r.description)}</td><td>${esc(r.account)}</td><td class="right">${esc(money(r.amount,r.currency))}</td><td>${esc(r.source)}</td></tr>`).join('');
    $('movement-limit').textContent=rows.length>500?'Se muestran los primeros 500 cargos. Usa la búsqueda para acotar los resultados.':'';
  }
  function detail(id){
    const r=app.state.recurring.find(x=>x.id===id);if(!r)return;app.state.lastDetail=id;
    const template=`Solicito cancelar mi suscripción de ${r.name} y detener las futuras renovaciones. Por favor, indíquenme la fecha efectiva de baja y envíenme la confirmación por escrito. Si hay requisitos o cargos pendientes, detállenlos antes de proceder.`;
    const guide=guides[r.name]||(r.name.startsWith('Apple')?'https://support.apple.com/es-es/118428':r.name.startsWith('Google Play')?'https://play.google.com/store/account/subscriptions':null);
    $('detail-content').innerHTML=`<div class="detail-top"><span class="eyebrow">EVIDENCIA Y SEGUIMIENTO</span><h2>${esc(r.name)}</h2><p>${esc(r.account)} · ${esc(r.currency)} · ${esc(r.kind)}</p>${status(r)}</div>
      <div class="detail-grid"><div>Frecuencia<strong>${esc(r.frequency)}</strong></div><div>Evidencia<strong>${r.items.length} cargos</strong></div><div>Último importe por fecha<strong>${esc(money(r.typical,r.currency))}</strong></div><div>Equivalente anual<strong>${r.perYear?esc(money(r.yearly,r.currency)):'Sin estimar'}</strong></div></div>
      <ul class="reason-list">${r.reasons.map(t=>`<li>${esc(t)}</li>`).join('')}</ul>
      ${r.priceChange?`<p class="callout">El precio pasó de ${esc(money(r.priceChange.from,r.currency))} a ${esc(money(r.priceChange.to,r.currency))}. Verifica si cambió el plan o el consumo.</p>`:''}
      <p class="hint">Próximo cobro estimado: ${esc(date(r.nextDate))}. Calculado con la cobertura de los movimientos importados, no con acceso a tu contrato.</p>
      <form id="decision-form"><div class="grid-two"><label>Nombre del proveedor<input id="provider-name" value="${esc(r.name)}" maxlength="80" required></label><label>Tipo de pago<select id="provider-kind">${['Suscripción','Servicio','Seguro','Comisión','Pago recurrente','Por identificar'].map(k=>`<option ${r.kind===k?'selected':''}>${esc(k)}</option>`).join('')}</select></label></div>
      <div class="grid-two"><label>Tu decisión<select id="decision-select">${Object.entries(labels).map(([k,v])=>`<option value="${k}" ${r.status===k?'selected':''}>${esc(v)}</option>`).join('')}</select></label><label>Fecha efectiva de baja<input id="cancellation-date" type="date" value="${esc(r.canceledAt||'')}"><small>Obligatoria al marcar la baja confirmada.</small></label></div><button class="primary" type="submit">Guardar seguimiento</button><p id="decision-status" role="status"></p></form>
      <h3>Movimientos que respaldan el resultado</h3><div class="table-wrap evidence-table"><table><thead><tr><th>Fecha</th><th>Concepto</th><th>Importe</th><th>Origen</th></tr></thead><tbody>${r.items.map(item=>`<tr><td>${esc(item.date)}</td><td>${esc(item.description)}</td><td>${esc(money(item.amount,item.currency))}</td><td>${esc(item.source)}</td></tr>`).join('')}</tbody></table></div>
      <div class="detail-actions"><h3>Ayuda para cancelar</h3>${guide?`<a href="${guide}" target="_blank" rel="noopener noreferrer">Abrir instrucciones del proveedor ↗</a>`:'<p>Confirma el proveedor o intermediario en el recibo antes de solicitar la baja.</p>'}<p>La solicitud se envía por el canal del proveedor. Esta aplicación prepara el texto y conserva tu seguimiento; no envía solicitudes ni acredita una cancelación por ti.</p><label>Texto que puedes copiar<textarea readonly id="cancellation-draft" rows="5">${esc(template)}</textarea></label><button type="button" class="secondary" id="copy-draft">Copiar solicitud</button></div>`;
    $('decision-form').addEventListener('submit',e=>{
      e.preventDefault();const status=$('decision-select').value,canceledAt=$('cancellation-date').value,name=$('provider-name').value.trim();
      if(!name){$('decision-status').textContent='Escribe el nombre del proveedor.';return;}
      if(status==='canceled'&&!GIRecurring.validDate(canceledAt)){$('decision-status').textContent='Indica la fecha efectiva de baja para poder vigilar nuevos cobros.';return;}
      const record={status,name,kind:$('provider-kind').value,anchor:GIRecurring.evidenceKey(r.items[0])};if(canceledAt)record.canceledAt=canceledAt;
      app.state.decisions[id]=record;app.state.dirty=true;app.recalculate();$('detail').close();app.notify('Seguimiento guardado en la sesión. Guarda la copia cifrada para conservarlo.');
    });
    $('copy-draft').addEventListener('click',async()=>{try{await navigator.clipboard.writeText(template);$('copy-draft').textContent='Solicitud copiada';}catch{$('cancellation-draft').select();$('copy-draft').textContent='Selecciona y copia el texto';}});
    $('detail').showModal();
  }
  function download(data,name,type){const url=URL.createObjectURL(new Blob([data],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);}
  function exportCSV(){
    const list=app.state.recurring;if(!list.length){app.notify('Importa estados de cuenta para generar resultados.',true);return;}
    const cell=v=>{let s=String(v??'');if(/^[=+@\-\t\r]/.test(s))s="'"+s;return '"'+s.replace(/"/g,'""')+'"';};
    const rows=[['Proveedor','Tipo','Cuenta','Moneda','Frecuencia','Confianza','Cargos','Último importe','Equivalente mensual','Equivalente anual','Último cargo','Próximo estimado','Decisión','Cobro tras baja']];
    for(const r of list)rows.push([r.name,r.kind,r.account,r.currency,r.frequency,r.confidence,r.items.length,r.typical.toFixed(2),r.monthly.toFixed(2),r.yearly.toFixed(2),r.lastDate,r.nextDate||'',labels[r.status],r.chargedAfterCancellation?'Sí':'No']);
    download('\uFEFF'+rows.map(r=>r.map(cell).join(';')).join('\r\n'),'gastos-invisibles-hallazgos.csv','text/csv;charset=utf-8');
  }
  function showVault(mode){vaultMode=mode;$('vault-password').value='';$('vault-confirm').value='';$('vault-status').textContent='';$('vault-title').textContent=mode==='save'?'Guardar historial cifrado':'Abrir historial cifrado';$('vault-confirm-label').hidden=mode!=='save';$('vault-action').textContent=mode==='save'?'Cifrar y descargar':'Descifrar y abrir';$('vault-explanation').textContent=mode==='save'?'El archivo incluye tus movimientos y decisiones cifrados. Guarda la frase aparte: no se almacena y no podemos recuperarla.':'Se abrirá el historial del archivo en esta sesión. Si ya hay cambios sin guardar, guarda una copia antes de sustituirlos.';$('vault-dialog').showModal();}
  function bind(options){
    app=options;
    for(const id of ['expense-search','kind-filter','status-filter','expense-sort','movement-search'])$(id).addEventListener(id.includes('search')?'input':'change',render);
    for(const id of ['save-vault','save-vault-top'])$(id).addEventListener('click',()=>showVault('save'));
    $('vault-close').addEventListener('click',()=>{$('vault-dialog').close();$('vault-password').value='';$('vault-confirm').value='';pendingVault=null;});
    $('vault-file').addEventListener('change',async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;try{if(file.size>GIVault.maxFileBytes)throw new Error('La bóveda supera el límite de tamaño.');pendingVault=JSON.parse(await file.text());showVault('open');}catch{pendingVault=null;app.notify('No se pudo leer el archivo de bóveda.',true);}});
    $('vault-form').addEventListener('submit',async e=>{
      e.preventDefault();const button=$('vault-action');button.disabled=true;let password=$('vault-password').value;
      try{if(vaultMode==='save'){
        if(password!==$('vault-confirm').value)throw new Error('Las frases no coinciden.');
        const envelope=await GIVault.seal({version:1,transactions:app.state.transactions,decisions:app.state.decisions,imports:app.state.imports},password);
        download(JSON.stringify(envelope),'gastos-invisibles-'+new Date().toISOString().slice(0,10)+'.gi-vault','application/json');app.state.dirty=false;render();app.notify('Copia cifrada preparada. Comprueba que se descargó y conserva el archivo y la frase en un lugar seguro.');
      }else{
        if(app.state.dirty&&!$('replace-session').checked)throw new Error('Confirma que quieres sustituir la sesión, o cierra y guarda primero tu copia.');
        const payload=await GIVault.open(pendingVault,password);app.state.transactions=payload.transactions;app.state.decisions=payload.decisions;app.state.imports=payload.imports;app.state.preview=[];app.state.files=[];app.state.dirty=false;app.recalculate();$('preview-box').hidden=true;app.navigate('inicio');app.notify('Historial abierto y resultados recalculados.');
      }$('vault-dialog').close();pendingVault=null;
      }catch(error){$('vault-status').textContent=error.message;}
      finally{password='';$('vault-password').value='';$('vault-confirm').value='';button.disabled=false;}
    });
    $('vault-dialog').addEventListener('close',()=>{$('vault-password').value='';$('vault-confirm').value='';$('replace-session').checked=false;});
  }
  return {bind,render,detail,exportCSV,download};
})();
