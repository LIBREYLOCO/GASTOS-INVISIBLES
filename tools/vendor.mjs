import {cp,mkdir,readdir,readFile,writeFile,copyFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
const root=new URL('../',import.meta.url),out=new URL('../site/vendor/',import.meta.url);
const copies=[
 ['pdfjs-dist/build/pdf.min.mjs','pdfjs/pdf.mjs'],['pdfjs-dist/build/pdf.worker.min.mjs','pdfjs/pdf.worker.mjs'],
 ['pdfjs-dist/cmaps','pdfjs/cmaps'],['pdfjs-dist/standard_fonts','pdfjs/standard_fonts'],['pdfjs-dist/wasm','pdfjs/wasm'],['pdfjs-dist/LICENSE','pdfjs/LICENSE'],
 ['xlsx/dist/xlsx.full.min.js','xlsx/xlsx.full.min.js'],['xlsx/LICENSE','xlsx/LICENSE'],
 ['tesseract.js/dist/tesseract.min.js','tesseract/tesseract.min.js'],['tesseract.js/dist/worker.min.js','tesseract/worker.min.js'],['tesseract.js/LICENSE.md','tesseract/LICENSE.md'],
 ['tesseract.js-core/LICENSE','tesseract-core/LICENSE'],
 ...['','simd-','relaxedsimd-'].map(v=>[`tesseract.js-core/tesseract-core-${v}lstm.wasm.js`,`tesseract-core/tesseract-core-${v}lstm.wasm.js`]),
 ...['eng','spa'].map(lang=>[`@tesseract.js-data/${lang}/4.0.0/${lang}.traineddata.gz`,`languages/${lang}.traineddata.gz`])
];
await mkdir(out,{recursive:true});
for(const [source,target] of copies){const dest=new URL(target,out);await mkdir(new URL('./',dest),{recursive:true});await cp(new URL('node_modules/'+source,root),dest,{recursive:true});}
const hashes={};
async function inventory(dir,relative=''){for(const item of await readdir(dir,{withFileTypes:true})){const rel=path.posix.join(relative,item.name);if(item.isDirectory())await inventory(new URL(item.name+'/',dir),rel);else if(item.name!=='manifest.json')hashes[rel]=createHash('sha256').update(await readFile(new URL(item.name,dir))).digest('hex');}}
await inventory(out);
const versions={};for(const pkg of ['pdfjs-dist','xlsx','tesseract.js','tesseract.js-core','@tesseract.js-data/eng','@tesseract.js-data/spa'])versions[pkg]=JSON.parse(await readFile(new URL('node_modules/'+pkg+'/package.json',root),'utf8')).version;
await writeFile(new URL('manifest.json',out),JSON.stringify({versions,sha256:hashes},null,2)+'\n');
console.log(`Lectores locales preparados: ${Object.keys(hashes).length} archivos; versiones e integridad en vendor/manifest.json.`);
