// Pantallas. Cada vista recibe { st, ui, p } y devuelve HTML. `acciones` y `formularios` atienden los toques y envíos.
import { hTxt, difTxt, aMin, deMin } from './horas.js';
import { ahora, zonaActiva, fijarZona, DIAS, DIAS_LARGOS, diaSemana, lunesDe, sumarDias, fechaCorta, fechaCompleta, fechaLarga, rangoSemana } from './fechas.js';
import * as S from './servicios.js';
import * as A from './acciones.js';
import { esc, toast, confirmar, formulario } from './ui.js';
import { guardar, estadoInicial, pedirPersistencia } from './store.js';
import { compartirPdf, descargarPdf, compartirArchivo } from './pdf.js';

// ---------- átomos ----------
const tarjeta = (c, clase = '') => `<section class="rounded-2xl border border-slate-200 bg-white p-4 ${clase}">${c}</section>`;
const titulo = (t, sub = '') => `<div class="mb-4"><h1 class="text-2xl font-bold tracking-tight">${t}</h1>${sub ? `<p class="mt-1 text-sm text-slate-500">${sub}</p>` : ''}</div>`;
const boton = (txt, data, clase = 'border border-slate-300 bg-white') => `<button ${data} class="min-h-[44px] rounded-xl px-4 text-sm font-medium ${clase}">${txt}</button>`;
const botonPri = (txt, data) => boton(txt, data, 'bg-blue-700 text-white font-semibold');
const pildora = (txt, c) => `<span class="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${c}">${txt}</span>`;
const vacio = (t, extra = '') => tarjeta(`<p class="text-slate-600">${t}</p>${extra}`);
const volver = (href, txt = 'Volver') => `<a href="${href}" class="mb-3 inline-flex min-h-[44px] items-center text-sm font-medium text-blue-700">← ${txt}</a>`;
const stepper = (izq, centro, der) => `<div class="flex items-center justify-between gap-2">${izq}<div class="text-center">${centro}</div>${der}</div>`;
const flecha = (txt, data, label, off = false) => `<button ${data} aria-label="${label}" ${off ? 'disabled' : ''} class="h-11 w-11 rounded-xl border border-slate-300 bg-white text-lg disabled:opacity-30">${txt}</button>`;

// ================= HOY =================
function tarjetaEmpleado(st, ui, emp, fecha, esHoy) {
  const tramos = S.tramosDelDia(st, emp.id, fecha), estado = S.estadoDe(tramos), r = S.resumenDia(st, emp.id, fecha, tramos);
  const ult = tramos[tramos.length - 1];
  const texto = estado === 'presente' ? `Presente desde ${deMin(ult.entrada)}` : estado === 'se_fue' ? `Se fue a las ${deMin(ult.salida)}` : 'Sin llegar';
  const colorTxt = estado === 'presente' ? 'text-teal-700' : estado === 'se_fue' ? 'text-blue-700' : 'text-slate-500';
  const borde = estado === 'presente' ? 'border-l-teal-600' : estado === 'se_fue' ? 'border-l-blue-600' : 'border-l-slate-300';
  const err = ui.errores[emp.id];
  const btn = !esHoy ? '' : estado === 'presente'
    ? `<button data-a="marcar" data-id="${emp.id}" class="min-h-[56px] w-full rounded-xl border-2 border-slate-400 text-lg font-semibold">Salió</button>`
    : `<button data-a="marcar" data-id="${emp.id}" class="min-h-[56px] w-full rounded-xl bg-blue-700 text-lg font-semibold text-white">${estado === 'se_fue' ? 'Volvió' : 'Entró'}</button>`;
  // Para cuando se olvidó marcar en el momento: se escribe la hora real.
  const otraHora = !esHoy ? '' : `<button data-a="marcar-hora" data-id="${emp.id}" class="min-h-[44px] w-full rounded-xl border border-slate-300 bg-white text-sm font-medium text-slate-700">${estado === 'presente' ? 'Marcar hora de salida' : estado === 'se_fue' ? 'Marcar hora de regreso' : 'Marcar hora de entrada'}</button>`;
  const tr = tramos.map(t => `<span class="rounded bg-slate-100 px-2 py-0.5">${deMin(t.entrada)} – ${t.salida != null ? deMin(t.salida) : 'en curso'}</span>`).join('') || '<span class="text-slate-500">Sin marcas</span>';
  return `<article class="space-y-3 rounded-2xl border border-l-4 border-slate-200 ${borde} bg-white p-4">
    <div class="flex items-baseline justify-between gap-2"><strong class="text-lg">${esc(emp.nombre)}</strong><span class="text-sm ${colorTxt}">${texto}</span></div>
    ${err ? `<p class="text-sm text-red-700">${esc(err)}</p>` : ''}${btn}${otraHora}
    <details data-det="${emp.id}" ${ui.abiertos.has(emp.id) ? 'open' : ''} class="text-sm">
      <summary class="flex min-h-[44px] cursor-pointer select-none items-center text-slate-500">Detalle y correcciones</summary>
      <div class="space-y-3 pb-1">
        <div class="flex flex-wrap gap-1">${tr}</div>
        ${esHoy && tramos.length ? `<div class="flex flex-wrap gap-2">${boton('−15 min', `data-a="ajustar" data-id="${emp.id}" data-s="menos"`)}${boton('+15 min', `data-a="ajustar" data-id="${emp.id}" data-s="mas"`)}${boton('Cambiar hora exacta', `data-a="cambiar-ultima" data-id="${emp.id}"`)}${boton('Deshacer', `data-a="deshacer" data-id="${emp.id}"`)}</div>` : ''}
        <div class="grid grid-cols-3 border-t border-slate-200 pt-2">
          <div><span class="text-slate-500">Normales</span><b class="block text-sm text-teal-700">${hTxt(r.normales)}</b></div>
          <div><span class="text-slate-500">Extra</span><b class="block text-sm text-blue-700">${hTxt(r.extraTurno)}${r.extraSinTurno ? `<span class="text-violet-700"> +${hTxt(r.extraSinTurno)}</span>` : ''}</b></div>
          <div><span class="text-slate-500">Total</span><b class="block text-sm">${hTxt(r.total)}</b></div></div>
        ${r.antesTurno ? `<p class="text-xs text-slate-500">${hTxt(r.antesTurno)} antes del turno: no cuenta.</p>` : ''}
        ${r.porRevisar ? `<p class="rounded bg-amber-100 px-2 py-1 text-xs text-amber-800">Por revisar: ${hTxt(r.totalReal)} queda exacto</p>`
          : r.total !== r.totalReal ? `<p class="text-xs text-slate-500">Real ${hTxt(r.totalReal)}, redondeado a ${hTxt(r.total)}</p>` : ''}
        <a class="inline-flex min-h-[44px] items-center font-medium text-blue-700 underline" href="#/dia/${emp.id}/${fecha}">Corregir el día completo</a>
      </div></details></article>`;
}

