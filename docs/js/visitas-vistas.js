// Pantallas del registro de visitas: día, formulario, informes (semana y mes), configuración y nombres.
import { deMin } from './horas.js';
import { ahora, DIAS, DIAS_LARGOS, diaSemana, lunesDe, sumarDias, fechaCorta, fechaCompleta, fechaLarga, rangoSemana, primerDiaMes, sumarMeses, nombreMes } from './fechas.js';
import * as S from './servicios.js';
import * as V from './visitas.js';
import { esc, toast, confirmar, formulario } from './ui.js';
import { tarjeta, titulo, boton, botonPri, pildora, vacio, volver, stepper, flecha, botonesExportar } from './atomos.js';

// ---------- piezas ----------
const conmutadorVisitas = actual => `<div class="mb-4 flex items-center gap-2"><div class="grid flex-1 grid-cols-3 rounded-xl border border-slate-200 bg-white p-1 text-sm font-medium" role="tablist">
  ${[['dia', 'Día', '#/visitas'], ['semana', 'Semana', '#/visitas/semana'], ['mes', 'Mes', '#/visitas/mes']].map(([k, t, h]) =>
    `<a href="${h}" role="tab" aria-selected="${actual === k}" class="flex min-h-[44px] items-center justify-center rounded-lg ${actual === k ? 'bg-blue-700 text-white' : ''}">${t}</a>`).join('')}</div>
  <a href="#/visitas/config" aria-label="Configurar visitas" class="grid h-12 w-12 flex-none place-items-center rounded-xl border border-slate-200 bg-white text-slate-600"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/></svg></a></div>`;

const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
const personasTxt = n => plural(n, 'persona', 'personas');
/** "20 niños · 5 adultos": lo que se detalló de una visita. */
function detalleCorto(st, r) {
  const partes = [];
  for (const e of st.visitas.edades) if ((r.edades || {})[e.id]) partes.push(`${r.edades[e.id]} ${e.nombre.toLowerCase()}`);
  for (const x of st.visitas.sexos) if ((r.sexos || {})[x.id]) partes.push(`${r.sexos[x.id]} ${x.nombre.toLowerCase()}`);
  for (const x of st.visitas.extras) if ((r.extras || {})[x.id]) partes.push(`${r.extras[x.id]} ${x.nombre.toLowerCase()}`);
  return partes.join(' · ');
}
const nombreGuia = (st, id) => (id == null ? '' : (S.empleado(st, id) || { nombre: '' }).nombre);

// ================= DÍA =================
function filaGrupo(st, r) {
  const det = detalleCorto(st, r), tipo = V.tipoDe(st, r.tipoId);
  return `<button data-a="editar-visita" data-id="${r.id}" class="flex min-h-[56px] w-full items-center justify-between gap-3 border-t border-slate-100 py-2 text-left first:border-0">
    <span class="min-w-0"><b class="block truncate">${esc(V.nombreVisita(st, r))}</b><span class="block text-xs text-slate-500">${[tipo && tipo.nombre !== V.nombreVisita(st, r) ? esc(tipo.nombre) : '', deMin(r.hora), det ? esc(det) : ''].filter(Boolean).join(' · ')}</span></span>
    <span class="flex-none whitespace-nowrap text-lg font-bold tabular-nums">${r.personas}</span></button>`;
}

export function vistaVisitasDia({ st, ui }) {
  const a = ahora(), fecha = ui.vFecha || a.fecha, esHoy = fecha === a.fecha;
  const regs = V.visitasDelDia(st, fecha), recs = V.recorridosDelDia(st, fecha), total = regs.reduce((s, r) => s + r.personas, 0);
  const sueltos = regs.filter(r => r.recorridoId == null);
  const cab = `${conmutadorVisitas('dia')}${stepper(flecha('←', 'data-a="v-dia" data-d="-1"', 'Día anterior'),
    `<h1 class="text-xl font-bold leading-tight">${esHoy ? 'Hoy' : 'Día'} · ${fechaLarga(fecha)}</h1>`, flecha('→', 'data-a="v-dia" data-d="1"', 'Día siguiente', fecha >= a.fecha))}
    ${!esHoy ? `<div class="mt-2 text-center">${boton('Ir a hoy', 'data-a="v-hoy"')}</div>` : ''}
    <div class="my-4 grid grid-cols-3 gap-2 text-center"><div class="rounded-2xl border border-slate-200 bg-white p-3"><b class="block text-2xl tabular-nums">${total}</b><span class="text-xs text-slate-500">${total === 1 ? 'persona' : 'personas'}</span></div>
      <div class="rounded-2xl border border-slate-200 bg-white p-3"><b class="block text-2xl tabular-nums">${regs.length}</b><span class="text-xs text-slate-500">${regs.length === 1 ? 'grupo' : 'grupos'}</span></div>
      <div class="rounded-2xl border border-slate-200 bg-white p-3"><b class="block text-2xl tabular-nums">${recs.length}</b><span class="text-xs text-slate-500">${recs.length === 1 ? 'recorrido' : 'recorridos'}</span></div></div>
    <button data-a="nueva-visita" class="mb-5 min-h-[56px] w-full rounded-xl bg-blue-700 text-lg font-semibold text-white">+ Registrar visita</button>`;
  if (!regs.length) return cab + vacio(esHoy ? 'Todavía no hay visitas hoy. Toca "Registrar visita" cuando llegue un grupo.' : 'No hay visitas registradas este día.');
  const tarjetasRec = recs.map(rec => {
    const grupos = V.gruposDelRecorrido(st, rec.id), guia = nombreGuia(st, rec.guiaId);
    return `<section class="rounded-2xl border border-slate-200 bg-white p-4">
      <div class="mb-1 flex items-start justify-between gap-2"><div><b>Recorrido ${deMin(rec.hora)}</b><span class="block text-xs text-slate-500">${guia ? 'Guía: ' + esc(guia) : 'Sin guía anotado'} · ${plural(grupos.length, 'grupo', 'grupos')} · ${personasTxt(V.personasDelRecorrido(st, rec.id))}</span></div>
        <div class="flex flex-none gap-1">${boton('Editar', `data-a="editar-recorrido" data-id="${rec.id}"`, 'border border-slate-300 bg-white !px-3 !text-xs')}${boton('Quitar', `data-a="quitar-recorrido" data-id="${rec.id}"`, 'border border-slate-300 bg-white !px-3 !text-xs')}</div></div>
      ${grupos.map(g => filaGrupo(st, g)).join('')}</section>`;
  }).join('');
  const sinRec = sueltos.length ? `<section class="rounded-2xl border border-slate-200 bg-white p-4"><b>Sin recorrido</b>${sueltos.map(g => filaGrupo(st, g)).join('')}</section>` : '';
  return cab + `<div class="space-y-3">${tarjetasRec}${sinRec}</div><p class="mt-3 text-center text-xs text-slate-500">Toca un grupo para corregirlo o eliminarlo.</p>`;
}

