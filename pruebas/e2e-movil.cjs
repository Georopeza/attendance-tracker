// Prueba de punta a punta en un celular simulado (Playwright). Antes: cd docs && python3 -m http.server 8780
// Uso: node pruebas/e2e-movil.cjs   (requiere: npm i playwright)
const { chromium, devices } = require('playwright');
const fs = require('fs');
const OUT = require('os').tmpdir() + '/control-asistencia-e2e';
fs.mkdirSync(OUT, { recursive: true });
const BASE = 'http://127.0.0.1:8780/';
let fallos = 0;
const ok = (c, m) => { if (!c) { fallos++; console.log('FALLO:', m); } else console.log('ok   ', m); };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: 'es-VE', timezoneId: 'America/Caracas', acceptDownloads: true });
  const page = await ctx.newPage();
  // Las capturas salen sin el aviso temporal (toast) encima.
  const capturar = page.screenshot.bind(page);
  page.screenshot = async o => { await page.evaluate(() => { const t = document.getElementById('toast'); if (t) t.hidden = true; }); return capturar(o); };
  const errores = [];
  page.on('pageerror', e => errores.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') errores.push('console: ' + m.text()); });
  await page.clock.setFixedTime(new Date('2026-11-26T19:30:00Z')); // jueves 15:30 en Venezuela
  await page.goto(BASE);
  await page.waitForSelector('main');

  await page.waitForTimeout(250); ok(await page.locator('text=Te damos la bienvenida').count() === 1, 'primer uso: pantalla de bienvenida');
  await page.screenshot({ path: `${OUT}/bienvenida.png`, fullPage: true });
  await page.fill('#b-organizacion', 'Taller San José');
  await page.fill('#b-descripcion', 'Asistencia del personal del taller');
  await page.fill('#b-personas', 'Ana Pérez\nLuis Mora');
  await page.click('text=Empezar');
  await page.waitForTimeout(250); ok(await page.locator('article').count() === 2, 'la bienvenida agrega las personas escritas');
  ok(await page.locator('header >> text=Taller San José').count() === 1 && await page.locator('header >> text=Asistencia del personal del taller').count() === 1, 'nombre y descripción aparecen arriba');
  await page.screenshot({ path: `${OUT}/vacio.png` });

  // Datos de ejemplo
  await page.click('nav >> text=Más');
  await page.waitForTimeout(250); ok(await page.locator('text=Cargar datos de ejemplo').count() === 0, 'la app ya no ofrece datos de ejemplo');
  // Los datos de ejemplo solo se usan en las pruebas: se cargan directo en el almacenamiento.
  await page.evaluate(async () => { const m = await import('./js/ejemplo.js'); localStorage.setItem('asistencia:v1', JSON.stringify(m.datosEjemplo())); });
  await page.reload(); await page.waitForSelector('main');
  await page.click('nav >> text=Hoy');
  await page.waitForTimeout(250); ok(await page.locator('article').count() === 6, 'seis tarjetas de personas');

  // Marcar en el momento
  const carlos = page.locator('article', { hasText: 'Carlos Díaz' });
  await carlos.locator('button', { hasText: 'Entró' }).click();
  await page.waitForTimeout(250); ok(await carlos.locator('text=Presente desde 15:30').count() === 1, 'Entró marca la hora actual (15:30)');
  await page.waitForTimeout(250); ok(await carlos.locator('button', { hasText: 'Salió' }).count() === 1, 'el botón cambia a Salió');
  await page.screenshot({ path: `${OUT}/hoy-momento.png` });
  await carlos.locator('summary').click();
  await carlos.locator('button', { hasText: 'Deshacer' }).click();
  await page.waitForTimeout(250); ok(await page.locator('article', { hasText: 'Carlos Díaz' }).locator('text=Sin llegar').count() === 1, 'deshacer vuelve a Sin llegar');
  await page.screenshot({ path: `${OUT}/hoy-detalle.png` });

  // Marcar a otra hora (entrada olvidada)
  await carlos.locator('button', { hasText: 'Marcar hora de entrada' }).click();
  await page.fill('dialog input[type=time]', '14:00');
  await page.click('dialog >> text=Marcar');
  await page.waitForTimeout(250); ok(await page.locator('article', { hasText: 'Carlos Díaz' }).locator('text=Presente desde 14:00').count() === 1, 'marcar la hora de entrada a otra hora (14:00)');
  await page.locator('article', { hasText: 'Carlos Díaz' }).locator('button', { hasText: 'Marcar hora de salida' }).click();
  await page.fill('dialog input[type=time]', '15:45');
  await page.click('dialog >> text=Marcar');
  await page.waitForTimeout(250); ok(await page.locator('#toast').textContent().then(t => /todavía no ha llegado/.test(t)), 'no acepta una hora futura (son las 15:30)');
  const detalle = page.locator('article', { hasText: 'Carlos Díaz' }).locator('details');
  if (!(await detalle.evaluate(d => d.open))) await detalle.locator('summary').click();
  await page.locator('article', { hasText: 'Carlos Díaz' }).locator('button', { hasText: 'Deshacer' }).click();
  await page.waitForTimeout(250); ok(await page.locator('article', { hasText: 'Carlos Díaz' }).locator('text=Sin llegar').count() === 1, 'se deshace la marca manual');
  // Bloque
  await page.click('text=Todos los que faltan entraron');
  await page.waitForTimeout(250); ok(await page.locator('text=Sin llegar').count() === 0, 'todos entraron en bloque');

  // Al final del día
  await page.click('button:has-text("Al final del día")');
  await page.waitForTimeout(250); ok(await page.locator('input[type=checkbox][name^="vino-"]').count() === 6, 'lista con casillas para los 6');
  await page.screenshot({ path: `${OUT}/hoy-dia.png` });
  await page.click('text=Nadie');
  await page.click('text=Guardar el día');
  await page.waitForTimeout(200);
  await page.click('button:has-text("En el momento")');
  await page.waitForTimeout(250); ok(await page.locator('text=Sin llegar').count() === 6, 'guardar con Nadie deja a todos sin asistencia');

  // Día anterior en la lista final: horas del turno ya puestas
  await page.click('button:has-text("Al final del día")');
  await page.click('[aria-label="Día anterior"]');
  await page.waitForTimeout(250); ok(await page.locator('input[name^="entrada-"]').first().inputValue() !== '', 'horario del turno precargado en un día anterior');
  await page.click('text=Todos vinieron');
  await page.click('text=Guardar el día');
  ok((await page.locator('#toast').textContent()).includes('Día guardado'), 'guardar un día pasado');
  await page.click('text=Ir a hoy');

  // Semana anterior, desglose y PDF
  await page.click('nav >> text=Semana');
  await page.click('[aria-label="Semana anterior"]');
  await page.waitForTimeout(250); ok(await page.locator('text=Total del equipo').count() === 1, 'resumen semanal');
  const luis = page.locator('article', { hasText: 'Luis Mora' });
  await page.waitForTimeout(250); ok(await luis.locator('text=39 h 38 min').count() === 1, 'Luis suma 39 h 38 min en la semana anterior');
  await page.waitForTimeout(250); ok(await luis.locator('text=1 por revisar').count() === 1, 'Luis tiene un día por revisar');
  await page.screenshot({ path: `${OUT}/semana.png`, fullPage: false });
  await luis.locator('text=Ver semana día por día').click();
  await page.waitForTimeout(250); ok(await page.locator('text=Suma de los días').count() === 1, 'desglose por día');
  await page.waitForTimeout(250); ok(await page.locator('text=39 h 38 min').count() >= 1, 'la suma del desglose es 39 h 38 min');
  await page.screenshot({ path: `${OUT}/desglose.png`, fullPage: true });
  await page.goBack();
  const [descarga] = await Promise.all([page.waitForEvent('download'), page.click('text=Descargar PDF')]);
  const ruta = `${OUT}/semana.pdf`; await descarga.saveAs(ruta);
  const pdf = fs.readFileSync(ruta);
  ok(pdf.slice(0, 5).toString() === '%PDF-' && pdf.length > 3000, `PDF generado (${pdf.length} bytes) con nombre ${descarga.suggestedFilename()}`);

  // Resumen del mes
  await page.goto(BASE + '#/mes'); await page.waitForTimeout(300);
  ok(await page.locator('h1', { hasText: 'noviembre de 2026' }).count() === 1, 'resumen mensual de noviembre');
  ok(await page.locator('text=Total del equipo').locator('xpath=..').locator('text=251 h 38 min').count() === 1, 'el mes suma las semanas (153 h 38 min + 98 h de esta semana = 251 h 38 min)');
  await page.screenshot({ path: `${OUT}/mes.png`, fullPage: false });
  await page.click('[aria-label="Mes anterior"]');
  ok(await page.locator('text=Total del equipo').locator('xpath=..').locator('text=0 h').count() === 1, 'octubre sin horas: 0 h');
  await page.click('[aria-label="Mes siguiente"]');
  await page.locator('article', { hasText: 'Luis Mora' }).locator('text=Ver el mes semana por semana').click();
  await page.waitForTimeout(300); ok(await page.locator('text=Semana 16/11 al 22/11').count() === 1 && await page.locator('text=Semana 1/11 al 1/11').count() === 0, 'el mes por semanas muestra solo las semanas con asistencia');
  await page.screenshot({ path: `${OUT}/mes-persona.png`, fullPage: true });
  await page.goBack();
  const [dm] = await Promise.all([page.waitForEvent('download'), page.click('text=Descargar PDF')]);
  await dm.saveAs(`${OUT}/mes.pdf`);
  const pm = fs.readFileSync(`${OUT}/mes.pdf`);
  ok(pm.slice(0, 5).toString() === '%PDF-' && /horas-mes-2026-11\.pdf/.test(dm.suggestedFilename()), `PDF mensual generado (${pm.length} bytes) con nombre ${dm.suggestedFilename()}`);
  await page.goto(BASE + '#/semana'); await page.waitForTimeout(250);

  // Cerrar semana, corregir y ver la diferencia
  await page.click('text=Cerrar semana');
  await page.click('dialog >> text=Cerrar semana');
  await page.waitForTimeout(250); ok(await page.locator('text=Semana entregada').count() === 1, 'semana cerrada');
  await page.locator('article', { hasText: 'Luis Mora' }).locator('text=Ver semana día por día').click();
  await page.locator('a:has-text("Corregir")').nth(1).click();   // martes 17
  await page.fill('input[name^="salida-"]', '17:10');
  await page.waitForTimeout(250); ok(await page.locator('input[name=motivo]').getAttribute('required') !== null, 'en semana cerrada el motivo es obligatorio');
  await page.fill('input[name=motivo]', 'olvidó marcar la salida');
  await page.click('text=Guardar corrección');
  await page.waitForTimeout(300);
  await page.goto(BASE + '#/semana');
  await page.waitForTimeout(250); ok(await page.locator('text=22 min más que lo entregado').count() >= 1, 'muestra la diferencia contra lo entregado (22 min más: 8 h 08 min se redondea a 8 h)');
  await page.screenshot({ path: `${OUT}/semana-cerrada.png` });

  // Sugerencia
  await page.goto(BASE + '#/sugerencia');
  await page.waitForTimeout(250); ok(await page.locator('text=¿Quién debería venir?').count() === 1, 'pantalla de sugerencia');
  await page.locator('button:has-text("Sin avisar")').first().click();
  await page.waitForTimeout(250); ok(await page.locator('button:has-text("Avisado")').count() === 1, 'anotar a quién se avisó');
  await page.screenshot({ path: `${OUT}/sugerencia.png` });

  // Empleados: agregar, archivar, eliminar
  await page.goto(BASE + '#/empleados');
  await page.click('text=Agregar persona');
  await page.fill('dialog input[name=nombre]', 'Pedro Prueba');
  await page.click('dialog >> text=Agregar');
  await page.waitForTimeout(250); ok(await page.locator('text=Pedro Prueba').count() === 1, 'persona agregada');
  const pedro = page.locator('div.rounded-2xl', { hasText: 'Pedro Prueba' }).first();
  await pedro.locator('button:has-text("Eliminar")').click();
  await page.click('dialog >> text=Sí, eliminar');
  await page.waitForTimeout(250); ok(await page.locator('text=Pedro Prueba').count() === 0, 'persona sin horas eliminada');
  await page.screenshot({ path: `${OUT}/empleados.png` });

  // Turnos y disponibilidad
  await page.goto(BASE + '#/turnos');
  await page.waitForTimeout(250); ok(await page.locator('text=Calendario semanal').count() === 1, 'pantalla de turnos');
  await page.screenshot({ path: `${OUT}/turnos.png`, fullPage: true });
  await page.goto(BASE + '#/disponibilidad');
  await page.screenshot({ path: `${OUT}/disponibilidad.png`, fullPage: true });
  await page.locator('a:has-text("María Rojas")').click();
  await page.waitForTimeout(250); ok(await page.locator('text=09:00–12:00').count() === 1 && await page.locator('text=14:00–16:00').count() === 1, 'ficha con dos franjas el miércoles');
  await page.screenshot({ path: `${OUT}/ficha.png`, fullPage: true });

  // Persistencia y sin internet
  await page.goto(BASE + '#/hoy');
  await page.reload(); await page.waitForSelector('article');
  await page.waitForTimeout(250); ok(await page.locator('article').count() === 6, 'los datos siguen después de recargar');
  await page.waitForTimeout(800);
  const sw = await page.evaluate(async () => { const r = await navigator.serviceWorker.getRegistration(); return !!(r && (r.active || r.installing || r.waiting)); });
  ok(sw, 'service worker registrado');
  await ctx.setOffline(true);
  await page.reload(); await page.waitForSelector('article');
  await page.waitForTimeout(250); ok(await page.locator('article').count() === 6, 'abre y funciona sin internet');
  await ctx.setOffline(false);

  // Copia de seguridad
  await page.goto(BASE + '#/mas');
  const [d2] = await Promise.all([page.waitForEvent('download'), page.click('text=Guardar copia y enviarla')]);
  await d2.saveAs(`${OUT}/copia.json`);
  const copia = JSON.parse(fs.readFileSync(`${OUT}/copia.json`, 'utf8'));
  ok(copia.app === 'control-asistencia' && copia.datos.empleados.length === 6, 'copia de seguridad descargable');
  await page.screenshot({ path: `${OUT}/mas.png`, fullPage: true });

  // Ajustes: nombre de la organización y zona horaria
  await page.goto(BASE + '#/ajustes');
  await page.fill('#aj-org', 'Mi grupo');
  await page.selectOption('#aj-zona', 'America/Bogota');
  await page.click('text=Guardar ajustes');
  await page.waitForTimeout(250); ok(await page.locator('header >> text=Mi grupo').count() === 1, 'el nombre elegido aparece en el encabezado');
  await page.waitForTimeout(100); ok(await page.locator('text=14:30').count() >= 1, 'con la zona de Bogotá la hora de ahora es 14:30 (en Caracas son las 15:30)');

  ok(errores.length === 0, 'sin errores en consola' + (errores.length ? ': ' + errores.join(' | ') : ''));
  await browser.close();
  console.log(fallos ? `\n${fallos} FALLOS` : '\nTODO BIEN');
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
