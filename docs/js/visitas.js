// Visitas (museos, tiendas, eventos…): grupos que llegan, recorridos y resúmenes. Lógica sin pantalla.
//
//  - Una VISITA es un grupo que llega: una institución, un medio, otro tipo con nombre, o "particulares" (solo cuántos).
//  - Un RECORRIDO es una visita guiada y puede juntar uno o varios grupos. Toda visita se anota, tenga recorrido o no.
//  - El guía de un recorrido es una de las personas de la lista de asistencia (opcional).
//  - El detalle por edad, por sexo y los extras son opcionales; lo que no se detalla sale como "sin detallar".
import { nuevoId } from './store.js';
import { aMin } from './horas.js';
import { ahora, sumarDias, ultimoDiaMes } from './fechas.js';

const err = error => ({ error });
const ok = (x = {}) => ({ ok: true, ...x });
const norm = s => String(s || '').trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ');
const entero = v => { const n = Number(v); return Number.isInteger(n) && n > 0 ? n : 0; };
const suma = o => Object.values(o || {}).reduce((s, n) => s + n, 0);

// ---------- consultas básicas ----------
export const tiposActivos = st => st.visitas.tipos.filter(t => !t.archivado);
export const tipoDe = (st, id) => st.visitas.tipos.find(t => t.id === id);
export const entidadDe = (st, id) => st.visitas.entidades.find(e => e.id === id);
export const entidadesDe = (st, tipoId, conArchivadas = false) =>
  st.visitas.entidades.filter(e => e.tipoId === tipoId && (conArchivadas || !e.archivado)).sort((a, b) => a.nombre.localeCompare(b.nombre));
export const edadesActivas = st => st.visitas.edades.filter(e => !e.archivado);
export const extrasActivos = st => st.visitas.extras.filter(e => e.activo);
export const visitasDelDia = (st, fecha) => st.visitas.registros.filter(r => r.fecha === fecha).sort((a, b) => a.hora - b.hora || a.id - b.id);
export const recorridosDelDia = (st, fecha) => st.visitas.recorridos.filter(r => r.fecha === fecha).sort((a, b) => a.hora - b.hora || a.id - b.id);
export const personasDelRecorrido = (st, recId) => st.visitas.registros.filter(r => r.recorridoId === recId).reduce((s, r) => s + r.personas, 0);
export const gruposDelRecorrido = (st, recId) => st.visitas.registros.filter(r => r.recorridoId === recId).sort((a, b) => a.hora - b.hora || a.id - b.id);

/** Nombre a mostrar de una visita: el de la institución/medio, o el del tipo (p. ej. "Particulares"). */
export function nombreVisita(st, r) {
  const e = r.entidadId != null ? entidadDe(st, r.entidadId) : null;
  return e ? e.nombre : (tipoDe(st, r.tipoId) || { nombre: 'Visita' }).nombre;
}

// ---------- limpieza ----------
function limpiarRecorridosVacios(st) {
  const usados = new Set(st.visitas.registros.map(r => r.recorridoId).filter(x => x != null));
  st.visitas.recorridos = st.visitas.recorridos.filter(r => usados.has(r.id));
}

// ---------- registrar / editar / eliminar una visita ----------
function limpiarConteos(entrada, ids) {
  const out = {};
  for (const id of ids) { const n = entero((entrada || {})[id]); if (n) out[id] = n; }
  return out;
}

/** d: { id?, fecha, hora:'HH:MM', tipoId, nombre, personas, edades:{id:n}, sexos:{id:n}, extras:{id:n},
 *       recorrido:{ modo:'ninguno'|'nuevo'|'existente', id?, hora?:'HH:MM', guiaId? } } */
