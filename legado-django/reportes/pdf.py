"""Reporte semanal en PDF: portada-resumen y el detalle día por día de cada persona."""
from io import BytesIO

from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import cm
from reportlab.platypus import KeepTogether, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from .datos import NOTAS, ReporteSemana, hhmm

AZUL = colors.HexColor("#1F3A5F")
SUAVE = colors.HexColor("#EEF1F6")
LINEA = colors.HexColor("#C9D1DC")
GRIS = colors.HexColor("#667085")
FINDE = colors.HexColor("#ECE2FF")
REVISAR = colors.HexColor("#FDEBC6")
TEAL, AZ, VIOLETA = colors.HexColor("#0F766E"), colors.HexColor("#2457D6"), colors.HexColor("#7432E0")

base = getSampleStyleSheet()
H1 = ParagraphStyle("h1", parent=base["Title"], fontName="Helvetica-Bold", fontSize=18, leading=22, alignment=0, textColor=AZUL, spaceAfter=2)
SUB = ParagraphStyle("sub", parent=base["Normal"], fontSize=10, textColor=GRIS, leading=13)
NOMBRE = ParagraphStyle("nom", parent=base["Heading3"], fontName="Helvetica-Bold", fontSize=12, textColor=AZUL, spaceBefore=10, spaceAfter=4)
CELDA = ParagraphStyle("c", parent=base["Normal"], fontSize=8.5, leading=11)
NOTA = ParagraphStyle("n", parent=base["Normal"], fontSize=8, leading=11, textColor=GRIS)


def _tabla(datos, anchos, extra=()):
    t = Table(datos, colWidths=anchos, repeatRows=1)
    t.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), AZUL), ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"), ("FONTSIZE", (0, 0), (-1, -1), 8.5),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"), ("GRID", (0, 0), (-1, -1), 0.4, LINEA),
        ("TOPPADDING", (0, 0), (-1, -1), 4), ("BOTTOMPADDING", (0, 0), (-1, -1), 4), *extra]))
    return t


