// Prueba de punta a punta del registro de visitas en un celular simulado (Playwright).
// Antes: cd docs && python3 -m http.server 8780      Uso: node pruebas/e2e-visitas.cjs
const { chromium } = require('playwright');
const fs = require('fs');
const OUT = require('os').tmpdir() + '/control-asistencia-e2e-visitas';
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

  // --- activar el módulo desde la bienvenida
  await page.fill('#b-organizacion', 'Museo de Prueba');
  await page.fill('#b-personas', 'Ana Pérez\nLuis Mora');
  ok(await page.isChecked('input[name=visitasActivo]'), 'la casilla de visitas viene marcada por defecto');
  await page.click('text=Empezar'); await esp(300);
  ok(await page.locator('nav >> text=Visitas').count() === 1, 'con el módulo encendido aparece la pestaña Visitas');
  await page.click('nav >> text=Visitas'); await esp(300);
  ok(await page.locator('text=Todavía no hay visitas hoy').count() === 1, 'pantalla de visitas vacía');

  const registrar = async ({ tipo, nombre, personas, edades, recorrido, hora, guia, otra, foto }) => {
    await page.click('text=+ Registrar visita'); await esp(250);
    if (tipo) await page.click(`label:has(input[name=tipoId]):has-text("${tipo}")`);
    await esp(150);
    if (nombre) await page.fill('#v-nombre', nombre);
    if (personas) await page.fill('#v-personas', String(personas));
    if (edades) { await page.click('summary:has-text("Detallar por edad")'); for (const [k, v] of Object.entries(edades)) await page.fill(`input[name="edad-${k}"]`, String(v)); }
    if (recorrido === 'nuevo') { await page.click('label:has-text("Nuevo recorrido")'); await esp(150); if (hora) await page.fill('#v-rhora', hora); if (guia) await page.selectOption('#v-rguia', { label: guia }); }
    if (recorrido && recorrido.startsWith('unir')) await page.click(`label:has-text("${recorrido.slice(5)}")`);
    if (foto) await page.screenshot({ path: `${OUT}/${foto}.png`, fullPage: true });
    await page.click(otra ? 'button:has-text("Guardar y registrar otra")' : 'form >> button:text-is("Guardar")'); await esp(300);
  };

  // --- primer grupo: institución con detalle por edad y recorrido nuevo con guía
  await page.click('text=+ Registrar visita'); await esp(250);
  await page.click('form >> button:text-is("Guardar")'); await esp(200);
  ok(await page.locator('#toast').textContent().then(t => /nombre/i.test(t)), 'no deja guardar sin nombre');
  await page.goBack(); await esp(200);
  await registrar({ nombre: 'Escuela Bolívar', edades: { ninos: 20, adultos: 5 }, recorrido: 'nuevo', hora: '10:30', guia: 'Ana Pérez', foto: 'formulario' });
  ok(await page.locator('text=Escuela Bolívar').count() === 1 && await page.locator('text=Recorrido 10:30').count() === 1, 'se guardó la institución dentro de un recorrido de las 10:30');
  ok(await page.locator('text=Guía: Ana Pérez').count() === 1, 'el guía sale en el recorrido');
  await page.screenshot({ path: `${OUT}/dia-1.png` });

  // --- segundo grupo: un medio que se une al mismo recorrido
  await registrar({ tipo: 'Medio', nombre: 'Canal Regional', personas: 3, recorrido: 'unir:Unir al recorrido de las 10:30' });
  ok(await page.locator('text=2 grupos · 28 personas').count() === 1, 'un recorrido con dos grupos: 28 personas');

  // --- particulares: "guardar y registrar otra"
  await registrar({ tipo: 'Particulares', personas: 6, otra: true });
  ok(await page.locator('text=Guardada. Registra la siguiente.').count() === 1 || await page.locator('h1:has-text("Registrar visita")').count() === 1, 'guardar y registrar otra deja el formulario nuevo');
  await page.fill('#v-personas', '2'); await page.click('form >> button:text-is("Guardar")'); await esp(300);
  const stats = await page.locator('main .grid.grid-cols-3 b').allTextContents();
  ok(stats.join(',') === '36,4,1', `totales del día: 36 personas, 4 grupos, 1 recorrido (salió ${stats.join(',')})`);
  await page.screenshot({ path: `${OUT}/dia-2.png`, fullPage: true });

  // --- editar y eliminar
  await page.locator('button:has-text("Canal Regional")').click(); await esp(250);
  await page.fill('#v-personas', '4'); await page.click('form >> button:text-is("Guardar")'); await esp(300);
  ok(await page.locator('text=2 grupos · 29 personas').count() === 1, 'editar una visita actualiza el recorrido (29 personas)');
  await page.locator('button:has-text("Particulares")').last().click(); await esp(250);
  await page.click('text=Eliminar esta visita'); await page.click('dialog >> text=Sí, eliminar'); await esp(300);
  const stats2 = await page.locator('main .grid.grid-cols-3 b').allTextContents();
  ok(stats2.join(',') === '35,3,1', `tras eliminar: 35 personas, 3 grupos (salió ${stats2.join(',')})`);

  // --- tipo nuevo a mano y nombres
  await page.click('[aria-label="Configurar visitas"]'); await esp(250);
  await page.click('text=+ Agregar >> nth=0');
  await page.fill('dialog input[name=nombre]', 'Empresa'); await page.click('dialog >> text=Agregar'); await esp(250);
  ok(await page.locator('text=Empresa').count() >= 1, 'se agregó el tipo "Empresa" a mano');
  await page.goto(BASE + '#/visitas'); await esp(200);
  await registrar({ tipo: 'Empresa', nombre: 'Mineras del Sur', personas: 12 });
  ok(await page.locator('text=Mineras del Sur').count() === 1, 'una visita del tipo nuevo');
  await registrar({ tipo: 'Institución', nombre: 'escuela bolivar', personas: 10 });   // mismo nombre escrito distinto
  await page.goto(BASE + '#/visitas/nombres'); await esp(250);
  ok(await page.locator('text=Escuela Bolívar').count() === 1, 'el mismo nombre escrito distinto no se duplica');
  await page.screenshot({ path: `${OUT}/nombres.png`, fullPage: true });
  await page.goto(BASE + '#/visitas/config'); await esp(250); await page.screenshot({ path: `${OUT}/config.png`, fullPage: true });

  // --- informes
  await page.goto(BASE + '#/visitas/semana'); await esp(300);
  ok(await page.locator('b.text-4xl').textContent() === '57', 'informe semanal: 57 personas');
  ok(await page.locator('text=quiénes nos visitaron').count() === 3, 'listas de instituciones, medios y empresas');
  ok(await page.locator('text=Mineras del Sur').count() === 1, 'la empresa aparece en el informe');
  await page.screenshot({ path: `${OUT}/semana.png`, fullPage: true });
  const [pdf] = await Promise.all([page.waitForEvent('download'), page.click('text=Descargar PDF')]);
  await pdf.saveAs(`${OUT}/visitas.pdf`);
  const bp = fs.readFileSync(`${OUT}/visitas.pdf`);
  ok(bp.slice(0, 5).toString() === '%PDF-' && /visitas-semana-2026-11-23\.pdf/.test(pdf.suggestedFilename()), `PDF de visitas (${bp.length} bytes): ${pdf.suggestedFilename()}`);
  const [xl] = await Promise.all([page.waitForEvent('download'), page.click('text=Descargar Excel')]);
  await xl.saveAs(`${OUT}/visitas.xlsx`);
  const bx = fs.readFileSync(`${OUT}/visitas.xlsx`);
  ok(bx.slice(0, 2).toString() === 'PK' && /visitas-semana-2026-11-23\.xlsx/.test(xl.suggestedFilename()), `Excel de visitas (${bx.length} bytes): ${xl.suggestedFilename()}`);
  await page.click('a:has-text("Mes")'); await esp(300);
  ok(await page.locator('h1:has-text("oviembre de 2026")').count() === 1 && await page.locator('b.text-4xl').textContent() === '57', 'informe mensual: 57 personas');
  await page.click('[aria-label="Mes anterior"]'); await esp(200);
  ok(await page.locator('text=No hay visitas registradas en este período').count() === 1, 'octubre sin visitas');

  // --- las horas del personal siguen y tienen Excel
  await page.goto(BASE + '#/semana'); await esp(300);
  const [xh] = await Promise.all([page.waitForEvent('download'), page.click('text=Descargar Excel')]);
  await xh.saveAs(`${OUT}/horas.xlsx`);
  ok(fs.readFileSync(`${OUT}/horas.xlsx`).slice(0, 2).toString() === 'PK', 'Excel de horas del personal');

  // --- persistencia y copia de seguridad
  await page.goto(BASE + '#/visitas'); await page.reload(); await page.waitForSelector('main'); await esp(300);
  ok(await page.locator('text=Mineras del Sur').count() === 1, 'las visitas siguen después de recargar');
  await page.goto(BASE + '#/mas'); await esp(250);
  const [cp] = await Promise.all([page.waitForEvent('download'), page.click('text=Guardar copia y enviarla')]);
  await cp.saveAs(`${OUT}/copia.json`);
  const copia = JSON.parse(fs.readFileSync(`${OUT}/copia.json`, 'utf8'));
  ok(copia.datos.visitas.registros.length === 5, 'la copia de seguridad incluye las visitas');

  // --- registrar visitas de un día que ya pasó (el formulario queda en ese día)
  await page.goto(BASE + '#/visitas'); await esp(250);
  await page.click('[aria-label="Día anterior"]'); await esp(250);
  ok(await page.locator('text=No hay visitas registradas este día').count() === 1, 'el día anterior está vacío');
  await page.click('text=+ Registrar visita'); await esp(250);
  ok(await page.locator('summary:has-text("Fecha y hora: 25/11/2026, 12:00")').count() === 1, 'el formulario queda en el día que se está viendo (25/11, 12:00)');
  await page.click('label:has(input[name=tipoId]):has-text("Particulares")'); await esp(150);
  await page.fill('#v-personas', '7'); await page.click('form >> button:text-is("Guardar")'); await esp(300);
  ok(await page.locator('main .grid.grid-cols-3 b').first().textContent() === '7', 'la visita quedó en el día pasado (7 personas)');
  await page.click('button:has-text("Ir a hoy")'); await esp(250);
  ok(await page.locator('main .grid.grid-cols-3 b').first().textContent() === '57', 'hoy no cambió (57 personas)');

  // --- apagar y volver a encender el módulo: lo registrado se conserva
  await page.goto(BASE + '#/ajustes'); await esp(250);
  await page.uncheck('input[name=visitasActivo]'); await page.click('text=Guardar ajustes'); await esp(300);
  ok(await page.locator('nav >> text=Visitas').count() === 0, 'apagado: desaparece la pestaña Visitas');
  await page.goto(BASE + '#/ajustes'); await esp(250);
  await page.check('input[name=visitasActivo]'); await page.click('text=Guardar ajustes'); await esp(300);
  await page.click('nav >> text=Visitas'); await esp(250);
  ok(await page.locator('text=Mineras del Sur').count() === 1, 'al encenderlo otra vez, las visitas siguen ahí');

  ok(errores.length === 0, 'sin errores en consola' + (errores.length ? ': ' + errores.join(' | ') : ''));
  await browser.close();
  console.log(fallos ? `\n${fallos} FALLOS` : '\nTODO BIEN');
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
