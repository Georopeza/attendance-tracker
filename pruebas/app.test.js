import test from 'node:test';
import assert from 'node:assert/strict';
import { estadoInicial } from '../docs/js/store.js';
import { fijarReloj, fijarZona, ahora, lunesDe, sumarDias, diaSemana } from '../docs/js/fechas.js';
import * as A from '../docs/js/acciones.js';
import * as S from '../docs/js/servicios.js';
import { hTxt, difTxt } from '../docs/js/horas.js';
import { datosEjemplo } from '../docs/js/ejemplo.js';

const HOY = '2026-11-26'; // jueves
const reloj = (min, fecha = HOY) => fijarReloj({ fecha, min });
const nuevo = (...nombres) => { const st = estadoInicial(); nombres.forEach(n => A.agregarEmpleado(st, n)); return st; };
const id = (st, n) => st.empleados.find(e => e.nombre === n).id;

test('fechas: día de la semana, lunes y suma de días', () => {
  assert.equal(diaSemana('2026-11-26'), 3); assert.equal(lunesDe('2026-11-26'), '2026-11-23');
  assert.equal(lunesDe('2026-11-22'), '2026-11-16'); assert.equal(sumarDias('2026-11-30', 1), '2026-12-01');
});

test('marcar: entró, salió, volvió; y la salida en el mismo minuto es inválida', () => {
  const st = nuevo('Ana'), ana = id(st, 'Ana');
  reloj(9 * 60 + 2); assert.ok(A.marcar(st, ana).ok);
  assert.equal(S.estadoDe(S.tramosDelDia(st, ana, HOY)), 'presente');
  assert.match(A.marcar(st, ana).error, /anterior a la entrada/);
  reloj(12 * 60); assert.ok(A.marcar(st, ana).ok);
  assert.equal(S.estadoDe(S.tramosDelDia(st, ana, HOY)), 'se_fue');
  reloj(14 * 60); assert.ok(A.marcar(st, ana).ok);
  assert.equal(S.tramosDelDia(st, ana, HOY).length, 2);
});

test('ajustar ±15 y deshacer', () => {
  const st = nuevo('Ana'), ana = id(st, 'Ana');
  reloj(9 * 60); A.marcar(st, ana); reloj(12 * 60); A.marcar(st, ana);
  A.ajustar(st, ana, 'mas'); assert.equal(S.tramosDelDia(st, ana, HOY)[0].salida, 12 * 60 + 15);
  A.deshacer(st, ana); assert.equal(S.tramosDelDia(st, ana, HOY)[0].salida, null);
  A.deshacer(st, ana); assert.equal(S.tramosDelDia(st, ana, HOY).length, 0);
});

test('bloque: los que faltan entran a la hora del turno, y los presentes salen', () => {
  const st = nuevo('Ana', 'Luis'); reloj(10 * 60);
  assert.equal(A.bloque(st, 'entrada').hechos, 2);
  assert.equal(S.tramosDelDia(st, id(st, 'Ana'), HOY)[0].entrada, 9 * 60);
  assert.equal(A.bloque(st, 'entrada').hechos, 0);          // no se duplican
  assert.equal(A.bloque(st, 'salida').hechos, 2);
  assert.equal(S.tramosDelDia(st, id(st, 'Luis'), HOY)[0].salida, 16 * 60);
});

test('guardarDia crea, edita y quita; con error no guarda nada', () => {
  const st = nuevo('Ana', 'Luis', 'Rosa'), [ana, luis, rosa] = ['Ana', 'Luis', 'Rosa'].map(n => id(st, n));
  const f = '2026-11-23'; reloj(10 * 60);
  st.tramos.push({ id: 900, empId: rosa, fecha: f, entrada: 540, salida: 720 });
  const r = A.guardarDia(st, f, { [ana]: { vino: true, entrada: '09:00', salida: '16:00' }, [luis]: { vino: true, entrada: '09:00', salida: '14:00' }, [rosa]: { vino: false, entrada: '', salida: '' } });
  assert.ok(r.ok); assert.equal(S.resumenDia(st, ana, f).total, 420); assert.equal(S.resumenDia(st, luis, f).total, 300);
  assert.equal(S.tramosDelDia(st, rosa, f).length, 0);       // estaba marcada y se desmarcó
  const mal = A.guardarDia(st, f, { [ana]: { vino: true, entrada: '08:00', salida: '17:00' }, [luis]: { vino: true, entrada: '15:00', salida: '10:00' } });
  assert.ok(mal.error && mal.errores[luis]);
  assert.equal(S.resumenDia(st, ana, f).total, 420);          // lo de Ana tampoco se guardó
  assert.match(A.guardarDia(st, f, { [ana]: { vino: true, entrada: '09:00', salida: '' } }).errores[ana], /salida/); // día pasado exige salida
});