export function guardarVisita(st, d) {
  const a = ahora(), V = st.visitas;
  const tipo = tipoDe(st, d.tipoId);
  if (!tipo) return err('Elige el tipo de visitante.');
  const fecha = d.fecha || a.fecha;
  if (fecha > a.fecha) return err('La fecha no puede ser futura.');
  if (!/^\d{2}:\d{2}$/.test(d.hora || '')) return err('Indica la hora.');
  const hora = aMin(d.hora);
  if (fecha === a.fecha && hora > a.min) return err('Esa hora todavía no ha llegado.');

  const nombre = String(d.nombre || '').trim();
  if (tipo.conNombre && !nombre) return err(`Escribe el nombre (${tipo.nombre.toLowerCase()}).`);

  const idsEdad = V.edades.filter(e => !e.archivado || (d.edades || {})[e.id]).map(e => e.id);
  const edades = limpiarConteos(d.edades, idsEdad);
  const sexos = limpiarConteos(d.sexos, V.sexos.map(s => s.id));
  const extras = limpiarConteos(d.extras, V.extras.map(x => x.id));
  const personas = suma(edades) > 0 ? suma(edades) : entero(d.personas);
  if (!personas) return err('Indica cuántas personas.');
  if (suma(sexos) > personas) return err('Mujeres y hombres no pueden sumar más que el total de personas.');
  for (const [id, n] of Object.entries(extras)) if (n > personas) return err(`"${V.extras.find(x => x.id === id).nombre}" no puede ser más que el total de personas.`);

  // recorrido
  const r = d.recorrido || { modo: 'ninguno' };
  let recorridoId = null, nuevoRec = null;
  if (r.modo === 'existente') {
    const rec = V.recorridos.find(x => x.id === Number(r.id));
    if (!rec) return err('Ese recorrido ya no existe.');
    if (rec.fecha !== fecha) return err('El recorrido es de otro día.');
    recorridoId = rec.id;
  } else if (r.modo === 'nuevo') {
    const rh = /^\d{2}:\d{2}$/.test(r.hora || '') ? aMin(r.hora) : hora;
    if (fecha === a.fecha && rh > a.min) return err('La hora del recorrido todavía no ha llegado.');
    nuevoRec = { id: nuevoId(st), fecha, hora: rh, guiaId: r.guiaId ? Number(r.guiaId) : null };
    recorridoId = nuevoRec.id;
  }
  // todo está validado: ahora sí se crean el nombre y el recorrido nuevos
  let entidadId = null;
  if (tipo.conNombre) {
    const igual = V.entidades.find(e => e.tipoId === tipo.id && norm(e.nombre) === norm(nombre));
    if (igual) { igual.archivado = false; entidadId = igual.id; }
    else { entidadId = nuevoId(st); V.entidades.push({ id: entidadId, tipoId: tipo.id, nombre, archivado: false }); }
  }
  if (nuevoRec) V.recorridos.push(nuevoRec);

  const reg = { id: d.id || nuevoId(st), fecha, hora, tipoId: tipo.id, entidadId, personas, edades, sexos, extras, recorridoId };
  const i = d.id ? V.registros.findIndex(x => x.id === d.id) : -1;
  if (i >= 0) V.registros[i] = reg; else V.registros.push(reg);
  limpiarRecorridosVacios(st);
  return ok({ registro: reg });
}

export function eliminarVisita(st, id) {
  st.visitas.registros = st.visitas.registros.filter(r => r.id !== id);
  limpiarRecorridosVacios(st);
  return ok();
}

// ---------- recorridos ----------
export function editarRecorrido(st, id, { hora, guiaId }) {
  const rec = st.visitas.recorridos.find(r => r.id === id);
  if (!rec) return err('Ese recorrido ya no existe.');
  if (!/^\d{2}:\d{2}$/.test(hora || '')) return err('Indica la hora.');
  const min = aMin(hora);
  if (rec.fecha === ahora().fecha && min > ahora().min) return err('Esa hora todavía no ha llegado.');
  rec.hora = min; rec.guiaId = guiaId ? Number(guiaId) : null;
  return ok();
}
/** Quita el recorrido; sus grupos siguen registrados, sin recorrido. */
export function eliminarRecorrido(st, id) {
  st.visitas.registros.forEach(r => { if (r.recorridoId === id) r.recorridoId = null; });
  st.visitas.recorridos = st.visitas.recorridos.filter(r => r.id !== id);
  return ok();
}

