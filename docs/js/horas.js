// Cálculo de horas de un día. Módulo puro (sin pantalla ni almacenamiento).
// Todo en minutos desde la medianoche (hora local de la persona que usa la app).
//
//  - Dentro de un turno: normales.            - Después del fin del último turno: extra.
//  - Antes del inicio del primer turno: no cuenta.
//  - Día sin turnos: todo es extra de día sin turno.
//  - Redondeo del total del día: 0-15 min baja, 45-59 sube, 16-44 queda exacto ("por revisar").

export const MIN_DIA = 1440;

export const solape = (a, b, c, d) => Math.max(0, Math.min(b, d) - Math.max(a, c));

export function redondear(total) {
  const resto = total % 60, base = total - resto;
  if (resto <= 15) return [base, false];
  if (resto >= 45) return [base + 60, false];
  return [total, true];
}

/** tramos: [[entrada, salida], ...] en minutos. turnos: [{inicio, fin}] en minutos. */
export function calcularDia(tramos, turnos) {
  let normales = 0, extraTurno = 0, extraSinTurno = 0, antesTurno = 0;
  const finUltimo = turnos.length ? Math.max(...turnos.map(t => t.fin)) : null;
  const inicioPrimero = turnos.length ? Math.min(...turnos.map(t => t.inicio)) : null;
  for (const [entrada, salida] of tramos) {
    if (salida <= entrada) continue;
    if (!turnos.length) { extraSinTurno += salida - entrada; continue; }
    normales += turnos.reduce((s, t) => s + solape(entrada, salida, t.inicio, t.fin), 0);
    extraTurno += solape(entrada, salida, finUltimo, MIN_DIA);
    antesTurno += solape(entrada, salida, 0, inicioPrimero);
  }
  const totalReal = normales + extraTurno + extraSinTurno;
  const [total, porRevisar] = redondear(totalReal);
  return { normales, extraTurno, extraSinTurno, antesTurno, totalReal, total, porRevisar };
}

/** Duración en palabras, sin dos puntos: '7 h 38 min', '22 h', '45 min', '0 h'. */
export function hTxt(m) {
  m = Math.round(m);
  if (m === 0) return '0 h';
  const h = Math.floor(m / 60), r = m % 60;
  return h === 0 ? `${r} min` : r ? `${h} h ${r} min` : `${h} h`;
}
/** Diferencia en palabras: 'igual que el promedio', '2 h 20 min más que el promedio', '45 min menos que lo entregado'. */
export function difTxt(m, ref = 'el promedio') {
  return m === 0 ? `igual que ${ref}` : `${hTxt(Math.abs(m))} ${m > 0 ? 'más' : 'menos'} que ${ref}`;
}

export const hhmm = m => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, '0')}`;
export const conSigno = m => (m < 0 ? '-' : '+') + hhmm(Math.abs(m));
export const aMin = s => { const [h, m] = s.split(':').map(Number); return h * 60 + m; };
export const deMin = m => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
