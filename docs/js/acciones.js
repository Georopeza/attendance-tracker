// Operaciones que cambian los datos. Cada una devuelve { error } si no se pudo, o { ok: true, ... }.
// Quien llama guarda el estado (store.guardar) cuando hay ok.
import { aMin } from './horas.js';
import { ahora, diaSemana, lunesDe, sumarDias, zonaValida } from './fechas.js';
import { nuevoId, conPorDefecto } from './store.js';
import {
  empleadosActivos, tramosDelDia, horarioDelDia, franjasVigentes, filasParaCierre, ultimoCierre, cierresDe,
} from './servicios.js';

const err = error => ({ error });
const ok = (x = {}) => ({ ok: true, ...x });

// ---------- validación de tramos ----------
/** Valida una lista de tramos de un misma persona y día (entrada/salida en minutos). */
export function validarTramos(lista) {
  const orden = [...lista].sort((a, b) => a.entrada - b.entrada);
  for (const t of orden) {
    if (t.entrada < 0 || t.entrada >= 1440) return 'La hora de entrada no es válida.';
    if (t.salida != null && t.salida <= t.entrada) return 'La salida no puede ser anterior a la entrada.';
    if (t.salida != null && t.salida > 1439) return 'Un tramo no puede cruzar la medianoche.';
  }
  for (let i = 1; i < orden.length; i++) {
    const prev = orden[i - 1];
    if (prev.salida == null || orden[i].entrada < prev.salida) return 'El tramo se cruza con otro del misma persona.';
  }
  return '';
}

// ---------- marcar ----------
export function marcar(st, empId) {
  const a = ahora(), tramos = tramosDelDia(st, empId, a.fecha), ultimo = tramos[tramos.length - 1];
  if (ultimo && ultimo.salida == null) {
    const e = validarTramos(tramos.map(t => (t === ultimo ? { ...t, salida: a.min } : t)));
    if (e) return err(e);
    ultimo.salida = a.min;
    return ok();
  }
  const nuevo = { id: nuevoId(st), empId, fecha: a.fecha, entrada: a.min, salida: null };
  const e = validarTramos([...tramos, nuevo]);
  if (e) return err(e);
  st.tramos.push(nuevo);
  return ok();
}

export function ajustar(st, empId, sentido) {
  const a = ahora(), tramos = tramosDelDia(st, empId, a.fecha), ultimo = tramos[tramos.length - 1];
  if (!ultimo) return ok();
  const paso = sentido === 'mas' ? 15 : -15, copia = { ...ultimo };
  if (ultimo.salida != null) copia.salida += paso; else copia.entrada += paso;
  const e = validarTramos(tramos.map(t => (t === ultimo ? copia : t)));
  if (e) return err(e);
  Object.assign(ultimo, copia);
  return ok();
}

export function deshacer(st, empId) {
  const a = ahora(), tramos = tramosDelDia(st, empId, a.fecha), ultimo = tramos[tramos.length - 1];
  if (!ultimo) return ok();
  if (ultimo.salida != null) ultimo.salida = null;
  else st.tramos = st.tramos.filter(t => t !== ultimo);
  return ok();
}

/** Marcación en bloque. que = 'entrada' | 'salida'. hora opcional 'HH:MM'; por defecto la del turno. */
export function bloque(st, que, hora) {
  const a = ahora(), [ini, fin] = horarioDelDia(st, a.fecha);
  const h = hora || (que === 'entrada' ? ini || '09:00' : fin || '16:00');
  const min = aMin(h);
  let hechos = 0, omitidos = 0;
  for (const emp of empleadosActivos(st)) {
    const tramos = tramosDelDia(st, emp.id, a.fecha);
    if (que === 'entrada') {
      if (tramos.length) continue;
      const nuevo = { id: nuevoId(st), empId: emp.id, fecha: a.fecha, entrada: min, salida: null };
      if (validarTramos([nuevo])) { omitidos++; continue; }
      st.tramos.push(nuevo); hechos++;
    } else {
      const ultimo = tramos[tramos.length - 1];
      if (!ultimo || ultimo.salida != null) continue;
      if (min <= ultimo.entrada) { omitidos++; continue; }
      ultimo.salida = min; hechos++;
    }
  }
  return ok({ hechos, omitidos, hora: h });
}

