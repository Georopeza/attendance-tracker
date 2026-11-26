from datetime import date

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core.exceptions import ValidationError
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone

from bitacora.models import foto, registrar
from personal.models import Empleado

from . import services
from .forms import FranjaForm
from .models import DIAS, Disponibilidad

CAMPOS = ("dia", "desde", "hasta", "vigente_desde")


@login_required
def cuadricula(request):
    """Cuadrícula del equipo: quién puede venir qué día y a qué hora."""
    hoy = timezone.localdate()
    filas = []
    for e in Empleado.activos():
        celdas = [[] for _ in range(7)]
        for f in services.franjas_vigentes(e, hoy):
            celdas[f.dia].append(f"{f.desde:%H:%M}–{f.hasta:%H:%M}")
        filas.append({"empleado": e, "celdas": celdas})
    conteo = [sum(1 for f in filas if f["celdas"][d]) for d in range(7)]
    return render(request, "disponibilidad/cuadricula.html", {"dias": DIAS, "filas": filas, "conteo": conteo})


def _fecha(valor, defecto):
    try:
        return date.fromisoformat(valor)
    except (TypeError, ValueError):
        return defecto


@login_required
def ficha(request, empleado_id):
    emp = get_object_or_404(Empleado, pk=empleado_id, archivado=False)
    hoy = timezone.localdate()
    vigencia = _fecha(request.GET.get("vigencia"), services.vigencia_de(emp, hoy) or hoy)
    franjas = Disponibilidad.objects.filter(empleado=emp, vigente_desde=vigencia)
    por_dia = [{"nombre": DIAS[i], "franjas": [f for f in franjas if f.dia == i]} for i in range(7)]
    vigencias = (Disponibilidad.objects.filter(empleado=emp).order_by("-vigente_desde")
                 .values_list("vigente_desde", flat=True).distinct())
    return render(request, "disponibilidad/ficha.html", {
        "emp": emp, "vigencia": vigencia, "por_dia": por_dia, "form": FranjaForm(),
        "vigencias": list(vigencias), "otros": Empleado.activos().exclude(pk=emp.pk)})


@login_required
def franja_agregar(request, empleado_id):
    emp = get_object_or_404(Empleado, pk=empleado_id, archivado=False)
    vigencia = _fecha(request.POST.get("vigencia"), timezone.localdate())
    form = FranjaForm(request.POST)
    if form.is_valid():
        f = form.save(commit=False)
        f.empleado, f.vigente_desde = emp, vigencia
        try:
            f.full_clean()
        except ValidationError as e:
            messages.error(request, "; ".join(e.messages))
        else:
            f.save()
            registrar(request.user, "Disponibilidad", f.pk, "agregó franja", None, foto(f, *CAMPOS))
            messages.success(request, "Franja agregada.")
    else:
        messages.error(request, "Revisa las horas de la franja.")
    return redirect(f"/disponibilidad/{emp.pk}/?vigencia={vigencia}")


@login_required
def franja_quitar(request, pk):
    f = get_object_or_404(Disponibilidad, pk=pk)
    if request.method == "POST":
        registrar(request.user, "Disponibilidad", f.pk, "quitó franja", foto(f, *CAMPOS), None)
        emp, vigencia = f.empleado_id, f.vigente_desde
        f.delete()
        messages.success(request, "Franja quitada.")
        return redirect(f"/disponibilidad/{emp}/?vigencia={vigencia}")
    return redirect("disponibilidad")


@login_required
def copiar(request, empleado_id):
    """Copiar la disponibilidad vigente de otro empleado (queda con vigencia de hoy)."""
    emp = get_object_or_404(Empleado, pk=empleado_id, archivado=False)
    if request.method == "POST":
        origen = get_object_or_404(Empleado, pk=request.POST.get("origen"), archivado=False)
        hoy = timezone.localdate()
        n = services.copiar_configuracion(origen, emp, hoy, hoy)
        registrar(request.user, "Disponibilidad", emp.pk, "copió disponibilidad", None,
                  {"de": origen.nombre, "franjas": str(n)})
        messages.success(request, f"Disponibilidad copiada de {origen.nombre} ({n} franjas).")
        return redirect(f"/disponibilidad/{emp.pk}/?vigencia={hoy}")
    return redirect("disponibilidad_ficha", empleado_id=emp.pk)


@login_required
def nueva_vigencia(request, empleado_id):
    """Empieza una configuración nueva desde una fecha, partiendo de la actual."""
    emp = get_object_or_404(Empleado, pk=empleado_id, archivado=False)
    if request.method == "POST":
        desde = _fecha(request.POST.get("desde"), None)
        if desde is None:
            messages.error(request, "Elige la fecha desde la que rige.")
            return redirect("disponibilidad_ficha", empleado_id=emp.pk)
        actual = services.vigencia_de(emp, desde)
        if actual == desde:
            messages.error(request, "Ya existe una configuración con esa fecha.")
        else:
            n = services.copiar_configuracion(emp, emp, desde, desde)
            registrar(request.user, "Disponibilidad", emp.pk, "nueva vigencia", None, {"desde": str(desde), "franjas": str(n)})
            messages.success(request, f"Nueva configuración desde {desde:%d/%m/%Y}. Edita sus franjas aquí.")
        return redirect(f"/disponibilidad/{emp.pk}/?vigencia={desde}")
    return redirect("disponibilidad_ficha", empleado_id=emp.pk)
