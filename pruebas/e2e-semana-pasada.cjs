// Prueba de punta a punta: registrar o corregir una semana que ya pasó (celular simulado).
// Antes: cd docs && python3 -m http.server 8780      Uso: node pruebas/e2e-semana-pasada.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = require('os').tmpdir() + '/control-asistencia-e2e-semana';
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:8780/';
let fallos = 0;
const ok = (c, m) => { if (!c) { fallos++; console.log('FALLO:', m); } else console.log('ok   ', m); };
const esp = ms => new Promise(r => setTimeout(r, ms));

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'es-VE', timezoneId: 'America/Caracas', acceptDownloads: true });
  const page = await ctx.newPage();
  const capturar = page.screenshot.bind(page);
  page.screenshot = async o => { await page.evaluate(() => { const t = document.getElementById('toast'); if (t) t.hidden = true; }); return capturar(o); };
  const errores = [];
  page.on('pageerror', e => errores.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errores.push('console: ' + m.text()); });
  await page.clock.setFixedTime(new Date('2026-11-26T19:30:00Z')); // jueves 15:30 en Venezuela
  await page.goto(BASE); await page.waitForSelector('main');
  await page.evaluate(async () => { const m = await import('./js/ejemplo.js'); const st = m.datosEjemplo(); st.ajustes.bienvenida = true; st.tramos = []; localStorage.setItem('asistencia:v1', JSON.stringify(st)); });
  await page.reload(); await page.waitForSelector('main'); await esp(300);
  const toastTxt = () => page.locator('#toast').textContent();

  // --- ir a la semana del 9 al 15 de noviembre (no se llevó en la app) y abrir el editor
  await page.click('nav >> text=Semana'); await esp(250);
  await page.click('[aria-label="Semana anterior"]'); await page.click('[aria-label="Semana anterior"]'); await esp(250);
  ok(await page.locator('h1:has-text("9/11 al 15/11")').count() === 1, 'semana 9/11 al 15/11, sin horas');
  await page.click('text=Registrar o corregir las horas de esta semana'); await esp(300);
  ok(await page.locator('h2:has-text("09/11 al 15/11")').count() === 1, 'el editor abre en la misma semana');
  ok(await page.locator('text=Sin cambios todavía').count() === 1, 'empieza sin cambios');
  await page.screenshot({ path: `${OUT}/editor-vacio.png` });

  // --- llenar rápido con el horario del turno
  await page.click('text=Llenar la semana con el horario del turno'); await esp(300);
  ok(await toastTxt().then(t => /30 filas/.test(t)), 'llenar: 6 personas x 5 días con turno = 30 filas');
  ok(await page.locator('#ed-n').textContent().then(t => /30 filas editadas/.test(t)), 'el contador marca 30 filas editadas');
  await page.click('button:text-is("Por persona")'); await esp(250);
  await page.selectOption('#ed-persona', { label: 'Luis Mora' }); await esp(250);
  // martes: salida a las 17:00 y sábado: 09:00 a 13:00
  const celdas = page.locator('[data-celda]');
  await celdas.nth(1).locator('input[name=salida]').fill('17:00');
  await celdas.nth(5).locator('input[name=vino]').check(); await celdas.nth(5).locator('input[name=entrada]').fill('09:00'); await celdas.nth(5).locator('input[name=salida]').fill('13:00');
  await page.screenshot({ path: `${OUT}/editor-persona.png`, fullPage: true });
  await page.click('button:text-is("Guardar semana")'); await esp(400);
  ok(await toastTxt().then(t => /Semana guardada \(31 cambios\)/.test(t)), 'se guardó la semana (31 cambios)');
  await page.click('text=Resumen semanal'); await esp(300);
  const equipo = async () => page.locator('div.bg-slate-900 b').first().textContent();
  ok(await equipo() === '215 h', `total del equipo de esa semana: 215 h (6 x 35 + 1 de extra + 4 del sábado) -> salió ${await equipo()}`);
  ok(await page.locator('article', { hasText: 'Luis Mora' }).locator('text=40 h').count() >= 1, 'Luis: 35 h + 1 h de extra + 4 h del sábado = 40 h');
  await page.screenshot({ path: `${OUT}/semana-llena.png` });

  // --- corregir un error: la salida de Ana el miércoles, y quitar un día
  await page.click('text=Registrar o corregir las horas de esta semana'); await esp(250);
  ok(await page.locator('text=Sin cambios todavía').count() === 1, 'al volver al editor no quedan cambios viejos');
  await page.click('button:text-is("Por persona")'); await esp(200);
  await page.selectOption('#ed-persona', { label: 'Ana Pérez' }); await esp(250);
  const ana = page.locator('[data-celda]');
  ok(await ana.nth(2).locator('input[name=salida]').inputValue() === '16:00', 'se ve lo que ya estaba guardado (Ana, miércoles 09:00 a 16:00)');
  await ana.nth(2).locator('input[name=salida]').fill('15:00');
  await ana.nth(4).locator('input[name=vino]').uncheck();
  await page.click('button:text-is("Guardar semana")'); await esp(400);
  ok(await toastTxt().then(t => /2 cambios/.test(t)), 'corrección guardada (2 cambios)');

  // --- errores: no se guarda nada a medias
  await page.selectOption('#ed-persona', { label: 'José Silva' }); await esp(250);
  const jose = page.locator('[data-celda]');
  await jose.nth(0).locator('input[name=entrada]').fill('16:00'); await jose.nth(0).locator('input[name=salida]').fill('09:00');
  await jose.nth(1).locator('input[name=salida]').fill('15:00');
  await page.click('button:text-is("Guardar semana")'); await esp(300);
  ok(await page.locator('text=anterior a la entrada').count() >= 1, 'la fila con la salida antes de la entrada se marca en rojo');
  await page.click('button:text-is("Por día")'); await esp(200);
  await page.click('button:text-is("Descartar")'); await page.click('dialog >> text=Sí, descartar'); await esp(300);
  ok(await page.locator('text=Sin cambios todavía').count() === 1, 'descartar deja todo como estaba');

  // --- varios tramos: se manda al corrector del día
  await page.goto(BASE + '#/hoy'); await esp(250);
  await page.evaluate(() => { const st = JSON.parse(localStorage.getItem('asistencia:v1')); const ana = st.empleados.find(e => e.nombre === 'Ana Pérez').id; st.tramos.push({ id: 9001, empId: ana, fecha: '2026-11-10', entrada: 480, salida: 660 }, { id: 9002, empId: ana, fecha: '2026-11-10', entrada: 840, salida: 960 }); localStorage.setItem('asistencia:v1', JSON.stringify(st)); });
  await page.reload(); await page.waitForSelector('main'); await page.goto(BASE + '#/semana'); await esp(250);
  await page.click('[aria-label="Semana anterior"]'); await page.click('[aria-label="Semana anterior"]'); await page.click('text=Registrar o corregir las horas de esta semana'); await esp(250);
  await page.click('button[data-a="ed-dia"][data-f="2026-11-10"]'); await esp(250);
  ok(await page.locator('a:has-text("Corregir el día")').count() === 1, 'quien tiene varios tramos ese día muestra "Corregir el día"');

  // --- semana ya entregada: pide motivo y deja la diferencia
  await page.click('text=Resumen semanal'); await esp(250);
  await page.click('text=Cerrar semana'); await page.click('dialog >> text=Cerrar semana'); await esp(300);
  await page.click('text=Registrar o corregir las horas de esta semana'); await esp(250);
  ok(await page.locator('text=Esta semana ya fue entregada').count() === 1 && await page.locator('#ed-motivo').count() === 1, 'una semana entregada pide motivo en el editor');
  await page.click('button:text-is("Por persona")'); await esp(200);
  await page.selectOption('#ed-persona', { label: 'Carlos Díaz' }); await esp(250);
  await page.locator('[data-celda]').nth(0).locator('input[name=salida]').fill('17:00');
  await page.click('button:text-is("Guardar semana")'); await esp(300);
  ok(await toastTxt().then(t => /motivo/i.test(t)), 'sin motivo no guarda');
  await page.fill('#ed-motivo', 'el jefe pidió corregir la hora de salida');
  await page.click('button:text-is("Guardar semana")'); await esp(400);
  ok(await toastTxt().then(t => /1 cambio/.test(t)), 'con motivo guarda');
  await page.click('text=Resumen semanal'); await esp(300);
  ok(await page.locator('text=Carlos Díaz: 1 h más que lo entregado').count() === 1, 'la semana muestra la diferencia contra lo entregado (+1 h)');
  ok(await page.locator('text=el jefe pidió corregir la hora de salida').count() === 1, 'y el motivo queda anotado');
  await page.screenshot({ path: `${OUT}/semana-entregada.png`, fullPage: false });

  // --- "Al final del día" en Hoy también pide motivo si la semana ya fue entregada
  await page.goto(BASE + '#/hoy'); await esp(250);
  await page.click('button:has-text("Al final del día")'); await esp(200);
  for (let i = 0; i < 12; i++) await page.click('[aria-label="Día anterior"]');
  await esp(250);
  ok(await page.locator('text=Esa semana ya fue entregada').count() === 1 && await page.locator('input[name=motivo]').count() === 1, 'al final del día: una semana entregada también pide motivo');
  ok(errores.length === 0, 'sin errores en consola' + (errores.length ? ': ' + errores.join(' | ') : ''));
  await browser.close();
  console.log(fallos ? `\n${fallos} FALLOS` : '\nTODO BIEN');
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
