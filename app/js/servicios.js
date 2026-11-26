// Consultas sobre los datos (solo lectura). Reciben el estado `st`.
import { calcularDia, aMin } from './horas.js';
import { ahora, diaSemana, lunesDe, sumarDias } from './fechas.js';

export const empleadosActivos = st => st.empleados.filter(e => !e.archivado);
export const empleado = (st, id) => st.empleados.find(e => e.id === id);

// ---------- turnos ----------
const rige = (t, f) => (!t.desde || t.desde <= f) && (!t.hasta || f <= t.hasta) && t.dias.includes(diaSemana(f));

/** Turnos que rigen en una fecha, con la excepción de esa fecha aplicada. [{id, nombre, inicio:'HH:MM', fin:'HH:MM'}] */
export function turnosDelDia(st, f) {
  const ex = st.excepciones.find(x => x.fecha === f);
  if (ex) {
    const t = ex.turnoId == null ? null : st.turnos.find(x => x.id === ex.turnoId);
    return t ? [{ id: t.id, nombre: t.nombre, inicio: ex.inicio || t.inicio, fin: ex.fin || t.fin }] : [];
  }
  return st.turnos.filter(t => rige(t, f)).map(t => ({ id: t.id, nombre: t.nombre, inicio: t.inicio, fin: t.fin }));
}
export const turnosCalculo = (st, f) => turnosDelDia(st, f).map(t => ({ inicio: aMin(t.inicio), fin: aMin(t.fin) }));
export function horarioDelDia(st, f) {
  const ts = turnosDelDia(st, f);
  if (!ts.length) return ['', ''];
  return [ts.map(t => t.inicio).sort()[0], ts.map(t => t.fin).sort().slice(-1)[0]];
}

// ---------- asistencia ----------
export const tramosDelDia = (st, empId, f) => st.tramos.filter(t => t.empId === empId && t.fecha === f).sort((a, b) => a.entrada - b.entrada);

export function estadoDe(tramos) {
  if (!tramos.length) return 'sin_llegar';
  return tramos[tramos.length - 1].salida == null ? 'presente' : 'se_fue';
}

export function resumenDia(st, empId, f, tramos = null) {
  const a = ahora();
  tramos = tramos || tramosDelDia(st, empId, f);
  // Un tramo abierto cuenta hasta "ahora" solo si es hoy; en un día pasado no suma hasta que se cierre.
  const pares = tramos.map(t => [t.entrada, t.salida != null ? t.salida : (f === a.fecha ? a.min : t.entrada)]);
  return calcularDia(pares, turnosCalculo(st, f));
}

export function resumenSemana(st, lunes) {
  const filas = empleadosActivos(st).map(emp => {
    const fila = { emp, dias: 0, normales: 0, extraTurno: 0, extraSinTurno: 0, total: 0, porRevisar: 0 };
    for (let i = 0; i < 7; i++) {
      const r = resumenDia(st, emp.id, sumarDias(lunes, i));
      if (r.totalReal) fila.dias++;
      fila.normales += r.normales; fila.extraTurno += r.extraTurno; fila.extraSinTurno += r.extraSinTurno;
      fila.total += r.total; fila.porRevisar += r.porRevisar ? 1 : 0;
    }
    return fila;
  });
  const promedio = filas.length ? Math.round(filas.reduce((s, f) => s + f.total, 0) / filas.length) : 0;
  filas.forEach(f => { f.vs = f.total - promedio; });
  return { filas, promedio };
}

export function desgloseSemana(st, empId, lunes) {
  return Array.from({ length: 7 }, (_, i) => {
    const fecha = sumarDias(lunes, i), tramos = tramosDelDia(st, empId, fecha);
    return { fecha, tramos, resumen: resumenDia(st, empId, fecha, tramos), sinTurno: !turnosDelDia(st, fecha).length };
  });
}

// ---------- disponibilidad ----------
export function vigenciaDe(st, empId, f) {
  const v = st.disponibilidad.filter(d => d.empId === empId && d.vigente <= f).map(d => d.vigente).sort();
  return v.length ? v[v.length - 1] : null;
}
export function franjasVigentes(st, empId, f) {
  const v = vigenciaDe(st, empId, f);
  return v ? st.disponibilidad.filter(d => d.empId === empId && d.vigente === v) : [];
}
export const vigencias = (st, empId) => [...new Set(st.disponibilidad.filter(d => d.empId === empId).map(d => d.vigente))].sort().reverse();

// ---------- sugerencia ----------
export function sugerencia(st, f) {
  const a = ahora(), lunes = lunesDe(f);
  const { filas, promedio } = resumenSemana(st, lunes);
  const dia = diaSemana(f);
  const con = [], sin = [];
  for (const fila of filas) {
    const franjas = franjasVigentes(st, fila.emp.id, f).filter(x => x.dia === dia);
    (franjas.length ? con : sin).push({ ...fila, franjas });
  }
  con.sort((x, y) => x.total - y.total || x.emp.nombre.localeCompare(y.emp.nombre));
  return { con, sin, promedio, hoy: a.fecha };
}

// ---------- cierre de semana ----------
export const cierresDe = (st, lunes) => st.cierres.filter(c => c.semana === lunes).sort((a, b) => a.version - b.version);
export const ultimoCierre = (st, lunes) => cierresDe(st, lunes).slice(-1)[0] || null;

export function filasParaCierre(st, lunes) {
  return resumenSemana(st, lunes).filas.map(f => ({
    empId: f.emp.id, nombre: f.emp.nombre, dias: f.dias, normales: f.normales,
    extra: f.extraTurno, sinTurno: f.extraSinTurno, total: f.total,
  }));
}

/** Diferencias entre lo entregado en el último cierre y lo que hay hoy: [{nombre, dif}] */
export function diferenciasContraCierre(st, lunes) {
  const c = ultimoCierre(st, lunes);
  if (!c) return [];
  const hoy = filasParaCierre(st, lunes), out = [];
  for (const f of hoy) {
    const antes = c.filas.find(x => x.empId === f.empId);
    const dif = f.total - (antes ? antes.total : 0);
    if (dif) out.push({ nombre: f.nombre, dif });
  }
  for (const antes of c.filas) if (!hoy.some(f => f.empId === antes.empId) && antes.total) out.push({ nombre: antes.nombre, dif: -antes.total });
  return out;
}
