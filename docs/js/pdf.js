// Reporte semanal en PDF (se genera en el teléfono, sin internet). Usa jsPDF + autoTable (carpeta vendor/).
import { hhmm, deMin } from './horas.js';
import { ahora, DIAS_LARGOS, diaSemana, fechaCompleta, fechaCorta, sumarDias } from './fechas.js';
import * as S from './servicios.js';

const AZUL = [31, 58, 95], GRIS = [102, 112, 133], SUAVE = [238, 241, 246], VIOLETA_BG = [236, 226, 255], AMBAR = [253, 235, 198];
const TEAL = [15, 118, 110], AZ = [36, 87, 214], VIOLETA = [116, 50, 224];

const NOTAS = [
  'Las horas normales son las trabajadas dentro del turno. Las extra son las posteriores al fin del turno.',
  'Lo trabajado antes del inicio del turno no se cuenta.',
  'En los días sin turno todas las horas se cuentan como extra.',
  'El total de cada día se redondea: de 0 a 15 min se baja a la hora, de 45 a 59 min se sube. De 16 a 44 min queda exacto (marcado con *).',
];

export function generarPdf(st, lunes) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const M = 15, ANCHO = 210 - 2 * M, ALTO = 297;
  const { filas } = S.resumenSemana(st, lunes);
  const domingo = sumarDias(lunes, 6), ts = S.turnosDelDia(st, lunes);
  const turnoTxt = ts.length ? `Turno ${ts[0].inicio.replace(/^0/, '')} a ${ts[0].fin.replace(/^0/, '')}` : 'Sin turno definido';
  const a = ahora(), generado = `${fechaCompleta(a.fecha)} ${deMin(a.min)}`;

  const org = (st.ajustes && st.ajustes.organizacion) || '';
  if (org) doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...GRIS).text(org, M, 13);
  doc.setFont('helvetica', 'bold').setFontSize(18).setTextColor(...AZUL).text('Resumen semanal de horas', M, 21);
  doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...GRIS).text(`Semana del ${fechaCompleta(lunes)} al ${fechaCompleta(domingo)} · ${turnoTxt}`, M, 27);

  const sum = c => filas.reduce((s, f) => s + f[c], 0);
  doc.autoTable({
    startY: 32, margin: { left: M, right: M }, theme: 'grid',
    head: [['Persona', 'Días', 'Normales', 'Extra tras turno', 'Extra día sin turno', 'Total']],
    body: filas.map(f => [f.emp.nombre, String(f.dias), hhmm(f.normales), hhmm(f.extraTurno), hhmm(f.extraSinTurno), hhmm(f.total) + (f.porRevisar ? '*' : '')]),
    foot: [['Total del equipo', String(sum('dias')), hhmm(sum('normales')), hhmm(sum('extraTurno')), hhmm(sum('extraSinTurno')), hhmm(sum('total'))]],
    styles: { fontSize: 9, cellPadding: 2.2, lineColor: [201, 209, 220], lineWidth: 0.2 },
    headStyles: { fillColor: AZUL, textColor: 255, halign: 'center' }, footStyles: { fillColor: SUAVE, textColor: 0, fontStyle: 'bold' },
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right', textColor: TEAL }, 3: { halign: 'right', textColor: AZ }, 4: { halign: 'right', textColor: VIOLETA }, 5: { halign: 'right', fontStyle: 'bold' } },
    didParseCell: h => { if (h.section === 'foot' && h.column.index >= 1) h.cell.styles.halign = 'right'; },
  });
  let y = doc.lastAutoTable.finalY + 8;
  doc.setFont('helvetica', 'bold').setFontSize(8).setTextColor(...GRIS).text('Criterios', M, y);
  doc.setFont('helvetica', 'normal');
  for (const n of NOTAS) { y += 4; doc.text(doc.splitTextToSize('• ' + n, ANCHO), M, y); if (n.length > 120) y += 3.5; }

  y += 10;
  doc.setFont('helvetica', 'bold').setFontSize(14).setTextColor(...AZUL).text('Detalle por persona', M, y);
  y += 4;
  for (const f of filas) {
    const dias = S.desgloseSemana(st, f.emp.id, lunes);
    const alto = 12 + (dias.length + 2) * 7.5;
    if (y + alto > ALTO - 22) { doc.addPage(); y = 18; }
    doc.setFont('helvetica', 'bold').setFontSize(11).setTextColor(...AZUL).text(f.emp.nombre, M, y + 4);
    const cuerpo = dias.map(d => {
      const r = d.resumen, hubo = d.tramos.length > 0, nombre = DIAS_LARGOS[diaSemana(d.fecha)] + (d.sinTurno ? ' (sin turno)' : '');
      if (!hubo) return [nombre, fechaCorta(d.fecha), 'No asistió', '', '', '', ''];
      return [nombre, fechaCorta(d.fecha), d.tramos.map(t => `${deMin(t.entrada)} a ${t.salida != null ? deMin(t.salida) : 'sin salida'}`).join('\n'),
        hhmm(r.normales), hhmm(r.extraTurno), hhmm(r.extraSinTurno), hhmm(r.total) + (r.porRevisar ? '*' : '')];
    });
    doc.autoTable({
      startY: y + 7, margin: { left: M, right: M }, theme: 'grid', head: [['Día', 'Fecha', 'Entrada / Salida', 'Normales', 'Extra', 'Extra s/ turno', 'Total del día']], body: cuerpo,
      foot: [['Total de la semana', '', `${f.dias} ${f.dias === 1 ? 'día asistido' : 'días asistidos'}`, hhmm(f.normales), hhmm(f.extraTurno), hhmm(f.extraSinTurno), hhmm(f.total)]],
      styles: { fontSize: 8.5, cellPadding: 1.8, lineColor: [201, 209, 220], lineWidth: 0.2, valign: 'middle' },
      headStyles: { fillColor: AZUL, textColor: 255, fontSize: 8 }, footStyles: { fillColor: SUAVE, textColor: 0, fontStyle: 'bold' },
      columnStyles: { 0: { cellWidth: 36 }, 1: { cellWidth: 13 }, 2: { cellWidth: 38 }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right', fontStyle: 'bold' } },
      didParseCell: h => {
        if (h.section === 'foot' && h.column.index >= 3) h.cell.styles.halign = 'right';
        if (h.section !== 'body') return;
        const d = dias[h.row.index];
        if (!d.tramos.length) h.cell.styles.textColor = [152, 162, 179];
        else if (d.sinTurno) h.cell.styles.fillColor = VIOLETA_BG;
        if (d.resumen.porRevisar && h.column.index === 6) h.cell.styles.fillColor = AMBAR;
      },
    });
    y = doc.lastAutoTable.finalY + 8;
  }
  if (y + 40 > ALTO - 20) { doc.addPage(); y = 20; }
  doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...GRIS).text('* Minutos entre 16 y 44 sin redondear: la coordinación decide cómo contarlos.', M, y);
  y += 22;
  doc.setDrawColor(120).line(M, y, M + 70, y).line(M + 95, y, M + 165, y);
  doc.text('Responsable', M, y + 5); doc.text('Fecha de entrega', M + 95, y + 5);

  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i).setFontSize(7.5).setTextColor(...GRIS);
    doc.text(`${org || 'Control de asistencia'} · Semana del ${fechaCompleta(lunes)} al ${fechaCompleta(domingo)} · Generado el ${generado}`, M, 290);
    doc.text(`Página ${i} de ${n}`, 210 - M, 290, { align: 'right' });
  }
  return { blob: doc.output('blob'), nombre: `horas-semana-${lunes}.pdf` };
}

export function descargarBlob(blob, nombre) {
  const url = URL.createObjectURL(blob), a = document.createElement('a');
  a.href = url; a.download = nombre; document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}
export function descargarPdf(st, lunes) { const { blob, nombre } = generarPdf(st, lunes); descargarBlob(blob, nombre); }

/** Abre la hoja de compartir del teléfono (WhatsApp, correo...). Si no existe, descarga el archivo. */
async function compartirBlob(blob, nombre, titulo) {
  const file = new File([blob], nombre, { type: blob.type });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try { await navigator.share({ files: [file], title: titulo }); return 'compartido'; }
    catch (e) { if (e.name === 'AbortError') return 'cancelado'; }
  }
  descargarBlob(blob, nombre);
  return 'descargado';
}
export const compartirPdf = async (st, lunes) => { const { blob, nombre } = generarPdf(st, lunes); return compartirBlob(blob, nombre, 'Resumen semanal de horas'); };
export const compartirArchivo = (texto, nombre, tipo, titulo) => compartirBlob(new Blob([texto], { type: tipo }), nombre, titulo);
