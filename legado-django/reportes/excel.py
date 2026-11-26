"""Reporte semanal en Excel: hoja Resumen (una fila por persona) y hoja Detalle (una fila por día)."""
from io import BytesIO

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

from .datos import NOTAS, ReporteSemana

HORAS = "[h]:mm"   # las horas se guardan como fracción de día para que Excel pueda sumarlas
ENCABEZADO = PatternFill("solid", fgColor="1F3A5F")
SUAVE = PatternFill("solid", fgColor="EEF1F6")
FINDE = PatternFill("solid", fgColor="ECE2FF")
REVISAR = PatternFill("solid", fgColor="FDEBC6")
FINO = Side(style="thin", color="C9D1DC")
BORDE = Border(left=FINO, right=FINO, top=FINO, bottom=FINO)


def _horas(minutos: int) -> float:
    return minutos / 1440


def _encabezar(ws, fila, textos):
    for i, t in enumerate(textos, 1):
        c = ws.cell(fila, i, t)
        c.font, c.fill, c.border = Font(bold=True, color="FFFFFF"), ENCABEZADO, BORDE
        c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
    ws.row_dimensions[fila].height = 32


def _anchos(ws, anchos):
    for i, a in enumerate(anchos, 1):
        ws.column_dimensions[get_column_letter(i)].width = a


def construir(rep: ReporteSemana) -> bytes:
    wb = Workbook()
    titulo = f"Semana del {rep.lunes:%d/%m/%Y} al {rep.domingo:%d/%m/%Y}"

    # ---- Resumen ----
    ws = wb.active
    ws.title = "Resumen"
    ws["A1"], ws["A1"].font = "Resumen semanal de horas", Font(bold=True, size=15)
    ws["A2"] = f"{titulo}  ·  {rep.turno_texto}"
    ws["A3"] = f"Generado el {rep.generado}"
    ws["A3"].font = Font(color="667085", size=9)
    _encabezar(ws, 5, ["Empleado", "Días asistidos", "Horas normales", "Extra tras turno", "Extra día sin turno", "Total de horas"])
    f = 6
    for e in rep.empleados:
        valores = [e.nombre, e.dias_asistidos, _horas(e.suma("normales")), _horas(e.suma("extra_turno")),
                   _horas(e.suma("extra_sin_turno")), _horas(e.total)]
        for i, v in enumerate(valores, 1):
            c = ws.cell(f, i, v)
            c.border = BORDE
            if i >= 3:
                c.number_format = HORAS
            if i == 6:
                c.font = Font(bold=True)
        if e.por_revisar:
            ws.cell(f, 6).fill = REVISAR
        f += 1
    ws.cell(f, 1, "Total del equipo").font = Font(bold=True)
    ws.cell(f, 2, f"=SUM(B6:B{f - 1})")
    for col in range(3, 7):
        L = get_column_letter(col)
        c = ws.cell(f, col, f"=SUM({L}6:{L}{f - 1})")
        c.number_format = HORAS
    for col in range(1, 7):
        c = ws.cell(f, col)
        c.font, c.fill, c.border = Font(bold=True), SUAVE, BORDE
    f += 2
    ws.cell(f, 1, "Criterios").font = Font(bold=True)
    for n in NOTAS:
        f += 1
        ws.cell(f, 1, "• " + n).alignment = Alignment(wrap_text=False)
    _anchos(ws, [26, 14, 16, 16, 18, 16])
    ws.freeze_panes = "A6"

    # ---- Detalle ----
    wd = wb.create_sheet("Detalle")
    wd["A1"], wd["A1"].font = f"Detalle diario · {titulo}", Font(bold=True, size=13)
    _encabezar(wd, 3, ["Empleado", "Día", "Fecha", "Entrada", "Salida", "Normales", "Extra tras turno", "Extra día sin turno", "Total del día", "Observación"])
    f = 4
    for e in rep.empleados:
        for d in e.dias:
            marcas = d.marcas or [("", "")]
            for k, (ent, sal) in enumerate(marcas):
                ultimo = k == len(marcas) - 1
                fila = [e.nombre, d.nombre, d.fecha, ent, sal or ("" if not ent else "sin salida"),
                        _horas(d.normales) if ultimo and d.asistio else None,
                        _horas(d.extra_turno) if ultimo and d.asistio else None,
                        _horas(d.extra_sin_turno) if ultimo and d.asistio else None,
                        _horas(d.total) if ultimo and d.asistio else None,
                        " · ".join(x for x in ["Sin turno" if d.sin_turno and d.asistio else "",
                                              "Minutos sin redondear" if d.por_revisar and ultimo else ""] if x)]
                if not d.asistio:
                    fila[9] = "No asistió"
                for i, v in enumerate(fila, 1):
                    c = wd.cell(f, i, v)
                    c.border = BORDE
                    if i == 3:
                        c.number_format = "dd/mm/yyyy"
                    if i >= 6 and i <= 9:
                        c.number_format = HORAS
                    if d.sin_turno and d.asistio:
                        c.fill = FINDE
                    if d.por_revisar and i == 9:
                        c.fill = REVISAR
                    if not d.asistio:
                        c.font = Font(color="98A2B3")
                f += 1
    ultima = f - 1
    wd.cell(f, 1, "Total").font = Font(bold=True)
    for col in range(6, 10):
        L = get_column_letter(col)
        c = wd.cell(f, col, f"=SUM({L}4:{L}{ultima})")
        c.number_format, c.font = HORAS, Font(bold=True)
    for col in range(1, 11):
        wd.cell(f, col).fill, wd.cell(f, col).border = SUAVE, BORDE
    _anchos(wd, [24, 12, 12, 10, 12, 11, 14, 16, 13, 30])
    wd.freeze_panes = "A4"
    wd.auto_filter.ref = f"A3:J{ultima}"

    for hoja in (ws, wd):
        hoja.page_setup.orientation = "landscape" if hoja is wd else "portrait"
        hoja.page_setup.fitToWidth, hoja.page_setup.fitToHeight = 1, 0
        hoja.sheet_properties.pageSetUpPr.fitToPage = True
    out = BytesIO()
    wb.save(out)
    return out.getvalue()
