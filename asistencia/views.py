"""Pantallas: Hoy (marcación con HTMX), resumen semanal y desglose con corrección de día."""
from datetime import date, datetime, time, timedelta

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.core.exceptions import ValidationError
from django.http import HttpResponseBadRequest
from django.shortcuts import get_object_or_404, redirect, render
from django.utils import timezone
from django.views.decorators.http import require_POST

from bitacora.models import registrar
from personal.models import Empleado
from turnos.services import turnos_vigentes

from . import services
from .horas import ResumenDia
from .models import Tramo

PASO = 15  # minutos de los botones -15 / +15


def _fecha(valor, defecto=None):
    try:
        return date.fromisoformat(valor)
    except (TypeError, ValueError):
        return defecto or timezone.localdate()


def _local(dia: date, hora: time):
    return timezone.make_aware(datetime.combine(dia, hora), timezone.get_current_timezone())


def _foto(t: Tramo):
    return {"entrada": t.entrada.isoformat(), "salida": t.salida and t.salida.isoformat()}


def _tarjeta_ctx(emp: Empleado, fecha: date, error: str = ""):
    tramos = services.tramos_del_dia(emp, fecha)
    return {"emp": emp, "fecha": fecha, "es_hoy": fecha == timezone.localdate(), "tramos": tramos,
            "estado": services.estado(tramos),
            "resumen": services.resumen_dia(emp, fecha, tramos=tramos), "error": error}


def _render_tarjeta(request, emp, error=""):
    return render(request, "asistencia/_tarjeta.html", _tarjeta_ctx(emp, timezone.localdate(), error))


def _render_tarjetas(request, fecha, aviso=""):
    return render(request, "asistencia/_tarjetas.html", {
        "tarjetas": [_tarjeta_ctx(e, fecha) for e in Empleado.activos()], "aviso": aviso})


@login_required
def hoy(request):
    fecha = _fecha(request.GET.get("fecha"))
    turnos = turnos_vigentes(fecha)
    return render(request, "asistencia/hoy.html", {
        "fecha": fecha, "es_hoy": fecha == timezone.localdate(), "turnos": turnos,
        "anterior": fecha - timedelta(days=1), "siguiente": fecha + timedelta(days=1)})


@login_required
def hoy_tarjetas(request):
    """Parcial que la pantalla Hoy recarga cada pocos segundos: así un coordinador
    ve lo que marcó otro sin recargar la página."""
    return _render_tarjetas(request, _fecha(request.GET.get("fecha")))


def _guardar(request, tramo, antes, accion, emp):
    try:
        tramo.full_clean()
    except ValidationError as e:
        return _render_tarjeta(request, emp, "; ".join(e.messages))
    tramo.save()
    registrar(request.user, "Tramo", tramo.pk, accion, antes, _foto(tramo))
    return _render_tarjeta(request, emp)


@login_required
@require_POST
def marcar(request, empleado_id):
    """Un solo botón: si está dentro marca la salida, si no, abre un tramo nuevo."""
    emp = get_object_or_404(Empleado, pk=empleado_id, archivado=False)
    abierto = emp.tramos.filter(salida__isnull=True).last()
    ahora = timezone.now().replace(second=0, microsecond=0)
    if abierto:
        antes = _foto(abierto)
        abierto.salida = ahora
        return _guardar(request, abierto, antes, "marcó salida", emp)
    return _guardar(request, Tramo(empleado=emp, entrada=ahora), None, "marcó entrada", emp)


@login_required
@require_POST
def ajustar(request, empleado_id, sentido):
    """Corrige la última marca de hoy en +/- 15 minutos."""
    emp = get_object_or_404(Empleado, pk=empleado_id, archivado=False)
    tramos = services.tramos_del_dia(emp, timezone.localdate())
    if not tramos:
        return _render_tarjeta(request, emp)
    ultimo = tramos[-1]
    antes = _foto(ultimo)
    paso = timedelta(minutes=PASO if sentido == "mas" else -PASO)
    if ultimo.salida:
        ultimo.salida += paso
    else:
        ultimo.entrada += paso
    return _guardar(request, ultimo, antes, "ajustó una marca", emp)


@login_required
@require_POST
def deshacer(request, empleado_id):
    """Quita la última marca: si había salida la borra; si no, elimina el tramo abierto."""
    emp = get_object_or_404(Empleado, pk=empleado_id, archivado=False)
    tramos = services.tramos_del_dia(emp, timezone.localdate())
    if tramos:
        ultimo = tramos[-1]
        antes = _foto(ultimo)
        if ultimo.salida:
            ultimo.salida = None
            ultimo.save(update_fields=["salida"])
            registrar(request.user, "Tramo", ultimo.pk, "deshizo la salida", antes, _foto(ultimo))
        else:
            registrar(request.user, "Tramo", ultimo.pk, "deshizo la entrada", antes, None)
            ultimo.delete()
    return _render_tarjeta(request, emp)


