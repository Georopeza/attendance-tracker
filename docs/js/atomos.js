// Piezas visuales compartidas por las pantallas (devuelven HTML).
export const tarjeta = (c, clase = '') => `<section class="rounded-2xl border border-slate-200 bg-white p-4 ${clase}">${c}</section>`;
export const titulo = (t, sub = '') => `<div class="mb-4"><h1 class="text-2xl font-bold tracking-tight">${t}</h1>${sub ? `<p class="mt-1 text-sm text-slate-500">${sub}</p>` : ''}</div>`;
export const boton = (txt, data, clase = 'border border-slate-300 bg-white') => `<button ${data} class="min-h-[44px] rounded-xl px-4 text-sm font-medium ${clase}">${txt}</button>`;
export const botonPri = (txt, data) => boton(txt, data, 'bg-blue-700 text-white font-semibold');
export const pildora = (txt, c) => `<span class="inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${c}">${txt}</span>`;
export const vacio = (t, extra = '') => tarjeta(`<p class="text-slate-600">${t}</p>${extra}`);
export const volver = (href, txt = 'Volver') => `<a href="${href}" class="mb-3 inline-flex min-h-[44px] items-center text-sm font-medium text-blue-700">← ${txt}</a>`;
export const stepper = (izq, centro, der) => `<div class="flex items-center justify-between gap-2">${izq}<div class="text-center">${centro}</div>${der}</div>`;
export const flecha = (txt, data, label, off = false) => `<button ${data} aria-label="${label}" ${off ? 'disabled' : ''} class="h-11 w-11 rounded-xl border border-slate-300 bg-white text-lg disabled:opacity-30">${txt}</button>`;

/** Cuatro botones para compartir o descargar un informe en PDF y en Excel. `tipo` dice cuál informe es. */
export const botonesExportar = tipo => `<div class="grid grid-cols-2 gap-2">${botonPri('Compartir PDF', `data-a="exportar" data-t="${tipo}" data-f="pdf" data-m="compartir"`)}${boton('Descargar PDF', `data-a="exportar" data-t="${tipo}" data-f="pdf" data-m="descargar"`)}
  ${boton('Compartir Excel', `data-a="exportar" data-t="${tipo}" data-f="xlsx" data-m="compartir"`)}${boton('Descargar Excel', `data-a="exportar" data-t="${tipo}" data-f="xlsx" data-m="descargar"`)}</div>`;
