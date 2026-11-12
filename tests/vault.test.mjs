import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);let vault;try{vault=require('../site/vault.js');}catch{}
const password='Ficticia exclusiva 2026';
const payload=()=>({version:1,transactions:[{date:'2026-01-05',description:'NETFLIX FICTICIO',amount:100,currency:'MXN',account:'Ficticia',source:'ficticio.csv'}],decisions:{},imports:[]});
test('bóveda cifra y recupera historial, sin texto bancario legible',async()=>{
 assert.equal(typeof vault?.seal,'function');const e=await vault.seal(payload(),password);assert.ok(!JSON.stringify(e).includes('NETFLIX'));const actual=await vault.open(e,password);assert.equal(actual.transactions[0].amount,100);assert.equal(actual.transactions[0].description,'NETFLIX FICTICIO');
});
test('misma contraseña produce ciphertext distinto cada vez',async()=>{
 assert.equal(typeof vault?.seal,'function');const a=await vault.seal(payload(),password),b=await vault.seal(payload(),password);assert.notEqual(a.salt,b.salt);assert.notEqual(a.iv,b.iv);assert.notEqual(a.ciphertext,b.ciphertext);
});
test('rechaza contraseña equivocada y ciphertext manipulado',async()=>{
 assert.equal(typeof vault?.seal,'function');const e=await vault.seal(payload(),password);await assert.rejects(vault.open(e,'Otra clave equivocada'));const altered={...e,ciphertext:(e.ciphertext[0]==='A'?'B':'A')+e.ciphertext.slice(1)};await assert.rejects(vault.open(altered,password));
});
test('rechaza clave corta, versión o parámetros de derivación no admitidos',async()=>{
 assert.equal(typeof vault?.seal,'function');await assert.rejects(vault.seal(payload(),'corta'));const e=await vault.seal(payload(),password);await assert.rejects(vault.open({...e,iterations:999999999},password));await assert.rejects(vault.open({...e,version:99},password));
});
test('valida los registros y rechaza prototipos, fechas falsas e importes no finitos',()=>{
 assert.equal(typeof vault?.validate,'function');const bad=payload();bad.transactions[0].date='2026-02-30';assert.throws(()=>vault.validate(bad));const inf=payload();inf.transactions[0].amount=Infinity;assert.throws(()=>vault.validate(inf));const proto=JSON.parse('{"version":1,"transactions":[],"decisions":{"__proto__":{"status":"canceled"}},"imports":[]}');assert.throws(()=>vault.validate(proto));
});
test('valida límites de tamaño y estados de seguimiento sin inventar cancelaciones',()=>{
 assert.equal(typeof vault?.validate,'function');const many=payload();many.transactions=Array(20001).fill(many.transactions[0]);assert.throws(()=>vault.validate(many));const p=payload();p.decisions.x={status:'canceled'};assert.throws(()=>vault.validate(p));p.decisions.x={status:'canceled',canceledAt:'2026-03-01'};assert.equal(vault.validate(p).decisions.x.status,'canceled');
});