function filaDia(st, ui, emp, fecha, ini, fin) {
  const tramos = S.tramosDelDia(st, emp.id, fecha), pend = ui.valoresDia && ui.valoresDia[emp.id], err = ui.erroresDia[emp.id];
  if (tramos.length > 1) {
    return `<div class="space-y-1 p-4"><div class="flex items-center gap-3"><input type="checkbox" checked disabled class="h-7 w-7 opacity-40"><span class="text-base font-medium">${esc(emp.nombre)}</span></div>
      <p class="pl-10 text-sm text-slate-500">Tiene varios tramos. <a class="font-medium text-blue-700 underline" href="#/dia/${emp.id}/${fecha}">Corregir el día</a></p></div>`;
  }
  const t = tramos[0];
  const v = pend || (t ? { vino: true, entrada: deMin(t.entrada), salida: t.salida != null ? deMin(t.salida) : '' } : { vino: false, entrada: ini, salida: fin });
  return `<div class="space-y-2 p-4 ${err ? 'bg-red-50' : ''}">
    <label class="flex min-h-[44px] cursor-pointer items-center gap-3"><input type="checkbox" class="h-7 w-7 accent-blue-700" name="vino-${emp.id}" ${v.vino ? 'checked' : ''}><span class="text-base font-medium">${esc(emp.nombre)}</span></label>
    <div class="flex items-center gap-2 pl-10"><input type="time" name="entrada-${emp.id}" value="${v.entrada}" aria-label="Entrada de ${esc(emp.nombre)}" class="w-full rounded-lg border border-slate-300 px-2 py-2.5">
      <span class="text-slate-500">a</span><input type="time" name="salida-${emp.id}" value="${v.salida}" aria-label="Salida de ${esc(emp.nombre)}" class="w-full rounded-lg border border-slate-300 px-2 py-2.5"></div>
    ${err ? `<p class="pl-10 text-sm text-red-700">${esc(err)}</p>` : ''}</div>`;
}

// ================= BIENVENIDA (primer uso) =================
const campoTexto = (n, etiqueta, ph, valor = '', ayuda = '') => `<div><label for="b-${n}" class="mb-1 block text-sm font-medium text-slate-700">${etiqueta}</label>
  <input id="b-${n}" name="${n}" value="${esc(valor)}" maxlength="100" placeholder="${esc(ph)}" autocomplete="off" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base">${ayuda ? `<p class="mt-1 text-xs text-slate-500">${ayuda}</p>` : ''}</div>`;

function vistaBienvenida({ st }) {
  const a = ahora();
  return `<div class="mb-5"><h1 class="text-2xl font-bold tracking-tight">Te damos la bienvenida</h1>
    <p class="mt-1 text-slate-600">Un par de datos para dejar la app lista. Todo es opcional y se puede cambiar después en <b>Más → Ajustes</b>.</p></div>
    <form data-f="bienvenida" class="space-y-4">
      ${tarjeta(`<div class="space-y-4">
        ${campoTexto('organizacion', 'Nombre de tu grupo o negocio', 'Ej.: Taller San José', st.ajustes.organizacion, 'Aparece arriba en la app y en el PDF.')}
        ${campoTexto('descripcion', '¿Para qué lo vas a usar?', 'Ej.: Asistencia del personal del taller', st.ajustes.descripcion, 'Una frase corta. También sale en el PDF.')}</div>`)}
      ${tarjeta(`<label for="b-personas" class="mb-1 block text-sm font-medium text-slate-700">Personas a las que les llevarás la asistencia</label>
        <textarea id="b-personas" name="personas" rows="5" placeholder="Una por línea&#10;Ana Pérez&#10;Luis Mora" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base"></textarea>
        <p class="mt-1 text-xs text-slate-500">Puedes agregar más después, en Más → Personas.</p>`)}
      <p class="text-sm text-slate-500">Hora detectada: <b>${deMin(a.min)}</b> (${esc(zonaActiva())}). Se puede cambiar en Ajustes.</p>
      <button class="min-h-[56px] w-full rounded-xl bg-blue-700 text-lg font-semibold text-white">Empezar</button>
      <button type="button" data-a="omitir-bienvenida" class="min-h-[48px] w-full rounded-xl text-sm font-medium text-slate-600 underline">Omitir por ahora</button></form>`;
}

function vistaHoy({ st, ui }) {
  if (!st.ajustes.bienvenida && !st.empleados.length && !st.tramos.length) return vistaBienvenida({ st });
  const a = ahora(), fecha = ui.fecha || a.fecha, esHoy = fecha === a.fecha, activos = S.empleadosActivos(st);
  const turnos = S.turnosDelDia(st, fecha), [ini, fin] = S.horarioDelDia(st, fecha);
  const diasSinCopia = st.ultimaCopia ? Math.round((new Date(a.fecha) - new Date(st.ultimaCopia)) / 864e5) : null;
  const recordatorio = st.empleados.length && st.tramos.length && (diasSinCopia === null || diasSinCopia >= 7)
    ? `<a href="#/mas" class="mb-4 block rounded-xl bg-amber-100 px-4 py-3 text-sm text-amber-900">${diasSinCopia === null ? 'Todavía no has guardado una copia de seguridad.' : `Hace ${diasSinCopia} días que no guardas una copia de seguridad.`} <b>Guardarla ahora →</b></a>` : '';
  const cab = `<div class="mb-4 space-y-3">
    ${stepper(flecha('←', 'data-a="dia" data-d="-1"', 'Día anterior'),
      `<h1 class="text-xl font-bold leading-tight">${esHoy ? 'Hoy' : 'Día'} · ${fechaLarga(fecha)}</h1><p class="text-sm text-slate-500">${turnos.length ? turnos.map(t => `Turno ${t.inicio}–${t.fin}`).join(', ') : '<span class="text-violet-700">Día sin turno: todo es extra</span>'}</p>`,
      flecha('→', 'data-a="dia" data-d="1"', 'Día siguiente', fecha >= a.fecha))}
    ${!esHoy ? `<div class="text-center">${boton('Ir a hoy', 'data-a="hoy"')}</div>` : ''}
    <div class="grid grid-cols-2 rounded-xl border border-slate-200 bg-white p-1 text-sm font-medium" role="tablist">
      <button data-a="modo" data-m="momento" role="tab" aria-selected="${ui.modo === 'momento'}" class="min-h-[44px] rounded-lg ${ui.modo === 'momento' ? 'bg-blue-700 text-white' : ''}">En el momento</button>
      <button data-a="modo" data-m="dia" role="tab" aria-selected="${ui.modo === 'dia'}" class="min-h-[44px] rounded-lg ${ui.modo === 'dia' ? 'bg-blue-700 text-white' : ''}">Al final del día</button></div></div>`;
  if (!activos.length) {
    return cab + vacio('Todavía no hay personas. Agrégalas para empezar a marcar.', `<div class="mt-3">${botonPri('Agregar personas', 'data-a="ir" data-h="#/empleados"')}</div>`);
  }
  if (ui.modo === 'momento') {
    const lote = esHoy ? `<div class="mb-4 grid grid-cols-2 gap-2">${boton('Todos los que faltan entraron', 'data-a="bloque" data-q="entrada"', 'border border-slate-300 bg-white !py-2')}${boton('Todos los presentes salieron', 'data-a="bloque" data-q="salida"', 'border border-slate-300 bg-white !py-2')}</div>` : '';
    return recordatorio + cab + lote + `<div class="space-y-3">${activos.map(e => tarjetaEmpleado(st, ui, e, fecha, esHoy)).join('')}</div>`;
  }
  return recordatorio + cab + `<form data-f="guardar-dia"><p class="mb-3 text-sm text-slate-600">Marca quién vino. El horario del turno ya está puesto: cambia solo las horas que difieran.</p>
    <div class="mb-3 flex gap-2">${boton('Todos vinieron', 'type="button" data-a="todos" data-v="1"')}${boton('Nadie', 'type="button" data-a="todos" data-v="0"')}</div>
    <div class="divide-y divide-slate-200 overflow-hidden rounded-2xl border border-slate-200 bg-white">${activos.map(e => filaDia(st, ui, e, fecha, ini, fin)).join('')}</div>
    <button class="mt-4 min-h-[56px] w-full rounded-xl bg-blue-700 text-lg font-semibold text-white">Guardar el día</button>
    <p class="mt-2 text-xs text-slate-500">Quien está sin marcar queda sin asistencia ese día. Si alguien ya tenía horas y lo desmarcas, se quitan.</p></form>`;
}

