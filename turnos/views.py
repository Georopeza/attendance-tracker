from datetime import timedelta

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone

from bitacora.models import foto, registrar

from .forms import CambioHorarioForm, ExcepcionForm, TurnoForm
from .models import DIAS_SEMANA, ExcepcionTurno, Turno
from .services import cambiar_horario, turnos_vigentes

CAMPOS = ("nombre", "inicio", "fin", "dias", "vigente_desde", "vigente_hasta")


@login_required
def lista(request):
    hoy = timezone.localdate()
    lunes = hoy - timedelta(days=hoy.weekday())
    calendario = [(nombre, [t for t in turnos_vigentes(lunes + timedelta(days=i))]) for i, nombre in DIAS_SEMANA]
    return render(request, "turnos/lista.html", {
        "turnos": Turno.objects.order_by("-vigente_hasta", "nombre"),
        "excepciones": ExcepcionTurno.objects.filter(fecha__gte=hoy - timedelta(days=30)).order_by("fecha"),
        "calendario": calendario, "hoy": hoy})


@login_required
def crear(request):
    form = TurnoForm(request.POST or None)
    if form.is_valid():
        t = form.save(commit=False)
        t.vigente_desde = timezone.localdate()
        t.save()
        registrar(request.user, "Turno", t.pk, "creó", None, foto(t, *CAMPOS))
        messages.success(request, "Turno creado.")
        return redirect("turnos")
    return render(request, "turnos/form.html", {"form": form, "titulo": "Nuevo turno"})


@login_required
def cambiar(request, pk):
    turno = get_object_or_404(Turno, pk=pk, vigente_hasta__isnull=True)
    form = CambioHorarioForm(request.POST or None, initial={"inicio": turno.inicio, "fin": turno.fin})
    if form.is_valid():
        antes = foto(turno, *CAMPOS)
        nuevo = cambiar_horario(turno, form.cleaned_data["desde"], form.cleaned_data["inicio"], form.cleaned_data["fin"])
        registrar(request.user, "Turno", nuevo.pk, "cambió el horario", antes, foto(nuevo, *CAMPOS))
        messages.success(request, "Horario cambiado. Las semanas anteriores conservan el horario que tenían.")
        return redirect("turnos")
    return render(request, "turnos/form.html", {"form": form, "titulo": f"Cambiar el horario de «{turno.nombre}»",
                                                 "boton": "Cambiar horario"})


@login_required
def dar_de_baja(request, pk):
    turno = get_object_or_404(Turno, pk=pk, vigente_hasta__isnull=True)
    if request.method == "POST":
        antes = foto(turno, *CAMPOS)
        turno.vigente_hasta = timezone.localdate()
        turno.save(update_fields=["vigente_hasta"])
        registrar(request.user, "Turno", turno.pk, "dio de baja", antes, foto(turno, *CAMPOS),
                  request.POST.get("motivo", ""))
        messages.success(request, "Turno dado de baja. El pasado no cambia.")
        return redirect("turnos")
    return render(request, "confirmar.html", {
        "titulo": f"¿Dar de baja «{turno.nombre}»?",
        "mensaje": "Deja de regir desde hoy. Los días anteriores se siguen calculando con este turno.",
        "boton": "Sí, dar de baja", "cancelar": "/turnos/", "pide_motivo": True})


@login_required
def excepcion_nueva(request):
    form = ExcepcionForm(request.POST or None)
    if form.is_valid():
        e = form.save()
        registrar(request.user, "ExcepcionTurno", e.pk, "creó", None, foto(e, "fecha", "turno", "inicio", "fin"))
        messages.success(request, "Excepción guardada.")
        return redirect("turnos")
    return render(request, "turnos/form.html", {"form": form, "titulo": "Nueva excepción por fecha"})


@login_required
def excepcion_eliminar(request, pk):
    e = get_object_or_404(ExcepcionTurno, pk=pk)
    if request.method == "POST":
        registrar(request.user, "ExcepcionTurno", e.pk, "eliminó", foto(e, "fecha", "turno", "inicio", "fin"), None,
                  request.POST.get("motivo", ""))
        e.delete()
        messages.success(request, "Excepción eliminada.")
        return redirect("turnos")
    return render(request, "confirmar.html", {
        "titulo": f"¿Eliminar la excepción del {e.fecha:%d/%m/%Y}?",
        "mensaje": "Ese día volverá a medirse con el turno habitual (o sin turno si es fin de semana).",
        "boton": "Sí, eliminar", "cancelar": "/turnos/", "pide_motivo": True})