test('guardarDia no toca a quien tiene varios tramos', () => {
  const st = nuevo('Ana'), ana = id(st, 'Ana'), f = '2026-11-23'; reloj(10 * 60);
  st.tramos.push({ id: 901, empId: ana, fecha: f, entrada: 480, salida: 660 }, { id: 902, empId: ana, fecha: f, entrada: 840, salida: 960 });
  A.guardarDia(st, f, { [ana]: { vino: false, entrada: '', salida: '' } });
  assert.equal(S.tramosDelDia(st, ana, f).length, 2);
});

test('corregir un día; en una semana cerrada exige motivo y deja rastro', () => {
  const st = nuevo('Luis'), luis = id(st, 'Luis'), f = '2026-11-17'; reloj(10 * 60);
  st.tramos.push({ id: 903, empId: luis, fecha: f, entrada: 542, salida: 1000 });
  assert.ok(A.corregirDia(st, luis, f, { tramos: [{ id: 903, entrada: 540, salida: 960 }], motivo: '' }).ok);
  assert.equal(S.resumenDia(st, luis, f).total, 420);
  A.cerrarSemana(st, '2026-11-16');
  assert.match(A.corregirDia(st, luis, f, { tramos: [{ id: 903, salida: 1020 }], motivo: '' }).error, /motivo/);
  assert.ok(A.corregirDia(st, luis, f, { tramos: [{ id: 903, salida: 1020 }], motivo: 'olvidó marcar' }).ok);
  assert.equal(st.correcciones.length, 1);
  assert.deepEqual(S.diferenciasContraCierre(st, '2026-11-16'), [{ nombre: 'Luis', dif: 60 }]);
  assert.equal(A.cerrarSemana(st, '2026-11-16').version, 2);
  assert.deepEqual(S.diferenciasContraCierre(st, '2026-11-16'), []);
});

test('corregir: tramo nuevo, quitar y cruces', () => {
  const st = nuevo('Ana'), ana = id(st, 'Ana'), f = '2026-11-23'; reloj(10 * 60);
  assert.ok(A.corregirDia(st, ana, f, { tramos: [], nuevo: { entrada: 480, salida: 660 } }).ok);
  assert.ok(A.corregirDia(st, ana, f, { tramos: [{ id: S.tramosDelDia(st, ana, f)[0].id }], nuevo: { entrada: 840, salida: 960 } }).ok);
  assert.equal(S.resumenDia(st, ana, f).total, 240);
  assert.match(A.corregirDia(st, ana, f, { tramos: [], nuevo: { entrada: 500, salida: 600 } }).error, /cruza/);
  assert.match(A.corregirDia(st, ana, f, { tramos: [], nuevo: { entrada: 700, salida: 600 } }).error, /anterior/);
});

test('turnos: excepción por fecha, día sin turno y cambio de horario sin alterar el pasado', () => {
  const st = nuevo('Ana'), ana = id(st, 'Ana'); reloj(10 * 60);
  assert.deepEqual(S.turnosDelDia(st, '2026-11-28'), []);                   // sábado
  A.agregarExcepcion(st, { fecha: '2026-11-30', turnoId: 1, fin: '16:30' });
  assert.equal(S.turnosDelDia(st, '2026-11-30')[0].fin, '16:30');
  A.agregarExcepcion(st, { fecha: '2026-12-01', turnoId: '' });
  assert.deepEqual(S.turnosDelDia(st, '2026-12-01'), []);
  A.cambiarHorario(st, 1, '2026-12-07', '09:00', '16:30');
  assert.equal(S.turnosDelDia(st, '2026-12-04')[0].fin, '16:00');            // antes: igual
  assert.equal(S.turnosDelDia(st, '2026-12-07')[0].fin, '16:30');
  assert.match(A.crearTurno(st, { nombre: 'X', inicio: '16:00', fin: '09:00', dias: [0] }).error, /posterior/);
  assert.equal(ana > 0, true);
});

test('empleados: nombres únicos, archivar y eliminar solo sin horas', () => {
  const st = nuevo('Ana'), ana = id(st, 'Ana');
  assert.match(A.agregarEmpleado(st, 'ana').error, /Ya existe/);
  assert.match(A.editarEmpleado(st, ana, '  ').error, /vacío/);
  st.tramos.push({ id: 904, empId: ana, fecha: '2026-11-23', entrada: 540, salida: 600 });
  assert.match(A.eliminarEmpleado(st, ana).error, /archivar/);
  A.archivarEmpleado(st, ana);
  assert.equal(S.empleadosActivos(st).length, 0);
  A.archivarEmpleado(st, ana, false); assert.equal(S.empleadosActivos(st).length, 1);
  const b = nuevo('Beto'); assert.ok(A.eliminarEmpleado(b, id(b, 'Beto')).ok);
});