def construir(rep: ReporteSemana) -> bytes:
    out = BytesIO()

    def pie(canvas, doc):
        canvas.saveState()
        canvas.setFont("Helvetica", 7.5)
        canvas.setFillColor(GRIS)
        canvas.drawString(2 * cm, 1.2 * cm, f"Control de asistencia · Semana del {rep.lunes:%d/%m/%Y} al {rep.domingo:%d/%m/%Y} · Generado el {rep.generado}")
        canvas.drawRightString(A4[0] - 2 * cm, 1.2 * cm, f"Página {doc.page}")
        canvas.restoreState()

    doc = SimpleDocTemplate(out, pagesize=A4, leftMargin=2 * cm, rightMargin=2 * cm, topMargin=1.8 * cm, bottomMargin=2 * cm,
                            title=f"Resumen semanal {rep.lunes:%d-%m-%Y}", author="Control de asistencia")
    e = [Paragraph("Resumen semanal de horas", H1),
         Paragraph(f"Semana del {rep.lunes:%d/%m/%Y} al {rep.domingo:%d/%m/%Y} · {rep.turno_texto}", SUB), Spacer(1, 12)]

    # ---- resumen del equipo ----
    filas = [["Empleado", "Días", "Normales", "Extra tras turno", "Extra día sin turno", "Total"]]
    for p in rep.empleados:
        filas.append([p.nombre, str(p.dias_asistidos), hhmm(p.suma("normales")), hhmm(p.suma("extra_turno")),
                      hhmm(p.suma("extra_sin_turno")), hhmm(p.total) + ("*" if p.por_revisar else "")])
    filas.append(["Total del equipo", str(sum(p.dias_asistidos for p in rep.empleados)),
                  hhmm(sum(p.suma("normales") for p in rep.empleados)), hhmm(sum(p.suma("extra_turno") for p in rep.empleados)),
                  hhmm(sum(p.suma("extra_sin_turno") for p in rep.empleados)), hhmm(rep.total_equipo)])
    n = len(filas)
    e.append(_tabla(filas, [5.2 * cm, 1.5 * cm, 2.3 * cm, 2.7 * cm, 3 * cm, 2.3 * cm], [
        ("ALIGN", (1, 0), (-1, -1), "RIGHT"), ("FONTNAME", (-1, 1), (-1, -1), "Helvetica-Bold"),
        ("BACKGROUND", (0, n - 1), (-1, n - 1), SUAVE), ("FONTNAME", (0, n - 1), (-1, n - 1), "Helvetica-Bold"),
        ("TEXTCOLOR", (2, 1), (2, n - 2), TEAL), ("TEXTCOLOR", (3, 1), (3, n - 2), AZ), ("TEXTCOLOR", (4, 1), (4, n - 2), VIOLETA)]))
    e.append(Spacer(1, 10))
    e.append(Paragraph("<b>Criterios</b>", NOTA))
    for nota in NOTAS:
        e.append(Paragraph("• " + nota, NOTA))

    # ---- detalle por persona ----
    e.append(Spacer(1, 6))
    e.append(Paragraph("Detalle por empleado", ParagraphStyle("t", parent=H1, fontSize=14, spaceBefore=14)))
    for p in rep.empleados:
        datos = [["Día", "Fecha", "Entrada / Salida", "Normales", "Extra", "Extra s/ turno", "Total del día"]]
        estilos = [("ALIGN", (3, 0), (-1, -1), "RIGHT")]
        for i, d in enumerate(p.dias, 1):
            if d.asistio:
                marcas = "<br/>".join(f"{a} – {b or 'sin salida'}" for a, b in d.marcas)
                datos.append([d.nombre + (" (sin turno)" if d.sin_turno else ""), f"{d.fecha:%d/%m}", Paragraph(marcas, CELDA),
                              hhmm(d.normales), hhmm(d.extra_turno), hhmm(d.extra_sin_turno), hhmm(d.total) + ("*" if d.por_revisar else "")])
                if d.sin_turno:
                    estilos.append(("BACKGROUND", (0, i), (-1, i), FINDE))
                if d.por_revisar:
                    estilos.append(("BACKGROUND", (6, i), (6, i), REVISAR))
            else:
                datos.append([d.nombre, f"{d.fecha:%d/%m}", "No asistió", "", "", "", ""])
                estilos.append(("TEXTCOLOR", (0, i), (-1, i), colors.HexColor("#98A2B3")))
        k = len(datos)
        datos.append(["Total de la semana", "", f"{p.dias_asistidos} días asistidos", hhmm(p.suma("normales")), hhmm(p.suma("extra_turno")),
                      hhmm(p.suma("extra_sin_turno")), hhmm(p.total)])
        estilos += [("BACKGROUND", (0, k), (-1, k), SUAVE), ("FONTNAME", (0, k), (-1, k), "Helvetica-Bold"), ("SPAN", (0, k), (1, k))]
        e.append(KeepTogether([Paragraph(p.nombre, NOMBRE),
                               _tabla(datos, [3.5 * cm, 1.2 * cm, 4.0 * cm, 1.9 * cm, 1.5 * cm, 2.5 * cm, 2.3 * cm], estilos)]))
    e.append(Spacer(1, 10))
    e.append(Paragraph("* Minutos entre 16 y 44 sin redondear: la coordinación decide cómo contarlos.", NOTA))
    e.append(Spacer(1, 26))
    e.append(Table([["______________________________", "______________________________"], ["Coordinador", "Fecha de entrega"]],
                   colWidths=[8 * cm, 8 * cm], style=TableStyle([("FONTSIZE", (0, 0), (-1, -1), 8.5), ("TEXTCOLOR", (0, 1), (-1, 1), GRIS)])))
    doc.build(e, onFirstPage=pie, onLaterPages=pie)
    return out.getvalue()