// ================= FORMULARIO DE VISITA =================
function formNuevo(st, base = {}) {
  const a = ahora(), tipos = V.tiposActivos(st);
  return { id: null, tipoId: (tipos[0] || {}).id, nombre: '', personas: '', edades: {}, sexos: {}, extras: {}, recorrido: 'ninguno', rHora: deMin(a.min), rGuia: '', fecha: a.fecha, hora: deMin(a.min), error: '', ...base };
}
function formDe(st, r) {
  const rec = r.recorridoId != null ? st.visitas.recorridos.find(x => x.id === r.recorridoId) : null;
  const strs = o => Object.fromEntries(Object.entries(o || {}).map(([k, v]) => [k, String(v)]));
  return { id: r.id, tipoId: r.tipoId, nombre: r.entidadId != null ? (V.entidadDe(st, r.entidadId) || { nombre: '' }).nombre : '', personas: String(r.personas), edades: strs(r.edades), sexos: strs(r.sexos), extras: strs(r.extras),
    recorrido: rec ? 'r' + rec.id : 'ninguno', rHora: rec ? deMin(rec.hora) : deMin(r.hora), rGuia: rec && rec.guiaId != null ? String(rec.guiaId) : '', fecha: r.fecha, hora: deMin(r.hora), error: '' };
}

/** Lee el formulario abierto y lo guarda en ui.vForm (así no se pierde nada al cambiar de tipo o de recorrido). */
export function capturarVisita(ui, form) {
  const f = new FormData(form), prev = ui.vForm || {}, g = (k, defecto) => (f.has(k) ? String(f.get(k)) : defecto);
  const mapa = pre => { const o = {}; for (const [k, v] of f.entries()) if (k.startsWith(pre)) o[k.slice(pre.length)] = String(v); return o; };
  ui.vForm = { ...prev, tipoId: g('tipoId', prev.tipoId), nombre: g('nombre', prev.nombre), personas: g('personas', prev.personas), edades: mapa('edad-'), sexos: mapa('sexo-'), extras: mapa('extra-'),
    recorrido: g('recorrido', prev.recorrido), rHora: g('rHora', prev.rHora), rGuia: g('rGuia', prev.rGuia), fecha: g('fecha', prev.fecha), hora: g('hora', prev.hora) };
  return ui.vForm;
}
const sumaMapa = o => Object.values(o || {}).reduce((s, v) => s + (Number(v) || 0), 0);
const totalForm = f => (sumaMapa(f.edades) > 0 ? sumaMapa(f.edades) : Number(f.personas) || 0);

/** Se llama en cada tecla dentro del formulario: actualiza el total sin volver a dibujar. */
export function alEscribirVisita(ui, form) {
  const f = capturarVisita(ui, form), el = document.getElementById('v-total');
  if (el) { const n = totalForm(f); el.textContent = n ? `Total: ${personasTxt(n)}` : 'Total: indica cuántas personas'; }
}
/** Cambios que sí obligan a dibujar de nuevo (tipo, recorrido o fecha). */
export function alCambiarVisita(ui, form, nombreCampo) { capturarVisita(ui, form); return ['tipoId', 'recorrido', 'fecha'].includes(nombreCampo); }

