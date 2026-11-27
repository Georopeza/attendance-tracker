// Comprueba que en una tablet las tarjetas van en cuadrícula y los botones no se ven enormes.
// Antes: cd docs && python3 -m http.server 8780      Uso: node pruebas/e2e-tablet.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = require('os').tmpdir() + '/control-asistencia-e2e-tablet';
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:8780/';
let fallos = 0;
const ok = (c, m) => { if (!c) { fallos++; console.log('FALLO:', m); } else console.log('ok   ', m); };
const esp = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch();
  for (const [nombre, ancho, alto, columnas] of [['ipad-vertical', 820, 1180, 2], ['android-horizontal', 1280, 800, 3], ['telefono', 390, 844, 1]]) {
    const ctx = await browser.newContext({ viewport: { width: ancho, height: alto }, deviceScaleFactor: 1.5, locale: 'es-VE', timezoneId: 'America/Caracas', hasTouch: true });
    const page = await ctx.newPage();
    await page.clock.setFixedTime(new Date('2026-11-26T19:30:00Z'));
    await page.goto(BASE); await page.waitForSelector('main');
    await page.evaluate(async () => { const m = await import('./js/ejemplo.js'); localStorage.setItem('asistencia:v1', JSON.stringify(m.datosEjemplo())); });
    await page.reload(); await page.waitForSelector('article'); await esp(300);
    const cajas = await page.locator('article').evaluateAll(es => es.map(e => { const r = e.getBoundingClientRect(); return { x: Math.round(r.x), w: Math.round(r.width) }; }));
    const columnasReales = new Set(cajas.map(c => c.x)).size;
    ok(columnasReales === columnas, `${nombre}: ${columnas} columna(s) de tarjetas (hay ${columnasReales})`);
    const alturaBoton = await page.locator('article button', { hasText: /^Entró$/ }).first().evaluate(b => Math.round(b.getBoundingClientRect().height));
    ok(nombre === 'telefono' ? alturaBoton >= 54 : alturaBoton <= 50, `${nombre}: botón "Entró" de ${alturaBoton}px de alto`);
    ok(cajas.every(c => c.w <= (nombre === 'telefono' ? 400 : 440)), `${nombre}: ninguna tarjeta pasa de ${Math.max(...cajas.map(c => c.w))}px de ancho`);
    await page.screenshot({ path: `${OUT}/${nombre}-hoy.png` });
    await page.click('text=Elegir personas…'); await esp(250);
    await page.screenshot({ path: `${OUT}/${nombre}-elegir.png` });
    await ctx.close();
  }
  await browser.close();
  console.log(fallos ? `\n${fallos} FALLOS` : '\nTODO BIEN');
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
