"""Pantallas: Hoy (marcación con HTMX), resumen semanal y desglose con corrección de día."""
from datetime import date, datetime, time, timedelta

from django.contrib.auth.decorators import login_required
from django.core.exceptions import ValidationError
from django.shortcuts import get_object_or_404, render
from django.utils import timezone
from django.views.decorators.http import require_POST

from bitacora.models import registrar
from personal.models import Empleado

from . import services
from .horas import ResumenDia
from .models import Tramo

PASO = 15  # minutos de los botones -15 / +15


def _tarjeta_ctx(emp: Empleado, error: str = ""):
    hoy = timezone.localdate()
    tramos = services.tramos_del_dia(emp, hoy)
    return {"emp": emp, "tramos": tramos, "estado": services.estado(tramos),
            "resumen": services.resumen_dia(emp, hoy, tramos=tramos), "error": error}


def _render_tarjeta(request, emp, error=""):
    return render(request, "asistencia/_tarjeta.html", _tarjeta_ctx(emp, error))


@login_required
def hoy(request):
    return render(request, "asistencia/hoy.html", {"fecha": timezone.localdate()})


@login_required
def hoy_tarjetas(request):
    """Parcial que la pantalla Hoy recarga cada pocos segundos: así un coordinador
    ve lo que marcó otro sin recargar la página."""
    return render(request, "asistencia/_tarjetas.html",
                  {"tarjetas": [_tarjeta_ctx(e) for e in Empleado.activos()]})


def _guardar(request, tramo, antes, accion, emp):
    try:
        tramo.full_clean()
    except ValidationError as e:
        return _render_tarjeta(request, emp, "; ".join(e.messages))
    tramo.save()
    registrar(request.user, "Tramo", tramo.pk, accion, antes,
              {"entrada": tramo.entrada.isoformat(), "salida": tramo.salida and tramo.salida.isoformat()})
    return _render_tarjeta(request, emp)


@login_required
@require_POST
def marcar(request, empleado_id):
    """Un solo botón: si está dentro marca la salida, si no, abre un tramo nuevo."""
    emp = get_object_or_404(Empleado, pk=empleado_id, archivado=False)
    abierto = emp.tramos.filter(salida__isnull=True).last()
    ahora = timezone.now().replace(second=0, microsecond=0)
    if abierto:
        antes = {"entrada": abierto.entrada.isoformat(), "salida": None}
        abierto.salida = ahora
        return _guardar(request, abierto, antes, "marcó salida", emp)
    return _guardar(request, Tramo(empleado=emp, entrada=ahora), None, "marcó entrada", emp)


@login_required
@require_POST
def ajustar(request, empleado_id, sentido):
    """Corrige la última marca en +/- 15 minutos."""
    emp = get_object_or_404(Empleado, pk=empleado_id, archivado=False)
    ultimo = emp.tramos.order_by("entrada").last()
    if not ultimo:
        return _render_tarjeta(request, emp)
    antes = {"entrada": ultimo.entrada.isoformat(), "salida": ultimo.salida and ultimo.salida.isoformat()}
    paso = timedelta(minutes=PASO if sentido == "mas" else -PASO)
    if ultimo.salida:
        ultimo.salida += paso
    else:
        ultimo.entrada += paso
    return _guardar(request, ultimo, antes, "ajustó una marca", emp)


# ---------- resumen semanal y desglose ----------

def _lunes(request):
    try:
        return services.lunes_de(date.fromisoformat(request.GET.get("semana", "")))
    except ValueError:
        return services.lunes_de(timezone.localdate())


@login_required
def semana(request):
    lunes = _lunes(request)
    filas, promedio = services.resumen_semana(lunes)
    return render(request, "asistencia/semana.html", {
        "lunes": lunes, "domingo": lunes + timedelta(days=6), "filas": filas, "promedio": promedio,
        "anterior": lunes - timedelta(days=7), "siguiente": lunes + timedelta(days=7)})


def _desglose_ctx(emp, lunes):
    dias = services.desglose_semana(emp, lunes)
    total = ResumenDia(total=sum(d["resumen"].total for d in dias))
    return {"emp": emp, "lunes": lunes, "dias": dias, "suma": total}


@login_required
def desglose(request, empleado_id):
    """Calendario lunes-domingo de un empleado, para justificar su total semanal."""
    emp = get_object_or_404(Empleado, pk=empleado_id)
    return render(request, "asistencia/_desglose.html", _desglose_ctx(emp, _lunes(request)))


@login_required
def dia_editar(request, empleado_id, fecha):
    """Corrige los tramos de un día desde el desglose."""
    emp = get_object_or_404(Empleado, pk=empleado_id)
    dia = date.fromisoformat(fecha)
    tramos = services.tramos_del_dia(emp, dia)
    error = ""
    if request.method == "POST":
        motivo = request.POST.get("motivo", "").strip()
        tz = timezone.get_current_timezone()
        try:
            for t in tramos:
                antes = {"entrada": t.entrada.isoformat(), "salida": t.salida and t.salida.isoformat()}
                t.entrada = timezone.make_aware(
                    datetime.combine(dia, time.fromisoformat(request.POST[f"entrada_{t.pk}"])), tz)
                s = request.POST.get(f"salida_{t.pk}")
                t.salida = timezone.make_aware(datetime.combine(dia, time.fromisoformat(s)), tz) if s else None
                t.full_clean()
                t.save()
                registrar(request.user, "Tramo", t.pk, "corrigió desde el desglose", antes,
                          {"entrada": t.entrada.isoformat(), "salida": t.salida and t.salida.isoformat()}, motivo)
        except (ValidationError, ValueError, KeyError) as e:
            error = "; ".join(getattr(e, "messages", [str(e)]))
        else:
            return render(request, "asistencia/_desglose.html", _desglose_ctx(emp, services.lunes_de(dia)))
    return render(request, "asistencia/_dia_editar.html",
                  {"emp": emp, "fecha": dia, "tramos": tramos, "error": error})
