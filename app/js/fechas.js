// Fechas como texto 'AAAA-MM-DD' y horas en minutos. La hora de "ahora" siempre es la de Venezuela.
export const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
export const DIAS_LARGOS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

let reloj = null; // para pruebas: { fecha, min }
export const fijarReloj = r => { reloj = r; };

export function ahora() {
  if (reloj) return reloj;
  const p = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Caracas', year: 'numeric', month: '2-digit', day: '2-digit',
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
export const rangoSemana = l => `${fechaCorta(l)} al ${fechaCorta(sumarDias(l, 6))}`;
