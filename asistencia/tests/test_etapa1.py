"""Pruebas de las pantallas de la etapa 1: empleados, turnos, disponibilidad, bloque, bitácora y accesos."""
from datetime import date, datetime, time, timedelta

import pytest
from django.contrib.auth import get_user_model
from django.utils import timezone

from asistencia import services
from asistencia.models import Tramo
from bitacora.models import Registro
from disponibilidad import services as disp
from disponibilidad.models import Disponibilidad
from personal.models import Empleado
from turnos.models import Turno
from turnos.services import cambiar_horario, turnos_del_dia

pytestmark = pytest.mark.django_db


@pytest.fixture
def coordinador(client):
    u = get_user_model().objects.create_user("coord", password="x")
    client.force_login(u)
    return u


@pytest.fixture
def turno():
    return Turno.objects.create(nombre="General", inicio=time(9), fin=time(16))


def local(fecha, h, mi=0):
    return timezone.make_aware(datetime.combine(fecha, time(h, mi)), timezone.get_current_timezone())


def un_lunes():
    return services.lunes_de(timezone.localdate()) - timedelta(days=14)


# ---------- empleados ----------

def test_crear_editar_archivar_y_reactivar_empleado(client, coordinador):
    client.post("/empleados/nuevo/", {"nombre": "Ana"})
    emp = Empleado.objects.get()
    client.post(f"/empleados/{emp.pk}/editar/", {"nombre": "Ana Pérez"})
    emp.refresh_from_db()
    assert emp.nombre == "Ana Pérez"
    assert "Archivar" in client.get(f"/empleados/{emp.pk}/archivar/").content.decode()
    assert not Empleado.objects.get().archivado          # GET solo pide confirmación
    client.post(f"/empleados/{emp.pk}/archivar/", {"motivo": "ya no viene"})
    assert Empleado.objects.get().archivado
    client.post(f"/empleados/{emp.pk}/reactivar/")
    assert not Empleado.objects.get().archivado
    assert [r.accion for r in Registro.objects.order_by("id")] == ["creó", "editó", "archivó", "reactivó"]


def test_nombre_repetido_se_rechaza(client, coordinador):
    Empleado.objects.create(nombre="Ana")
    r = client.post("/empleados/nuevo/", {"nombre": "ana"})
    assert "Ya existe" in r.content.decode() and Empleado.objects.count() == 1


def test_eliminar_solo_si_no_tiene_horas(client, coordinador, turno):
    con, sin = Empleado.objects.create(nombre="Con"), Empleado.objects.create(nombre="Sin")
    f = un_lunes()
    Tramo.objects.create(empleado=con, entrada=local(f, 9), salida=local(f, 12))
    client.post(f"/empleados/{con.pk}/eliminar/")
    assert Empleado.objects.filter(pk=con.pk).exists()
    client.post(f"/empleados/{sin.pk}/eliminar/")
    assert not Empleado.objects.filter(pk=sin.pk).exists()


def test_archivado_no_sale_en_hoy_ni_en_semana(client, coordinador, turno):
    Empleado.objects.create(nombre="Visible")
    Empleado.objects.create(nombre="Oculto", archivado=True)
    assert "Oculto" not in client.get("/hoy/tarjetas/").content.decode()
    assert "Oculto" not in client.get("/semana/").content.decode()
    assert "Oculto" in client.get("/empleados/?archivados=1").content.decode()


# ---------- turnos con vigencia ----------

def test_cambiar_horario_no_altera_el_pasado(turno):
    hoy = timezone.localdate()
    desde = hoy + timedelta(days=30)
    while desde.weekday() > 4:
        desde += timedelta(days=1)
    cambiar_horario(turno, desde, time(9), time(16, 30))
    antes = turnos_del_dia(desde - timedelta(days=3 if desde.weekday() == 0 else 1))
    despues = turnos_del_dia(desde)
    assert all(t.fin == 16 * 60 for t in antes)
    assert [t.fin for t in despues] == [16 * 60 + 30]


def test_pantalla_turnos_y_excepcion(client, coordinador, turno):
    assert client.get("/turnos/").status_code == 200
    f = un_lunes()
    client.post("/turnos/excepciones/nueva/", {"fecha": f.isoformat(), "turno": turno.pk, "fin": "16:30"})
    assert [t.fin for t in turnos_del_dia(f)] == [16 * 60 + 30]
    client.post("/turnos/excepciones/nueva/", {"fecha": (f + timedelta(days=1)).isoformat(), "turno": ""})
    assert turnos_del_dia(f + timedelta(days=1)) == []


def test_turno_con_fin_anterior_al_inicio_se_rechaza(client, coordinador):
    r = client.post("/turnos/nuevo/", {"nombre": "X", "inicio": "16:00", "fin": "09:00", "dias": ["0"]})
    assert "posterior al inicio" in r.content.decode() and not Turno.objects.exists()


# ---------- disponibilidad ----------

def test_ficha_agregar_franja_y_validar_cruce(client, coordinador):
    emp = Empleado.objects.create(nombre="Ana")
    hoy = timezone.localdate()
    base = {"vigencia": hoy.isoformat(), "dia": 0}
    client.post(f"/disponibilidad/{emp.pk}/franja/", {**base, "desde": "09:00", "hasta": "12:00"})
    client.post(f"/disponibilidad/{emp.pk}/franja/", {**base, "desde": "11:00", "hasta": "13:00"})   # se cruza
    client.post(f"/disponibilidad/{emp.pk}/franja/", {**base, "desde": "14:00", "hasta": "16:00"})   # dos franjas ok
    assert Disponibilidad.objects.filter(empleado=emp).count() == 2
    client.post(f"/disponibilidad/{emp.pk}/franja/", {**base, "desde": "10:00", "hasta": "09:00", "dia": 1})
    assert Disponibilidad.objects.filter(empleado=emp).count() == 2