// ---------- nombres (instituciones, medios…) ----------
export function renombrarEntidad(st, id, nombre) {
  nombre = String(nombre || '').trim();
  const e = entidadDe(st, id);
  if (!nombre) return err('El nombre no puede quedar vacío.');
  if (st.visitas.entidades.some(x => x.id !== id && x.tipoId === e.tipoId && norm(x.nombre) === norm(nombre))) return err('Ya existe ese nombre. Usa "Unir con otro" para juntarlos.');
  e.nombre = nombre;
  return ok();
}
export function archivarEntidad(st, id, archivar = true) { entidadDe(st, id).archivado = archivar; return ok(); }
/** Junta dos nombres del mismo tipo (por ejemplo, uno escrito de dos formas): las visitas pasan al destino. */
export function unirEntidades(st, origenId, destinoId) {
  const o = entidadDe(st, origenId), d = entidadDe(st, destinoId);
  if (!o || !d || o.id === d.id) return err('Elige dos nombres distintos.');
  if (o.tipoId !== d.tipoId) return err('Solo se pueden unir nombres del mismo tipo.');
  st.visitas.registros.forEach(r => { if (r.entidadId === o.id) r.entidadId = d.id; });
  st.visitas.entidades = st.visitas.entidades.filter(e => e.id !== o.id);
  return ok();
}
export const visitasDeEntidad = (st, id) => st.visitas.registros.filter(r => r.entidadId === id).length;
export function eliminarEntidad(st, id) {
  if (visitasDeEntidad(st, id)) return err('Tiene visitas registradas: no se puede eliminar, solo archivar.');
  st.visitas.entidades = st.visitas.entidades.filter(e => e.id !== id);
  return ok();
}

// ---------- configuración: tipos, edades, sexo, extras ----------
const unico = (lista, nombre, exceptoId) => !lista.some(x => x.id !== exceptoId && norm(x.nombre) === norm(nombre));
export function agregarTipo(st, { nombre, conNombre }) {
  nombre = String(nombre || '').trim();
  if (!nombre) return err('Escribe el nombre del tipo.');
  if (!unico(st.visitas.tipos, nombre)) return err('Ya existe un tipo con ese nombre.');
  st.visitas.tipos.push({ id: 't' + nuevoId(st), nombre, conNombre: !!conNombre, archivado: false });
  return ok();
}
export function editarTipo(st, id, nombre) {
  nombre = String(nombre || '').trim();
  if (!nombre) return err('El nombre no puede quedar vacío.');
  if (!unico(st.visitas.tipos, nombre, id)) return err('Ya existe un tipo con ese nombre.');
  tipoDe(st, id).nombre = nombre;
  return ok();
}
export function archivarTipo(st, id, archivar = true) {
  if (archivar && tiposActivos(st).length <= 1) return err('Debe quedar al menos un tipo de visitante.');
  tipoDe(st, id).archivado = archivar;
  return ok();
}
export function agregarEdad(st, { nombre, rango }) {
  nombre = String(nombre || '').trim();
  if (!nombre) return err('Escribe el nombre del grupo de edad.');
  if (!unico(st.visitas.edades, nombre)) return err('Ya existe un grupo con ese nombre.');
  st.visitas.edades.push({ id: 'e' + nuevoId(st), nombre, rango: String(rango || '').trim(), archivado: false });
  return ok();
}
export function editarEdad(st, id, { nombre, rango }) {
  nombre = String(nombre || '').trim();
  if (!nombre) return err('El nombre no puede quedar vacío.');
  if (!unico(st.visitas.edades, nombre, id)) return err('Ya existe un grupo con ese nombre.');
  const e = st.visitas.edades.find(x => x.id === id);
  e.nombre = nombre; e.rango = String(rango || '').trim();
  return ok();
}
export function archivarEdad(st, id, archivar = true) { st.visitas.edades.find(x => x.id === id).archivado = archivar; return ok(); }
export function guardarOpciones(st, { activo, usarSexo, extras }) {
  const V = st.visitas;
  if (activo !== undefined) V.activo = !!activo;
  if (usarSexo !== undefined) V.usarSexo = !!usarSexo;
  if (extras) V.extras.forEach(x => { if (x.id in extras) x.activo = !!extras[x.id]; });
  return ok();
}

// ---------- informes ----------
export const rangoDeSemana = lunes => [lunes, sumarDias(lunes, 6)];
export const rangoDeMes = mes => [mes, ultimoDiaMes(mes)];