const num = (nombre, valor, etiqueta, ayuda = '') => `<label class="flex items-center justify-between gap-3 py-2"><span class="text-sm">${esc(etiqueta)}${ayuda ? `<span class="block text-xs text-slate-500">${esc(ayuda)}</span>` : ''}</span>
  <input type="number" min="0" inputmode="numeric" name="${nombre}" value="${esc(valor || '')}" class="w-24 rounded-lg border border-slate-300 px-3 py-2.5 text-right text-base" placeholder="0"></label>`;
const radio = (nombre, valor, marcado, texto, sub = '') => `<label class="flex min-h-[48px] cursor-pointer items-center gap-3 rounded-xl border border-slate-300 bg-white px-3 py-2 has-[:checked]:border-blue-700 has-[:checked]:bg-blue-50">
  <input type="radio" name="${nombre}" value="${esc(valor)}" ${marcado ? 'checked' : ''} class="h-5 w-5 accent-blue-700"><span class="text-sm">${texto}${sub ? `<span class="block text-xs text-slate-500">${sub}</span>` : ''}</span></label>`;

export function vistaVisita({ st, ui, p }) {
  const nueva = p[1] === 'nueva', id = Number(p[1]);
  if (!ui.vForm || (nueva ? ui.vForm.id !== null : ui.vForm.id !== id)) {
    const reg = nueva ? null : st.visitas.registros.find(r => r.id === id);
    if (!nueva && !reg) return vacio('Esa visita ya no existe.', `<div class="mt-3">${boton('Volver', 'data-a="ir" data-h="#/visitas"')}</div>`);
    ui.vForm = reg ? formDe(st, reg) : formNuevo(st);
  }
  const f = ui.vForm, tipo = V.tipoDe(st, f.tipoId), tipos = V.tiposActivos(st), V_ = st.visitas;
  const entidades = tipo && tipo.conNombre ? V.entidadesDe(st, tipo.id) : [];
  const recsDia = V.recorridosDelDia(st, f.fecha).filter(r => r.id !== null);
  const edades = V.edadesActivas(st).concat(V_.edades.filter(e => e.archivado && Number((f.edades || {})[e.id])));
  const abiertoEdad = sumaMapa(f.edades) > 0, abiertoSexo = sumaMapa(f.sexos) > 0 || sumaMapa(f.extras) > 0;
  const guias = S.empleadosActivos(st);
  const n = totalForm(f);
  return `${volver('#/visitas', 'Visitas')}${titulo(nueva ? 'Registrar visita' : 'Editar visita')}
  ${f.error ? `<p class="mb-3 rounded-xl bg-red-100 px-4 py-3 text-sm text-red-800">${esc(f.error)}</p>` : ''}
  <form data-f="visita" class="space-y-4" autocomplete="off">
    ${tarjeta(`<p class="mb-2 text-sm font-medium text-slate-700">¿Quién viene?</p><div class="grid gap-2 ${tipos.length > 2 ? 'grid-cols-2' : 'grid-cols-1'}">${tipos.map(t => radio('tipoId', t.id, t.id === f.tipoId, esc(t.nombre))).join('')}</div>
      ${tipo && tipo.conNombre ? `<label for="v-nombre" class="mb-1 mt-4 block text-sm font-medium text-slate-700">Nombre (${esc(tipo.nombre.toLowerCase())})</label>
        <input id="v-nombre" name="nombre" list="v-nombres" value="${esc(f.nombre)}" placeholder="Escribe o elige de la lista" class="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base" autocomplete="off">
        <datalist id="v-nombres">${entidades.map(e => `<option value="${esc(e.nombre)}"></option>`).join('')}</datalist>
        <p class="mt-1 text-xs text-slate-500">Si el nombre no existe, se agrega a la lista para la próxima vez.</p>` : '<p class="mt-3 text-sm text-slate-500">Particulares: solo se cuentan las personas.</p>'}`)}
    ${tarjeta(`<label for="v-personas" class="mb-1 block text-sm font-medium text-slate-700">¿Cuántas personas?</label>
      <input id="v-personas" name="personas" type="number" min="1" inputmode="numeric" value="${esc(f.personas)}" ${abiertoEdad ? 'placeholder="(se suma del detalle)"' : ''} class="w-full rounded-lg border border-slate-300 px-3 py-3 text-xl font-semibold">
      <p id="v-total" class="mt-2 text-sm font-medium text-blue-700">${n ? `Total: ${personasTxt(n)}` : 'Total: indica cuántas personas'}</p>
      <details ${abiertoEdad ? 'open' : ''} class="mt-3 border-t border-slate-200 pt-1"><summary class="flex min-h-[44px] cursor-pointer select-none items-center text-sm font-medium text-slate-700">Detallar por edad (opcional)</summary>
        <p class="text-xs text-slate-500">Si llenas esto, el total se suma solo.</p>${edades.map(e => num('edad-' + e.id, (f.edades || {})[e.id], e.nombre, e.rango)).join('')}</details>
      ${V_.usarSexo || V.extrasActivos(st).length ? `<details ${abiertoSexo ? 'open' : ''} class="border-t border-slate-200 pt-1"><summary class="flex min-h-[44px] cursor-pointer select-none items-center text-sm font-medium text-slate-700">Más datos (opcional)</summary>
        ${V_.usarSexo ? V_.sexos.map(x => num('sexo-' + x.id, (f.sexos || {})[x.id], x.nombre)).join('') : ''}
        ${V.extrasActivos(st).map(x => num('extra-' + x.id, (f.extras || {})[x.id], x.nombre)).join('')}
        <p class="text-xs text-slate-500">No pueden sumar más que el total de personas.</p></details>` : ''}`)}
    ${tarjeta(`<p class="mb-2 text-sm font-medium text-slate-700">Recorrido</p><div class="grid gap-2">
      ${radio('recorrido', 'ninguno', f.recorrido === 'ninguno', 'Sin recorrido')}
      ${radio('recorrido', 'nuevo', f.recorrido === 'nuevo', 'Nuevo recorrido')}
      ${recsDia.map(r => radio('recorrido', 'r' + r.id, f.recorrido === 'r' + r.id, `Unir al recorrido de las ${deMin(r.hora)}`,
        `${nombreGuia(st, r.guiaId) ? 'Guía: ' + esc(nombreGuia(st, r.guiaId)) + ' · ' : ''}${personasTxt(V.personasDelRecorrido(st, r.id))}`)).join('')}</div>
      ${f.recorrido === 'nuevo' ? `<div class="mt-3 grid grid-cols-2 gap-3"><div><label for="v-rhora" class="mb-1 block text-xs text-slate-600">Hora del recorrido</label>
        <input id="v-rhora" name="rHora" type="time" value="${esc(f.rHora)}" class="w-full rounded-lg border border-slate-300 px-2 py-2.5"></div>
        <div><label for="v-rguia" class="mb-1 block text-xs text-slate-600">Guía</label><select id="v-rguia" name="rGuia" class="w-full rounded-lg border border-slate-300 bg-white px-2 py-2.5">
        <option value="">Sin guía</option>${guias.map(g => `<option value="${g.id}" ${String(g.id) === String(f.rGuia) ? 'selected' : ''}>${esc(g.nombre)}</option>`).join('')}</select></div></div>
        ${guias.length ? '' : '<p class="mt-2 text-xs text-slate-500">Los guías salen de la lista de personas (Más → Personas).</p>'}` : ''}`)}
    ${tarjeta(`<details><summary class="flex min-h-[44px] cursor-pointer select-none items-center text-sm font-medium text-slate-700">Fecha y hora: ${f.fecha === ahora().fecha ? 'hoy' : fechaCompleta(f.fecha)}, ${esc(f.hora)}</summary>
      <div class="grid grid-cols-2 gap-3 pt-1"><div><label for="v-fecha" class="mb-1 block text-xs text-slate-600">Fecha</label><input id="v-fecha" name="fecha" type="date" value="${esc(f.fecha)}" max="${ahora().fecha}" class="w-full rounded-lg border border-slate-300 px-2 py-2.5"></div>
      <div><label for="v-hora" class="mb-1 block text-xs text-slate-600">Hora</label><input id="v-hora" name="hora" type="time" value="${esc(f.hora)}" class="w-full rounded-lg border border-slate-300 px-2 py-2.5"></div></div>
      <p class="mt-2 text-xs text-slate-500">Cámbialas si se te olvidó anotar a tiempo.</p></details>`)}
    <button class="min-h-[56px] w-full rounded-xl bg-blue-700 text-lg font-semibold text-white">Guardar</button>
    ${nueva ? '<button name="otra" value="1" class="min-h-[48px] w-full rounded-xl border border-slate-300 bg-white font-medium">Guardar y registrar otra</button>'
      : `<button type="button" data-a="eliminar-visita" data-id="${id}" class="min-h-[48px] w-full rounded-xl border border-red-300 bg-white font-medium text-red-700">Eliminar esta visita</button>`}
  </form>`;
}

