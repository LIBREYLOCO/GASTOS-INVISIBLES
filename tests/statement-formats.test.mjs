import {readFileSync} from 'node:fs';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
const source=readFileSync(new URL('../site/app.js',import.meta.url),'utf8');
const helpers=source.slice(source.indexOf('function numberValue('),source.indexOf('function merchantAndCategory('));
const start=source.indexOf('function parseBankStatement(');
const parser=start<0?'':source.slice(start,source.indexOf('async function readPdfScanned('));
const parse=vm.runInNewContext(helpers+parser+'; typeof parseBankStatement === "function" ? parseBankStatement : null');
const line=(text,parts=[])=>({text,parts,page:1});
function run(lines){assert.equal(typeof parse,'function','Missing statement format parser');return parse(lines,'ficticio.pdf');}

test('mes escrito: infiere año del período y separa cargos de créditos CR',()=>{
 const rows=run([
  line('Período de facturación Del 20 de junio al 19 de julio de 2026'),
  line('Fecha y Detalle de las operaciones Importe en MN'),
  line('25 de Junio SERVICIO FICTICIO 123.45'),
  line('2 de Julio PAGO FICTICIO 400.00 CR')
 ]);
 assert.equal(rows.length,2);assert.equal(rows[0].date,'2026-06-25');
 assert.equal(rows[0].description,'SERVICIO FICTICIO');assert.equal(rows[0].amount,-123.45);
 assert.equal(rows[1].amount,400);assert.equal(rows[1].date,'2026-07-02');
});
test('BBVA: usa la columna de cargo o abono y descarta ambos saldos',()=>{
 const headers=[{text:'CARGOS',x:373,width:36},{text:'ABONOS',x:430,width:35},{text:'OPERACION',x:478,width:49}];
 const row=(date,description,money)=>line(`${date} ${date} ${description} `+money.map(x=>x.text).join(' '),[{text:`${date} ${date} ${description}`,x:20,width:220},...money]);
 const rows=run([
  line('Periodo DEL 01/09/2026 AL 30/09/2026'),line('DESCRIPCION CARGOS ABONOS OPERACION LIQUIDACION',headers),
  row('03/SEP','SERVICIO FICTICIO',[{text:'150.00',x:386,width:30},{text:'1,850.00',x:492,width:35},{text:'1,850.00',x:564,width:35}]),
  row('04/SEP','ABONO FICTICIO',[{text:'900.00',x:440,width:33},{text:'2,750.00',x:492,width:35},{text:'2,750.00',x:564,width:35}])
 ]);
 assert.equal(rows.length,2);assert.equal(rows[0].date,'2026-09-03');assert.equal(rows[0].amount,-150);
 assert.equal(rows[0].description,'SERVICIO FICTICIO');assert.equal(rows[1].amount,900);
});
test('no inventa año ni acepta fechas fuera del período',()=>{
 assert.equal(run([line('Fecha y Detalle Importe'),line('12 de Julio FICTICIO 123.00')]).length,0);
 assert.equal(run([line('Período Del 20 de junio al 19 de julio de 2026'),line('Fecha y Detalle Importe'),line('12 de Marzo FICTICIO 123.00')]).length,0);
});
test('resuelve correctamente un período entre diciembre y enero',()=>{
 const rows=run([line('Periodo Del 20 de diciembre al 19 de enero de 2027'),line('Fecha y Detalle Importe'),line('25 de Diciembre FICTICIO 100.00'),line('2 de Enero FICTICIO 100.00')]);
 assert.equal(rows.length,2);assert.equal(rows[0].date,'2026-12-25');assert.equal(rows[1].date,'2027-01-02');
});
test('mes escrito: reconoce CR en la línea de continuación del importe',()=>{
 const rows=run([line('Periodo Del 20 de junio al 19 de julio de 2026'),
  line('Fecha y Detalle Importe',[{text:'Importe en MN',x:485,width:66}]),
  line('25 de Junio DEVOLUCION FICTICIA 123.45'),
  line('REFERENCIA FICTICIA CR',[{text:'CR',x:540,width:12}]),
  line('26 de Junio SERVICIO FICTICIO 80.00')]);
 assert.equal(rows.length,2);assert.equal(rows[0].amount,123.45);assert.equal(rows[1].amount,-80);
});
