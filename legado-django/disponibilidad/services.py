"""Disponibilidad vigente: cada 'configuración' es el conjunto de franjas con la misma fecha de vigencia."""
from datetime import date

from personal.models import Empleado

from .models import Disponibilidad


def vigencia_de(empleado: Empleado, fecha: date):
    """Fecha de vigencia de la configuración que rige en `fecha` (o None si no hay ninguna)."""
    return (Disponibilidad.objects.filter(empleado=empleado, vigente_desde__lte=fecha)
            .order_by("-vigente_desde").values_list("vigente_desde", flat=True).first())


def franjas_vigentes(empleado: Empleado, fecha: date):
    v = vigencia_de(empleado, fecha)
    if v is None:
        return Disponibilidad.objects.none()
    return Disponibilidad.objects.filter(empleado=empleado, vigente_desde=v)


def disponibles_el(fecha: date):
    """Empleados activos con alguna franja ese día de la semana, con sus franjas."""
    resultado = []
    for emp in Empleado.activos():
        franjas = [f for f in franjas_vigentes(emp, fecha) if f.dia == fecha.weekday()]
        if franjas:
            resultado.append((emp, franjas))
    return resultado


def copiar_configuracion(origen: Empleado, destino: Empleado, desde: date, fecha_ref: date) -> int:
    """Copia la disponibilidad vigente de `origen` a `destino` con vigencia `desde`."""
    Disponibilidad.objects.filter(empleado=destino, vigente_desde=desde).delete()
    copiadas = 0
    for f in franjas_vigentes(origen, fecha_ref):
        Disponibilidad.objects.create(empleado=destino, dia=f.dia, desde=f.desde, hasta=f.hasta, vigente_desde=desde)
        copiadas += 1
    return copiadas
