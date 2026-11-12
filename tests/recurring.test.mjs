import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
let engine;try{engine=require('../site/recurring.js');}catch{}
const tx=(date,description='NETFLIX.COM',amount=100,account='Tarjeta ficticia',currency='MXN',source='ficticio.csv')=>({date,description,amount,account,currency,source});
const analyze=(rows,decisions={})=>{assert.equal(typeof engine?.analyze,'function');return engine.analyze(rows,decisions);};

test('agrupa alias de un proveedor y explica tres cobros mensuales',()=>{
 const [r]=analyze([tx('2026-01-05','NETFLIX.COM 12345'),tx('2026-02-06','NETFLIX INTL 98765'),tx('2026-03-05','NETFLIX.COM')]);
 assert.equal(r.name,'Netflix');assert.equal(r.frequency,'Mensual');assert.equal(r.kind,'Suscripción');assert.equal(r.confidence,'Alta');assert.equal(r.items.length,3);assert.equal(r.monthly,100);assert.equal(r.yearly,1200);assert.equal(r.nextDate,'2026-04-05');assert.ok(r.reasons.length>0);
});
test('fin de mes y un mes sin extracto conservan una cadencia mensual',()=>{
 const [r]=analyze([tx('2026-01-31'),tx('2026-02-28'),tx('2026-03-31'),tx('2026-05-31')]);
 assert.equal(r.frequency,'Mensual');assert.equal(r.nextDate,'2026-06-30');assert.equal(r.items.length,4);
});
test('un cargo conocido se muestra como candidato y no entra en el coste recurrente',()=>{
 const [r]=analyze([tx('2026-01-05')]);assert.equal(r.confidence,'Por confirmar');assert.equal(r.yearly,0);assert.equal(r.nextDate,null);
});
test('compras repetidas y cargos irregulares no se convierten en suscripciones',()=>{
 const rows=[...['2026-01-05','2026-02-05','2026-03-05'].map(d=>tx(d,'SUPERMERCADO FICTICIO',200)),tx('2026-01-01','TIENDA SIN PLAN',100),tx('2026-01-04','TIENDA SIN PLAN',770),tx('2026-03-20','TIENDA SIN PLAN',25)];
 assert.equal(analyze(rows).length,0);
});
test('servicios y seguros se distinguen de suscripciones',()=>{
 const rows=['2026-01-05','2026-02-05','2026-03-05'].flatMap(d=>[tx(d,'CFE SERVICIO',300),tx(d,'AXA SEGURO',600)]);
 const rr=analyze(rows);assert.equal(rr.find(x=>x.name==='CFE').kind,'Servicio');assert.equal(rr.find(x=>x.name==='AXA').kind,'Seguro');
});
test('no mezcla cuentas ni monedas',()=>{
 const rows=['2026-01-05','2026-02-05','2026-03-05'].flatMap(d=>[tx(d),tx(d,'NETFLIX',12,'Otra tarjeta','EUR')]);
 const rr=analyze(rows);assert.equal(rr.length,2);assert.equal(rr.find(x=>x.currency==='EUR').monthly,12);assert.equal(rr.find(x=>x.currency==='MXN').monthly,100);
});
test('intermediario con dos precios simultáneos conserva dos series por identificar',()=>{
 const rows=['2026-01-05','2026-02-05','2026-03-05'].flatMap(d=>[tx(d,'APPLE.COM/BILL',50),tx(d,'APPLE.COM/BILL',200)]);
 const rr=analyze(rows);assert.equal(rr.length,2);assert.ok(rr.every(x=>x.name.includes('Apple')));assert.deepEqual(rr.map(x=>x.typical).sort((a,b)=>a-b),[50,200]);assert.ok(rr.every(x=>x.kind==='Por identificar'));
});
test('detecta subida y usa el último precio observado en la proyección',()=>{
 const [r]=analyze([tx('2026-01-05'),tx('2026-02-05'),tx('2026-03-05','NETFLIX',120)]);assert.equal(r.priceChange.from,100);assert.equal(r.priceChange.to,120);assert.equal(r.monthly,120);assert.equal(r.yearly,1440);
});
test('un nuevo cobro posterior a la baja genera alerta y nunca ahorro realizado',()=>{
 const rows=[tx('2026-01-05'),tx('2026-02-05'),tx('2026-03-05')];const [base]=analyze(rows);
 const [r]=analyze(rows,{[base.id]:{status:'canceled',canceledAt:'2026-02-10'}});
 assert.equal(r.chargedAfterCancellation,true);assert.equal(r.status,'canceled');assert.equal(r.realizedSavings,0);
});
test('un proveedor descartado conserva evidencia pero deja de ser coste activo',()=>{
 const rows=[tx('2026-01-05'),tx('2026-02-05'),tx('2026-03-05')];const [base]=analyze(rows);const [r]=analyze(rows,{[base.id]:{status:'not-recurring'}});assert.equal(r.status,'not-recurring');assert.equal(r.active,false);assert.equal(r.items.length,3);
});
test('excluye ingresos, devoluciones y fechas o importes inválidos',()=>{
 assert.equal(analyze([tx('2026-01-05','ABONO NOMINA'),tx('2026-02-05','ABONO NOMINA'),tx('2026-03-05','ABONO NOMINA'),tx('2026-02-30'),tx('2026-01-01','NETFLIX',NaN),tx('2026-01-01','NETFLIX',-10)]).length,0);
});
test('reimportación conserva dos cargos iguales legítimos, sin duplicarlos al cargar otro extracto',()=>{
 assert.equal(typeof engine?.mergeTransactions,'function');const batch=[tx('2026-01-05'),tx('2026-01-05')];
 const first=engine.mergeTransactions([],batch);assert.equal(first.added,2);assert.equal(first.transactions.length,2);
 const again=engine.mergeTransactions(first.transactions,batch.map(r=>({...r,source:'solapado.csv'})));assert.equal(again.added,0);assert.equal(again.duplicates,2);assert.equal(again.transactions.length,2);
});
test('mismo cobro en otra cuenta o moneda sigue siendo distinto',()=>{
 assert.equal(typeof engine?.mergeTransactions,'function');const result=engine.mergeTransactions([],[tx('2026-01-05'),tx('2026-01-05','NETFLIX.COM',100,'Otra'),tx('2026-01-05','NETFLIX.COM',100,'Tarjeta ficticia','EUR')]);assert.equal(result.added,3);
});