// ================= CORREGIR UN DÍA =================
function vistaDia({ st, ui, p }) {
  const empId = Number(p[1]), fecha = p[2], emp = S.empleado(st, empId);
  if (!emp) return vacio('No se encontró a la persona.');
  const tramos = S.tramosDelDia(st, empId, fecha), cerrada = !!S.ultimoCierre(st, lunesDe(fecha)), r = S.resumenDia(st, empId, fecha, tramos);
  return `${volver(ui.volver || '#/hoy', 'Volver')}${titulo(`Corregir a ${esc(emp.nombre)}`, `${fechaLarga(fecha)} · total actual ${hTxt(r.total)}`)}
    ${cerrada ? '<p class="mb-3 rounded-xl bg-blue-100 px-4 py-3 text-sm text-blue-900">Esta semana ya fue entregada. El cambio se mostrará como diferencia contra lo entregado y pide un motivo.</p>' : ''}
    ${ui.errorDia ? `<p class="mb-3 rounded-xl bg-red-100 px-4 py-3 text-sm text-red-800">${esc(ui.errorDia)}</p>` : ''}
    <form data-f="corregir-dia" data-emp="${empId}" data-fecha="${fecha}" class="space-y-3">
      ${tramos.map(t => `<div class="space-y-2 rounded-2xl border border-slate-200 bg-white p-4">
        <div class="flex items-center gap-2"><input type="time" name="entrada-${t.id}" value="${deMin(t.entrada)}" required aria-label="Entrada" class="w-full rounded-lg border border-slate-300 px-2 py-2.5"><span class="text-slate-500">a</span>
        <input type="time" name="salida-${t.id}" value="${t.salida != null ? deMin(t.salida) : ''}" aria-label="Salida" class="w-full rounded-lg border border-slate-300 px-2 py-2.5"></div>
        <label class="flex min-h-[44px] items-center gap-3 text-sm text-red-700"><input type="checkbox" name="quitar-${t.id}" class="h-5 w-5">Quitar este tramo</label></div>`).join('') || '<p class="text-slate-500">No hay tramos este día.</p>'}
      <div class="rounded-2xl border border-dashed border-slate-300 p-4"><p class="mb-2 text-sm text-slate-600">Agregar un tramo</p>
        <div class="flex items-center gap-2"><input type="time" name="entrada-nuevo" aria-label="Entrada nueva" class="w-full rounded-lg border border-slate-300 px-2 py-2.5"><span class="text-slate-500">a</span>
        <input type="time" name="salida-nuevo" aria-label="Salida nueva" class="w-full rounded-lg border border-slate-300 px-2 py-2.5"></div></div>
      <input name="motivo" placeholder="${cerrada ? 'Motivo (obligatorio)' : 'Motivo (opcional)'}" ${cerrada ? 'required' : ''} class="w-full rounded-lg border border-slate-300 px-3 py-2.5">
      <button class="min-h-[56px] w-full rounded-xl bg-blue-700 text-lg font-semibold text-white">Guardar corrección</button></form>`;
}

// ================= SEMANA =================
function vistaSemana({ st, ui }) {
  const a = ahora(), lunes = ui.semana || lunesDe(a.fecha), cierres = S.cierresDe(st, lunes), ultimo = cierres[cierres.length - 1];
  const { filas, promedio } = S.resumenSemana(st, lunes), total = filas.reduce((s, f) => s + f.total, 0);
  const difs = S.diferenciasContraCierre(st, lunes), corr = st.correcciones.filter(c => lunesDe(c.fecha) === lunes);
  const banner = ultimo
    ? `<div class="mb-4 space-y-2 rounded-2xl bg-blue-100 p-4 text-sm text-blue-900"><p><b>Semana entregada</b> el ${fechaCompleta(ultimo.fecha)} · versión ${ultimo.version}</p>
        ${difs.length ? `<p>Cambios después de entregarla:</p><ul class="list-disc pl-5">${difs.map(d => `<li>${esc(d.nombre)}: <b>${difTxt(d.dif, 'lo entregado')}</b></li>`).join('')}</ul>
          ${corr.length ? `<ul class="list-disc pl-5 text-blue-800">${corr.map(c => `<li>${fechaCorta(c.fecha)} ${esc(S.empleado(st, c.empId)?.nombre || '')}: ${esc(c.motivo)}</li>`).join('')}</ul>` : ''}
          <div class="pt-1">${boton(`Volver a cerrar (versión ${ultimo.version + 1})`, 'data-a="cerrar-semana"', 'bg-blue-700 text-white font-semibold')}</div>` : '<p>Sin cambios desde la entrega.</p>'}</div>`
    : `<div class="mb-4 flex items-center justify-between gap-3 rounded-2xl bg-teal-100 p-4 text-sm text-teal-900"><span><b>Semana abierta.</b> Los totales se actualizan al marcar.</span>${boton('Cerrar semana', 'data-a="cerrar-semana"', 'bg-white font-semibold')}</div>`;
  const cabeza = `<div class="mb-4 space-y-3">${stepper(flecha('←', 'data-a="sem" data-d="-7"', 'Semana anterior'),
    `<h1 class="text-xl font-bold">Semana ${rangoSemana(lunes)}</h1><p class="text-sm text-slate-500">de lunes a domingo</p>`, flecha('→', 'data-a="sem" data-d="7"', 'Semana siguiente'))}
    <div class="grid grid-cols-2 gap-2">${botonPri('Compartir PDF', 'data-a="pdf-compartir"')}${boton('Descargar PDF', 'data-a="pdf-descargar"')}</div></div>`;
  if (!filas.length) return cabeza + vacio('No hay personas activas.');
  const cards = filas.map(f => `<article class="rounded-2xl border border-slate-200 bg-white p-4">
    <div class="flex items-start justify-between gap-3"><div class="min-w-0"><strong class="text-lg">${esc(f.emp.nombre)}</strong>
      <p class="text-sm text-slate-500">${f.dias} ${f.dias === 1 ? 'día' : 'días'} · ${difTxt(f.vs)}</p></div>
      <div class="flex-none text-right"><div class="whitespace-nowrap text-xl font-bold tabular-nums">${hTxt(f.total)}</div>${f.porRevisar ? pildora(`${f.porRevisar} por revisar`, 'bg-amber-100 text-amber-800') : ''}</div></div>
    <div class="mt-3 grid grid-cols-3 gap-2 text-center text-xs"><div class="rounded-lg bg-teal-50 py-2 text-teal-800"><b class="block text-sm">${hTxt(f.normales)}</b>normales</div>
      <div class="rounded-lg bg-blue-50 py-2 text-blue-800"><b class="block text-sm">${hTxt(f.extraTurno)}</b>extra</div>
      <div class="rounded-lg bg-violet-50 py-2 text-violet-800"><b class="block text-sm">${hTxt(f.extraSinTurno)}</b>sin turno</div></div>
    <a href="#/semana/${f.emp.id}" class="mt-3 flex min-h-[44px] items-center justify-center rounded-xl border border-slate-300 text-sm font-medium">Ver semana día por día</a></article>`).join('');
  return cabeza + banner + `<div class="mb-4 flex items-center justify-between rounded-2xl bg-slate-900 p-4 text-white"><span>Total del equipo</span><b class="text-2xl tabular-nums">${hTxt(total)}</b></div>
    <div class="space-y-3">${cards}</div><p class="mt-3 text-center text-xs text-slate-500">Promedio del equipo: ${hTxt(promedio)}</p>`;
}

