"""Qué turno(s) rigen en una fecha. El resultado alimenta el cálculo de horas."""
from datetime import date

from asistencia.horas import Turno as TurnoCalculo

from .models import ExcepcionTurno, Turno


def minutos(t) -> int:
    return t.hour * 60 + t.minute


def turnos_del_dia(fecha: date) -> list[TurnoCalculo]:
    """Lista vacía = día sin turno (todo es extra)."""
    excepcion = ExcepcionTurno.objects.filter(fecha=fecha).select_related("turno").first()
    if excepcion:
        if excepcion.turno is None:
            return []
        t = excepcion.turno
        return [TurnoCalculo(minutos(excepcion.inicio or t.inicio), minutos(excepcion.fin or t.fin))]
    return [TurnoCalculo(minutos(t.inicio), minutos(t.fin)) for t in Turno.objects.all() if t.rige_en(fecha)]


def turnos_vigentes(fecha: date):
    """Los turnos (modelos) que rigen en una fecha."""
    return [t for t in Turno.objects.all() if t.rige_en(fecha)]


def cambiar_horario(turno: Turno, desde: date, inicio, fin) -> Turno:
    """Nueva versión del turno desde `desde`; la anterior termina el día anterior."""
    from datetime import timedelta

    turno.vigente_hasta = desde - timedelta(days=1)
    turno.save(update_fields=["vigente_hasta"])
    return Turno.objects.create(nombre=turno.nombre, inicio=inicio, fin=fin, dias=turno.dias,
                                vigente_desde=desde)
