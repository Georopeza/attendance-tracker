import test from 'node:test';
import assert from 'node:assert/strict';
import { estadoInicial, conPorDefecto } from '../docs/js/store.js';
import { fijarReloj } from '../docs/js/fechas.js';
import * as A from '../docs/js/acciones.js';
import * as V from '../docs/js/visitas.js';

const HOY = '2026-11-26'; // jueves
const reloj = (min = 15 * 60) => fijarReloj({ fecha: HOY, min });
const nuevo = () => { const st = estadoInicial(); reloj(); return st; };
const visita = (extra = {}) => ({ tipoId: 'inst', nombre: 'Escuela Bolívar', personas: 25, hora: '10:00', recorrido: { modo: 'ninguno' }, ...extra });

test('visita de una institución: crea el nombre y lo reutiliza aunque se escriba distinto', () => {
  const st = nuevo();
  assert.ok(V.guardarVisita(st, visita()).ok);
  assert.ok(V.guardarVisita(st, visita({ nombre: '  escuela  BOLÍVAR ', personas: 10 })).ok);
  assert.equal(st.visitas.entidades.length, 1);                       // no se duplicó
  assert.equal(st.visitas.registros.length, 2);
  assert.equal(st.visitas.entidades[0].nombre, 'Escuela Bolívar');
});

test('particulares: sin nombre, solo personas', () => {
  const st = nuevo();
  const r = V.guardarVisita(st, { tipoId: 'part', personas: 6, hora: '11:00', recorrido: { modo: 'ninguno' } });
  assert.ok(r.ok); assert.equal(r.registro.entidadId, null); assert.equal(V.nombreVisita(st, r.registro), 'Particulares');
  assert.equal(st.visitas.entidades.length, 0);
});

test('validaciones al registrar', () => {
  const st = nuevo();
  assert.match(V.guardarVisita(st, visita({ tipoId: 'x' })).error, /tipo/);
  assert.match(V.guardarVisita(st, visita({ nombre: ' ' })).error, /nombre/);
  assert.match(V.guardarVisita(st, visita({ personas: 0 })).error, /cuántas personas/);
  assert.match(V.guardarVisita(st, visita({ personas: 'abc' })).error, /cuántas personas/);
  assert.match(V.guardarVisita(st, visita({ fecha: '2026-11-27' })).error, /futura/);
  assert.match(V.guardarVisita(st, visita({ hora: '16:00' })).error, /todavía no ha llegado/);
  assert.match(V.guardarVisita(st, visita({ hora: '' })).error, /hora/);
  assert.match(V.guardarVisita(st, visita({ sexos: { m: 20, h: 10 } })).error, /no pueden sumar más/);
  assert.match(V.guardarVisita(st, visita({ extras: { disc: 99 } })).error, /Personas con discapacidad/);
  assert.equal(st.visitas.registros.length, 0);                        // nada se guardó
  assert.equal(st.visitas.entidades.length, 0);                        // ni siquiera el nombre
});

test('el detalle por edad suma el total; sexo y extras son opcionales', () => {
  const st = nuevo();
  const r = V.guardarVisita(st, visita({ personas: 1, edades: { ninos: 18, adultos: 5, mayores: 2 }, sexos: { m: 14 }, extras: { disc: 2 } }));
  assert.ok(r.ok); assert.equal(r.registro.personas, 25);
  assert.deepEqual(r.registro.edades, { ninos: 18, adultos: 5, mayores: 2 });
});

test('recorridos con varios grupos; promedio; y un recorrido sin grupos desaparece', () => {
  const st = nuevo(); st.empleados.push({ id: 7, nombre: 'Ana Pérez', archivado: false });
  const a = V.guardarVisita(st, visita({ recorrido: { modo: 'nuevo', hora: '10:30', guiaId: 7 } })).registro;
  const recId = a.recorridoId;
  assert.ok(V.guardarVisita(st, { tipoId: 'medio', nombre: 'Canal Regional', personas: 3, hora: '10:20', recorrido: { modo: 'existente', id: recId } }).ok);
  assert.ok(V.guardarVisita(st, { tipoId: 'part', personas: 6, hora: '12:00', recorrido: { modo: 'ninguno' } }).ok);
  assert.equal(V.recorridosDelDia(st, HOY).length, 1);
  assert.equal(V.personasDelRecorrido(st, recId), 28);
  assert.equal(V.gruposDelRecorrido(st, recId).length, 2);
  const res = V.resumenVisitas(st, HOY, HOY);
  assert.deepEqual([res.personas, res.visitas, res.recorridos.n, res.recorridos.personas, res.recorridos.sinRecorrido], [34, 3, 1, 28, 6]);
  assert.equal(res.recorridos.promedio, 28);
  assert.deepEqual(res.recorridos.porGuia, [{ guia: 'Ana Pérez', recorridos: 1, personas: 28 }]);
  // quitar los dos grupos del recorrido lo elimina
  V.eliminarVisita(st, a.id); assert.equal(V.recorridosDelDia(st, HOY).length, 1);
  V.eliminarVisita(st, st.visitas.registros.find(r => r.tipoId === 'medio').id);
  assert.equal(V.recorridosDelDia(st, HOY).length, 0);
});

