// Informes de visitas en PDF y Excel (semana o mes). Se generan en el teléfono.
import { c, ESTILO, enc, hoja, libro, encabezadoHoja } from './excel.js';
import { deMin } from './horas.js';
import { ahora, DIAS_LARGOS, diaSemana, fechaCompleta, fechaCorta } from './fechas.js';
import * as V from './visitas.js';

const AZUL = [31, 58, 95], GRIS = [102, 112, 133], SUAVE = [238, 241, 246];
const pct = (n, total) => (total ? `${Math.round(n / total * 100)} %` : '');

// ================= PDF =================
export function pdfVisitas(st, desde, hasta, titulo, archivo) {
  const { jsPDF } = window.jspdf, doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const M = 15, ANCHO = 180, ALTO = 297, r = V.resumenVisitas(st, desde, hasta);
  const org = (st.ajustes && st.ajustes.organizacion) || '', desc = (st.ajustes && st.ajustes.descripcion) || '';
  const a = ahora(), generado = `${fechaCompleta(a.fecha)} ${deMin(a.min)}`;
  if (org || desc) doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...GRIS).text(doc.splitTextToSize([org, desc].filter(Boolean).join(' · '), ANCHO)[0], M, 13);
  doc.setFont('helvetica', 'bold').setFontSize(18).setTextColor(...AZUL).text('Informe de visitas', M, 21);
  doc.setFont('helvetica', 'normal').setFontSize(10).setTextColor(...GRIS).text(`${titulo} · del ${fechaCompleta(desde)} al ${fechaCompleta(hasta)}`, M, 27);

  let y = 33;
  const estilo = { fontSize: 9, cellPadding: 2, lineColor: [201, 209, 220], lineWidth: 0.2 };
  const tabla = (head, body, cols = {}, foot = null) => {
    if (y > ALTO - 45) { doc.addPage(); y = 18; }
    doc.autoTable({ startY: y, margin: { left: M, right: M }, theme: 'grid', head: [head], body, foot: foot ? [foot] : undefined, styles: estilo,
      headStyles: { fillColor: AZUL, textColor: 255, halign: 'center' }, footStyles: { fillColor: SUAVE, textColor: 0, fontStyle: 'bold' }, columnStyles: cols,
      didParseCell: h => { if (h.section === 'foot' && h.column.index >= 1) h.cell.styles.halign = 'right'; } });
    y = doc.lastAutoTable.finalY + 7;
  };
  const seccion = t => { if (y > ALTO - 40) { doc.addPage(); y = 18; } doc.setFont('helvetica', 'bold').setFontSize(12).setTextColor(...AZUL).text(t, M, y); y += 3; };
  const der = { 1: { halign: 'right' }, 2: { halign: 'right' }, 3: { halign: 'right' } };

  tabla(['Personas', 'Visitas (grupos)', 'Recorridos', 'Personas por recorrido'], [[String(r.personas), String(r.visitas), String(r.recorridos.n), r.recorridos.n ? V.dec1(r.recorridos.promedio) : '-']],
    { 0: { halign: 'center', fontStyle: 'bold', fontSize: 12 }, 1: { halign: 'center', fontSize: 12 }, 2: { halign: 'center', fontSize: 12 }, 3: { halign: 'center', fontSize: 12 } });
  if (r.recorridos.n) { doc.setFontSize(8).setTextColor(...GRIS).text(`${r.recorridos.personas} personas hicieron recorrido y ${r.recorridos.sinRecorrido} no. Toda visita se cuenta, tenga recorrido o no.`, M, y - 3); y += 3; }

  seccion('Por tipo de visitante');
  tabla(['Tipo', 'Visitas', 'Personas', '% del total'], r.porTipo.map(x => [x.tipo.nombre, String(x.visitas), String(x.personas), pct(x.personas, r.personas)]), der, ['Total', String(r.visitas), String(r.personas), '']);

  seccion('Por edad');
  tabla(['Grupo de edad', 'Personas', '% del total'], [...r.edades.items.map(e => [`${e.nombre}${e.rango ? ' (' + e.rango + ')' : ''}`, String(e.n), pct(e.n, r.personas)]), ...(r.edades.sinDetallar ? [['Sin detallar', String(r.edades.sinDetallar), pct(r.edades.sinDetallar, r.personas)]] : [])], { 1: { halign: 'right' }, 2: { halign: 'right' } });
  if (st.visitas.usarSexo && r.sexos.items.some(x => x.n)) {
    seccion('Por sexo');
    tabla(['Sexo', 'Personas', '% del total'], [...r.sexos.items.map(e => [e.nombre, String(e.n), pct(e.n, r.personas)]), ...(r.sexos.sinDetallar ? [['Sin detallar', String(r.sexos.sinDetallar), pct(r.sexos.sinDetallar, r.personas)]] : [])], { 1: { halign: 'right' }, 2: { halign: 'right' } });
  }
  if (r.extras.length) { seccion('Otros datos'); tabla(['Concepto', 'Personas'], r.extras.map(e => [e.nombre, String(e.n)]), { 1: { halign: 'right' } }); }

  if (r.recorridos.n) {
    seccion('Recorridos');
    tabla(['Fecha', 'Hora', 'Guía', 'Grupos', 'Personas'], r.listaRecorridos.map(x => [fechaCompleta(x.fecha), deMin(x.hora), x.guia, x.grupos.join(', '), String(x.personas)]),
      { 0: { cellWidth: 24 }, 1: { cellWidth: 14 }, 2: { cellWidth: 34 }, 4: { halign: 'right', cellWidth: 20 } });
    if (r.recorridos.porGuia.some(g => g.guia !== 'Sin guía') || r.recorridos.porGuia.length > 1) {
      tabla(['Guía', 'Recorridos', 'Personas'], r.recorridos.porGuia.map(g => [g.guia, String(g.recorridos), String(g.personas)]), { 1: { halign: 'right' }, 2: { halign: 'right' } });
    }
  }
  for (const g of r.entidades) {
    seccion(`${g.tipo.nombre}: quiénes nos visitaron`);
    tabla(['Nombre', 'Visitas', 'Personas', 'Recorridos'], g.items.map(i => [i.nombre, String(i.visitas), String(i.personas), String(i.recorridos)]), der,
      ['Total', String(g.items.reduce((s, i) => s + i.visitas, 0)), String(g.items.reduce((s, i) => s + i.personas, 0)), '']);
  }
  seccion('Día por día');
  tabla(['Fecha', 'Visitas', 'Personas', 'Recorridos'], r.dias.map(d => [`${DIAS_LARGOS[diaSemana(d.fecha)]} ${fechaCorta(d.fecha)}`, String(d.visitas), String(d.personas), String(d.recorridos)]), der,
    ['Total', String(r.visitas), String(r.personas), String(r.recorridos.n)]);

  if (y + 40 > ALTO - 20) { doc.addPage(); y = 20; }
  y += 14;
  doc.setDrawColor(120).line(M, y, M + 70, y).line(M + 95, y, M + 165, y);
  doc.setFont('helvetica', 'normal').setFontSize(8).setTextColor(...GRIS).text('Responsable', M, y + 5).text('Fecha de entrega', M + 95, y + 5);
  const n = doc.getNumberOfPages();
  for (let i = 1; i <= n; i++) {
    doc.setPage(i).setFontSize(7.5).setTextColor(...GRIS);
    doc.text(`${org || 'Control de asistencia'} · Informe de visitas · Generado el ${generado}`, M, 290);
    doc.text(`Página ${i} de ${n}`, 210 - M, 290, { align: 'right' });
  }
  return { blob: doc.output('blob'), nombre: archivo };
}