/** Modo "al final del día": el día queda igual a lo que muestra el formulario.
 *  filas: { [empId]: { vino, entrada:'HH:MM', salida:'HH:MM' } } */
export function guardarDia(st, fecha, filas) {
  const esHoy = fecha === ahora().fecha;
  const errores = {}, plan = [];
  for (const emp of empleadosActivos(st)) {
    const f = filas[emp.id];
    if (!f) continue;
    const tramos = tramosDelDia(st, emp.id, fecha);
    if (tramos.length > 1) continue; // varios tramos: se corrigen desde "Corregir el día"
    if (!f.vino) { if (tramos.length) plan.push({ tipo: 'borrar', emp, t: tramos[0] }); continue; }
    if (!f.entrada) { errores[emp.id] = 'Falta la hora de entrada.'; continue; }
    if (!f.salida && !esHoy) { errores[emp.id] = 'Falta la hora de salida.'; continue; }
    const entrada = aMin(f.entrada), salida = f.salida ? aMin(f.salida) : null;
    const e = validarTramos([{ entrada, salida }]);
    if (e) { errores[emp.id] = e; continue; }
    if (tramos.length && tramos[0].entrada === entrada && tramos[0].salida === salida) continue;
    plan.push({ tipo: tramos.length ? 'editar' : 'crear', emp, t: tramos[0], entrada, salida });
  }
  if (Object.keys(errores).length) return { error: 'Hay horas por corregir.', errores };
  for (const p of plan) {
    if (p.tipo === 'borrar') st.tramos = st.tramos.filter(t => t !== p.t);
    else if (p.tipo === 'editar') Object.assign(p.t, { entrada: p.entrada, salida: p.salida });
    else st.tramos.push({ id: nuevoId(st), empId: p.emp.id, fecha, entrada: p.entrada, salida: p.salida });
  }
  return ok({ cambios: plan.length });
}

/** Corrige todos los tramos de un día. cambios: { tramos:[{id, entrada, salida, quitar}], nuevo:{entrada,salida}|null, motivo } */
export function corregirDia(st, empId, fecha, cambios) {
  const semana = lunesDe(fecha), cerrada = !!ultimoCierre(st, semana);
  const motivo = (cambios.motivo || '').trim();
  if (cerrada && !motivo) return err('Esta semana ya fue entregada: escribe el motivo del cambio.');
  const actuales = tramosDelDia(st, empId, fecha);
  const candidatos = [];
  for (const t of actuales) {
    const c = cambios.tramos.find(x => x.id === t.id) || {};
    if (c.quitar) continue;
    candidatos.push({ ...t, entrada: c.entrada != null ? c.entrada : t.entrada, salida: c.salida !== undefined ? c.salida : t.salida });
  }
  if (cambios.nuevo && cambios.nuevo.entrada != null) {
    candidatos.push({ id: nuevoId(st), empId, fecha, entrada: cambios.nuevo.entrada, salida: cambios.nuevo.salida ?? null, esNuevo: true });
  }
  const e = validarTramos(candidatos);
  if (e) return err(e);
  st.tramos = st.tramos.filter(t => !(t.empId === empId && t.fecha === fecha));
  st.tramos.push(...candidatos.map(({ esNuevo, ...t }) => t));
  if (cerrada) st.correcciones.push({ fecha, empId, motivo, cuando: ahora().fecha });
  return ok();
}

// ---------- empleados ----------
const nombreRepetido = (st, nombre, exceptoId) => st.empleados.some(e => e.id !== exceptoId && e.nombre.toLowerCase() === nombre.toLowerCase());

