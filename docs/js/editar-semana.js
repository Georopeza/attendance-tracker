// Registrar o corregir las horas de una semana entera (por ejemplo, una semana que ya pasó o que se anotó mal).
// Se trabaja sobre un borrador: nada se guarda hasta tocar "Guardar semana", y se guarda todo o nada.
import { deMin } from './horas.js';
import { ahora, DIAS, DIAS_LARGOS, diaSemana, lunesDe, sumarDias, fechaCorta, rangoSemana } from './fechas.js';
import * as S from './servicios.js';
import * as A from './acciones.js';
import { esc, toast, confirmar } from './ui.js';
import { tarjeta, titulo, boton, botonPri, pildora, vacio, volver, stepper, flecha } from './atomos.js';

const clave = (empId, fecha) => `${empId}|${fecha}`;

/** Borrador de la edición. Se reinicia al cambiar de semana. */
function borrador(ui, lunes) {
  if (!ui.ed || ui.ed.lunes !== lunes) ui.ed = { lunes, modo: 'dia', dia: null, persona: null, cambios: {}, errores: {}, motivo: '' };
  return ui.ed;
}
const diaPorDefecto = (lunes, hoy) => (hoy >= lunes && hoy <= sumarDias(lunes, 6) ? hoy : lunes);

/** Valores que muestra una fila: lo editado en el borrador o, si no, lo que ya hay guardado. */
function valores(st, ed, empId, fecha) {
  const c = ed.cambios[clave(empId, fecha)];
  if (c) return c;
  const tramos = S.tramosDelDia(st, empId, fecha);
  if (tramos.length > 1) return { varios: true };
  if (tramos.length === 1) return { vino: true, entrada: deMin(tramos[0].entrada), salida: tramos[0].salida != null ? deMin(tramos[0].salida) : '' };
  const [ini, fin] = S.horarioDelDia(st, fecha);
  return { vino: false, entrada: ini, salida: fin };
}

function fila(st, ed, empId, fecha, nombre, subtitulo, hoy) {
  const k = clave(empId, fecha), v = valores(st, ed, empId, fecha), futuro = fecha > hoy, err = ed.errores[k], editada = !!ed.cambios[k];
  const cabeza = `<b class="block truncate">${esc(nombre)}</b>${subtitulo ? `<span class="block text-xs text-slate-500">${subtitulo}</span>` : ''}`;
  if (v.varios) {
    return `<div class="rounded-xl border border-slate-200 bg-white p-3"><div class="min-w-0">${cabeza}</div>
      <p class="mt-1 text-sm text-slate-500">Tiene varios tramos ese día. <a class="font-medium text-blue-700 underline" href="#/dia/${empId}/${fecha}">Corregir el día</a></p></div>`;
  }
  return `<div data-celda="${k}" class="space-y-2 rounded-xl border bg-white p-3 ${err ? 'border-red-400 bg-red-50' : editada ? 'border-blue-300' : 'border-slate-200'} ${futuro ? 'opacity-50' : ''}">
    <label class="flex min-h-[44px] cursor-pointer items-center gap-3"><input type="checkbox" name="vino" ${v.vino ? 'checked' : ''} ${futuro ? 'disabled' : ''} class="h-7 w-7 flex-none accent-blue-700">
      <span class="min-w-0 flex-1">${cabeza}</span>${editada ? pildora('editada', 'bg-blue-100 text-blue-800') : ''}</label>
    <div class="flex items-center gap-2 pl-10"><input type="time" name="entrada" value="${esc(v.entrada)}" ${futuro ? 'disabled' : ''} aria-label="Entrada de ${esc(nombre)}" class="w-full rounded-lg border border-slate-300 px-2 py-2.5">
      <span class="text-slate-500">a</span><input type="time" name="salida" value="${esc(v.salida)}" ${futuro ? 'disabled' : ''} aria-label="Salida de ${esc(nombre)}" class="w-full rounded-lg border border-slate-300 px-2 py-2.5"></div>
    ${futuro ? '<p class="pl-10 text-xs text-slate-500">Todavía no llega este día.</p>' : ''}${err ? `<p class="pl-10 text-sm text-red-700">${esc(err)}</p>` : ''}</div>`;
}