test('un recorrido es del mismo día; se puede editar y quitar sin perder los grupos', () => {
  const st = nuevo();
  const a = V.guardarVisita(st, visita({ recorrido: { modo: 'nuevo', hora: '10:30' } })).registro;
  assert.match(V.guardarVisita(st, visita({ fecha: '2026-11-25', recorrido: { modo: 'existente', id: a.recorridoId } })).error, /otro día/);
  assert.match(V.guardarVisita(st, visita({ recorrido: { modo: 'existente', id: 999 } })).error, /ya no existe/);
  assert.ok(V.editarRecorrido(st, a.recorridoId, { hora: '10:45', guiaId: '' }).ok);
  assert.equal(st.visitas.recorridos[0].hora, 10 * 60 + 45);
  assert.match(V.editarRecorrido(st, a.recorridoId, { hora: '23:00' }).error, /todavía/);
  V.eliminarRecorrido(st, a.recorridoId);
  assert.equal(st.visitas.recorridos.length, 0); assert.equal(st.visitas.registros[0].recorridoId, null);
});

test('editar una visita: cambiar de tipo, de recorrido y de cantidades', () => {
  const st = nuevo();
  const a = V.guardarVisita(st, visita({ recorrido: { modo: 'nuevo', hora: '10:30' } })).registro;
  const e = V.guardarVisita(st, visita({ id: a.id, personas: 30, recorrido: { modo: 'ninguno' } }));
  assert.ok(e.ok); assert.equal(st.visitas.registros.length, 1); assert.equal(st.visitas.registros[0].personas, 30);
  assert.equal(st.visitas.recorridos.length, 0);                      // el recorrido quedó vacío y se quitó
});

test('resumen: por tipo, nombres ordenados, edades con "sin detallar", días', () => {
  const st = nuevo();
  V.guardarVisita(st, visita({ fecha: '2026-11-24', personas: 1, edades: { ninos: 20, adultos: 5 }, sexos: { m: 15, h: 10 } }));         // 25, detallada
  V.guardarVisita(st, visita({ fecha: '2026-11-25', nombre: 'Liceo Sucre', personas: 45 }));                                              // sin detalle
  V.guardarVisita(st, visita({ fecha: '2026-11-25', nombre: 'Escuela Bolívar', personas: 15 }));
  V.guardarVisita(st, { tipoId: 'medio', nombre: 'Radio Cultural', personas: 2, hora: '09:00', fecha: '2026-11-25', recorrido: { modo: 'ninguno' } });
  V.guardarVisita(st, { tipoId: 'part', personas: 8, hora: '09:00', fecha: '2026-11-26', recorrido: { modo: 'ninguno' } });
  const r = V.resumenVisitas(st, '2026-11-23', '2026-11-29');
  assert.equal(r.personas, 25 + 45 + 15 + 2 + 8); assert.equal(r.visitas, 5);
  assert.deepEqual(r.porTipo.map(x => [x.tipo.id, x.visitas, x.personas]), [['inst', 3, 85], ['medio', 1, 2], ['part', 1, 8]]);
  assert.deepEqual(r.entidades[0].items.map(i => [i.nombre, i.visitas, i.personas]), [['Liceo Sucre', 1, 45], ['Escuela Bolívar', 2, 40]]);
  assert.equal(r.edades.items.find(x => x.id === 'ninos').n, 20); assert.equal(r.edades.sinDetallar, 95 - 25);
  assert.equal(r.sexos.items.find(x => x.id === 'm').n, 15); assert.equal(r.sexos.sinDetallar, 95 - 25);
  assert.deepEqual(r.dias.map(d => [d.fecha, d.personas]), [['2026-11-24', 25], ['2026-11-25', 62], ['2026-11-26', 8]]);
  assert.equal(r.detalle.length, 5); assert.equal(V.resumenVisitas(st, '2026-12-01', '2026-12-31').personas, 0);
});