@login_required
@require_POST
def bloque(request, que):
    """Marcación en bloque para días normales. `que` = 'entrada' o 'salida'."""
    if que not in ("entrada", "salida"):
        return HttpResponseBadRequest()
    hoy_ = timezone.localdate()
    try:
        hora = time.fromisoformat(request.POST.get("hora") or ("09:00" if que == "entrada" else "16:00"))
    except ValueError:
        return _render_tarjetas(request, hoy_, "La hora no es válida.")
    momento = _local(hoy_, hora)
    hechos = omitidos = 0
    for emp in Empleado.activos():
        tramos = services.tramos_del_dia(emp, hoy_)
        if que == "entrada":
            if tramos:
                continue
            t = Tramo(empleado=emp, entrada=momento)
            antes, accion = None, "marcó entrada en bloque"
        else:
            if not tramos or tramos[-1].salida is not None:
                continue
            t = tramos[-1]
            antes, accion = _foto(t), "marcó salida en bloque"
            t.salida = momento
        try:
            t.full_clean()
        except ValidationError:
            omitidos += 1
            continue
        t.save()
        registrar(request.user, "Tramo", t.pk, accion, antes, _foto(t))
        hechos += 1
    aviso = f"{hechos} marcas a las {hora:%H:%M}." + (f" {omitidos} omitidas por validación." if omitidos else "")
    return _render_tarjetas(request, hoy_, aviso)


# ---------- corrección de un día (desde Hoy o desde el desglose) ----------

def _aplicar_correccion(request, emp, dia, tramos):
    """Aplica los campos del formulario del editor. Devuelve el texto del error ('' si todo bien)."""
    motivo = request.POST.get("motivo", "").strip()
    try:
        for t in tramos:
            if request.POST.get(f"borrar_{t.pk}"):
                registrar(request.user, "Tramo", t.pk, "eliminó desde la corrección", _foto(t), None, motivo)
                t.delete()
                continue
            antes = _foto(t)
            t.entrada = _local(dia, time.fromisoformat(request.POST[f"entrada_{t.pk}"]))
            s = request.POST.get(f"salida_{t.pk}")
            t.salida = _local(dia, time.fromisoformat(s)) if s else None
            t.full_clean()
            t.save()
            registrar(request.user, "Tramo", t.pk, "corrigió el día", antes, _foto(t), motivo)
        nueva_e = request.POST.get("entrada_nuevo")
        if nueva_e:
            nueva_s = request.POST.get("salida_nuevo")
            t = Tramo(empleado=emp, entrada=_local(dia, time.fromisoformat(nueva_e)),
                      salida=_local(dia, time.fromisoformat(nueva_s)) if nueva_s else None)
            t.full_clean()
            t.save()
            registrar(request.user, "Tramo", t.pk, "agregó un tramo", None, _foto(t), motivo)
    except (ValidationError, ValueError, KeyError) as e:
        return "; ".join(getattr(e, "messages", [str(e)]))
    return ""


@login_required
def dia_pagina(request, empleado_id, fecha):
    """Editor de un día como página completa (se llega desde Hoy en días pasados)."""
    emp = get_object_or_404(Empleado, pk=empleado_id)
    dia = _fecha(fecha)
    error = ""
    if request.method == "POST":
        error = _aplicar_correccion(request, emp, dia, services.tramos_del_dia(emp, dia))
        if not error:
            messages.success(request, "Día corregido.")
            return redirect(f"/?fecha={dia}")
    return render(request, "asistencia/dia_pagina.html", {
        "emp": emp, "fecha": dia, "tramos": services.tramos_del_dia(emp, dia), "error": error,
        "resumen": services.resumen_dia(emp, dia)})


# ---------- resumen semanal y desglose ----------

def _lunes(request):
    return services.lunes_de(_fecha(request.GET.get("semana")))


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
    """Corrige los tramos de un día desde el desglose (parcial HTMX)."""
    emp = get_object_or_404(Empleado, pk=empleado_id)
    dia = _fecha(fecha)
    error = ""
    if request.method == "POST":
        error = _aplicar_correccion(request, emp, dia, services.tramos_del_dia(emp, dia))
        if not error:
            return render(request, "asistencia/_desglose.html", _desglose_ctx(emp, services.lunes_de(dia)))
    return render(request, "asistencia/_dia_editar.html",
                  {"emp": emp, "fecha": dia, "tramos": services.tramos_del_dia(emp, dia), "error": error})