export function vistaEditarSemana({ st, ui }) {
  const a = ahora(), lunes = ui.semana || lunesDe(a.fecha), ed = borrador(ui, lunes), activos = S.empleadosActivos(st);
  const cerrada = S.ultimoCierre(st, lunes), n = Object.keys(ed.cambios).length;
  const dias = Array.from({ length: 7 }, (_, i) => sumarDias(lunes, i));
  if (!ed.dia || !dias.includes(ed.dia)) ed.dia = diaPorDefecto(lunes, a.fecha);
  if (!activos.some(e => e.id === ed.persona)) ed.persona = activos[0] && activos[0].id;
  const cab = `${volver('#/semana', 'Resumen semanal')}${titulo('Registrar o corregir una semana', 'Para anotar una semana que no se llevó en la app, o arreglar un error. No se guarda nada hasta que toques "Guardar semana".')}
    ${stepper(flecha('←', 'data-a="ed-sem" data-d="-7"', 'Semana anterior'), `<h2 class="text-lg font-bold">Semana ${rangoSemana(lunes)}</h2>`, flecha('→', 'data-a="ed-sem" data-d="7"', 'Semana siguiente', sumarDias(lunes, 7) > a.fecha))}`;
  if (!activos.length) return cab + vacio('No hay personas activas. Agrégalas en Más → Personas.');

  const barra = `<div class="sticky top-2 z-30 my-3 flex items-center justify-between gap-2 rounded-2xl border ${n ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white'} p-3 shadow-sm">
    <p id="ed-n" class="text-sm ${n ? 'font-medium text-blue-900' : 'text-slate-500'}">${n ? `${n} ${n === 1 ? 'fila editada' : 'filas editadas'} sin guardar` : 'Sin cambios todavía'}</p>
    <div class="flex gap-2">${n ? boton('Descartar', 'data-a="ed-descartar"', 'border border-slate-300 bg-white !px-3') : ''}${botonPri('Guardar semana', 'data-a="ed-guardar"')}</div></div>`;
  const aviso = cerrada ? `<div class="mb-3 rounded-2xl border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900"><p><b>Esta semana ya fue entregada</b> (versión ${cerrada.version}). Los cambios se mostrarán como diferencia contra lo entregado, y hace falta un motivo.</p>
    <input id="ed-motivo" value="${esc(ed.motivo)}" placeholder="Motivo del cambio (obligatorio)" class="mt-2 w-full rounded-lg border border-blue-300 bg-white px-3 py-2.5 text-base"></div>` : '';
  const global = tarjeta(`<p class="mb-2 text-sm text-slate-600">Para empezar rápido: pone a todos como asistentes, con el horario del turno, en los días con turno que todavía no tienen horas. Después ajustas lo que difiera.</p>
    ${boton('Llenar la semana con el horario del turno', 'data-a="ed-llenar"', 'border border-blue-300 bg-blue-50 text-blue-800')}`);
  const modos = `<div class="my-4 grid grid-cols-2 rounded-xl border border-slate-200 bg-white p-1 text-sm font-medium" role="tablist">
    <button data-a="ed-modo" data-m="dia" role="tab" aria-selected="${ed.modo === 'dia'}" class="min-h-[44px] rounded-lg ${ed.modo === 'dia' ? 'bg-blue-700 text-white' : ''}">Por día</button>
    <button data-a="ed-modo" data-m="persona" role="tab" aria-selected="${ed.modo === 'persona'}" class="min-h-[44px] rounded-lg ${ed.modo === 'persona' ? 'bg-blue-700 text-white' : ''}">Por persona</button></div>`;

  let cuerpo;
  if (ed.modo === 'dia') {
    const chips = `<div class="-mx-4 mb-3 flex gap-2 overflow-x-auto px-4 pb-1">${dias.map(f => `<button data-a="ed-dia" data-f="${f}" ${f > a.fecha ? 'disabled' : ''} class="min-h-[52px] flex-none rounded-xl border px-4 text-sm disabled:opacity-40 ${f === ed.dia ? 'border-blue-700 bg-blue-700 font-semibold text-white' : 'border-slate-300 bg-white'}">${DIAS[diaSemana(f)]}<br>${fechaCorta(f)}</button>`).join('')}</div>`;
    const [ini, fin] = S.horarioDelDia(st, ed.dia);
    const turno = ini ? `Turno ${ini}–${fin}` : 'Sin turno ese día';
    cuerpo = `${chips}<div class="mb-3 flex flex-wrap items-center gap-2"><span class="text-sm text-slate-500">${turno}</span>
      ${ed.dia <= a.fecha ? `${boton('Todos vinieron', 'data-a="ed-dia-todos" data-v="1"', 'border border-slate-300 bg-white !py-2')}${boton('Nadie', 'data-a="ed-dia-todos" data-v="0"', 'border border-slate-300 bg-white !py-2')}` : ''}</div>
      <div class="grid gap-2 md:grid-cols-2">${activos.map(e => fila(st, ed, e.id, ed.dia, e.nombre, '', a.fecha)).join('')}</div>`;
  } else {
    const emp = S.empleado(st, ed.persona);
    cuerpo = `<label class="mb-3 block text-sm text-slate-600" for="ed-persona">Persona
      <select id="ed-persona" data-a="ed-persona" class="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base">${activos.map(e => `<option value="${e.id}" ${e.id === ed.persona ? 'selected' : ''}>${esc(e.nombre)}</option>`).join('')}</select></label>
      <div class="mb-3">${boton('Asistió todos los días con turno', 'data-a="ed-persona-llenar"', 'border border-slate-300 bg-white !py-2')}</div>
      <div class="grid gap-2 md:grid-cols-2">${dias.map(f => fila(st, ed, emp.id, f, `${DIAS_LARGOS[diaSemana(f)]} ${fechaCorta(f)}`, S.turnosDelDia(st, f).length ? '' : 'Sin turno: todo es extra', a.fecha)).join('')}</div>`;
  }
  return `${cab}${global}${modos}${aviso}${barra}${cuerpo}<p class="mt-4 text-xs text-slate-500">Quien tiene varios tramos en un día (fue y volvió) se corrige con "Corregir el día". Los días que todavía no llegan no se pueden marcar.</p>`;
}