/** Pasa lo escrito en el formulario al formato que espera guardarVisita. */
function datosDeForm(f) {
  const rec = f.recorrido === 'nuevo' ? { modo: 'nuevo', hora: f.rHora, guiaId: f.rGuia } : f.recorrido && f.recorrido.startsWith('r') ? { modo: 'existente', id: Number(f.recorrido.slice(1)) } : { modo: 'ninguno' };
  return { id: f.id || undefined, fecha: f.fecha, hora: f.hora, tipoId: f.tipoId, nombre: f.nombre, personas: f.personas, edades: f.edades, sexos: f.sexos, extras: f.extras, recorrido: rec };
}

// ================= INFORMES =================
const barra = (n, total, color) => `<div class="mt-1 h-2 overflow-hidden rounded-full bg-slate-100"><div class="h-full rounded-full ${color}" style="width:${total ? Math.max(2, Math.round(n / total * 100)) : 0}%"></div></div>`;
const lineaConteo = (nombre, n, total, color, sub = '') => `<div class="py-2"><div class="flex items-baseline justify-between gap-3"><span class="text-sm">${esc(nombre)}${sub ? `<span class="block text-xs text-slate-500">${esc(sub)}</span>` : ''}</span>
  <span class="whitespace-nowrap text-sm font-bold tabular-nums">${n}${total ? ` <span class="font-normal text-slate-500">· ${Math.round(n / total * 100)} %</span>` : ''}</span></div>${barra(n, total, color)}</div>`;

