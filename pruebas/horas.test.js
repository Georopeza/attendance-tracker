import test from 'node:test';
import assert from 'node:assert/strict';
import { calcularDia, redondear, hhmm } from '../app/js/horas.js';

const m = (h, mi = 0) => h * 60 + mi;
const GENERAL = [{ inicio: m(9), fin: m(16) }];

test('Ana va y viene: la hora antes del turno no cuenta', () => {
  const r = calcularDia([[m(8), m(11)], [m(14), m(16)]], GENERAL);
  assert.deepEqual([r.normales, r.extraTurno, r.antesTurno, r.total], [m(4), 0, m(1), m(4)]);
  assert.equal(r.porRevisar, false);
});
test('Luis 7:38 queda exacto y por revisar', () => {
  const r = calcularDia([[m(9, 2), m(16, 40)]], GENERAL);
  assert.equal(r.normales, m(6, 58)); assert.equal(r.extraTurno, 40);
  assert.equal(r.totalReal, m(7, 38)); assert.equal(r.total, m(7, 38)); assert.equal(r.porRevisar, true);
});
test('Rosa 6:50 sube a 7:00', () => {
  const r = calcularDia([[m(9), m(15, 50)]], GENERAL);
  assert.equal(r.totalReal, m(6, 50)); assert.equal(r.total, m(7)); assert.equal(r.porRevisar, false);
});
test('día sin turno: todo es extra de día sin turno', () => {
  const r = calcularDia([[m(9), m(14)]], []);
  assert.deepEqual([r.normales, r.extraTurno, r.extraSinTurno, r.total], [0, 0, m(5), m(5)]);
});
test('turno hasta 16:30 es configurable', () => {
  const r = calcularDia([[m(9), m(16, 30)]], [{ inicio: m(9), fin: m(16, 30) }]);
  assert.equal(r.normales, m(7, 30)); assert.equal(r.extraTurno, 0); assert.equal(r.porRevisar, true);
});
test('bordes del redondeo', () => {
  const casos = [[0, 0, false], [15, 0, false], [16, 16, true], [30, 30, true], [44, 44, true], [45, 60, false], [59, 60, false],
    [m(7, 15), m(7), false], [m(7, 45), m(8), false]];
  for (const [min, esperado, revisar] of casos) assert.deepEqual(redondear(min), [esperado, revisar], `min ${min}`);
});
test('tramo invertido o vacío no suma', () => {
  assert.equal(calcularDia([[m(10), m(10)]], GENERAL).total, 0);
  assert.equal(calcularDia([[m(11), m(10)]], GENERAL).total, 0);
});
test('con dos turnos cada tramo se mide contra su turno', () => {
  const r = calcularDia([[m(8), m(11)], [m(14), m(16)]], [{ inicio: m(8), fin: m(12) }, { inicio: m(14), fin: m(18) }]);
  assert.equal(r.normales, m(5)); assert.equal(r.extraTurno, 0);
});
test('formato de horas', () => { assert.equal(hhmm(458), '7:38'); assert.equal(hhmm(0), '0:00'); });
