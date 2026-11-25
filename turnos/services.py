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
    return [
        TurnoCalculo(minutos(t.inicio), minutos(t.fin))
        for t in Turno.objects.filter(activo=True)
        if fecha.weekday() in t.dias
    ]