function vistaDesglose({ st, ui, p }) {
  const empId = Number(p[1]), emp = S.empleado(st, empId), lunes = ui.semana || lunesDe(ahora().fecha);
  if (!emp) return vacio('No se encontró a la persona.');
  const dias = S.desgloseSemana(st, empId, lunes), suma = dias.reduce((s, d) => s + d.resumen.total, 0);
  const sn = dias.reduce((s, d) => s + d.resumen.normales, 0), sx = dias.reduce((s, d) => s + d.resumen.extraTurno, 0), sf = dias.reduce((s, d) => s + d.resumen.extraSinTurno, 0);
  const filas = dias.map(d => {
    const r = d.resumen, hubo = d.tramos.length > 0;
    return `<div class="rounded-2xl border border-slate-200 ${hubo ? 'bg-white' : 'bg-slate-50 text-slate-400'} p-4 ${d.sinTurno && hubo ? '!bg-violet-50' : ''}">
      <div class="flex items-center justify-between"><div><b>${DIAS_LARGOS[diaSemana(d.fecha)]}</b> <span class="text-sm text-slate-500">${fechaCorta(d.fecha)}</span> ${d.sinTurno ? pildora('sin turno', 'bg-violet-100 text-violet-800') : ''}</div>
        ${hubo ? `<b class="text-xl tabular-nums">${hTxt(r.total)}</b>` : '<span class="text-sm">No asistió</span>'}</div>
      ${hubo ? `<p class="mt-1 text-sm text-slate-600">${d.tramos.map(t => `${deMin(t.entrada)} a ${t.salida != null ? deMin(t.salida) : 'sin salida'}`).join(' · ')}</p>
        <p class="mt-1 text-sm">${d.sinTurno ? `<span class="text-violet-700">Extra sin turno ${hTxt(r.extraSinTurno)}</span>` : `<span class="text-teal-700">Normales ${hTxt(r.normales)}</span>${r.extraTurno ? ` · <span class="text-blue-700">Extra ${hTxt(r.extraTurno)}</span>` : ''}`}
          ${r.porRevisar ? pildora('por revisar', 'bg-amber-100 text-amber-800') : ''}</p>` : ''}
      <a href="#/dia/${empId}/${d.fecha}" class="mt-2 inline-flex min-h-[44px] items-center text-sm font-medium text-blue-700 underline">${hubo ? 'Corregir' : 'Agregar horas'}</a></div>`;
  }).join('');
  return `${volver('#/semana', 'Resumen semanal')}${titulo(esc(emp.nombre), `Semana ${rangoSemana(lunes)}`)}<div class="space-y-3">${filas}</div>
    <div class="mt-4 rounded-2xl bg-slate-900 p-4 text-white"><div class="flex justify-between text-lg"><span>Suma de los días</span><b class="tabular-nums">${hTxt(suma)}</b></div>
      <p class="mt-1 text-sm text-slate-300">Normales ${hTxt(sn)} · Extra ${hTxt(sx)} · Sin turno ${hTxt(sf)}</p></div>`;
}

// ================= EMPLEADOS =================
function vistaEmpleados({ st, ui }) {
  const lista = st.empleados.filter(e => ui.verArchivados || !e.archivado);
  const filas = lista.map(e => `<div class="rounded-2xl border border-slate-200 bg-white p-4 ${e.archivado ? 'opacity-60' : ''}">
    <div class="flex items-center justify-between gap-2"><strong class="text-lg">${esc(e.nombre)}</strong>${e.archivado ? pildora('Archivado', 'bg-slate-200 text-slate-700') : pildora('Activo', 'bg-teal-100 text-teal-800')}</div>
    <div class="mt-3 flex flex-wrap gap-2">${e.archivado ? boton('Reactivar', `data-a="reactivar" data-id="${e.id}"`)
      : `${boton('Disponibilidad', `data-a="ir" data-h="#/disp/${e.id}"`)}${boton('Editar', `data-a="editar-emp" data-id="${e.id}"`)}${boton('Archivar', `data-a="archivar" data-id="${e.id}"`, 'border border-red-300 text-red-700 bg-white')}`}
      ${!A.tieneHoras(st, e.id) ? boton('Eliminar', `data-a="eliminar-emp" data-id="${e.id}"`, 'border border-red-300 text-red-700 bg-white') : ''}</div></div>`).join('');
  return `${titulo('Personas', 'Archivar en lugar de borrar: el historial y los totales entregados se conservan.')}
    <div class="mb-4 flex items-center justify-between gap-3">${botonPri('Agregar persona', 'data-a="agregar-emp"')}
      <label class="flex min-h-[44px] items-center gap-2 text-sm"><input type="checkbox" data-a="ver-archivados" ${ui.verArchivados ? 'checked' : ''} class="h-5 w-5">Ver archivados</label></div>
    <div class="space-y-3">${filas || vacio('Todavía no hay personas.')}</div>
    <p class="mt-3 text-xs text-slate-500">"Eliminar" solo aparece para quien no tiene horas registradas (por ejemplo, uno creado por error).</p>`;
}

// ================= TURNOS =================
function vistaTurnos({ st }) {
  const a = ahora(), lunes = lunesDe(a.fecha);
  const tur = [...st.turnos].sort((x, y) => (x.hasta ? 1 : 0) - (y.hasta ? 1 : 0)).map(t => `<div class="rounded-2xl border border-slate-200 bg-white p-4 ${t.hasta && t.hasta < a.fecha ? 'opacity-60' : ''}">
    <div class="flex items-baseline justify-between"><strong class="text-lg">${esc(t.nombre)}</strong><span class="text-lg tabular-nums">${t.inicio}–${t.fin}</span></div>
    <p class="text-sm text-slate-500">${t.dias.map(d => DIAS[d]).join(', ')} · ${t.desde ? 'desde ' + fechaCompleta(t.desde) : 'desde siempre'}${t.hasta ? ' hasta ' + fechaCompleta(t.hasta) : ''}</p>
    ${!t.hasta ? `<div class="mt-3 flex flex-wrap gap-2">${boton('Cambiar horario', `data-a="cambiar-turno" data-id="${t.id}"`)}${boton('Dar de baja', `data-a="baja-turno" data-id="${t.id}"`, 'border border-red-300 text-red-700 bg-white')}</div>` : '<p class="mt-2 text-xs text-slate-500">Versión anterior</p>'}</div>`).join('');
  const cal = DIAS_LARGOS.map((n, i) => {
    const ts = S.turnosDelDia(st, sumarDias(lunes, i));
    return `<div class="flex items-center justify-between border-t border-slate-200 py-2 first:border-0"><span>${n}</span>${ts.length ? pildora(ts.map(t => `${t.nombre} ${t.inicio}–${t.fin}`).join(', '), 'bg-blue-100 text-blue-800') : pildora('Sin turno · todo es extra', 'bg-violet-100 text-violet-800')}</div>`;
  }).join('');
  const exc = [...st.excepciones].filter(x => x.fecha >= sumarDias(a.fecha, -30)).sort((x, y) => x.fecha.localeCompare(y.fecha)).map(x => {
    const t = st.turnos.find(y => y.id === x.turnoId);
    return `<div class="flex items-center justify-between gap-2 border-t border-slate-200 py-2 first:border-0"><span>${DIAS[diaSemana(x.fecha)]} ${fechaCompleta(x.fecha)}<br><span class="text-sm text-slate-600">${t ? `${esc(t.nombre)} ${x.inicio || t.inicio}–${x.fin || t.fin}` : 'Sin turno ese día'}</span></span>
      ${boton('Quitar', `data-a="quitar-exc" data-f="${x.fecha}"`, 'border border-red-300 text-red-700 bg-white')}</div>`;
  }).join('');
  return `${titulo('Turnos', 'El turno es el molde con el que se miden las horas. No se asigna a personas.')}
    <div class="mb-3">${botonPri('Nuevo turno', 'data-a="nuevo-turno"')}</div><div class="space-y-3">${tur}</div>
    <h2 class="mb-2 mt-6 text-lg font-semibold">Calendario semanal</h2>${tarjeta(cal)}
    <div class="mb-2 mt-6 flex items-center justify-between"><h2 class="text-lg font-semibold">Excepciones por fecha</h2>${boton('Agregar', 'data-a="nueva-exc"')}</div>
    ${tarjeta(exc || '<p class="text-sm text-slate-500">Sin excepciones. Sirven para un día con turno hasta las 16:30, o para definir un sábado con turno.</p>')}`;
}

