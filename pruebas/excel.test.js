import test from 'node:test';
import assert from 'node:assert/strict';
import { cargarXLSX } from './cargar-xlsx.js';

globalThis.window = globalThis;
window.XLSX = cargarXLSX();
const { estadoInicial } = await import('../docs/js/store.js');
const { fijarReloj } = await import('../docs/js/fechas.js');
const V = await import('../docs/js/visitas.js');
const { excelVisitas } = await import('../docs/js/visitas-informes.js');
const { excelHorasSemana, excelHorasMes } = await import('../docs/js/excel.js');
const { datosEjemplo } = await import('../docs/js/ejemplo.js');

// Los objetos de la biblioteca vienen de otro contexto de ejecución: se pasan por JSON para compararlos.
const plano = x => JSON.parse(JSON.stringify(x));
const leer = async blob => window.XLSX.read(await blob.arrayBuffer(), { type: 'array', cellNF: true });
const filas = (wb, hoja) => plano(window.XLSX.utils.sheet_to_json(wb.Sheets[hoja], { header: 1, defval: '' }));

test('Excel de visitas: hojas, totales y detalle plano', async () => {
  fijarReloj({ fecha: '2026-11-26', min: 15 * 60 });
  const st = estadoInicial();
  V.guardarVisita(st, { tipoId: 'inst', nombre: 'Escuela Bolívar', personas: 1, edades: { ninos: 20, adultos: 5 }, sexos: { m: 15 }, hora: '10:00', recorrido: { modo: 'nuevo', hora: '10:30' } });
  V.guardarVisita(st, { tipoId: 'medio', nombre: 'Canal Regional', personas: 3, hora: '10:20', recorrido: { modo: 'existente', id: st.visitas.recorridos[0].id } });
  V.guardarVisita(st, { tipoId: 'part', personas: 6, hora: '11:00', recorrido: { modo: 'ninguno' } });
  const { blob, nombre } = excelVisitas(st, '2026-11-23', '2026-11-29', 'Semana', 'visitas-semana-2026-11-23.xlsx');
  assert.equal(nombre, 'visitas-semana-2026-11-23.xlsx');
  const wb = await leer(blob);
  assert.deepEqual(plano(wb.SheetNames), ['Resumen', 'Por día', 'Instituciones y medios', 'Recorridos', 'Visitas']);
  const res = filas(wb, 'Resumen').flat();
  assert.ok(res.includes('Personas') && res.includes(34));
  const nombres = filas(wb, 'Instituciones y medios');
  assert.deepEqual(nombres[1].slice(0, 5), ['Institución', 'Escuela Bolívar', 1, 25, 1]);
  assert.deepEqual(nombres[2].slice(0, 5), ['Medio', 'Canal Regional', 1, 3, 1]);
  const det = filas(wb, 'Visitas');
  assert.equal(det.length, 4);                                            // encabezado + 3 visitas
  assert.equal(det[0][3], 'Nombre'); assert.equal(det[3][3], 'Particulares');
  const recs = filas(wb, 'Recorridos');
  assert.equal(recs[1][4], 28); assert.match(recs[1][3], /Escuela Bolívar, Canal Regional/);
});

test('Excel de horas: resumen con totales sumables y detalle por día', async () => {
  fijarReloj({ fecha: '2026-11-26', min: 15 * 60 });
  const st = datosEjemplo();
  const { blob, nombre } = excelHorasSemana(st, '2026-11-16');
  assert.equal(nombre, 'horas-semana-2026-11-16.xlsx');
  const wb = await leer(blob);
  assert.deepEqual(plano(wb.SheetNames), ['Resumen', 'Detalle']);
  const res = wb.Sheets['Resumen'];
  const luis = Object.keys(res).filter(k => res[k].v === 'Luis Mora')[0];
  const fila = luis.slice(1);
  assert.equal(Math.round(res['F' + fila].v * 1440), 39 * 60 + 38);       // total en horas con formato [h]:mm
  assert.equal(res['G' + fila].v, 39.63);                                  // y en decimales
  assert.equal(res['F' + fila].z, '[h]:mm');
  const total = Object.keys(res).filter(k => res[k].v === 'Total del equipo')[0].slice(1);
  assert.match(res['F' + total].f, /^SUM\(F\d+:F\d+\)$/);                  // la fila de totales son fórmulas...
  assert.equal(Math.round(res['F' + total].v * 1440), 153 * 60 + 38);      // ...con su valor ya calculado (153 h 38 min)
  const det = filas(wb, 'Detalle');
  assert.ok(det.some(f => f[0] === 'Luis Mora' && f[2] === '17/11/2026' && f[3] === '09:02' && f[4] === '16:40'));
});

test('Excel mensual de horas: por semanas', async () => {
  fijarReloj({ fecha: '2026-11-26', min: 15 * 60 });
  const wb = await leer(excelHorasMes(datosEjemplo(), '2026-11-01').blob);
  assert.deepEqual(plano(wb.SheetNames), ['Resumen', 'Por semanas']);
  const sem = filas(wb, 'Por semanas');
  assert.ok(sem.length > 6 && sem[0][0] === 'Persona');
});
