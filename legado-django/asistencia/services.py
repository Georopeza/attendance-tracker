"""Une los datos (tramos, turnos) con el cálculo puro de horas."""
from datetime import date, datetime, time, timedelta

from django.utils import timezone

from personal.models import Empleado
from turnos.services import turnos_del_dia

from .horas import calcular_dia
from .models import Tramo


def a_minutos(dt: datetime) -> int:
    local = timezone.localtime(dt)
    return local.hour * 60 + local.minute


def tramos_del_dia(empleado: Empleado, fecha: date):
    tz = timezone.get_current_timezone()
    desde = timezone.make_aware(datetime.combine(fecha, time.min), tz)
    return list(Tramo.objects.filter(empleado=empleado, entrada__gte=desde,
                                     entrada__lt=desde + timedelta(days=1)))


def resumen_dia(empleado: Empleado, fecha: date, ahora: datetime | None = None, tramos=None):
    ahora = ahora or timezone.now()
    tramos = tramos if tramos is not None else tramos_del_dia(empleado, fecha)
    pares = [(a_minutos(t.entrada), a_minutos(t.salida or ahora)) for t in tramos]
    return calcular_dia(pares, turnos_del_dia(fecha))


def estado(tramos) -> str:
    if not tramos:
        return "sin_llegar"
    return "presente" if tramos[-1].salida is None else "se_fue"


def lunes_de(fecha: date) -> date:
    return fecha - timedelta(days=fecha.weekday())


def resumen_semana(lunes: date):
    """Una fila por empleado activo: días asistidos, normales, extras y total."""
    filas = []
    for emp in Empleado.activos():
        fila = dict(empleado=emp, dias=0, normales=0, extra_turno=0, extra_sin_turno=0,
                    total=0, por_revisar=0)
        for i in range(7):
            r = resumen_dia(emp, lunes + timedelta(days=i))
            if r.total_real:
                fila["dias"] += 1
            fila["normales"] += r.normales
            fila["extra_turno"] += r.extra_turno
            fila["extra_sin_turno"] += r.extra_sin_turno
            fila["total"] += r.total
            fila["por_revisar"] += int(r.por_revisar)
        filas.append(fila)
    promedio = round(sum(f["total"] for f in filas) / len(filas)) if filas else 0
    for f in filas:
        f["vs_promedio"] = f["total"] - promedio
    return filas, promedio


def desglose_semana(empleado: Empleado, lunes: date):
    """Los 7 días de un empleado, con sus tramos, para justificar el total semanal."""
    dias = []
    for i in range(7):
        fecha = lunes + timedelta(days=i)
        tramos = tramos_del_dia(empleado, fecha)
        dias.append(dict(fecha=fecha, tramos=tramos, resumen=resumen_dia(empleado, fecha, tramos=tramos),
                         sin_turno=not turnos_del_dia(fecha)))
    return dias