export function rangoInforme(ui, modo) {
  const a = ahora();
  if (modo === 'mes') { const mes = ui.vMes || primerDiaMes(a.fecha); return { desde: V.rangoDeMes(mes)[0], hasta: V.rangoDeMes(mes)[1], mes, etiqueta: `Mes de ${nombreMes(mes)}` }; }
  const lunes = ui.vSemana || lunesDe(a.fecha), [desde, hasta] = V.rangoDeSemana(lunes);
  return { desde, hasta, lunes, etiqueta: `Semana del ${fechaCompleta(desde)} al ${fechaCompleta(hasta)}` };
}

export function vistaInformeVisitas({ st, ui }, modo) {
  const rg = rangoInforme(ui, modo), r = V.resumenVisitas(st, rg.desde, rg.hasta), a = ahora();
  const cab = `${conmutadorVisitas(modo)}<div class="mb-4 space-y-3">${modo === 'mes'
    ? stepper(flecha('←', 'data-a="v-mes" data-d="-1"', 'Mes anterior'), `<h1 class="text-xl font-bold first-letter:uppercase">${nombreMes(rg.mes)}</h1><p class="text-sm text-slate-500">${rg.mes === primerDiaMes(a.fecha) ? 'mes en curso' : 'del 1 al último día'}</p>`, flecha('→', 'data-a="v-mes" data-d="1"', 'Mes siguiente'))
    : stepper(flecha('←', 'data-a="v-sem" data-d="-7"', 'Semana anterior'), `<h1 class="text-xl font-bold">Semana ${rangoSemana(rg.lunes)}</h1><p class="text-sm text-slate-500">de lunes a domingo</p>`, flecha('→', 'data-a="v-sem" data-d="7"', 'Semana siguiente'))}
    ${botonesExportar('visitas-' + modo)}</div>`;
  if (!r.visitas) return cab + vacio('No hay visitas registradas en este período.');
  const kpi = `<div class="mb-4 grid grid-cols-2 gap-2 text-center">
    <div class="col-span-2 rounded-2xl bg-slate-900 p-4 text-white"><b class="block text-4xl tabular-nums">${r.personas}</b><span class="text-sm text-slate-300">${r.personas === 1 ? 'persona nos visitó' : 'personas nos visitaron'}</span></div>
    <div class="rounded-2xl border border-slate-200 bg-white p-3"><b class="block text-2xl tabular-nums">${r.visitas}</b><span class="text-xs text-slate-500">${r.visitas === 1 ? 'grupo' : 'grupos'}</span></div>
    <div class="rounded-2xl border border-slate-200 bg-white p-3"><b class="block text-2xl tabular-nums">${r.recorridos.n}</b><span class="text-xs text-slate-500">${r.recorridos.n === 1 ? 'recorrido' : 'recorridos'}${r.recorridos.n ? ` · ${V.dec1(r.recorridos.promedio)} personas c/u` : ''}</span></div></div>`;
  const tipos = tarjeta(`<h2 class="mb-1 font-semibold">Por tipo de visitante</h2>${r.porTipo.map(x => lineaConteo(x.tipo.nombre, x.personas, r.personas, 'bg-blue-600', plural(x.visitas, 'visita', 'visitas'))).join('')}`);
  const edades = tarjeta(`<h2 class="mb-1 font-semibold">Por edad</h2>${r.edades.items.map(e => lineaConteo(e.nombre, e.n, r.personas, 'bg-teal-600', e.rango)).join('')}${r.edades.sinDetallar ? lineaConteo('Sin detallar', r.edades.sinDetallar, r.personas, 'bg-slate-400') : ''}`);
  const sexos = st.visitas.usarSexo && r.sexos.items.some(x => x.n) ? tarjeta(`<h2 class="mb-1 font-semibold">Por sexo</h2>${r.sexos.items.map(e => lineaConteo(e.nombre, e.n, r.personas, 'bg-violet-600')).join('')}${r.sexos.sinDetallar ? lineaConteo('Sin detallar', r.sexos.sinDetallar, r.personas, 'bg-slate-400') : ''}`) : '';
  const extras = r.extras.length ? tarjeta(`<h2 class="mb-1 font-semibold">Otros datos</h2>${r.extras.map(e => lineaConteo(e.nombre, e.n, r.personas, 'bg-amber-500')).join('')}`) : '';
  const rec = tarjeta(`<h2 class="mb-1 font-semibold">Recorridos</h2><p class="text-sm text-slate-600">${plural(r.recorridos.n, 'recorrido', 'recorridos')} · ${personasTxt(r.recorridos.personas)} los hicieron y ${personasTxt(r.recorridos.sinRecorrido)} no. Toda visita se cuenta, tenga recorrido o no.</p>
    ${r.recorridos.porGuia.length ? `<div class="mt-2 divide-y divide-slate-100">${r.recorridos.porGuia.map(g => `<div class="flex justify-between py-2 text-sm"><span>${esc(g.guia)}</span><b class="tabular-nums">${plural(g.recorridos, 'recorrido', 'recorridos')} · ${g.personas}</b></div>`).join('')}</div>` : ''}`);
  const nombres = r.entidades.map(g => tarjeta(`<h2 class="mb-1 font-semibold">${esc(g.tipo.nombre)}: quiénes nos visitaron</h2><div class="divide-y divide-slate-100">${g.items.map(i =>
    `<div class="flex items-baseline justify-between gap-3 py-2 text-sm"><span class="min-w-0">${esc(i.nombre)}<span class="block text-xs text-slate-500">${plural(i.visitas, 'visita', 'visitas')}${i.recorridos ? ' · ' + plural(i.recorridos, 'recorrido', 'recorridos') : ''}</span></span><b class="whitespace-nowrap tabular-nums">${personasTxt(i.personas)}</b></div>`).join('')}</div>`)).join('');
  const dias = tarjeta(`<h2 class="mb-1 font-semibold">Día por día</h2><div class="divide-y divide-slate-100">${r.dias.map(d => `<div class="flex items-baseline justify-between gap-3 py-2 text-sm"><span>${DIAS_LARGOS[diaSemana(d.fecha)]} ${fechaCorta(d.fecha)}</span>
    <span class="text-slate-500">${plural(d.visitas, 'grupo', 'grupos')}${d.recorridos ? ' · ' + plural(d.recorridos, 'recorrido', 'recorridos') : ''} · <b class="text-slate-900">${d.personas}</b></span></div>`).join('')}</div>`);
  return cab + kpi + `<div class="space-y-3">${tipos}${edades}${sexos}${extras}${rec}${nombres}${dias}</div>`;
}