// ================= DISPONIBILIDAD =================
function vistaDisponibilidad({ st }) {
  const a = ahora(), act = S.empleadosActivos(st);
  const por = act.map(e => ({ e, fr: S.franjasVigentes(st, e.id, a.fecha) }));
  const conteo = DIAS.map((_, d) => por.filter(x => x.fr.some(f => f.dia === d)).length);
  const resumen = `<div class="mb-4 grid grid-cols-7 gap-1 rounded-2xl border border-slate-200 bg-white p-3 text-center">${DIAS.map((d, i) => `<div><div class="text-xs text-slate-500">${d}</div><div class="text-lg font-bold">${conteo[i]}</div></div>`).join('')}</div>`;
  const cards = por.map(({ e, fr }) => `<a href="#/disp/${e.id}" class="block rounded-2xl border border-slate-200 bg-white p-4">
    <strong class="text-lg">${esc(e.nombre)}</strong><div class="mt-2 grid grid-cols-7 gap-1 text-center text-[11px]">
    ${DIAS.map((d, i) => { const f = fr.filter(x => x.dia === i); return `<div class="rounded-lg py-1.5 ${f.length ? 'bg-teal-100 text-teal-900' : 'bg-slate-100 text-slate-400'}"><b class="block text-xs">${d}</b>${f.length ? f.map(x => `${x.desde.replace(/^0/, '')}<br>${x.hasta.replace(/^0/, '')}`).join('<hr class="my-0.5 border-teal-300">') : '—'}</div>`; }).join('')}</div></a>`).join('');
  return `${titulo('Disponibilidad', 'Cuándo puede venir cada uno. Toca un nombre para editar. Los números son cuántas personas pueden venir cada día.')}${resumen}<div class="space-y-3">${cards || vacio('No hay personas activas.')}</div>`;
}

function vistaFicha({ st, ui, p }) {
  const empId = Number(p[1]), emp = S.empleado(st, empId), a = ahora();
  if (!emp) return vacio('No se encontró a la persona.');
  const vig = ui.vigencia || S.vigenciaDe(st, empId, a.fecha) || a.fecha, franjas = st.disponibilidad.filter(d => d.empId === empId && d.vigente === vig);
  const filas = DIAS_LARGOS.map((n, i) => {
    const f = franjas.filter(x => x.dia === i).sort((x, y) => x.desde.localeCompare(y.desde));
    return `<div class="flex flex-wrap items-center gap-2 border-t border-slate-200 py-3 first:border-0"><b class="w-24">${n}</b>
      ${f.map(x => `<span class="inline-flex items-center gap-1 rounded-full bg-teal-100 py-1 pl-3 pr-1 text-sm text-teal-900">${x.desde}–${x.hasta}<button data-a="quitar-franja" data-id="${x.id}" aria-label="Quitar franja" class="h-8 w-8 rounded-full text-lg">×</button></span>`).join('') || '<span class="text-sm text-slate-500">No puede este día</span>'}</div>`;
  }).join('');
  const vigs = S.vigencias(st, empId);
  return `${volver('#/disponibilidad', 'Disponibilidad')}${titulo(`Disponibilidad de ${esc(emp.nombre)}`, `Configuración vigente desde ${fechaCompleta(vig)}. Un cambio de horario se guarda como una configuración nueva para no alterar el pasado.`)}
    ${tarjeta(filas)}<div class="mt-3 grid grid-cols-1 gap-2">${botonPri('Agregar franja', `data-a="agregar-franja" data-id="${empId}" data-v="${vig}"`)}
      ${boton('Copiar de otra persona', `data-a="copiar-disp" data-id="${empId}"`)}${boton('Nueva vigencia desde una fecha', `data-a="nueva-vigencia" data-id="${empId}"`)}</div>
    <p class="mt-3 text-xs text-slate-500">Puede haber más de una franja el mismo día (mañana y tarde). Se avisa si se cruzan.</p>
    ${vigs.length > 1 ? `<h2 class="mb-2 mt-5 text-lg font-semibold">Historial de vigencias</h2>${tarjeta(vigs.map(v => `<button data-a="ver-vigencia" data-v="${v}" class="flex min-h-[44px] w-full items-center justify-between text-left ${v === vig ? 'font-semibold' : ''}"><span>Desde ${fechaCompleta(v)}</span>${v === vig ? '<span class="text-xs text-slate-500">viendo</span>' : ''}</button>`).join(''))}` : ''}`;
}

// ================= SUGERENCIA =================
const ESTADOS_AVISO = [['Sin avisar', 'bg-slate-100 text-slate-700'], ['Avisado', 'bg-amber-100 text-amber-800'], ['Aceptó', 'bg-teal-100 text-teal-800'], ['No puede', 'bg-red-100 text-red-800']];
function vistaSugerencia({ st, ui }) {
  const a = ahora(), dias = Array.from({ length: 7 }, (_, i) => sumarDias(a.fecha, i)), f = ui.sugDia && dias.includes(ui.sugDia) ? ui.sugDia : dias[1];
  const s = S.sugerencia(st, f);
  const item = (x, i, off) => {
    const k = `${f}|${x.emp.id}`, est = st.avisos[k] || 0;
    return `<div class="flex items-center gap-3 rounded-2xl border border-slate-200 ${off ? 'bg-slate-50 opacity-70' : 'bg-white'} p-4">
      <span class="grid h-9 w-9 flex-none place-items-center rounded-full ${off ? 'bg-slate-400' : 'bg-blue-700'} font-bold text-white">${off ? '–' : i + 1}</span>
      <div class="min-w-0 flex-1"><strong>${esc(x.emp.nombre)}</strong><p class="text-sm text-slate-500">${off ? 'No tiene disponibilidad ese día.' : `Lleva ${hTxt(x.total)} esta semana · ${difTxt(x.total - s.promedio)} · ${x.franjas.map(fr => `${fr.desde}–${fr.hasta}`).join(' y ')}`}</p></div>
      ${off ? '' : `<button data-a="aviso" data-f="${f}" data-id="${x.emp.id}" class="min-h-[44px] rounded-full px-3 text-xs font-semibold ${ESTADOS_AVISO[est][1]}">${ESTADOS_AVISO[est][0]}</button>`}</div>`;
  };
  return `${titulo('¿Quién debería venir?', 'Solo es una ayuda: ordena por las horas de la semana, de menos a más, entre los disponibles. Tú decides. Toca el estado para anotar a quién avisaste.')}
    <div class="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1">${dias.map(d => `<button data-a="sug-dia" data-d="${d}" class="min-h-[52px] flex-none rounded-xl border px-4 text-sm ${d === f ? 'border-blue-700 bg-blue-700 font-semibold text-white' : 'border-slate-300 bg-white'}">${DIAS[diaSemana(d)]}<br>${fechaCorta(d)}</button>`).join('')}</div>
    <p class="mb-3 text-sm text-slate-500">${fechaLarga(f)} · promedio de la semana ${hTxt(s.promedio)}</p>
    <div class="space-y-3">${s.con.length ? s.con.map((x, i) => item(x, i, false)).join('') : vacio('Nadie tiene disponibilidad registrada ese día.')}</div>
    ${s.sin.length ? `<h2 class="mb-2 mt-5 text-sm font-semibold text-slate-500">No disponibles ese día</h2><div class="space-y-2">${s.sin.map(x => item(x, 0, true)).join('')}</div>` : ''}`;
}

