'use strict';
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.GIVault=api;})(globalThis,function(){
  const ITERATIONS=310000,MAX_BYTES=12*1024*1024;
  const validDate=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
  const fail=()=>{throw new Error('El archivo no es una bóveda válida de Gastos invisibles.');};
  const plain=x=>!!x&&typeof x==='object'&&!Array.isArray(x)&&[Object.prototype,null].includes(Object.getPrototypeOf(x));
  const text=(x,max)=>typeof x==='string'&&x.length<=max;
  const dangerous=x=>Object.keys(x).some(k=>['__proto__','prototype','constructor'].includes(k));
  function validate(payload){
    if(!plain(payload)||dangerous(payload)||payload.version!==1||!Array.isArray(payload.transactions)||payload.transactions.length>20000||!plain(payload.decisions)||dangerous(payload.decisions)||Object.keys(payload.decisions).length>10000||!Array.isArray(payload.imports)||payload.imports.length>2000)fail();
    const transactions=payload.transactions.map(r=>{
      if(!plain(r)||dangerous(r)||!validDate(r.date)||!text(r.description,300)||!r.description.trim()||!text(r.account,80)||!r.account.trim()||!['MXN','EUR'].includes(r.currency)||!Number.isFinite(r.amount)||r.amount<=0||r.amount>1e12||!text(r.source||'',300))fail();
      return {date:r.date,description:r.description,amount:r.amount,account:r.account,currency:r.currency,source:r.source||''};
    });
    const decisions=Object.create(null);
    for(const [id,value] of Object.entries(payload.decisions)){
      if(id.length>600||!plain(value)||dangerous(value)||!['pending','keep','investigate','cancel-requested','canceled','not-recurring'].includes(value.status))fail();
      const record={status:value.status};
      if(value.anchor!==undefined){if(!text(value.anchor,1000))fail();record.anchor=value.anchor;}
      if(value.canceledAt!==undefined){if(!validDate(value.canceledAt))fail();record.canceledAt=value.canceledAt;}
      if(record.status==='canceled'&&!record.canceledAt)fail();
      if(value.name!==undefined){if(!text(value.name,80))fail();record.name=value.name;}
      if(value.kind!==undefined){if(!['Suscripción','Servicio','Seguro','Comisión','Pago recurrente','Por identificar'].includes(value.kind))fail();record.kind=value.kind;}
      decisions[id]=record;
    }
    const imports=payload.imports.map(r=>{
      if(!plain(r)||dangerous(r)||!text(r.label,300)||!text(r.account,80)||!['MXN','EUR'].includes(r.currency)||!Number.isInteger(r.read)||r.read<0||r.read>20000||!Number.isInteger(r.added)||r.added<0||r.added>20000||!Number.isInteger(r.duplicates)||r.duplicates<0||r.duplicates>20000)fail();
      return {label:r.label,account:r.account,currency:r.currency,read:r.read,added:r.added,duplicates:r.duplicates};
    });
    return {version:1,transactions,decisions,imports};
  }
  function base64(bytes){let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s);}
  function decode(s,max){if(!text(s,max)||!s.length||!/^[A-Za-z0-9+/]*={0,2}$/.test(s))fail();try{return Uint8Array.from(atob(s),c=>c.charCodeAt(0));}catch{fail();}}
  async function key(password,salt,usage){
    const material=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),{name:'PBKDF2'},false,['deriveKey']);
    return crypto.subtle.deriveKey({name:'PBKDF2',hash:'SHA-256',salt,iterations:ITERATIONS},material,{name:'AES-GCM',length:256},false,[usage]);
  }
  async function seal(payload,password){
    if(typeof password!=='string'||password.length<14||password.length>1024)throw new Error('Usa una frase de al menos 14 caracteres y guárdala: no podemos recuperarla.');
    const bytes=new TextEncoder().encode(JSON.stringify(validate(payload)));if(bytes.length>MAX_BYTES)throw new Error('El historial supera el tamaño máximo de la bóveda.');
    const salt=crypto.getRandomValues(new Uint8Array(16)),iv=crypto.getRandomValues(new Uint8Array(12));
    const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode('gastos-invisibles-vault-v1')},await key(password,salt,'encrypt'),bytes);
    return {format:'gastos-invisibles-vault',version:1,iterations:ITERATIONS,salt:base64(salt),iv:base64(iv),ciphertext:base64(new Uint8Array(encrypted))};
  }
  async function open(envelope,password){
    if(!plain(envelope)||dangerous(envelope)||envelope.format!=='gastos-invisibles-vault'||envelope.version!==1||envelope.iterations!==ITERATIONS||typeof password!=='string'||password.length>1024)fail();
    const salt=decode(envelope.salt,24),iv=decode(envelope.iv,16),bytes=decode(envelope.ciphertext,Math.ceil((MAX_BYTES+16)*4/3)+4);if(salt.length!==16||iv.length!==12||bytes.length<17||bytes.length>MAX_BYTES+16)fail();
    let result;
    try{const decrypted=await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode('gastos-invisibles-vault-v1')},await key(password,salt,'decrypt'),bytes);result=JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(decrypted));}
    catch{throw new Error('No se pudo abrir la bóveda: contraseña incorrecta o archivo dañado. Tu sesión no ha cambiado.');}
    return validate(result);
  }
  return {seal,open,validate,maxFileBytes:Math.ceil((MAX_BYTES+16)*4/3)+2048};
});