// ================= CONFIGURACIÓN =================
function filaLista(texto, sub, botones, apagada = false) {
  return `<div class="flex items-center justify-between gap-2 border-t border-slate-100 py-2 first:border-0 ${apagada ? 'opacity-50' : ''}"><span class="min-w-0"><b class="block truncate text-sm">${texto}</b>${sub ? `<span class="block text-xs text-slate-500">${sub}</span>` : ''}</span><span class="flex flex-none gap-1">${botones}</span></div>`;
}
const chico = (txt, data, extra = '') => boton(txt, data, `border border-slate-300 bg-white !px-3 !text-xs ${extra}`);

export function vistaConfigVisitas({ st }) {
  const V_ = st.visitas;
  const tipos = V_.tipos.map(t => filaLista(esc(t.nombre), t.conNombre ? 'Con nombre (se escribe cuál)' : 'Sin nombre (solo se cuentan personas)',
    t.archivado ? chico('Reactivar', `data-a="v-tipo-archivar" data-id="${t.id}" data-x="0"`) : `${chico('Editar', `data-a="v-tipo-editar" data-id="${t.id}"`)}${chico('Ocultar', `data-a="v-tipo-archivar" data-id="${t.id}" data-x="1"`)}`, t.archivado)).join('');
  const edades = V_.edades.map(e => filaLista(esc(e.nombre), esc(e.rango || 'sin rango'),
    e.archivado ? chico('Reactivar', `data-a="v-edad-archivar" data-id="${e.id}" data-x="0"`) : `${chico('Editar', `data-a="v-edad-editar" data-id="${e.id}"`)}${chico('Ocultar', `data-a="v-edad-archivar" data-id="${e.id}" data-x="1"`)}`, e.archivado)).join('');
  const check = (accion, extra, marcado, txt, sub = '') => `<label class="flex min-h-[52px] cursor-pointer items-center gap-3 border-t border-slate-100 py-2 first:border-0"><input type="checkbox" data-a="${accion}" ${extra} ${marcado ? 'checked' : ''} class="h-6 w-6 accent-blue-700"><span class="text-sm">${txt}${sub ? `<span class="block text-xs text-slate-500">${sub}</span>` : ''}</span></label>`;
  return `${volver('#/visitas', 'Visitas')}${titulo('Configurar visitas', 'Lo que se pregunta al registrar una visita. Ocultar no borra lo ya registrado.')}
    <div class="space-y-3">
      ${tarjeta(`<div class="mb-1 flex items-center justify-between"><h2 class="font-semibold">Tipos de visitante</h2>${chico('+ Agregar', 'data-a="v-tipo-agregar"')}</div>${tipos}<p class="mt-2 text-xs text-slate-500">Puedes agregar otros a mano (empresa, gobierno, autoridades…).</p>`)}
      ${tarjeta(`<div class="mb-1 flex items-center justify-between"><h2 class="font-semibold">Grupos de edad</h2>${chico('+ Agregar', 'data-a="v-edad-agregar"')}</div>${edades}`)}
      ${tarjeta(`<h2 class="mb-1 font-semibold">Otros datos por visita (opcionales)</h2>
        ${check('v-sexo', '', V_.usarSexo, 'Mujeres y hombres', 'Un conteo aparte de la edad')}
        ${V_.extras.map(x => check('v-extra', `data-id="${x.id}"`, x.activo, esc(x.nombre))).join('')}`)}
      ${tarjeta(`<a href="#/visitas/nombres" class="flex min-h-[44px] items-center justify-between"><span><b class="block text-sm">Instituciones, medios y otros nombres</b><span class="text-xs text-slate-500">Corregir un nombre, unir dos escritos distinto, ocultar</span></span><span class="text-slate-400">›</span></a>`)}
    </div>`;
}