export function agregarEmpleado(st, nombre) {
  nombre = (nombre || '').trim();
  if (!nombre) return err('Escribe un nombre.');
  if (nombreRepetido(st, nombre)) return err('Ya existe una persona con ese nombre.');
  const e = { id: nuevoId(st), nombre, archivado: false };
  st.empleados.push(e);
  return ok({ empleado: e });
}
export function editarEmpleado(st, id, nombre) {
  nombre = (nombre || '').trim();
  if (!nombre) return err('El nombre no puede quedar vacío.');
  if (nombreRepetido(st, nombre, id)) return err('Ya existe una persona con ese nombre.');
  st.empleados.find(e => e.id === id).nombre = nombre;
  return ok();
}
export function archivarEmpleado(st, id, archivar = true) { st.empleados.find(e => e.id === id).archivado = archivar; return ok(); }
export const tieneHoras = (st, id) => st.tramos.some(t => t.empId === id);
export function eliminarEmpleado(st, id) {
  if (tieneHoras(st, id)) return err('Tiene horas registradas: no se puede eliminar, solo archivar.');
  st.empleados = st.empleados.filter(e => e.id !== id);
  st.disponibilidad = st.disponibilidad.filter(d => d.empId !== id);
  return ok();
}

// ---------- turnos ----------
function validarHorario(inicio, fin) {
  if (!inicio || !fin) return 'Indica la hora de inicio y de fin.';
  if (aMin(fin) <= aMin(inicio)) return 'El fin del turno debe ser posterior al inicio.';
  return '';
}
export function crearTurno(st, { nombre, inicio, fin, dias }) {
  const e = validarHorario(inicio, fin) || (!nombre.trim() ? 'Escribe un nombre.' : '') || (!dias.length ? 'Elige al menos un día.' : '');
  if (e) return err(e);
  st.turnos.push({ id: nuevoId(st), nombre: nombre.trim(), inicio, fin, dias: [...dias].sort(), desde: ahora().fecha, hasta: null });
  return ok();
}
/** Cambia el horario desde una fecha: la versión anterior termina el día anterior (el pasado no cambia). */
export function cambiarHorario(st, turnoId, desde, inicio, fin) {
  const e = validarHorario(inicio, fin);
  if (e) return err(e);
  const t = st.turnos.find(x => x.id === turnoId);
  if (!desde) return err('Elige desde qué fecha rige.');
  t.hasta = sumarDias(desde, -1);
  st.turnos.push({ id: nuevoId(st), nombre: t.nombre, inicio, fin, dias: [...t.dias], desde, hasta: null });
  return ok();
}
export function darDeBaja(st, turnoId) { st.turnos.find(x => x.id === turnoId).hasta = ahora().fecha; return ok(); }

export function agregarExcepcion(st, { fecha, turnoId, inicio, fin }) {
  if (!fecha) return err('Elige la fecha.');
  if (inicio && fin && aMin(fin) <= aMin(inicio)) return err('El fin del turno debe ser posterior al inicio.');
  st.excepciones = st.excepciones.filter(x => x.fecha !== fecha);
  st.excepciones.push({ fecha, turnoId: turnoId ? Number(turnoId) : null, inicio: inicio || null, fin: fin || null });
  return ok();
}
export function quitarExcepcion(st, fecha) { st.excepciones = st.excepciones.filter(x => x.fecha !== fecha); return ok(); }

// ---------- disponibilidad ----------
export function agregarFranja(st, empId, dia, desde, hasta, vigente) {
  if (!desde || !hasta || aMin(hasta) <= aMin(desde)) return err('La hora final debe ser posterior a la inicial.');
  const cruce = st.disponibilidad.some(d => d.empId === empId && d.vigente === vigente && d.dia === dia
    && aMin(d.desde) < aMin(hasta) && aMin(d.hasta) > aMin(desde));
  if (cruce) return err('Las franjas del mismo día no pueden cruzarse.');
  st.disponibilidad.push({ id: nuevoId(st), empId, dia, desde, hasta, vigente });
  return ok();
}
export function quitarFranja(st, id) { st.disponibilidad = st.disponibilidad.filter(d => d.id !== id); return ok(); }

