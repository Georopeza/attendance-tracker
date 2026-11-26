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


def _tarjeta_ctx(emp: Empleado, fecha: date, error: str = "", abierto: bool = False):
    tramos = services.tramos_del_dia(emp, fecha)
    return {"emp": emp, "fecha": fecha, "es_hoy": fecha == timezone.localdate(), "tramos": tramos,
            "estado": services.estado(tramos),
            "resumen": services.resumen_dia(emp, fecha, tramos=tramos), "error": error, "abierto": abierto}


def _render_tarjeta(request, emp, error="", abierto=False):
    return render(request, "asistencia/_tarjeta.html", _tarjeta_ctx(emp, timezone.localdate(), error, abierto))


def _render_tarjetas(request, fecha, aviso=""):
    return render(request, "asistencia/_tarjetas.html", {
        "tarjetas": [_tarjeta_ctx(e, fecha) for e in Empleado.activos()], "aviso": aviso})


def _horario_del_dia(fecha: date):
    """(inicio, fin) del turno del día como 'HH:MM', o ('', '') si no hay turno."""
    turnos = turnos_vigentes(fecha)
    if not turnos:
        return "", ""
    return f"{min(t.inicio for t in turnos):%H:%M}", f"{max(t.fin for t in turnos):%H:%M}"


def _filas_dia(fecha: date, post=None, errores=None):
    """Una fila por empleado para marcar el día completo. Refleja lo ya marcado; con `post`
    muestra lo que se envió (para repintar el formulario cuando hay errores)."""
    ini, fin = _horario_del_dia(fecha)
    filas = []
    for emp in Empleado.activos():
        tramos = services.tramos_del_dia(emp, fecha)
        if len(tramos) > 1:
            fila = {"emp": emp, "varios": True, "vino": True, "entrada": "", "salida": ""}
        elif tramos:
            t = tramos[0]
            fila = {"emp": emp, "varios": False, "vino": True,
                    "entrada": f"{timezone.localtime(t.entrada):%H:%M}",
                    "salida": f"{timezone.localtime(t.salida):%H:%M}" if t.salida else ""}
        else:
            fila = {"emp": emp, "varios": False, "vino": False, "entrada": ini, "salida": fin}
        if post is not None and not fila["varios"]:
            fila.update(vino=bool(post.get(f"vino_{emp.pk}")), entrada=post.get(f"entrada_{emp.pk}", ""),
                        salida=post.get(f"salida_{emp.pk}", ""))
        fila["error"] = (errores or {}).get(emp.pk, "")
        filas.append(fila)
    return filas


def _ctx_hoy(request, fecha, **extra):
    modo = "dia" if request.GET.get("modo", request.POST.get("modo")) == "dia" else "momento"
    ctx = {"fecha": fecha, "es_hoy": fecha == timezone.localdate(), "turnos": turnos_vigentes(fecha), "modo": modo,
           "anterior": fecha - timedelta(days=1), "siguiente": fecha + timedelta(days=1)}
    if modo == "dia":
        ctx["filas"] = _filas_dia(fecha)
    ctx.update(extra)
    return ctx


@login_required
def hoy(request):
    return render(request, "asistencia/hoy.html", _ctx_hoy(request, _fecha(request.GET.get("fecha"))))


@login_required
@require_POST
def guardar_dia(request):
    """Modo 'al final del día': el día queda igual a lo que muestra el formulario."""
    fecha = _fecha(request.POST.get("fecha"))
    es_hoy = fecha == timezone.localdate()
    acciones, errores = [], {}
    for emp in Empleado.activos():
        tramos = services.tramos_del_dia(emp, fecha)
        if len(tramos) > 1:
            continue  # varios tramos: se corrigen desde "Corregir el día"
        vino = bool(request.POST.get(f"vino_{emp.pk}"))
        if not vino:
            if tramos:
                acciones.append(("borrar", emp, tramos[0]))
            continue
        e_txt, s_txt = request.POST.get(f"entrada_{emp.pk}", ""), request.POST.get(f"salida_{emp.pk}", "")
        try:
            if not e_txt:
                raise ValueError("Falta la hora de entrada.")
            if not s_txt and not es_hoy:
                raise ValueError("Falta la hora de salida.")
            entrada = _local(fecha, time.fromisoformat(e_txt))
            salida = _local(fecha, time.fromisoformat(s_txt)) if s_txt else None
            t = tramos[0] if tramos else Tramo(empleado=emp)
            antes = _foto(t) if tramos else None
            if tramos and t.entrada == entrada and t.salida == salida:
                continue
            t.entrada, t.salida = entrada, salida
            t.full_clean()
        except ValidationError as e:
            errores[emp.pk] = "; ".join(e.messages)
        except ValueError as e:
            errores[emp.pk] = str(e) if "Falta" in str(e) else "Hora no válida."
        else:
            acciones.append(("editar" if tramos else "crear", emp, t, antes))
    if errores:
        ctx = _ctx_hoy(request, fecha)
        ctx["filas"] = _filas_dia(fecha, request.POST, errores)
        ctx["modo"] = "dia"
        return render(request, "asistencia/hoy.html", ctx)
    for a in acciones:
        if a[0] == "borrar":
            registrar(request.user, "Tramo", a[2].pk, "quitó la asistencia del día", _foto(a[2]), None)
            a[2].delete()
        else:
            a[2].save()
            registrar(request.user, "Tramo", a[2].pk,
                      "marcó el día completo" if a[0] == "crear" else "ajustó el día completo", a[3], _foto(a[2]))
    messages.success(request, f"Día guardado ({len(acciones)} cambios)." if acciones else "No había cambios que guardar.")
    return redirect(f"/?modo=dia&fecha={fecha}")


@login_required
def hoy_tarjetas(request):
    """Parcial que la pantalla Hoy recarga cada pocos segundos: así un coordinador
    ve lo que marcó otro sin recargar la página."""
    return _render_tarjetas(request, _fecha(request.GET.get("fecha")))


def _guardar(request, tramo, antes, accion, emp, abierto=False):
    try:
        tramo.full_clean()
    except ValidationError as e:
        return _render_tarjeta(request, emp, "; ".join(e.messages), abierto)
    tramo.save()
    registrar(request.user, "Tramo", tramo.pk, accion, antes, _foto(tramo))
    return _render_tarjeta(request, emp, abierto=abierto)


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
    return _guardar(request, ultimo, antes, "ajustó una marca", emp, abierto=True)


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
    return _render_tarjeta(request, emp, abierto=True)


@login_required
@require_POST
def bloque(request, que):
    """Marcación en bloque para días normales. `que` = 'entrada' o 'salida'."""
    if que not in ("entrada", "salida"):
        return HttpResponseBadRequest()
    hoy_ = timezone.localdate()
    try:
        ini, fin = _horario_del_dia(hoy_)
        hora = time.fromisoformat(request.POST.get("hora") or ((ini or "09:00") if que == "entrada" else (fin or "16:00")))
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
