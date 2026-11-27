// Informes en Excel (se generan en el teléfono). Usa xlsx-js-style (carpeta vendor/).
// Las horas van como números de Excel con formato [h]:mm para poder sumarlas, y también en horas decimales.
import { deMin } from './horas.js';
import { ahora, DIAS_LARGOS, diaSemana, fechaCompleta, sumarDias, ultimoDiaMes, nombreMes } from './fechas.js';
import * as S from './servicios.js';

const FINO = { style: 'thin', color: { rgb: 'C9D1DC' } };
const BORDE = { top: FINO, bottom: FINO, left: FINO, right: FINO };
export const ESTILO = {
  titulo: { font: { bold: true, sz: 15, color: { rgb: '1F3A5F' } } },
  sub: { font: { sz: 10, color: { rgb: '667085' } } },
  enc: { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '1F3A5F' } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border: BORDE },
  celda: { border: BORDE },
  total: { font: { bold: true }, fill: { fgColor: { rgb: 'EEF1F6' } }, border: BORDE },
  seccion: { font: { bold: true, sz: 12, color: { rgb: '1F3A5F' } } },
  gris: { font: { color: { rgb: '98A2B3' } }, border: BORDE },
  revisar: { fill: { fgColor: { rgb: 'FDEBC6' } }, border: BORDE },
};
export const HORAS_FMT = '[h]:mm';

/** Celda con estilo. fmt: formato de número (opcional). */
export function c(v, estilo = ESTILO.celda, fmt) {
  const o = { v, t: typeof v === 'number' ? 'n' : 's', s: estilo };
  if (fmt) o.z = fmt;
  return o;
}
export const horas = (min, estilo = ESTILO.celda) => c(min / 1440, estilo, HORAS_FMT);       // 7 h 38 min -> 7:38 (sumable)
export const decimales = (min, estilo = ESTILO.celda) => c(Math.round(min / 60 * 100) / 100, estilo, '0.00'); // 7,63
export const enc = textos => textos.map(t => c(t, ESTILO.enc));

/** filas: arreglo de arreglos de celdas (o valores sueltos). anchos: en caracteres. */
export function hoja(filas, anchos = [], opciones = {}) {
  const X = window.XLSX, ws = X.utils.aoa_to_sheet(filas);
  ws['!cols'] = anchos.map(w => ({ wch: w }));
  if (opciones.congelar) ws['!views'] = [{ state: 'frozen', ySplit: opciones.congelar }];
  if (opciones.filtro) ws['!autofilter'] = { ref: opciones.filtro };
  return ws;
}
export function libro(hojas, titulo) {
  const X = window.XLSX, wb = X.utils.book_new();
  wb.Props = { Title: titulo, Author: 'Control de asistencia' };
  for (const [nombre, ws] of hojas) X.utils.book_append_sheet(wb, ws, nombre.slice(0, 31));
  const bytes = X.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
}
export const encabezadoHoja = (st, titulo, sub) => {
  const org = [(st.ajustes && st.ajustes.organizacion) || '', (st.ajustes && st.ajustes.descripcion) || ''].filter(Boolean).join(' · ');
  return [[c(org || 'Control de asistencia', ESTILO.sub)], [c(titulo, ESTILO.titulo)], [c(sub, ESTILO.sub)], [c(`Generado el ${fechaCompleta(ahora().fecha)} ${deMin(ahora().min)}`, ESTILO.sub)], []];
};

// ================= HORAS DEL PERSONAL =================
const COLS_H = ['Persona', 'Días asistidos', 'Horas normales', 'Extra tras turno', 'Extra día sin turno', 'Total (h:mm)', 'Total (horas decimales)'];

function filaResumen(f, nombre) {
  return [c(nombre), c(f.dias), horas(f.normales), horas(f.extraTurno), horas(f.extraSinTurno), horas(f.total, ESTILO.total), decimales(f.total, ESTILO.total)];
}
/** Fila de totales: son fórmulas SUM, con el valor ya calculado dentro (así se ve también en visores que no calculan). */
function filaTotales(filas, desde, hasta) {
  const L = i => String.fromCharCode(65 + i);
  const t = campo => filas.reduce((s, f) => s + f[campo], 0);
  const celda = (i, v, fmt) => ({ f: `SUM(${L(i)}${desde}:${L(i)}${hasta})`, v, t: 'n', s: ESTILO.total, z: fmt });
  return [c('Total del equipo', ESTILO.total), celda(1, t('dias')), celda(2, t('normales') / 1440, HORAS_FMT), celda(3, t('extraTurno') / 1440, HORAS_FMT),
    celda(4, t('extraSinTurno') / 1440, HORAS_FMT), celda(5, t('total') / 1440, HORAS_FMT),
    celda(6, filas.reduce((s, f) => s + Math.round(f.total / 60 * 100) / 100, 0), '0.00')];
}