// ================= Excel =================
export function excelVisitas(st, desde, hasta, titulo, archivo) {
  const r = V.resumenVisitas(st, desde, hasta), V_ = st.visitas;
  const sub = `${titulo} · del ${fechaCompleta(desde)} al ${fechaCompleta(hasta)}`;
  const tot = ESTILO.total;
  const resumen = [...encabezadoHoja(st, 'Informe de visitas', sub),
    [c('Totales', ESTILO.seccion)], enc(['Concepto', 'Cantidad']),
    [c('Personas'), c(r.personas, tot)], [c('Visitas (grupos)'), c(r.visitas)], [c('Recorridos'), c(r.recorridos.n)],
    [c('Personas por recorrido (promedio)'), c(Math.round(r.recorridos.promedio * 10) / 10, ESTILO.celda, '0.0')],
    [c('Personas que hicieron recorrido'), c(r.recorridos.personas)], [c('Personas sin recorrido'), c(r.recorridos.sinRecorrido)], [],
    [c('Por tipo de visitante', ESTILO.seccion)], enc(['Tipo', 'Visitas', 'Personas']), ...r.porTipo.map(x => [c(x.tipo.nombre), c(x.visitas), c(x.personas)]), [],
    [c('Por edad', ESTILO.seccion)], enc(['Grupo de edad', 'Rango', 'Personas']), ...r.edades.items.map(e => [c(e.nombre), c(e.rango || ''), c(e.n)]), [c('Sin detallar'), c(''), c(r.edades.sinDetallar)]];
  if (V_.usarSexo) resumen.push([], [c('Por sexo', ESTILO.seccion)], enc(['Sexo', 'Personas']), ...r.sexos.items.map(e => [c(e.nombre), c(e.n)]), [c('Sin detallar'), c(r.sexos.sinDetallar)]);
  if (r.extras.length) resumen.push([], [c('Otros datos', ESTILO.seccion)], enc(['Concepto', 'Personas']), ...r.extras.map(e => [c(e.nombre), c(e.n)]));

  const dias = [enc(['Fecha', 'Día', 'Visitas', 'Personas', 'Recorridos']),
    ...r.dias.map(d => [c(fechaCompleta(d.fecha)), c(DIAS_LARGOS[diaSemana(d.fecha)]), c(d.visitas), c(d.personas), c(d.recorridos)]),
    [c('Total', tot), c('', tot), c(r.visitas, tot), c(r.personas, tot), c(r.recorridos.n, tot)]];

  const nombres = [enc(['Tipo', 'Nombre', 'Visitas', 'Personas', 'Recorridos'])];
  for (const g of r.entidades) for (const i of g.items) nombres.push([c(g.tipo.nombre), c(i.nombre), c(i.visitas), c(i.personas), c(i.recorridos)]);

  const recs = [enc(['Fecha', 'Hora', 'Guía', 'Grupos', 'Personas']), ...r.listaRecorridos.map(x => [c(fechaCompleta(x.fecha)), c(deMin(x.hora)), c(x.guia), c(x.grupos.join(', ')), c(x.personas)])];

  const edadesCols = V_.edades.filter(e => !e.archivado || r.detalle.some(d => (d.edades || {})[e.id]));
  const sexCols = V_.usarSexo ? V_.sexos : [], extCols = V_.extras.filter(x => x.activo || r.detalle.some(d => (d.extras || {})[x.id]));
  const cab = ['Fecha', 'Hora', 'Tipo', 'Nombre', 'Personas', ...edadesCols.map(e => e.nombre), ...sexCols.map(s => s.nombre), ...extCols.map(x => x.nombre), 'Recorrido (hora)', 'Guía'];
  const det = [enc(cab), ...r.detalle.map(d => [c(fechaCompleta(d.fecha)), c(deMin(d.hora)), c(d.tipo), c(d.nombre), c(d.personas),
    ...edadesCols.map(e => c((d.edades || {})[e.id] || 0)), ...sexCols.map(s => c((d.sexos || {})[s.id] || 0)), ...extCols.map(x => c((d.extras || {})[x.id] || 0)),
    c(d.recorrido ? deMin(d.recorrido.hora) : ''), c(d.guia)])];

  const blob = libro([
    ['Resumen', hoja(resumen, [34, 18, 14])], ['Por día', hoja(dias, [16, 14, 10, 10, 12])], ['Instituciones y medios', hoja(nombres, [16, 36, 10, 10, 12], { congelar: 1 })],
    ['Recorridos', hoja(recs, [16, 8, 24, 46, 10], { congelar: 1 })],
    ['Visitas', hoja(det, [16, 8, 16, 30, 10, ...edadesCols.map(() => 12), ...sexCols.map(() => 11), ...extCols.map(() => 14), 14, 22], { congelar: 1, filtro: `A1:${String.fromCharCode(64 + Math.min(cab.length, 26))}${det.length}` })],
  ], 'Informe de visitas');
  return { blob, nombre: archivo };
}
