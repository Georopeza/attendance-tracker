// Carga la biblioteca de Excel como la vería un navegador (sin `require`), para poder probar los informes en Node.
import vm from 'node:vm';
import fs from 'node:fs';

export function cargarXLSX() {
  const codigo = fs.readFileSync(new URL('../docs/vendor/xlsx.min.js', import.meta.url), 'utf8');
  const ctx = vm.createContext({ TextEncoder, TextDecoder, Uint8Array, ArrayBuffer, console, setTimeout, Buffer: undefined });
  vm.runInContext(codigo, ctx);
  return ctx.XLSX;
}
