from django.contrib.auth.decorators import login_required
from django.shortcuts import render


@login_required
def configuracion(request):
    """Lo que se toca poco: empleados, turnos, disponibilidad, bitácora y accesos."""
    return render(request, "configuracion.html")
