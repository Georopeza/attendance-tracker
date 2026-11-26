// Fechas como texto 'AAAA-MM-DD' y horas en minutos. "Ahora" sale de la zona horaria elegida en Ajustes
// (por defecto, la del teléfono), así los datos no cambian si el teléfono viaja.
export const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
export const DIAS_LARGOS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

let reloj = null; // para pruebas: { fecha, min }
export const fijarReloj = r => { reloj = r; };
let zona = '';    // '' = la del teléfono
export const fijarZona = z => { zona = z || ''; };
export const zonaActiva = () => zona || Intl.DateTimeFormat().resolvedOptions().timeZone;
export function zonaValida(z) { try { new Intl.DateTimeFormat('en', { timeZone: z }); return true; } catch (e) { return false; } }

export function ahora() {
  if (reloj) return reloj;
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: zonaValida(zona) && zona ? zona : undefined, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date()).map(x => [x.type, x.value]));
  return { fecha: `${p.year}-${p.month}-${p.day}`, min: Number(p.hour) * 60 + Number(p.minute) };
}

const utc = f => { const [y, m, d] = f.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)); };
export const diaSemana = f => (utc(f).getUTCDay() + 6) % 7; // 0 = lunes
export function sumarDias(f, n) { const d = utc(f); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); }
export const lunesDe = f => sumarDias(f, -diaSemana(f));
export const fechaCorta = f => `${f.slice(8, 10)}/${f.slice(5, 7)}`;
export const fechaCompleta = f => `${f.slice(8, 10)}/${f.slice(5, 7)}/${f.slice(0, 4)}`;
export const fechaLarga = f => `${DIAS_LARGOS[diaSemana(f)].toLowerCase()} ${Number(f.slice(8, 10))} de ${MESES[Number(f.slice(5, 7)) - 1]}`;
// ---- meses: se identifican por su primer día ('AAAA-MM-01') ----
export const primerDiaMes = f => f.slice(0, 7) + '-01';
export function sumarMeses(mes, n) { const [y, m] = mes.split('-').map(Number); return new Date(Date.UTC(y, m - 1 + n, 1)).toISOString().slice(0, 10); }
export const ultimoDiaMes = mes => sumarDias(sumarMeses(mes, 1), -1);
export const nombreMes = mes => `${MESES[Number(mes.slice(5, 7)) - 1]} de ${mes.slice(0, 4)}`;
export const rangoCorto = (a, b) => `${Number(a.slice(8, 10))}/${a.slice(5, 7)} al ${Number(b.slice(8, 10))}/${b.slice(5, 7)}`;
export const rangoSemana = l => `${fechaCorta(l)} al ${fechaCorta(sumarDias(l, 6))}`;
