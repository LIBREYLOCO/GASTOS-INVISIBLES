import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';
import { test } from 'node:test';

const config = readFileSync(new URL('../netlify.toml', import.meta.url), 'utf8');
const policy = config.match(/Content-Security-Policy = "([^"]+)"/)[1];
const directives = new Map(policy.split(';').map(part => {
  const [name, ...sources] = part.trim().split(/\s+/);
  return [name, sources];
}));

test('OCR engine can compile WebAssembly without enabling JavaScript eval', () => {
  const script = directives.get('script-src');
  assert.ok(script.includes("'wasm-unsafe-eval'"), 'OCR requires WebAssembly compilation');
  assert.ok(!script.includes("'unsafe-eval'"), 'JavaScript eval must stay blocked');
  assert.ok(!script.includes("'unsafe-inline'"), 'Inline scripts must stay blocked');
  assert.ok(!script.includes('data:'), 'Data URLs must not become executable scripts');
});

test('OCR can read its embedded WASM bytes without opening arbitrary network hosts', () => {
  const connect = directives.get('connect-src');
  assert.ok(connect.includes('data:'), 'Tesseract fetches its embedded WASM from a data URL');
  assert.ok(!connect.includes('*'), 'Do not open arbitrary external connections');
  assert.deepEqual(connect.filter(value => value.startsWith('https:')), []);
});