test('disponibilidad: franjas, cruces, copiar y vigencias', () => {
  const st = nuevo('Ana', 'Luis'), [ana, luis] = ['Ana', 'Luis'].map(n => id(st, n)); reloj(10 * 60);
  assert.ok(A.agregarFranja(st, ana, 2, '09:00', '12:00', HOY).ok);
  assert.ok(A.agregarFranja(st, ana, 2, '14:00', '16:00', HOY).ok);
  assert.match(A.agregarFranja(st, ana, 2, '11:00', '13:00', HOY).error, /cruzar/);
  assert.match(A.agregarFranja(st, ana, 2, '10:00', '09:00', HOY).error, /posterior/);
  assert.equal(A.copiarDisponibilidad(st, ana, luis).copiadas, 2);
  assert.equal(S.franjasVigentes(st, luis, HOY).length, 2);
  A.nuevaVigencia(st, ana, '2026-12-07');
  st.disponibilidad = st.disponibilidad.filter(d => !(d.empId === ana && d.vigente === '2026-12-07' && d.hasta === '12:00'));
  assert.equal(S.franjasVigentes(st, ana, HOY).length, 2);                    // hoy no cambia
  assert.equal(S.franjasVigentes(st, ana, '2026-12-07').length, 1);
  assert.match(A.nuevaVigencia(st, ana, '2026-12-07').error, /Ya existe/);
});

test('semana, promedio y sugerencia: los de menos horas primero, solo disponibles', () => {
  const st = datosEjemplo(); reloj(15 * 60 + 30);
  const lunes = lunesDe(HOY);
  const { filas, promedio } = S.resumenSemana(st, lunes);
  assert.equal(filas.length, 6); assert.ok(promedio >= 0);
  const sug = S.sugerencia(st, '2026-11-26');                                  // jueves
  const nombres = sug.con.map(x => x.emp.nombre);
  assert.ok(!nombres.includes('Ana Pérez') && !nombres.includes('José Silva'));
  const totales = sug.con.map(x => x.total);
  assert.deepEqual(totales, [...totales].sort((a, b) => a - b));
  assert.ok(sug.sin.some(x => x.emp.nombre === 'Ana Pérez'));
  A.ciclarAviso(st, '2026-11-26', sug.con[0].emp.id); assert.equal(st.avisos[`2026-11-26|${sug.con[0].emp.id}`], 1);
});

test('desglose semanal suma igual que el resumen', () => {
  const st = datosEjemplo(); reloj(15 * 60 + 30);
  const ant = sumarDias(lunesDe(HOY), -7);
  const { filas } = S.resumenSemana(st, ant);
  for (const f of filas) assert.equal(S.desgloseSemana(st, f.emp.id, ant).reduce((s, d) => s + d.resumen.total, 0), f.total);
  const luis = filas.find(f => f.emp.nombre === 'Luis Mora');
  assert.equal(luis.total, 7 * 60 * 4 + 458 + 240); assert.equal(luis.porRevisar, 1); assert.equal(luis.dias, 6);
});

test('copia de seguridad: exportar e importar, y rechazo de archivos ajenos', () => {
  const st = datosEjemplo(), r = A.importarCopia(A.exportarCopia(st));
  assert.ok(r.ok); assert.equal(r.datos.empleados.length, 6);
  assert.ok(A.importarCopia('hola').error); assert.ok(A.importarCopia('{"app":"otra"}').error);
});

test('un tramo abierto de un día pasado no suma hasta cerrarse', () => {
  const st = nuevo('Ana'), ana = id(st, 'Ana'); reloj(15 * 60);
  st.tramos.push({ id: 905, empId: ana, fecha: '2026-11-23', entrada: 540, salida: null });
  assert.equal(S.resumenDia(st, ana, '2026-11-23').total, 0);
  st.tramos.push({ id: 906, empId: ana, fecha: HOY, entrada: 540, salida: null });
  assert.equal(S.resumenDia(st, ana, HOY).totalReal, 360);                      // hoy cuenta hasta ahora
});

test('ajustes: nombre, zona válida e inválida', () => {
  const st = nuevo('Ana');
  assert.ok(A.guardarAjustes(st, { organizacion: '  Mi grupo ', zona: 'America/Bogota' }).ok);
  assert.equal(st.ajustes.organizacion, 'Mi grupo'); assert.equal(st.ajustes.zona, 'America/Bogota');
  assert.match(A.guardarAjustes(st, { organizacion: '', zona: 'Marte/Olimpo' }).error, /zona/);
  assert.equal(st.ajustes.zona, 'America/Bogota');              // lo inválido no se guardó
  assert.ok(A.guardarAjustes(st, { organizacion: '', zona: '' }).ok);   // '' = la del teléfono
});

