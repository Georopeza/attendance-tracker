// Piezas de interfaz: texto seguro, avisos, confirmaciones y formularios en hoja emergente.
export const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

let temporizador;
export function toast(msg, tipo = 'ok') {
  let el = document.getElementById('toast');
  if (!el) { el = document.createElement('div'); el.id = 'toast'; el.setAttribute('role', 'status'); document.body.appendChild(el); }
  el.textContent = msg;
  el.className = `fixed left-1/2 -translate-x-1/2 z-50 max-w-[90vw] rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${tipo === 'error' ? 'bg-red-700 text-white' : 'bg-slate-900 text-white'}`;
  el.style.bottom = 'calc(88px + env(safe-area-inset-bottom, 0px))';
  el.hidden = false;
  clearTimeout(temporizador);
  temporizador = setTimeout(() => { el.hidden = true; }, tipo === 'error' ? 4200 : 2400);
}

const CLASE_CAMPO = 'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-base';

function campoHtml(c) {
  const id = `f-${c.n}`, req = c.req === false ? '' : (c.t === 'dias' ? '' : 'required');
  const etiqueta = `<label for="${id}" class="mb-1 block text-sm text-slate-600">${esc(c.l)}</label>`;
  if (c.t === 'select') {
    return `<div>${etiqueta}<select id="${id}" name="${c.n}" class="${CLASE_CAMPO}" ${req}>${c.op.map(([v, l]) => `<option value="${esc(v)}" ${String(v) === String(c.v) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></div>`;
  }
  if (c.t === 'dias') {
    const dias = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
    return `<fieldset><legend class="mb-1 text-sm text-slate-600">${esc(c.l)}</legend><div class="flex flex-wrap gap-2">${dias.map((d, i) =>
      `<label class="flex min-h-[44px] min-w-[3.4rem] cursor-pointer items-center justify-center rounded-lg border border-slate-300 bg-white px-2 text-sm has-[:checked]:border-blue-700 has-[:checked]:bg-blue-700 has-[:checked]:text-white"><input type="checkbox" class="sr-only" name="${c.n}" value="${i}" ${(c.v || []).includes(i) ? 'checked' : ''}>${d}</label>`).join('')}</div></fieldset>`;
  }
  const tipo = c.t === 'area' ? 'text' : c.t;
  return `<div>${etiqueta}<input id="${id}" name="${c.n}" type="${tipo}" value="${esc(c.v ?? '')}" placeholder="${esc(c.ph ?? '')}" class="${CLASE_CAMPO}" ${req} autocomplete="off"></div>`;
}

function hoja(contenido) {
  return new Promise(resolver => {
    const d = document.createElement('dialog');
    d.className = 'w-[min(94vw,28rem)] rounded-2xl border-0 p-0 shadow-2xl backdrop:bg-black/50';
    d.innerHTML = contenido;
    document.body.appendChild(d);
    let valor = null;
    d.addEventListener('close', () => { d.remove(); resolver(valor); });
    d.querySelector('[data-cancelar]').addEventListener('click', () => d.close());
    d.querySelector('form').addEventListener('submit', ev => {
      ev.preventDefault();
      const f = new FormData(ev.target), v = {};
      for (const k of new Set(f.keys())) v[k] = f.getAll(k).length > 1 || k === 'dias' ? f.getAll(k) : f.get(k);
      if (v.dias !== undefined) v.dias = [].concat(v.dias).map(Number);
      else if (contenido.includes('name="dias"')) v.dias = [];
      valor = v;
      d.close();
    });
    d.showModal();
    const primero = d.querySelector('input:not([type=checkbox]),select');
    if (primero && primero.type !== 'time' && primero.type !== 'date') primero.focus();
  });
}

/** Hoja con campos. Devuelve un objeto con los valores, o null si se cancela. */
export function formulario({ titulo, mensaje = '', campos, boton = 'Guardar' }) {
  return hoja(`<form class="space-y-4 p-5"><h2 class="text-lg font-semibold">${esc(titulo)}</h2>
    ${mensaje ? `<p class="text-sm text-slate-600">${esc(mensaje)}</p>` : ''}
    ${campos.map(campoHtml).join('')}
    <div class="flex gap-3 pt-1"><button type="button" data-cancelar class="min-h-[48px] flex-1 rounded-xl border border-slate-300 font-medium">Cancelar</button>
    <button class="min-h-[48px] flex-1 rounded-xl bg-blue-700 font-semibold text-white">${esc(boton)}</button></div></form>`);
}

/** Confirmación. Devuelve { motivo } si acepta, o null. */
export function confirmar({ titulo, mensaje, boton = 'Confirmar', peligro = false, motivo = false }) {
  return hoja(`<form class="space-y-4 p-5"><h2 class="text-lg font-semibold">${esc(titulo)}</h2>
    <p class="text-sm text-slate-600">${esc(mensaje)}</p>
    ${motivo ? campoHtml({ n: 'motivo', t: 'text', l: 'Motivo (opcional)', req: false }) : ''}
    <div class="flex gap-3 pt-1"><button type="button" data-cancelar class="min-h-[48px] flex-1 rounded-xl border border-slate-300 font-medium">Cancelar</button>
    <button class="min-h-[48px] flex-1 rounded-xl font-semibold text-white ${peligro ? 'bg-red-700' : 'bg-blue-700'}">${esc(boton)}</button></div></form>`)
    .then(v => (v ? { motivo: v.motivo || '' } : null));
}