/** Copia la disponibilidad vigente de otro empleado; queda con vigencia de hoy y reemplaza la de hoy. */
export function copiarDisponibilidad(st, origenId, destinoId) {
  const hoy = ahora().fecha, franjas = franjasVigentes(st, origenId, hoy).map(f => ({ ...f }));
  st.disponibilidad = st.disponibilidad.filter(d => !(d.empId === destinoId && d.vigente === hoy));
  for (const f of franjas) st.disponibilidad.push({ id: nuevoId(st), empId: destinoId, dia: f.dia, desde: f.desde, hasta: f.hasta, vigente: hoy });
  return ok({ copiadas: franjas.length, vigente: hoy });
}
export function nuevaVigencia(st, empId, desde) {
  if (!desde) return err('Elige desde qué fecha rige.');
  if (st.disponibilidad.some(d => d.empId === empId && d.vigente === desde)) return err('Ya existe una configuración con esa fecha.');
  const base = franjasVigentes(st, empId, desde);
  for (const f of base) st.disponibilidad.push({ id: nuevoId(st), empId, dia: f.dia, desde: f.desde, hasta: f.hasta, vigente: desde });
  return ok({ franjas: base.length });
}

// ---------- avisos (a quién se llamó) ----------
export function ciclarAviso(st, fecha, empId) {
  const k = `${fecha}|${empId}`;
  st.avisos[k] = ((st.avisos[k] || 0) + 1) % 4;
  return ok();
}

// ---------- cierre de semana ----------
export function cerrarSemana(st, lunes) {
  const version = cierresDe(st, lunes).length + 1;
  st.cierres.push({ semana: lunes, version, fecha: ahora().fecha, filas: filasParaCierre(st, lunes) });
  return ok({ version });
}

// ---------- ajustes ----------
export function guardarAjustes(st, { organizacion, descripcion, zona }) {
  zona = (zona || '').trim();
  if (zona && !zonaValida(zona)) return err('La zona horaria no es válida.');
  st.ajustes = { ...st.ajustes, organizacion: (organizacion || '').trim().slice(0, 60), descripcion: (descripcion || '').trim().slice(0, 100), zona };
  return ok();
}

/** Primer paso: nombre, para qué se usa y las primeras personas (una por línea, o separadas por comas). */
export function configuracionInicial(st, { organizacion, descripcion, personas }) {
  const r = guardarAjustes(st, { organizacion, descripcion, zona: st.ajustes.zona });
  if (r.error) return r;
  let agregadas = 0, repetidas = 0;
  for (const nombre of String(personas || '').split(/[\n,;]+/).map(x => x.trim()).filter(Boolean)) {
    if (A_agregar(st, nombre)) agregadas++; else repetidas++;
  }
  st.ajustes.bienvenida = true;
  return ok({ agregadas, repetidas });
}
const A_agregar = (st, nombre) => !!agregarEmpleado(st, nombre).ok;

// ---------- copia de seguridad ----------
export const exportarCopia = st => JSON.stringify({ app: 'control-asistencia', exportado: new Date().toISOString(), datos: st });
export function importarCopia(texto) {
  let o;
  try { o = JSON.parse(texto); } catch (e) { return err('El archivo no es una copia válida.'); }
  const d = o && o.app === 'control-asistencia' ? o.datos : null;
  if (!d || d.v !== 1 || !Array.isArray(d.empleados) || !Array.isArray(d.tramos) || !Array.isArray(d.turnos)) return err('El archivo no es una copia de esta aplicación.');
  return ok({ datos: conPorDefecto(d) });
}