def test_copiar_disponibilidad_y_nueva_vigencia(client, coordinador):
    a, b = Empleado.objects.create(nombre="A"), Empleado.objects.create(nombre="B")
    hoy = timezone.localdate()
    Disponibilidad.objects.create(empleado=a, dia=2, desde=time(9), hasta=time(16), vigente_desde=hoy - timedelta(days=5))
    client.post(f"/disponibilidad/{b.pk}/copiar/", {"origen": a.pk})
    assert [(f.dia, f.desde) for f in disp.franjas_vigentes(b, hoy)] == [(2, time(9))]
    futuro = hoy + timedelta(days=7)
    client.post(f"/disponibilidad/{a.pk}/vigencia/", {"desde": futuro.isoformat()})
    Disponibilidad.objects.filter(empleado=a, vigente_desde=futuro).delete()
    Disponibilidad.objects.create(empleado=a, dia=4, desde=time(9), hasta=time(13), vigente_desde=futuro)
    assert [f.dia for f in disp.franjas_vigentes(a, hoy)] == [2]            # hoy sigue igual
    assert [f.dia for f in disp.franjas_vigentes(a, futuro)] == [4]         # desde la fecha cambia


def test_cuadricula_y_conteo(client, coordinador):
    a = Empleado.objects.create(nombre="A")
    Disponibilidad.objects.create(empleado=a, dia=0, desde=time(9), hasta=time(16), vigente_desde=timezone.localdate())
    html = client.get("/disponibilidad/").content.decode()
    assert "09:00–16:00" in html
    assert client.get(f"/disponibilidad/{a.pk}/").status_code == 200


# ---------- hoy: bloque, deshacer, días pasados ----------

def test_marcacion_en_bloque_y_deshacer(client, coordinador, turno):
    emps = [Empleado.objects.create(nombre=n) for n in ("A", "B", "C")]
    client.post("/hoy/bloque/entrada/", {"hora": "00:01"})
    assert Tramo.objects.count() == 3 and all(t.salida is None for t in Tramo.objects.all())
    client.post("/hoy/bloque/entrada/", {"hora": "00:01"})            # los que ya entraron no se duplican
    assert Tramo.objects.count() == 3
    client.post("/hoy/bloque/salida/", {"hora": "00:30"})
    assert all(t.salida is not None for t in Tramo.objects.all())
    client.post(f"/hoy/deshacer/{emps[0].pk}/")
    assert emps[0].tramos.get().salida is None
    client.post(f"/hoy/deshacer/{emps[0].pk}/")
    assert not emps[0].tramos.exists()
    assert client.post("/hoy/bloque/otra/").status_code == 400


def test_dia_pasado_y_correccion_con_tramo_nuevo(client, coordinador, turno):
    emp = Empleado.objects.create(nombre="Ana")
    f = un_lunes()
    assert client.get(f"/?fecha={f}").status_code == 200
    r = client.post(f"/dia/{emp.pk}/{f}/", {"entrada_nuevo": "08:00", "salida_nuevo": "11:00", "motivo": "olvidado"})
    assert r.status_code == 302
    primero = emp.tramos.get()
    client.post(f"/dia/{emp.pk}/{f}/", {f"entrada_{primero.pk}": "08:00", f"salida_{primero.pk}": "11:00",
                                        "entrada_nuevo": "14:00", "salida_nuevo": "16:00"})
    assert services.resumen_dia(emp, f).total == 4 * 60
    t = emp.tramos.first()
    client.post(f"/dia/{emp.pk}/{f}/", {f"entrada_{t.pk}": "08:00", f"salida_{t.pk}": "11:00", f"borrar_{t.pk}": "on",
                                        f"entrada_{emp.tramos.last().pk}": "14:00", f"salida_{emp.tramos.last().pk}": "16:00"})
    assert emp.tramos.count() == 1


def test_correccion_invalida_no_guarda(client, coordinador, turno):
    emp = Empleado.objects.create(nombre="Ana")
    f = un_lunes()
    r = client.post(f"/dia/{emp.pk}/{f}/", {"entrada_nuevo": "12:00", "salida_nuevo": "10:00"})
    assert "anterior a la entrada" in r.content.decode() and not emp.tramos.exists()


# ---------- bitácora y coordinadores ----------

def test_bitacora_se_ve_y_filtra(client, coordinador):
    client.post("/empleados/nuevo/", {"nombre": "Ana"})
    html = client.get("/bitacora/?entidad=Empleado").content.decode()
    assert "creó" in html and "coord" in html


def test_coordinadores_crear_y_desactivar(client, coordinador):
    r = client.post("/coordinadores/nuevo/", {"username": "otro", "password1": "Clave-segura-98", "password2": "Clave-segura-98"})
    assert r.status_code == 302
    otro = get_user_model().objects.get(username="otro")
    client.post(f"/coordinadores/{otro.pk}/activo/0/")
    otro.refresh_from_db()
    assert not otro.is_active
    client.post(f"/coordinadores/{coordinador.pk}/activo/0/")           # no puede desactivarse a sí mismo
    coordinador.refresh_from_db()
    assert coordinador.is_active


def test_contrasenas_distintas_se_rechazan(client, coordinador):
    r = client.post("/coordinadores/nuevo/", {"username": "x", "password1": "Clave-segura-98", "password2": "otra"})
    assert "no coinciden" in r.content.decode()


def test_todas_las_pantallas_exigen_login(client):
    for url in ["/", "/semana/", "/empleados/", "/turnos/", "/disponibilidad/", "/bitacora/", "/coordinadores/"]:
        assert client.get(url).status_code == 302, url
