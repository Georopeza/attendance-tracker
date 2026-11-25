from django.contrib.auth.decorators import login_required
from django.shortcuts import render

from personal.models import Empleado

from .models import DIAS, Disponibilidad


@login_required
def cuadricula(request):
    """Cuadrícula del equipo: quién puede venir qué día y a qué hora."""
    franjas = Disponibilidad.objects.filter(empleado__archivado=False)
    mapa = {}
    for f in franjas:
        mapa.setdefault((f.empleado_id, f.dia), []).append(f"{f.desde:%H:%M}–{f.hasta:%H:%M}")
    empleados = Empleado.activos()
    filas = [{"empleado": e, "celdas": [mapa.get((e.pk, d), []) for d in range(7)]} for e in empleados]
    conteo = [sum(1 for f in filas if f["celdas"][d]) for d in range(7)]
    return render(request, "disponibilidad/cuadricula.html", {"dias": DIAS, "filas": filas, "conteo": conteo})