// ================= MÁS / COPIA =================
function vistaMas({ st }) {
  const fila = (h, t, d) => `<a href="${h}" class="flex min-h-[64px] items-center justify-between rounded-2xl border border-slate-200 bg-white px-4"><span><b class="block">${t}</b><span class="text-sm text-slate-500">${d}</span></span><span class="text-slate-400">›</span></a>`;
  const a = ahora();
  return `${titulo('Más')}<div class="space-y-3">${fila('#/empleados', 'Personas', 'Agregar, editar o archivar')}${fila('#/disponibilidad', 'Disponibilidad', 'Qué días y horas puede venir cada persona')}
    ${fila('#/sugerencia', '¿Quién debería venir?', 'Sugerencia según las horas de la semana')}${fila('#/turnos', 'Turnos', 'El horario normal y los cambios por fecha')}</div>
    ${fila('#/ajustes', 'Ajustes', 'Nombre que aparece en la app y el PDF, y zona horaria')}
    <h2 class="mb-2 mt-7 text-lg font-semibold">Copia de seguridad</h2>
    ${tarjeta(`<p class="text-sm text-slate-600">Tus datos están solo en este teléfono. Si borras los datos del navegador o cambias de teléfono, se pierden. Guarda una copia cada semana y envíatela por WhatsApp o correo.</p>
      <p class="mt-2 text-sm">${st.ultimaCopia ? `Última copia: <b>${fechaCompleta(st.ultimaCopia)}</b>` : '<b class="text-amber-800">Todavía no has guardado una copia.</b>'}</p>
      <div class="mt-3 grid gap-2">${botonPri('Guardar copia y enviarla', 'data-a="copia-guardar"')}
      <label class="flex min-h-[44px] cursor-pointer items-center justify-center rounded-xl border border-slate-300 bg-white text-sm font-medium">Restaurar una copia<input type="file" accept=".json,application/json" data-a="copia-restaurar" class="sr-only"></label></div>`)}
    <h2 class="mb-2 mt-7 text-lg font-semibold">Instalar en el teléfono</h2>
    ${tarjeta(`<p class="text-sm text-slate-600"><b>Android (Chrome):</b> menú ⋮ → “Instalar aplicación” o “Agregar a pantalla de inicio”.</p>
      <p class="mt-2 text-sm text-slate-600"><b>iPhone (Safari):</b> botón Compartir → “Agregar a pantalla de inicio”. Ábrela siempre desde ese ícono.</p>
      <p class="mt-2 text-sm text-slate-600">Después funciona sin internet.</p>`)}
    <h2 class="mb-2 mt-7 text-lg font-semibold">Datos</h2>
    <div class="grid gap-2">${boton('Borrar todos los datos', 'data-a="borrar-todo"', 'border border-red-300 text-red-700 bg-white')}</div>
    <p class="mt-5 text-center text-xs text-slate-400">Hoy es ${fechaLarga(a.fecha)}</p>`;
}

