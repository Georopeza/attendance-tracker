from django.contrib import messages
from django.contrib.auth import get_user_model
from django.contrib.auth.decorators import login_required
from django.shortcuts import get_object_or_404, redirect, render
from django.views.decorators.http import require_POST

from bitacora.models import registrar

from .forms import CoordinadorForm

User = get_user_model()


@login_required
def lista(request):
    return render(request, "cuentas/lista.html", {"usuarios": User.objects.order_by("-is_active", "username")})


@login_required
def crear(request):
    form = CoordinadorForm(request.POST or None)
    if form.is_valid():
        u = User.objects.create_user(form.cleaned_data["username"], password=form.cleaned_data["password1"],
                                     is_staff=True)
        registrar(request.user, "Coordinador", u.pk, "creó acceso", None, {"usuario": u.username})
        messages.success(request, f"Acceso creado para {u.username}.")
        return redirect("coordinadores")
    return render(request, "cuentas/form.html", {"form": form})


@login_required
@require_POST
def activar(request, pk, activo):
    u = get_object_or_404(User, pk=pk)
    nuevo = activo == "1"
    if u == request.user and not nuevo:
        messages.error(request, "No puedes desactivar tu propio acceso.")
        return redirect("coordinadores")
    u.is_active = nuevo
    u.save(update_fields=["is_active"])
    registrar(request.user, "Coordinador", u.pk, "reactivó acceso" if nuevo else "desactivó acceso", None,
              {"usuario": u.username})
    messages.success(request, f"Acceso de {u.username} {'reactivado' if nuevo else 'desactivado'}.")
    return redirect("coordinadores")
