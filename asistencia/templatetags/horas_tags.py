from django import template

from asistencia.horas import hhmm

register = template.Library()


@register.filter
def horas(minutos):
    """Minutos -> '7:38'."""
    return hhmm(int(minutos or 0))


@register.filter
def con_signo(minutos):
    minutos = int(minutos or 0)
    return ("−" if minutos < 0 else "+") + hhmm(abs(minutos))
