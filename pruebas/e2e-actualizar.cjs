// Comprueba el botón "Buscar y actualizar": con una versión nueva publicada descarga todo, y los datos siguen.
// Uso: node pruebas/e2e-actualizar.cjs   (copia docs/ a una carpeta temporal y la sirve en el puerto 8781)
const { chromium } = require('playwright');
const { execSync, spawn } = require('child_process');
const fs = require('fs');
const os = require('os');
const DIR = os.tmpdir() + '/docs-actualizar';
fs.rmSync(DIR, { recursive: true, force: true });
execSync(`cp -r ${__dirname}/../docs ${DIR}`);
const srv = spawn('python3', ['-m', 'http.server', '8781'], { cwd: DIR, stdio: 'ignore' });
const BASE = 'http://127.0.0.1:8781/';
let fallos = 0;
const ok = (c, m) => { if (!c) { fallos++; console.log('FALLO:', m); } else console.log('ok   ', m); };
const esp = ms => new Promise(r => setTimeout(r, ms));
const version = t => /VERSION\s*=\s*'([^']+)'/.exec(t)[1];

(async () => {
  await esp(800);
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, locale: 'es-VE' });
  const page = await ctx.newPage();
  await page.goto(BASE); await page.waitForSelector('main'); await esp(1200);
  await page.fill('#b-personas', 'Ana Pérez'); await page.click('text=Empezar'); await esp(300);
  const v0 = version(fs.readFileSync(DIR + '/sw.js', 'utf8'));

  await page.goto(BASE + '#/mas'); await esp(300);
  await page.click('text=Buscar y actualizar'); await esp(300);
  ok(await page.locator('#toast').textContent().then(t => /última versión/.test(t)), `sin versión nueva dice "Ya tienes la última versión" (${v0})`);

  // se "publica" una versión nueva con un cambio que se pueda ver
  let sw = fs.readFileSync(DIR + '/sw.js', 'utf8').replace(v0, v0 + '-nueva'); fs.writeFileSync(DIR + '/sw.js', sw);
  let vistas = fs.readFileSync(DIR + '/js/vistas.js', 'utf8').replace("'Buscar y actualizar'", "'Buscar y actualizar (v2)'"); fs.writeFileSync(DIR + '/js/vistas.js', vistas);

  await page.click('text=Buscar y actualizar'); await page.waitForLoadState('load'); await esp(1800);
  await page.goto(BASE + '#/mas'); await esp(500);
  ok(await page.locator('text=Buscar y actualizar (v2)').count() === 1, 'después de actualizar se ve la versión nueva');
  const instalada = await page.evaluate(async () => (await (await fetch('sw.js')).text()).match(/VERSION\s*=\s*'([^']+)'/)[1]);
  ok(instalada === v0 + '-nueva', `la versión guardada en el teléfono ahora es ${instalada}`);
  await page.goto(BASE + '#/hoy'); await esp(300);
  ok(await page.locator('article', { hasText: 'Ana Pérez' }).count() === 1, 'los datos siguen después de actualizar');

  await ctx.setOffline(true);
  await page.goto(BASE + '#/mas'); await esp(400);
  await page.click('text=Buscar y actualizar (v2)'); await esp(500);
  ok(await page.locator('#toast').textContent().then(t => /No hay conexión/.test(t)), 'sin internet avisa y no borra nada');
  await page.goto(BASE + '#/hoy'); await esp(300);
  ok(await page.locator('article', { hasText: 'Ana Pérez' }).count() === 1, 'sin internet la app sigue abriendo');
  await browser.close(); srv.kill();
  console.log(fallos ? `\n${fallos} FALLOS` : '\nTODO BIEN');
  process.exit(fallos ? 1 : 0);
})().catch(e => { console.error(e); srv.kill(); process.exit(2); });