export function vistaNombresVisitas({ st, ui }) {
  const V_ = st.visitas, conNombre = V_.tipos.filter(t => t.conNombre);
  const grupos = conNombre.map(t => {
    const lista = V.entidadesDe(st, t.id, true).filter(e => ui.verOcultos || !e.archivado);
    const filas = lista.map(e => {
      const n = V.visitasDeEntidad(st, e.id);
      return filaLista(esc(e.nombre), `${plural(n, 'visita', 'visitas')}${e.archivado ? ' · oculto' : ''}`,
        `${chico('Cambiar', `data-a="v-ent-renombrar" data-id="${e.id}"`)}${chico('Unir', `data-a="v-ent-unir" data-id="${e.id}"`)}${chico(e.archivado ? 'Mostrar' : 'Ocultar', `data-a="v-ent-archivar" data-id="${e.id}"`)}${n ? '' : chico('Borrar', `data-a="v-ent-eliminar" data-id="${e.id}"`, '!text-red-700 !border-red-300')}`, e.archivado);
    }).join('');
    return tarjeta(`<h2 class="mb-1 font-semibold">${esc(t.nombre)}</h2>${filas || '<p class="text-sm text-slate-500">Todavía no hay nombres. Se agregan solos al registrar visitas.</p>'}`);
  }).join('');
  return `${volver('#/visitas/config', 'Configurar visitas')}${titulo('Nombres', 'Cambiar un nombre lo cambia en todas sus visitas. "Unir" junta dos nombres escritos distinto en uno solo.')}
    <label class="mb-3 flex min-h-[44px] items-center gap-2 text-sm"><input type="checkbox" data-a="v-ver-ocultos" ${ui.verOcultos ? 'checked' : ''} class="h-5 w-5">Ver también los ocultos</label>
    <div class="space-y-3">${grupos || vacio('No hay tipos con nombre.')}</div>`;
}

// ================= RUTAS Y ACCIONES =================
export const RUTAS_VISITAS = {
  visitas: { v: c => (c.p[1] === 'semana' ? vistaInformeVisitas(c, 'semana') : c.p[1] === 'mes' ? vistaInformeVisitas(c, 'mes') : c.p[1] === 'config' ? vistaConfigVisitas(c) : c.p[1] === 'nombres' ? vistaNombresVisitas(c) : vistaVisitasDia(c)), tab: 'visitas' },
  visita: { v: vistaVisita, tab: 'visitas' },
};

const fallo = r => { if (r.error) { toast(r.error, 'error'); return true; } return false; };
const otrosDeLaLista = (st, e) => V.entidadesDe(st, e.tipoId).filter(x => x.id !== e.id);

