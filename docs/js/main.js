// Arranque, rutas y eventos. Todo se dibuja de nuevo después de cada cambio (los datos son pequeños).
import { cargar, guardar, pedirPersistencia } from './store.js';
import { RUTAS, acciones, formularios } from './vistas.js';
import { toast, esc } from './ui.js';
import { fijarZona } from './fechas.js';

const st = cargar();
fijarZona(st.ajustes.zona);
const ui = { modo: 'momento', fecha: null, semana: null, abiertos: new Set(), errores: {}, erroresDia: {}, valoresDia: null, verArchivados: false, vigencia: null, sugDia: null, errorDia: '' };
const app = document.getElementById('app');
const PESTAÑAS = [['hoy', 'Hoy', '#/hoy', 'M5 13l4 4L19 7'], ['semana', 'Semana', '#/semana', 'M4 6h16M4 12h16M4 18h10'], ['mas', 'Más', '#/mas', 'M5 12h.01M12 12h.01M19 12h.01']];

function ruta() {
  const p = (location.hash || '#/hoy').replace(/^#\/?/, '').split('/');
  return { p, nombre: RUTAS[p[0]] ? p[0] : 'hoy' };
}

function dibujar() {
  const { p, nombre } = ruta(), r = RUTAS[nombre], y = window.scrollY;
  let html;
  try { html = r.v({ st, ui, p }); } catch (e) { console.error(e); html = `<div class="rounded-2xl bg-red-100 p-4 text-red-900">Algo salió mal al mostrar esta pantalla. Vuelve a Hoy y, si sigue, guarda una copia de seguridad.</div>`; }
  const nav = PESTAÑAS.map(([k, t, h, d]) => `<a href="${h}" class="flex min-h-[56px] flex-1 flex-col items-center justify-center gap-0.5 text-xs font-medium ${r.tab === k ? 'text-blue-700' : 'text-slate-500'}" ${r.tab === k ? 'aria-current="page"' : ''}>
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>${t}</a>`).join('');
  app.innerHTML = `<header class="flex items-center gap-2 px-4 pb-1 pt-3"><span class="grid h-6 w-6 place-items-center rounded-md bg-blue-700 text-white" aria-hidden="true"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 13l4 4L19 7"/></svg></span><span class="truncate font-bold">${esc(st.ajustes.organizacion || 'Control de Asistencia')}</span></header>
    <main class="mx-auto w-full max-w-2xl px-4 pb-32 pt-3">${html}</main>
    <nav class="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur" style="padding-bottom:env(safe-area-inset-bottom,0px)"><div class="mx-auto flex max-w-2xl">${nav}</div></nav>`;
  window.scrollTo(0, y);
}

function persistirYDibujar(cambio) { if (cambio === null) return; if (cambio !== false) guardar(st); dibujar(); }

addEventListener('hashchange', () => { ui.errorDia = ''; window.scrollTo(0, 0); dibujar(); });

document.addEventListener('click', async ev => {
  const el = ev.target.closest('[data-a]');
  if (!el || el.tagName === 'INPUT' && el.type === 'file') return;
  const f = acciones[el.dataset.a]; if (!f) return;
  ev.preventDefault();
  if (el.dataset.a === 'ver-archivados') { /* casilla: se maneja en change */ return; }
  try { persistirYDibujar(await f({ st, ui, d: el.dataset, el })); } catch (e) { console.error(e); toast('No se pudo completar la acción.', 'error'); }
});
document.addEventListener('change', async ev => {
  const el = ev.target.closest('[data-a]');
  if (!el || !(el.type === 'file' || el.type === 'checkbox')) return;
  const f = acciones[el.dataset.a]; if (!f) return;
  try { persistirYDibujar(await f({ st, ui, d: el.dataset, el })); } catch (e) { console.error(e); toast('No se pudo completar la acción.', 'error'); }
});
document.addEventListener('submit', async ev => {
  const form = ev.target.closest('form[data-f]'); if (!form) return;
  ev.preventDefault();
  const f = formularios[form.dataset.f]; if (!f) return;
  try { persistirYDibujar(await f({ st, ui, form })); } catch (e) { console.error(e); toast('No se pudo guardar.', 'error'); }
});
document.addEventListener('toggle', ev => {
  const d = ev.target; if (!d.dataset || !d.dataset.det) return;
  const id = Number(d.dataset.det); if (d.open) ui.abiertos.add(id); else ui.abiertos.delete(id);
}, true);

// Al volver a abrir la app (otro día), se actualiza "hoy".
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') dibujar(); });

if (!location.hash) location.hash = '#/hoy';
dibujar();
pedirPersistencia();

if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('sw.js').catch(() => { /* sin soporte: la app funciona igual en línea */ });
}