export function excelHorasSemana(st, lunes) {
  const { filas } = S.resumenSemana(st, lunes), fin = sumarDias(lunes, 6);
  const sub = `Semana del ${fechaCompleta(lunes)} al ${fechaCompleta(fin)}`;
  const top = encabezadoHoja(st, 'Resumen semanal de horas', sub);
  const r0 = top.length + 2;
  const resumen = [...top, enc(COLS_H), ...filas.map(f => filaResumen(f, f.emp.nombre)), filaTotales(filas, r0, r0 + filas.length - 1)];
  if (filas.some(f => f.porRevisar)) resumen.push([], [c('Hay días con minutos entre 16 y 44 sin redondear (resaltados en el detalle): la coordinación decide cómo contarlos.', ESTILO.sub)]);
  const det = [enc(['Persona', 'Día', 'Fecha', 'Entrada', 'Salida', 'Normales', 'Extra tras turno', 'Extra día sin turno', 'Total del día (h:mm)', 'Total (decimal)', 'Observación'])];
  for (const f of filas) for (const d of S.desgloseSemana(st, f.emp.id, lunes)) {
    const r = d.resumen, nombreDia = DIAS_LARGOS[diaSemana(d.fecha)];
    if (!d.tramos.length) { det.push([c(f.emp.nombre, ESTILO.gris), c(nombreDia, ESTILO.gris), c(fechaCompleta(d.fecha), ESTILO.gris), c('', ESTILO.gris), c('', ESTILO.gris), c('', ESTILO.gris), c('', ESTILO.gris), c('', ESTILO.gris), c('', ESTILO.gris), c('', ESTILO.gris), c('No asistió', ESTILO.gris)]); continue; }
    d.tramos.forEach((t, i) => {
      const ultimo = i === d.tramos.length - 1, obs = [d.sinTurno ? 'Sin turno' : '', r.porRevisar && ultimo ? 'Minutos sin redondear' : ''].filter(Boolean).join(' · ');
      det.push([c(f.emp.nombre), c(nombreDia), c(fechaCompleta(d.fecha)), c(deMin(t.entrada)), c(t.salida != null ? deMin(t.salida) : 'sin salida'),
        ultimo ? horas(r.normales) : c(''), ultimo ? horas(r.extraTurno) : c(''), ultimo ? horas(r.extraSinTurno) : c(''),
        ultimo ? horas(r.total, r.porRevisar ? ESTILO.revisar : ESTILO.celda) : c(''), ultimo ? decimales(r.total) : c(''), c(obs)]);
    });
  }
  const wb = libro([['Resumen', hoja(resumen, [26, 14, 16, 16, 18, 14, 18])], ['Detalle', hoja(det, [24, 12, 12, 9, 11, 11, 15, 17, 16, 14, 26], { congelar: 1, filtro: `A1:K${det.length}` })]], 'Resumen semanal de horas');
  return { blob: wb, nombre: `horas-semana-${lunes}.xlsx` };
}

export function excelHorasMes(st, mes) {
  const { filas } = S.resumenMes(st, mes), fin = ultimoDiaMes(mes);
  const top = encabezadoHoja(st, 'Resumen mensual de horas', `Mes de ${nombreMes(mes)} · del ${fechaCompleta(mes)} al ${fechaCompleta(fin)}`);
  const r0 = top.length + 2;
  const resumen = [...top, enc(COLS_H), ...filas.map(f => filaResumen(f, f.emp.nombre)), filaTotales(filas, r0, r0 + filas.length - 1), [],
    [c('Se suman los días del mes. Una semana que cruza dos meses se reparte según la fecha de cada día.', ESTILO.sub)]];
  const sem = [enc(['Persona', 'Semana (días del mes)', 'Parcial', 'Días asistidos', 'Horas normales', 'Extra tras turno', 'Extra día sin turno', 'Total (h:mm)', 'Total (horas decimales)'])];
  for (const f of filas) for (const w of S.semanasDelMes(st, f.emp.id, mes).filter(x => x.dias > 0)) {
    sem.push([c(f.emp.nombre), c(`${fechaCompleta(w.desde)} al ${fechaCompleta(w.hasta)}`), c(w.completa ? '' : 'sí'), c(w.dias), horas(w.normales), horas(w.extraTurno), horas(w.extraSinTurno), horas(w.total, ESTILO.total), decimales(w.total, ESTILO.total)]);
  }
  const wb = libro([['Resumen', hoja(resumen, [26, 14, 16, 16, 18, 14, 18])], ['Por semanas', hoja(sem, [24, 26, 9, 14, 16, 16, 18, 14, 18], { congelar: 1, filtro: `A1:I${sem.length}` })]], 'Resumen mensual de horas');
  return { blob: wb, nombre: `horas-mes-${mes.slice(0, 7)}.xlsx` };
}
