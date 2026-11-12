import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import vm from 'node:vm';

const code=readFileSync(new URL('../site/app.js', import.meta.url),'utf8');
const helpers=code.slice(code.indexOf('function numberValue('),code.indexOf('function merchantAndCategory('));
const parser=code.slice(code.indexOf('function parseOcrLines('),code.indexOf('async function readPdfScanned('));
const extract=vm.runInNewContext(helpers+parser+'; parseOcrLines');

test('OCR: fechas, cargos positivos y coma decimal',()=>{
  const rows=extract('ESTADO DE CUENTA\nFECHA DESCRIPCION CARGO\n01/08/2026 NETFLIX 13,99\n01/09/2026 NETFLIX 13,99\n01/10/2026 NETFLIX 13,99','ficticio.pdf');
  assert.equal(rows.length,3);
  assert.equal(rows[0].date,'2026-08-01');
  assert.equal(rows[0].amount,13.99);
  assert.equal(rows[0].description,'NETFLIX');
  assert.equal(rows[0].cargoColumn,true);
});

test('OCR: rechaza líneas sin movimientos bancarios',()=>{
  const rows=extract('BANCO FICTICIO\nSALDO INICIAL 1250,00\nPÁGINA 1 DE 2','ficticio.pdf');
  assert.equal(rows.length,0);
});

test('OCR: lee importes con separadores de miles',()=>{
  const rows=extract('FECHA CONCEPTO CARGO\n12/09/2026 SEGURO ANUAL 1.234,56','ficticio.pdf');
  assert.equal(rows.length,1);
  assert.equal(rows[0].amount,1234.56);
});
