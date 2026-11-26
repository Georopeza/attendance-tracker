from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404, redirect, render

from bitacora.models import foto, registrar

from .forms import EmpleadoForm
from .models import Empleado


@login_required
def lista(request):
    mostrar = request.GET.get("archivados") == "1"
    qs = Empleado.objects.all() if mostrar else Empleado.activos()
    empleados = [{"emp": e, "tiene_horas": e.tramos.exists()} for e in qs]
    return render(request, "personal/lista.html", {"empleados": empleados, "archivados": mostrar})


@login_required
def crear(request):
    form = EmpleadoForm(request.POST or None)
    if form.is_valid():
        emp = form.save()
        registrar(request.user, "Empleado", emp.pk, "creó", None, foto(emp, "nombre"))
        messages.success(request, f"{emp.nombre} agregado. Falta registrar su disponibilidad.")
        return redirect("empleados")
    return render(request, "personal/form.html", {"form": form, "titulo": "Nuevo empleado"})


@login_required
def editar(request, pk):
    emp = get_object_or_404(Empleado, pk=pk)
    antes = foto(emp, "nombre")
    form = EmpleadoForm(request.POST or None, instance=emp)
    if form.is_valid():
        emp = form.save()
        registrar(request.user, "Empleado", emp.pk, "editó", antes, foto(emp, "nombre"))
        messages.success(request, "Cambios guardados.")
        return redirect("empleados")
    return render(request, "personal/form.html", {"form": form, "titulo": f"Editar a {emp.nombre}"})


@login_required
def archivar(request, pk):
    emp = get_object_or_404(Empleado, pk=pk, archivado=False)
    if request.method == "POST":
        emp.archivado = True
        emp.save(update_fields=["archivado"])
        registrar(request.user, "Empleado", emp.pk, "archivó", {"archivado": "False"}, {"archivado": "True"},
                  request.POST.get("motivo", ""))
        messages.success(request, f"{emp.nombre} archivado. Su historial se conserva.")
        return redirect("empleados")
    return render(request, "confirmar.html", {
        "titulo": f"¿Archivar a {emp.nombre}?",
        "mensaje": "Dejará de aparecer en Hoy, disponibilidad y sugerencias. Su historial y los totales "
                   "ya entregados se conservan, y se puede reactivar cuando vuelva.",
        "boton": "Sí, archivar", "cancelar": "/empleados/", "pide_motivo": True})


@login_required
def reactivar(request, pk):
    if request.method == "POST":
        emp = get_object_or_404(Empleado, pk=pk, archivado=True)
        emp.archivado = False
        emp.save(update_fields=["archivado"])
        registrar(request.user, "Empleado", emp.pk, "reactivó", {"archivado": "True"}, {"archivado": "False"})
        messages.success(request, f"{emp.nombre} reactivado.")
    return redirect("empleados")


@login_required
def eliminar(request, pk):
    """Eliminación definitiva: solo si no tiene ninguna hora registrada (p. ej. creado por error)."""
    emp = get_object_or_404(Empleado, pk=pk)
    if emp.tramos.exists():
        messages.error(request, f"{emp.nombre} tiene horas registradas: no se puede eliminar, solo archivar.")
        return redirect("empleados")
    if request.method == "POST":
        registrar(request.user, "Empleado", emp.pk, "eliminó", foto(emp, "nombre"), None,
                  request.POST.get("motivo", ""))
        emp.delete()
        messages.success(request, "Empleado eliminado.")
        return redirect("empleados")
    return render(request, "confirmar.html", {
        "titulo": f"¿Eliminar a {emp.nombre}?",
        "mensaje": "No tiene horas registradas, así que se elimina por completo. Esto no se puede deshacer.",
        "boton": "Sí, eliminar", "cancelar": "/empleados/", "pide_motivo": True})