// ---------- captura de lo que se escribe (sin volver a dibujar) ----------
/** Lee la fila que se tocó y la guarda en el borrador. */
export function alEditarFila(ui, el) {
  const celda = el.closest('[data-celda]');
  if (!celda || !ui.ed) return;
  ui.ed.cambios[celda.dataset.celda] = { vino: celda.querySelector('[name=vino]').checked, entrada: celda.querySelector('[name=entrada]').value, salida: celda.querySelector('[name=salida]').value };
  delete ui.ed.errores[celda.dataset.celda];
  const n = Object.keys(ui.ed.cambios).length, txt = document.getElementById('ed-n');
  if (txt) { txt.textContent = `${n} ${n === 1 ? 'fila editada' : 'filas editadas'} sin guardar`; txt.className = 'text-sm font-medium text-blue-900'; }
}
export function alEscribirMotivo(ui, el) { if (ui.ed) ui.ed.motivo = el.value; }

// ---------- acciones ----------
const hoyFecha = () => ahora().fecha;
const llenarCelda = (st, ed, empId, fecha, vino) => {
  const v = valores(st, ed, empId, fecha);
  if (v.varios || fecha > hoyFecha()) return false;
  const [ini, fin] = S.horarioDelDia(st, fecha);
  ed.cambios[clave(empId, fecha)] = vino ? { vino: true, entrada: ini || v.entrada, salida: fin || v.salida } : { vino: false, entrada: v.entrada, salida: v.salida };
  return true;
};

export const accionesEditarSemana = {
  'ed-modo': ({ ui, d }) => { ui.ed.modo = d.m; return false; },
  'ed-dia': ({ ui, d }) => { ui.ed.dia = d.f; return false; },
  'ed-persona': ({ ui, el }) => { ui.ed.persona = Number(el.value); return false; },
  'ed-dia-todos': ({ st, ui, d }) => { for (const e of S.empleadosActivos(st)) llenarCelda(st, ui.ed, e.id, ui.ed.dia, d.v === '1'); return false; },
  'ed-persona-llenar': ({ st, ui }) => {
    for (let i = 0; i < 7; i++) { const f = sumarDias(ui.ed.lunes, i); if (S.turnosDelDia(st, f).length && !S.tramosDelDia(st, ui.ed.persona, f).length) llenarCelda(st, ui.ed, ui.ed.persona, f, true); }
    return false;
  },
  'ed-llenar': ({ st, ui }) => {
    let n = 0;
    for (const e of S.empleadosActivos(st)) for (let i = 0; i < 7; i++) {
      const f = sumarDias(ui.ed.lunes, i), v = valores(st, ui.ed, e.id, f);
      if (S.turnosDelDia(st, f).length && !v.varios && !v.vino && !S.tramosDelDia(st, e.id, f).length && llenarCelda(st, ui.ed, e.id, f, true)) n++;
    }
    toast(n ? `Se llenaron ${n} filas. Revisa y toca "Guardar semana".` : 'No hay días con turno vacíos para llenar.');
    return false;
  },
  'ed-sem': async ({ ui, d }) => {
    if (Object.keys(ui.ed.cambios).length) {
      const ok = await confirmar({ titulo: '¿Cambiar de semana?', mensaje: 'Tienes cambios sin guardar en esta semana. Si cambias, se descartan.', boton: 'Sí, descartar', peligro: true });
      if (!ok) return false;
    }
    ui.semana = sumarDias(ui.ed.lunes, Number(d.d)); return false;
  },
  'ed-descartar': async ({ ui }) => {
    const ok = await confirmar({ titulo: '¿Descartar los cambios?', mensaje: 'Se pierde lo que editaste y no se guardó.', boton: 'Sí, descartar', peligro: true });
    if (!ok) return false;
    ui.ed.cambios = {}; ui.ed.errores = {}; return false;
  },
  'ed-guardar': ({ st, ui }) => {
    const ed = ui.ed, items = Object.entries(ed.cambios).map(([k, v]) => { const [e, f] = k.split('|'); return { empId: Number(e), fecha: f, ...v }; });
    if (!items.length) { toast('No hay cambios que guardar.'); return false; }
    const r = A.guardarSemana(st, items, ed.motivo);
    if (r.error) { ed.errores = r.errores || {}; toast(r.motivoRequerido ? r.error : 'Revisa las filas marcadas en rojo.', 'error'); return false; }
    ed.cambios = {}; ed.errores = {}; ed.motivo = '';
    toast(`Semana guardada (${r.cambios} ${r.cambios === 1 ? 'cambio' : 'cambios'}).${r.omitidos.length ? ` ${r.omitidos.length} día(s) con varios tramos no se tocaron.` : ''}`);
    return true;
  },
};

export const RUTAS_EDITAR_SEMANA = { 'editar-semana': { v: vistaEditarSemana, tab: 'semana', ancho: true } };