test('"ahora" usa la zona elegida y no una fija', () => {
  fijarReloj(null);
  fijarZona('Asia/Tokyo'); const t = ahora();
  fijarZona('Pacific/Honolulu'); const h = ahora();
  fijarZona('');
  assert.match(t.fecha, /^\d{4}-\d{2}-\d{2}$/);
  assert.notEqual(t.min, h.min);                                // 19 horas de diferencia entre ambas zonas
});

test('datos incompletos (de versiones anteriores) se completan al importar', () => {
  const viejo = JSON.stringify({ app: 'control-asistencia', datos: { v: 1, empleados: [], tramos: [], turnos: [] } });
  const r = A.importarCopia(viejo);
  assert.ok(r.ok); assert.deepEqual(r.datos.ajustes, { organizacion: '', descripcion: '', zona: '', bienvenida: false }); assert.ok(Array.isArray(r.datos.excepciones));
});

test('primer paso: nombre, descripción y personas (una por línea, sin repetir)', () => {
  const st = estadoInicial();
  const r = A.configuracionInicial(st, { organizacion: ' Taller San José ', descripcion: 'Asistencia del taller', personas: 'Ana Pérez\nLuis Mora\n\n ana pérez ,  Rosa Linares' });
  assert.ok(r.ok); assert.equal(r.agregadas, 3); assert.equal(r.repetidas, 1);
  assert.deepEqual(st.empleados.map(e => e.nombre), ['Ana Pérez', 'Luis Mora', 'Rosa Linares']);
  assert.equal(st.ajustes.organizacion, 'Taller San José'); assert.equal(st.ajustes.descripcion, 'Asistencia del taller');
  assert.equal(st.ajustes.bienvenida, true);
  assert.ok(A.configuracionInicial(estadoInicial(), { organizacion: '', descripcion: '', personas: '' }).ok);  // todo es opcional
});

test('duraciones en palabras, sin dos puntos', () => {
  assert.equal(hTxt(0), '0 h'); assert.equal(hTxt(45), '45 min'); assert.equal(hTxt(60), '1 h');
  assert.equal(hTxt(458), '7 h 38 min'); assert.equal(hTxt(1320), '22 h');
});
test('comparaciones en palabras', () => {
  assert.equal(difTxt(0), 'igual que el promedio');
  assert.equal(difTxt(140), '2 h 20 min más que el promedio');
  assert.equal(difTxt(-45), '45 min menos que el promedio');
  assert.equal(difTxt(22, 'lo entregado'), '22 min más que lo entregado');
});

test('marcar a otra hora: entrada olvidada, salida y regreso', () => {
  const st = nuevo('Ana'), ana = id(st, 'Ana'); reloj(9 * 60);                 // son las 9:00 y se olvidó marcar la entrada de las 8:00
  assert.ok(A.marcarA(st, ana, '08:00').ok);
  assert.equal(S.tramosDelDia(st, ana, HOY)[0].entrada, 8 * 60);
  assert.equal(S.estadoDe(S.tramosDelDia(st, ana, HOY)), 'presente');
  assert.match(A.marcarA(st, ana, '07:00').error, /anterior a la entrada/);     // la salida no puede ser antes de la entrada
  assert.match(A.marcarA(st, ana, '09:30').error, /todavía no ha llegado/);     // ni una hora futura
  assert.ok(A.marcarA(st, ana, '08:45').ok);                                    // salida a las 8:45
  assert.equal(S.tramosDelDia(st, ana, HOY)[0].salida, 8 * 60 + 45);
  assert.match(A.marcarA(st, ana, '08:30').error, /cruza/);                     // regreso dentro del tramo anterior
  assert.ok(A.marcarA(st, ana, '08:50').ok);                                    // regreso a las 8:50
  assert.equal(S.tramosDelDia(st, ana, HOY).length, 2);
  assert.match(A.marcarA(st, ana, '').error, /hora/);
});

test('cambiar la hora exacta de la última marca', () => {
  const st = nuevo('Ana'), ana = id(st, 'Ana'); reloj(9 * 60);
  assert.match(A.cambiarUltimaMarca(st, ana, '08:00').error, /No hay marcas/);
  A.marcar(st, ana);                                                            // entró a las 9:00 (tarde)
  assert.ok(A.cambiarUltimaMarca(st, ana, '08:00').ok);                         // en realidad llegó a las 8:00
  assert.equal(S.tramosDelDia(st, ana, HOY)[0].entrada, 8 * 60);
  reloj(12 * 60); A.marcar(st, ana);
  assert.ok(A.cambiarUltimaMarca(st, ana, '11:40').ok);
  assert.equal(S.tramosDelDia(st, ana, HOY)[0].salida, 11 * 60 + 40);
  assert.match(A.cambiarUltimaMarca(st, ana, '07:00').error, /anterior a la entrada/);
  assert.match(A.cambiarUltimaMarca(st, ana, '13:00').error, /todavía no ha llegado/);
});