// ================= AJUSTES =================
function zonasDisponibles() {
  try { if (Intl.supportedValuesOf) return Intl.supportedValuesOf('timeZone'); } catch (e) { /* lista corta */ }
  return ['America/Caracas', 'America/Bogota', 'America/Lima', 'America/Mexico_City', 'America/Santiago', 'America/Argentina/Buenos_Aires', 'America/New_York', 'Europe/Madrid'];
}
function vistaAjustes({ st }) {
  const a = ahora(), zonas = zonasDisponibles(), actual = st.ajustes.zona;
  const opciones = [['', `Automática (la del teléfono: ${Intl.DateTimeFormat().resolvedOptions().timeZone})`], ...zonas.map(z => [z, z.replace(/_/g, ' ')])];
  return `${volver('#/mas', 'Más')}${titulo('Ajustes')}
    <form data-f="ajustes" class="space-y-4">
      ${tarjeta(`<label class="mb-1 block text-sm text-slate-600" for="aj-org">Nombre (opcional)</label>
        <input id="aj-org" name="organizacion" value="${esc(st.ajustes.organizacion)}" maxlength="60" placeholder="Ej.: Mi grupo, Escuela, Taller…" class="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base" autocomplete="off">
        <p class="mt-1 text-xs text-slate-500">Aparece arriba en la app y en el encabezado del PDF.</p>
        <label class="mb-1 mt-4 block text-sm text-slate-600" for="aj-desc">¿Para qué lo usas? (opcional)</label>
        <input id="aj-desc" name="descripcion" value="${esc(st.ajustes.descripcion)}" maxlength="100" placeholder="Ej.: Asistencia del personal del taller" class="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-base" autocomplete="off">`)}
      ${tarjeta(`<label class="mb-1 block text-sm text-slate-600" for="aj-zona">Zona horaria</label>
        <select id="aj-zona" name="zona" class="w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base">${opciones.map(([v, l]) => `<option value="${esc(v)}" ${v === actual ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>
        <p class="mt-2 text-sm text-slate-600">Ahora son <b>${deMin(a.min)}</b> del ${fechaLarga(a.fecha)}. Las marcas “Entró” y “Salió” usan esta hora.</p>`)}
      <button class="min-h-[56px] w-full rounded-xl bg-blue-700 text-lg font-semibold text-white">Guardar ajustes</button></form>`;
}

// ================= ENRUTADOR DE VISTAS =================
export const RUTAS = {
  hoy: { v: vistaHoy, tab: 'hoy' }, dia: { v: vistaDia, tab: 'hoy' }, semana: { v: c => (c.p[1] ? vistaDesglose(c) : vistaSemana(c)), tab: 'semana' },
  empleados: { v: vistaEmpleados, tab: 'mas' }, turnos: { v: vistaTurnos, tab: 'mas' }, disponibilidad: { v: vistaDisponibilidad, tab: 'mas' },
  disp: { v: vistaFicha, tab: 'mas' }, ajustes: { v: vistaAjustes, tab: 'mas' }, sugerencia: { v: vistaSugerencia, tab: 'mas' }, mas: { v: vistaMas, tab: 'mas' },
};

// ================= ACCIONES =================
// Cada acción devuelve: true = guardar y dibujar de nuevo; false = solo dibujar; null = no hacer nada más.
const fallo = r => { if (r.error) { toast(r.error, 'error'); return true; } return false; };
const nombreDe = (st, id) => S.empleado(st, id)?.nombre || '';

export const acciones = {
  'omitir-bienvenida': ({ st }) => { st.ajustes.bienvenida = true; return true; },
  ir: (c) => { location.hash = c.d.h; return false; },
  modo: ({ d, ui }) => { ui.modo = d.m; ui.erroresDia = {}; ui.valoresDia = null; return false; },
  dia: ({ d, ui }) => { const a = ahora().fecha, f = sumarDias(ui.fecha || a, Number(d.d)); ui.fecha = f >= a ? null : f; ui.erroresDia = {}; ui.valoresDia = null; return false; },
  hoy: ({ ui }) => { ui.fecha = null; return false; },
  marcar: ({ st, d, ui }) => { const r = A.marcar(st, Number(d.id)); if (r.error) { ui.errores[d.id] = r.error; } else delete ui.errores[d.id]; return true; },
  ajustar: ({ st, d, ui }) => { ui.abiertos.add(Number(d.id)); const r = A.ajustar(st, Number(d.id), d.s); if (r.error) ui.errores[d.id] = r.error; else delete ui.errores[d.id]; return true; },
  'marcar-hora': async ({ st, d, ui }) => {
    const id = Number(d.id), emp = S.empleado(st, id), estado = S.estadoDe(S.tramosDelDia(st, id, ahora().fecha));
    const que = estado === 'presente' ? 'salida' : estado === 'se_fue' ? 'regreso' : 'entrada';
    const v = await formulario({ titulo: `Hora de ${que} de ${emp.nombre}`, mensaje: 'Escribe la hora real a la que ocurrió, si no la marcaste en el momento.',
      campos: [{ n: 'hora', t: 'time', l: `Hora de ${que}`, v: deMin(ahora().min) }], boton: 'Marcar' });
    if (!v) return false;
    const r = A.marcarA(st, id, v.hora);
    if (r.error) { ui.errores[id] = r.error; toast(r.error, 'error'); } else { delete ui.errores[id]; toast(`Marcada a las ${v.hora}.`); }
    return true;
  },
  'cambiar-ultima': async ({ st, d, ui }) => {
    const id = Number(d.id), emp = S.empleado(st, id), tr = S.tramosDelDia(st, id, ahora().fecha), u = tr[tr.length - 1];
    if (!u) return false;
    ui.abiertos.add(id);
    const cerrado = u.salida != null;
    const v = await formulario({ titulo: `Cambiar la hora de ${cerrado ? 'salida' : 'entrada'} de ${emp.nombre}`, mensaje: 'Escribe la hora exacta correcta.',
      campos: [{ n: 'hora', t: 'time', l: `Hora de ${cerrado ? 'salida' : 'entrada'}`, v: deMin(cerrado ? u.salida : u.entrada) }], boton: 'Cambiar' });
    if (!v) return false;
    const r = A.cambiarUltimaMarca(st, id, v.hora);
    if (r.error) { ui.errores[id] = r.error; toast(r.error, 'error'); } else { delete ui.errores[id]; toast('Hora cambiada.'); }
    return true;
  },
  deshacer: ({ st, d, ui }) => { ui.abiertos.add(Number(d.id)); A.deshacer(st, Number(d.id)); return true; },
  bloque: ({ st, d }) => { const r = A.bloque(st, d.q); toast(r.hechos ? `${r.hechos} marcas a las ${r.hora}.${r.omitidos ? ` ${r.omitidos} omitidas.` : ''}` : 'No había a quién marcar.'); return true; },
  // Solo marca o desmarca casillas en pantalla: no hay que guardar ni volver a dibujar (se perderían).
  todos: ({ d }) => { document.querySelectorAll('[name^="vino-"]:not(:disabled)').forEach(c => { c.checked = d.v === '1'; }); return null; },

  sem: ({ d, ui }) => { ui.semana = sumarDias(ui.semana || lunesDe(ahora().fecha), Number(d.d)); return false; },
  'cerrar-semana': async ({ st, ui }) => {
    const lunes = ui.semana || lunesDe(ahora().fecha), ult = S.ultimoCierre(st, lunes);
    const ok = await confirmar({ titulo: ult ? `¿Volver a cerrar la semana (versión ${ult.version + 1})?` : `¿Cerrar la semana ${rangoSemana(lunes)}?`,
      mensaje: 'Se guarda una copia de estos totales como lo entregado. Después se puede corregir, con motivo, y verás la diferencia.', boton: 'Cerrar semana' });
    if (!ok) return false;
    const r = A.cerrarSemana(st, lunes); toast(`Semana cerrada (versión ${r.version}).`); return true;
  },
  'pdf-compartir': async ({ st, ui }) => { const r = await compartirPdf(st, ui.semana || lunesDe(ahora().fecha)); if (r === 'descargado') toast('PDF guardado en tu teléfono.'); return false; },
  'pdf-descargar': ({ st, ui }) => { descargarPdf(st, ui.semana || lunesDe(ahora().fecha)); toast('PDF guardado en tu teléfono.'); return false; },

  'agregar-emp': async ({ st }) => {
    const v = await formulario({ titulo: 'Nueva persona', campos: [{ n: 'nombre', t: 'text', l: 'Nombre' }], boton: 'Agregar' });
    if (!v) return false;
    if (fallo(A.agregarEmpleado(st, v.nombre))) return false;
    toast('Persona agregada. Falta registrar su disponibilidad.'); return true;
  },
  'editar-emp': async ({ st, d }) => {
    const v = await formulario({ titulo: 'Editar persona', campos: [{ n: 'nombre', t: 'text', l: 'Nombre', v: nombreDe(st, Number(d.id)) }] });
    return v ? !fallo(A.editarEmpleado(st, Number(d.id), v.nombre)) : false;
  },
  archivar: async ({ st, d }) => {
    const ok = await confirmar({ titulo: `¿Archivar a ${nombreDe(st, Number(d.id))}?`, mensaje: 'Dejará de aparecer en Hoy, disponibilidad y sugerencias. Su historial y los totales ya entregados se conservan, y se puede reactivar cuando vuelva.', boton: 'Sí, archivar', peligro: true });
    if (!ok) return false; A.archivarEmpleado(st, Number(d.id)); toast('Archivada. Su historial se conserva.'); return true;
  },
  reactivar: ({ st, d }) => { A.archivarEmpleado(st, Number(d.id), false); toast('Reactivada.'); return true; },
  'eliminar-emp': async ({ st, d }) => {
    const ok = await confirmar({ titulo: `¿Eliminar a ${nombreDe(st, Number(d.id))}?`, mensaje: 'No tiene horas registradas, así que se elimina por completo. Esto no se puede deshacer.', boton: 'Sí, eliminar', peligro: true });
    return ok ? !fallo(A.eliminarEmpleado(st, Number(d.id))) : false;
  },
  'ver-archivados': ({ ui, el }) => { ui.verArchivados = el.checked; return false; },

  'nuevo-turno': async ({ st }) => {
    const v = await formulario({ titulo: 'Nuevo turno', campos: [{ n: 'nombre', t: 'text', l: 'Nombre', v: '' }, { n: 'inicio', t: 'time', l: 'Inicio', v: '09:00' }, { n: 'fin', t: 'time', l: 'Fin', v: '16:00' }, { n: 'dias', t: 'dias', l: 'Días en que rige', v: [0, 1, 2, 3, 4] }] });
    return v ? !fallo(A.crearTurno(st, v)) : false;
  },
  'cambiar-turno': async ({ st, d }) => {
    const t = st.turnos.find(x => x.id === Number(d.id));
    const v = await formulario({ titulo: `Cambiar el horario de «${t.nombre}»`, mensaje: 'Rige desde la fecha elegida. Las semanas anteriores conservan el horario que tenían.',
      campos: [{ n: 'inicio', t: 'time', l: 'Nuevo inicio', v: t.inicio }, { n: 'fin', t: 'time', l: 'Nuevo fin', v: t.fin }, { n: 'desde', t: 'date', l: 'Rige desde', v: ahora().fecha }], boton: 'Cambiar horario' });
    if (!v) return false; if (fallo(A.cambiarHorario(st, t.id, v.desde, v.inicio, v.fin))) return false; toast('Horario cambiado.'); return true;
  },
  'baja-turno': async ({ st, d }) => {
    const ok = await confirmar({ titulo: '¿Dar de baja este turno?', mensaje: 'Deja de regir desde hoy. Los días anteriores se siguen calculando con este turno.', boton: 'Sí, dar de baja', peligro: true });
    return ok ? !fallo(A.darDeBaja(st, Number(d.id))) : false;
  },
  'nueva-exc': async ({ st }) => {
    const v = await formulario({ titulo: 'Excepción por fecha', mensaje: 'Para un día con un turno distinto, o sin turno.',
      campos: [{ n: 'fecha', t: 'date', l: 'Fecha' }, { n: 'turnoId', t: 'select', l: 'Turno ese día', op: [['', 'Sin turno ese día'], ...st.turnos.filter(t => !t.hasta).map(t => [t.id, `${t.nombre} ${t.inicio}–${t.fin}`])], req: false },
        { n: 'inicio', t: 'time', l: 'Inicio ese día (opcional)', req: false }, { n: 'fin', t: 'time', l: 'Fin ese día (opcional)', req: false }] });
    return v ? !fallo(A.agregarExcepcion(st, v)) : false;
  },
  'quitar-exc': async ({ st, d }) => {
    const ok = await confirmar({ titulo: `¿Quitar la excepción del ${fechaCompleta(d.f)}?`, mensaje: 'Ese día volverá a medirse con el turno habitual.', boton: 'Sí, quitar', peligro: true });
    return ok ? !fallo(A.quitarExcepcion(st, d.f)) : false;
  },

  'agregar-franja': async ({ st, d }) => {
    const v = await formulario({ titulo: 'Agregar franja', campos: [{ n: 'dia', t: 'select', l: 'Día', op: DIAS_LARGOS.map((n, i) => [i, n]), v: 0 }, { n: 'desde', t: 'time', l: 'Desde', v: '09:00' }, { n: 'hasta', t: 'time', l: 'Hasta', v: '16:00' }], boton: 'Agregar' });
    return v ? !fallo(A.agregarFranja(st, Number(d.id), Number(v.dia), v.desde, v.hasta, d.v)) : false;
  },
  'quitar-franja': ({ st, d }) => { A.quitarFranja(st, Number(d.id)); return true; },
  'copiar-disp': async ({ st, d, ui }) => {
    const otros = S.empleadosActivos(st).filter(e => e.id !== Number(d.id));
    if (!otros.length) { toast('No hay otras personas de las que copiar.', 'error'); return false; }
    const v = await formulario({ titulo: 'Copiar disponibilidad', mensaje: 'Reemplaza la configuración de hoy por la de la persona elegida.', campos: [{ n: 'origen', t: 'select', l: 'Copiar de', op: otros.map(e => [e.id, e.nombre]) }], boton: 'Copiar' });
    if (!v) return false; const r = A.copiarDisponibilidad(st, Number(v.origen), Number(d.id)); ui.vigencia = r.vigente; toast(`Copiadas ${r.copiadas} franjas.`); return true;
  },
  'nueva-vigencia': async ({ st, d, ui }) => {
    const v = await formulario({ titulo: 'Nueva vigencia', mensaje: 'Parte de la configuración actual, desde esa fecha.', campos: [{ n: 'desde', t: 'date', l: 'Rige desde', v: ahora().fecha }], boton: 'Crear' });
    if (!v || fallo(A.nuevaVigencia(st, Number(d.id), v.desde))) return false; ui.vigencia = v.desde; toast('Edita las franjas de la nueva configuración.'); return true;
  },
  'ver-vigencia': ({ d, ui }) => { ui.vigencia = d.v; return false; },

  'sug-dia': ({ d, ui }) => { ui.sugDia = d.d; return false; },
  aviso: ({ st, d }) => { A.ciclarAviso(st, d.f, Number(d.id)); return true; },

  'copia-guardar': async ({ st }) => {
    const r = await compartirArchivo(A.exportarCopia(st), `asistencia-copia-${ahora().fecha}.json`, 'application/json', 'Copia de seguridad de Control de Asistencia');
    if (r !== 'cancelado') { st.ultimaCopia = ahora().fecha; toast(r === 'descargado' ? 'Copia guardada en tu teléfono. Envíatela por WhatsApp o correo.' : 'Copia enviada.'); return true; }
    return false;
  },
  'copia-restaurar': async ({ st, el, ui }) => {
    const f = el.files && el.files[0]; if (!f) return false;
    const r = A.importarCopia(await f.text()); el.value = '';
    if (fallo(r)) return false;
    const ok = await confirmar({ titulo: '¿Restaurar esta copia?', mensaje: `Reemplaza TODOS los datos de este teléfono por los de la copia (${r.datos.empleados.length} personas, ${r.datos.tramos.length} marcas).`, boton: 'Sí, restaurar', peligro: true });
    if (!ok) return false;
    Object.keys(st).forEach(k => delete st[k]); Object.assign(st, r.datos); ui.semana = null; ui.fecha = null; toast('Copia restaurada.'); return true;
  },
  'borrar-todo': async ({ st, ui }) => {
    const ok = await confirmar({ titulo: '¿Borrar todos los datos?', mensaje: 'Se eliminan personas, horas, turnos y disponibilidad de este teléfono. Esto no se puede deshacer. Guarda una copia antes.', boton: 'Sí, borrar todo', peligro: true });
    if (!ok) return false; Object.keys(st).forEach(k => delete st[k]); Object.assign(st, estadoInicial()); ui.semana = null; ui.fecha = null; toast('Datos borrados.'); return true;
  },
};

export const formularios = {
  bienvenida: ({ st, form }) => {
    const f = new FormData(form), r = A.configuracionInicial(st, { organizacion: f.get('organizacion'), descripcion: f.get('descripcion'), personas: f.get('personas') });
    if (r.error) { toast(r.error, 'error'); return false; }
    toast(r.agregadas ? `Listo. ${r.agregadas} ${r.agregadas === 1 ? 'persona agregada' : 'personas agregadas'}.` : 'Listo. Agrega personas cuando quieras.'); return true;
  },
  ajustes: ({ st, form }) => {
    const f = new FormData(form), r = A.guardarAjustes(st, { organizacion: f.get('organizacion'), descripcion: f.get('descripcion'), zona: f.get('zona') });
    if (r.error) { toast(r.error, 'error'); return false; }
    fijarZona(st.ajustes.zona); toast('Ajustes guardados.'); return true;
  },
  'guardar-dia': ({ st, ui, form }) => {
    const fecha = ui.fecha || ahora().fecha, f = new FormData(form), filas = {};
    for (const e of S.empleadosActivos(st)) filas[e.id] = { vino: f.get(`vino-${e.id}`) === 'on', entrada: f.get(`entrada-${e.id}`) || '', salida: f.get(`salida-${e.id}`) || '' };
    const r = A.guardarDia(st, fecha, filas);
    if (r.error) { ui.erroresDia = r.errores; ui.valoresDia = filas; toast('Revisa las horas marcadas en rojo.', 'error'); return false; }
    ui.erroresDia = {}; ui.valoresDia = null;
    toast(r.cambios ? `Día guardado (${r.cambios} cambios).` : 'No había cambios que guardar.'); return true;
  },
  'corregir-dia': ({ st, ui, form }) => {
    const empId = Number(form.dataset.emp), fecha = form.dataset.fecha, f = new FormData(form);
    const tramos = S.tramosDelDia(st, empId, fecha).map(t => ({
      id: t.id, entrada: aMin(f.get(`entrada-${t.id}`)), salida: f.get(`salida-${t.id}`) ? aMin(f.get(`salida-${t.id}`)) : null, quitar: f.get(`quitar-${t.id}`) === 'on',
    }));
    const ne = f.get('entrada-nuevo'), ns = f.get('salida-nuevo');
    const r = A.corregirDia(st, empId, fecha, { tramos, nuevo: ne ? { entrada: aMin(ne), salida: ns ? aMin(ns) : null } : null, motivo: f.get('motivo') });
    if (r.error) { ui.errorDia = r.error; toast(r.error, 'error'); return false; }
    ui.errorDia = ''; toast('Día corregido.'); if (history.length > 1) history.back(); else location.hash = '#/hoy'; return true;
  },
};