export const accionesVisitas = {
  'nueva-visita': ({ st, ui }) => { ui.vForm = formNuevo(st); location.hash = '#/visita/nueva'; return null; },
  'editar-visita': ({ d, ui }) => { ui.vForm = null; location.hash = `#/visita/${d.id}`; return null; },
  'eliminar-visita': async ({ st, d, ui }) => {
    const r = st.visitas.registros.find(x => x.id === Number(d.id));
    const ok = await confirmar({ titulo: '¿Eliminar esta visita?', mensaje: `${V.nombreVisita(st, r)}: ${personasTxt(r.personas)}. Esto no se puede deshacer.`, boton: 'Sí, eliminar', peligro: true });
    if (!ok) return false;
    V.eliminarVisita(st, r.id); ui.vForm = null; toast('Visita eliminada.'); location.hash = '#/visitas'; return true;
  },
  'v-dia': ({ d, ui }) => { const a = ahora().fecha, f = sumarDias(ui.vFecha || a, Number(d.d)); ui.vFecha = f >= a ? null : f; return false; },
  'v-hoy': ({ ui }) => { ui.vFecha = null; return false; },
  'v-sem': ({ d, ui }) => { ui.vSemana = sumarDias(ui.vSemana || lunesDe(ahora().fecha), Number(d.d)); return false; },
  'v-mes': ({ d, ui }) => { ui.vMes = sumarMeses(ui.vMes || primerDiaMes(ahora().fecha), Number(d.d)); return false; },

  'editar-recorrido': async ({ st, d }) => {
    const rec = st.visitas.recorridos.find(r => r.id === Number(d.id));
    const v = await formulario({ titulo: 'Editar recorrido', campos: [{ n: 'hora', t: 'time', l: 'Hora del recorrido', v: deMin(rec.hora) },
      { n: 'guiaId', t: 'select', l: 'Guía', op: [['', 'Sin guía'], ...S.empleadosActivos(st).map(e => [e.id, e.nombre])], v: rec.guiaId == null ? '' : rec.guiaId, req: false }] });
    return v ? !fallo(V.editarRecorrido(st, rec.id, v)) : false;
  },
  'quitar-recorrido': async ({ st, d }) => {
    const ok = await confirmar({ titulo: '¿Quitar este recorrido?', mensaje: 'Los grupos siguen registrados, pero ya no cuentan como parte de un recorrido.', boton: 'Sí, quitar', peligro: true });
    if (!ok) return false; V.eliminarRecorrido(st, Number(d.id)); toast('Recorrido quitado.'); return true;
  },

  // configuración
  'v-tipo-agregar': async ({ st }) => {
    const v = await formulario({ titulo: 'Nuevo tipo de visitante', campos: [{ n: 'nombre', t: 'text', l: 'Nombre (ej.: Empresa, Gobierno)' },
      { n: 'conNombre', t: 'select', l: '¿Se anota el nombre?', op: [['1', 'Sí: se escribe cuál (empresa, institución…)'], ['0', 'No: solo se cuentan personas']], v: '1' }], boton: 'Agregar' });
    return v ? !fallo(V.agregarTipo(st, { nombre: v.nombre, conNombre: v.conNombre === '1' })) : false;
  },
  'v-tipo-editar': async ({ st, d }) => { const v = await formulario({ titulo: 'Editar tipo', campos: [{ n: 'nombre', t: 'text', l: 'Nombre', v: V.tipoDe(st, d.id).nombre }] }); return v ? !fallo(V.editarTipo(st, d.id, v.nombre)) : false; },
  'v-tipo-archivar': ({ st, d }) => !fallo(V.archivarTipo(st, d.id, d.x === '1')),
  'v-edad-agregar': async ({ st }) => {
    const v = await formulario({ titulo: 'Nuevo grupo de edad', campos: [{ n: 'nombre', t: 'text', l: 'Nombre (ej.: Jóvenes)' }, { n: 'rango', t: 'text', l: 'Rango (ej.: 18 a 29 años)', req: false }], boton: 'Agregar' });
    return v ? !fallo(V.agregarEdad(st, v)) : false;
  },
  'v-edad-editar': async ({ st, d }) => {
    const e = st.visitas.edades.find(x => x.id === d.id);
    const v = await formulario({ titulo: 'Editar grupo de edad', campos: [{ n: 'nombre', t: 'text', l: 'Nombre', v: e.nombre }, { n: 'rango', t: 'text', l: 'Rango', v: e.rango, req: false }] });
    return v ? !fallo(V.editarEdad(st, e.id, v)) : false;
  },
  'v-edad-archivar': ({ st, d }) => !fallo(V.archivarEdad(st, d.id, d.x === '1')),
  'v-sexo': ({ st, el }) => !fallo(V.guardarOpciones(st, { usarSexo: el.checked })),
  'v-extra': ({ st, d, el }) => !fallo(V.guardarOpciones(st, { extras: { [d.id]: el.checked } })),

  // nombres
  'v-ver-ocultos': ({ ui, el }) => { ui.verOcultos = el.checked; return false; },
  'v-ent-renombrar': async ({ st, d }) => {
    const v = await formulario({ titulo: 'Cambiar el nombre', mensaje: 'Se cambia en todas sus visitas.', campos: [{ n: 'nombre', t: 'text', l: 'Nombre', v: V.entidadDe(st, Number(d.id)).nombre }] });
    return v ? !fallo(V.renombrarEntidad(st, Number(d.id), v.nombre)) : false;
  },
  'v-ent-unir': async ({ st, d }) => {
    const e = V.entidadDe(st, Number(d.id)), otros = otrosDeLaLista(st, e);
    if (!otros.length) { toast('No hay otro nombre del mismo tipo para unir.', 'error'); return false; }
    const v = await formulario({ titulo: `Unir «${e.nombre}» con otro`, mensaje: 'Sus visitas pasan al nombre que elijas, y este nombre desaparece.', campos: [{ n: 'destino', t: 'select', l: 'Unir con', op: otros.map(x => [x.id, x.nombre]) }], boton: 'Unir' });
    if (!v) return false; if (fallo(V.unirEntidades(st, e.id, Number(v.destino)))) return false; toast('Nombres unidos.'); return true;
  },
  'v-ent-archivar': ({ st, d }) => { const e = V.entidadDe(st, Number(d.id)); V.archivarEntidad(st, e.id, !e.archivado); return true; },
  'v-ent-eliminar': async ({ st, d }) => {
    const e = V.entidadDe(st, Number(d.id));
    const ok = await confirmar({ titulo: `¿Borrar «${e.nombre}»?`, mensaje: 'No tiene visitas registradas, así que se borra por completo.', boton: 'Sí, borrar', peligro: true });
    return ok ? !fallo(V.eliminarEntidad(st, e.id)) : false;
  },
};

export const formulariosVisitas = {
  visita: ({ st, ui, form, submitter }) => {
    const f = capturarVisita(ui, form), r = V.guardarVisita(st, datosDeForm(f));
    if (r.error) { f.error = r.error; toast(r.error, 'error'); return true; }
    if (submitter && submitter.name === 'otra') {
      const rec = f.recorrido === 'nuevo' ? 'r' + r.registro.recorridoId : f.recorrido;
      ui.vForm = formNuevo(st, { tipoId: f.tipoId, recorrido: rec, fecha: f.fecha });
      toast('Guardada. Registra la siguiente.'); window.scrollTo(0, 0); return true;
    }
    ui.vForm = null; toast('Visita guardada.'); location.hash = '#/visitas'; return true;
  },
};