test('unir, renombrar, archivar y eliminar nombres', () => {
  const st = nuevo();
  V.guardarVisita(st, visita({ nombre: 'U.E. Bolívar' })); V.guardarVisita(st, visita({ nombre: 'Unidad Educativa Bolívar' }));
  const [a, b] = st.visitas.entidades;
  assert.match(V.renombrarEntidad(st, a.id, 'unidad educativa bolivar').error, /Ya existe/);
  assert.match(V.eliminarEntidad(st, a.id).error, /archivar/);
  assert.ok(V.unirEntidades(st, a.id, b.id).ok);
  assert.equal(st.visitas.entidades.length, 1); assert.ok(st.visitas.registros.every(r => r.entidadId === b.id));
  assert.ok(V.renombrarEntidad(st, b.id, 'U. E. Simón Bolívar').ok);
  V.archivarEntidad(st, b.id); assert.equal(V.entidadesDe(st, 'inst').length, 0); assert.equal(V.entidadesDe(st, 'inst', true).length, 1);
  assert.match(V.unirEntidades(st, b.id, b.id).error, /distintos/);
  V.guardarVisita(st, { tipoId: 'medio', nombre: 'Canal 1', personas: 1, hora: '09:00', recorrido: { modo: 'ninguno' } });
  assert.match(V.unirEntidades(st, b.id, st.visitas.entidades.find(e => e.tipoId === 'medio').id).error, /mismo tipo/);
  V.guardarVisita(st, visita({ nombre: 'U. E. Simón Bolívar' }));       // volver a usar un nombre archivado lo reactiva
  assert.equal(V.entidadesDe(st, 'inst').length, 1);
});

test('tipos de visitante nuevos a mano, edades editables y opciones', () => {
  const st = nuevo();
  assert.ok(V.agregarTipo(st, { nombre: 'Empresa', conNombre: true }).ok);
  assert.match(V.agregarTipo(st, { nombre: 'empresa', conNombre: true }).error, /Ya existe/);
  const empresa = st.visitas.tipos.find(t => t.nombre === 'Empresa');
  assert.ok(V.guardarVisita(st, { tipoId: empresa.id, nombre: 'Mineras del Sur', personas: 12, hora: '09:00', recorrido: { modo: 'ninguno' } }).ok);
  assert.equal(V.resumenVisitas(st, HOY, HOY).entidades.find(g => g.tipo.id === empresa.id).items[0].nombre, 'Mineras del Sur');
  V.archivarTipo(st, 'medio'); V.archivarTipo(st, 'part'); V.archivarTipo(st, empresa.id);
  assert.match(V.archivarTipo(st, 'inst').error, /al menos un tipo/);
  assert.ok(V.editarTipo(st, 'inst', 'Institución educativa').ok);
  // edades: agregar, editar y archivar; lo ya registrado se conserva en los informes
  assert.ok(V.agregarEdad(st, { nombre: 'Bebés', rango: '0 a 2 años' }).ok);
  assert.match(V.agregarEdad(st, { nombre: 'niños', rango: '' }).error, /Ya existe/);
  V.guardarVisita(st, visita({ edades: { ninos: 4 } })); V.archivarEdad(st, 'ninos');
  assert.ok(V.resumenVisitas(st, HOY, HOY).edades.items.some(x => x.id === 'ninos' && x.n === 4));
  assert.ok(V.guardarOpciones(st, { activo: true, usarSexo: false, extras: { disc: true } }).ok);
  assert.equal(st.visitas.activo, true); assert.equal(V.extrasActivos(st).length, 1);
});

test('rangos de semana y mes, y datos antiguos sin el módulo se completan', () => {
  assert.deepEqual(V.rangoDeSemana('2026-11-23'), ['2026-11-23', '2026-11-29']);
  assert.deepEqual(V.rangoDeMes('2026-02-01'), ['2026-02-01', '2026-02-28']);
  const viejo = conPorDefecto({ v: 1, empleados: [], tramos: [], turnos: [] });
  assert.equal(viejo.visitas.tipos.length, 3); assert.equal(viejo.visitas.edades.length, 4); assert.equal(viejo.visitas.activo, true);   // viene encendido
  assert.equal(V.dec1(12.5), '12,5'); assert.equal(V.dec1(28), '28');
});

test('la copia de seguridad incluye las visitas', () => {
  const st = nuevo(); V.guardarVisita(st, visita());
  const r = A.importarCopia(A.exportarCopia(st));
  assert.ok(r.ok); assert.equal(r.datos.visitas.registros.length, 1); assert.equal(r.datos.visitas.entidades[0].nombre, 'Escuela Bolívar');
});

test('el módulo viene encendido; si se apaga a propósito, se respeta; lo no elegido vuelve al valor de fábrica', () => {
  const st = nuevo();
  assert.equal(st.visitas.activo, true); assert.equal(st.visitas.elegido, false);
  assert.equal(conPorDefecto({ v: 1, empleados: [], tramos: [], turnos: [], visitas: { activo: false } }).visitas.activo, true);   // datos viejos: nadie lo eligió
  assert.ok(V.guardarOpciones(st, { activo: false }).ok);
  assert.equal(st.visitas.activo, false); assert.equal(st.visitas.elegido, true);
  assert.equal(conPorDefecto(JSON.parse(JSON.stringify(st))).visitas.activo, false);                                              // apagado a propósito: se queda apagado
  V.guardarVisita(st, visita()); V.guardarOpciones(st, { activo: true });
  assert.equal(st.visitas.activo, true); assert.equal(st.visitas.registros.length, 1);                                           // al encenderlo, lo registrado sigue ahí
});
