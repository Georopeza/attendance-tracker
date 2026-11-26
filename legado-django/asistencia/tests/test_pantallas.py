"""Pruebas de las pantallas: marcar, validaciones, bitácora y desglose semanal."""
from datetime import datetime, time, timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone

from asistencia import services
from asistencia.models import Tramo
from bitacora.models import Registro
from personal.models import Empleado
from turnos.models import ExcepcionTurno, Turno

pytestmark = pytest.mark.django_db


@pytest.fixture
def coordinador(client):
    u = get_user_model().objects.create_user("coord", password="x")
    client.force_login(u)
    return u


@pytest.fixture
def turno(db):
    return Turno.objects.create(nombre="General", inicio=time(9), fin=time(16))


def local(fecha, h, mi=0):
    return timezone.make_aware(datetime.combine(fecha, time(h, mi)), timezone.get_current_timezone())


def lunes_pasado():
    return services.lunes_de(timezone.localdate()) - timedelta(days=7)


def test_requiere_iniciar_sesion(client):
    assert client.get("/").status_code == 302


def test_marcar_entrada_y_salida_registra_en_bitacora(client, coordinador, turno):
    emp = Empleado.objects.create(nombre="Ana")
    client.post(f"/hoy/marcar/{emp.pk}/")
    assert emp.tramos.get().salida is None
    # Salir en el mismo minuto de la entrada es inválido: se muestra el error y no se guarda.
    assert "anterior a la entrada" in client.post(f"/hoy/marcar/{emp.pk}/").content.decode()
    assert emp.tramos.get().salida is None
    Tramo.objects.filter(empleado=emp).update(entrada=timezone.now() - timedelta(minutes=30))
    client.post(f"/hoy/marcar/{emp.pk}/")
    assert emp.tramos.get().salida is not None
    assert list(Registro.objects.values_list("accion", flat=True)) == ["marcó salida", "marcó entrada"]


def test_un_archivado_no_se_puede_marcar(client, coordinador):
    emp = Empleado.objects.create(nombre="X", archivado=True)
    assert client.post(f"/hoy/marcar/{emp.pk}/").status_code == 404


def test_validacion_cruce_de_tramos(turno):
    emp = Empleado.objects.create(nombre="Ana")
    f = lunes_pasado()
    Tramo.objects.create(empleado=emp, entrada=local(f, 9), salida=local(f, 12))
    with pytest.raises(Exception):
        Tramo(empleado=emp, entrada=local(f, 11), salida=local(f, 13)).full_clean()


def test_desglose_suma_igual_que_el_resumen_semanal(client, coordinador, turno):
    emp = Empleado.objects.create(nombre="Luis")
    lunes = lunes_pasado()
    Tramo.objects.create(empleado=emp, entrada=local(lunes, 9), salida=local(lunes, 16))
    sabado = lunes + timedelta(days=5)
    Tramo.objects.create(empleado=emp, entrada=local(sabado, 9), salida=local(sabado, 14))
    filas, _ = services.resumen_semana(lunes)
    dias = services.desglose_semana(emp, lunes)
    assert filas[0]["total"] == sum(d["resumen"].total for d in dias) == 12 * 60
    assert filas[0]["extra_sin_turno"] == 5 * 60 and filas[0]["dias"] == 2
    r = client.get(f"/semana/desglose/{emp.pk}/?semana={lunes}")
    assert r.status_code == 200 and "Luis" in r.content.decode()


def test_corregir_un_dia_desde_el_desglose(client, coordinador, turno):
    emp = Empleado.objects.create(nombre="Luis")
    lunes = lunes_pasado()
    t = Tramo.objects.create(empleado=emp, entrada=local(lunes, 9), salida=local(lunes, 16, 40))
    client.post(f"/semana/dia/{emp.pk}/{lunes}/",
                {f"entrada_{t.pk}": "09:00", f"salida_{t.pk}": "16:00", "motivo": "salida mal marcada"})
    assert services.resumen_dia(emp, lunes).total == 7 * 60
    assert Registro.objects.get().motivo == "salida mal marcada"


def test_excepcion_dia_sin_turno(turno):
    emp = Empleado.objects.create(nombre="Ana")
    lunes = lunes_pasado()
    ExcepcionTurno.objects.create(fecha=lunes, turno=None)
    Tramo.objects.create(empleado=emp, entrada=local(lunes, 9), salida=local(lunes, 12))
    r = services.resumen_dia(emp, lunes)
    assert r.extra_sin_turno == 180 and r.normales == 0


def test_excepcion_turno_hasta_16_30(turno):
    emp = Empleado.objects.create(nombre="Ana")
    lunes = lunes_pasado()
    ExcepcionTurno.objects.create(fecha=lunes, turno=turno, fin=time(16, 30))
    Tramo.objects.create(empleado=emp, entrada=local(lunes, 9), salida=local(lunes, 16, 30))
    r = services.resumen_dia(emp, lunes)
    assert r.normales == 450 and r.extra_turno == 0


def test_ajustar_quince_minutos(client, coordinador, turno):
    emp = Empleado.objects.create(nombre="Ana")
    f = timezone.localdate()
    t = Tramo.objects.create(empleado=emp, entrada=local(f, 9), salida=local(f, 12))
    client.post(f"/hoy/ajustar/{emp.pk}/mas/")
    t.refresh_from_db()
    assert timezone.localtime(t.salida).hour == 12 and timezone.localtime(t.salida).minute == 15


def test_pantallas_principales_cargan(client, coordinador, turno):
    Empleado.objects.create(nombre="Ana")
    for url in ["/", "/hoy/tarjetas/", "/semana/", "/disponibilidad/"]:
        assert client.get(url).status_code == 200, url