/** Resumen de visitas entre dos fechas (inclusive). */
export function resumenVisitas(st, desde, hasta) {
  const V = st.visitas, enRango = f => f >= desde && f <= hasta;
  const regs = V.registros.filter(r => enRango(r.fecha));
  const recs = V.recorridos.filter(r => enRango(r.fecha));
  const personas = regs.reduce((s, r) => s + r.personas, 0);
  const recDe = new Map(recs.map(r => [r.id, r]));

  // por tipo
  const porTipo = V.tipos.map(t => {
    const rs = regs.filter(r => r.tipoId === t.id);
    return { tipo: t, visitas: rs.length, personas: rs.reduce((s, r) => s + r.personas, 0) };
  }).filter(x => !x.tipo.archivado || x.visitas);

  // edades, sexos, extras (+ lo que no se detalló)
  const conteo = (campo, lista) => {
    const items = lista.map(x => ({ ...x, n: regs.reduce((s, r) => s + ((r[campo] || {})[x.id] || 0), 0) })).filter(x => !x.archivado || x.n);
    const detallado = regs.reduce((s, r) => s + suma(r[campo]), 0);
    return { items, sinDetallar: personas - detallado };
  };
  const edades = conteo('edades', V.edades);
  const sexos = conteo('sexos', V.sexos);
  const extras = V.extras.map(x => ({ ...x, n: regs.reduce((s, r) => s + ((r.extras || {})[x.id] || 0), 0) })).filter(x => x.activo || x.n);

  // recorridos
  const enRec = regs.filter(r => r.recorridoId != null && recDe.has(r.recorridoId));
  const personasEnRec = enRec.reduce((s, r) => s + r.personas, 0);
  const guiaNombre = id => (id == null ? 'Sin guía' : ((st.empleados.find(e => e.id === id) || {}).nombre || 'Guía eliminado'));
  const porGuia = new Map();
  for (const rec of recs) {
    const k = rec.guiaId == null ? 'sin' : rec.guiaId, g = porGuia.get(k) || { guia: guiaNombre(rec.guiaId), recorridos: 0, personas: 0 };
    g.recorridos++; g.personas += personasDelRecorrido(st, rec.id); porGuia.set(k, g);
  }

  // nombres (instituciones, medios…) con su cantidad de visitas, personas y recorridos
  const entidades = V.tipos.filter(t => t.conNombre).map(t => {
    const items = new Map();
    for (const r of regs.filter(x => x.tipoId === t.id && x.entidadId != null)) {
      const e = entidadDe(st, r.entidadId), it = items.get(r.entidadId) || { id: r.entidadId, nombre: e ? e.nombre : '(sin nombre)', visitas: 0, personas: 0, recs: new Set() };
      it.visitas++; it.personas += r.personas; if (r.recorridoId != null) it.recs.add(r.recorridoId); items.set(r.entidadId, it);
    }
    const lista = [...items.values()].map(({ recs, ...x }) => ({ ...x, recorridos: recs.size })).sort((a, b) => b.personas - a.personas || a.nombre.localeCompare(b.nombre));
    return { tipo: t, items: lista };
  }).filter(g => g.items.length);

  // por día (solo los días con movimiento)
  const dias = [...new Set([...regs.map(r => r.fecha), ...recs.map(r => r.fecha)])].sort().map(fecha => ({
    fecha, visitas: regs.filter(r => r.fecha === fecha).length, personas: regs.filter(r => r.fecha === fecha).reduce((s, r) => s + r.personas, 0), recorridos: recs.filter(r => r.fecha === fecha).length,
  }));

  const listaRec = recs.slice().sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora - b.hora || a.id - b.id).map(rec => ({
    id: rec.id, fecha: rec.fecha, hora: rec.hora, guia: guiaNombre(rec.guiaId), personas: personasDelRecorrido(st, rec.id),
    grupos: gruposDelRecorrido(st, rec.id).map(g => nombreVisita(st, g)),
  }));
  return {
    desde, hasta, visitas: regs.length, personas, porTipo, edades, sexos, extras, listaRecorridos: listaRec,
    recorridos: { n: recs.length, personas: personasEnRec, promedio: recs.length ? personasEnRec / recs.length : 0, sinRecorrido: personas - personasEnRec, porGuia: [...porGuia.values()].sort((a, b) => b.recorridos - a.recorridos) },
    entidades, dias,
    detalle: regs.slice().sort((a, b) => a.fecha.localeCompare(b.fecha) || a.hora - b.hora || a.id - b.id).map(r => {
      const rec = r.recorridoId != null ? recDe.get(r.recorridoId) : null;
      return { ...r, tipo: (tipoDe(st, r.tipoId) || {}).nombre || '', nombre: nombreVisita(st, r), recorrido: rec ? rec : null, guia: rec ? guiaNombre(rec.guiaId) : '' };
    }),
  };
}

/** 1 decimal con coma: 12,5 */
export const dec1 = n => (Math.round(n * 10) / 10).toString().replace('.', ',');
