from datetime import datetime, time, timedelta
from io import BytesIO

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone
from openpyxl import load_workbook

from asistencia import services
from asistencia.models import Tramo
from personal.models import Empleado
from reportes.datos import reporte_semana
from turnos.models import Turno

pytestmark = pytest.mark.django_db


def local(fecha, h, mi=0):
    return timezone.make_aware(datetime.combine(fecha, time(h, mi)), timezone.get_current_timezone())


@pytest.fixture
def semana():
    Turno.objects.create(nombre="General", inicio=time(9), fin=time(16))
    lunes = services.lunes_de(timezone.localdate()) - timedelta(days=14)
    luis, ana = Empleado.objects.create(nombre="Luis"), Empleado.objects.create(nombre="Ana")
    Tramo.objects.create(empleado=luis, entrada=local(lunes, 9, 2), salida=local(lunes, 16, 40))             # 7:38 por revisar
    Tramo.objects.create(empleado=luis, entrada=local(lunes + timedelta(days=5), 9), salida=local(lunes + timedelta(days=5), 14))
    Tramo.objects.create(empleado=ana, entrada=local(lunes, 8), salida=local(lunes, 11))
    Tramo.objects.create(empleado=ana, entrada=local(lunes, 14), salida=local(lunes, 16))
    return lunes


def test_datos_del_reporte_coinciden_con_el_resumen_semanal(semana):
    rep = reporte_semana(semana)
    filas, _ = services.resumen_semana(semana)
    assert {e.nombre: e.total for e in rep.empleados} == {f["empleado"].nombre: f["total"] for f in filas}
    luis = next(e for e in rep.empleados if e.nombre == "Luis")
    assert luis.total == 7 * 60 + 38 + 5 * 60 and luis.dias_asistidos == 2 and luis.por_revisar == 1
    ana = next(e for e in rep.empleados if e.nombre == "Ana")
    assert ana.dias[0].marcas == [("08:00", "11:00"), ("14:00", "16:00")] and ana.total == 4 * 60


def test_descargas_excel_y_pdf(client, semana):
    client.force_login(get_user_model().objects.create_user("c", password="x"))
    r = client.get(f"/reportes/semana.pdf?semana={semana}")
    assert r.status_code == 200 and r.content.startswith(b"%PDF") and f"horas-semana-{semana}" in r["Content-Disposition"]
    r = client.get(f"/reportes/semana.xlsx?semana={semana + timedelta(days=3)}")      # cualquier día de la semana sirve
    wb = load_workbook(BytesIO(r.content))
    assert wb.sheetnames == ["Resumen", "Detalle"]
    resumen = {fila[0]: fila[5] for fila in wb["Resumen"].iter_rows(min_row=6, max_row=7, values_only=True)}
    minutos = lambda v: round(v.total_seconds() / 60)          # openpyxl lee [h]:mm como timedelta
    assert minutos(resumen["Luis"]) == 7 * 60 + 38 + 5 * 60 and minutos(resumen["Ana"]) == 240
    assert wb["Resumen"]["F8"].value == "=SUM(F6:F7)"                                 # los totales son fórmulas
    assert client.get("/reportes/semana.doc").status_code == 404


def test_reportes_exigen_login(client):
    assert client.get("/reportes/semana.pdf").status_code == 302
