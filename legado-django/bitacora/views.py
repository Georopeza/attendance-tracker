from django.contrib.auth.decorators import login_required
from django.core.paginator import Paginator
from django.shortcuts import render

from .models import Registro


@login_required
def lista(request):
    qs = Registro.objects.select_related("usuario")
    entidad = request.GET.get("entidad", "")
    if entidad:
        qs = qs.filter(entidad=entidad)
    pagina = Paginator(qs, 50).get_page(request.GET.get("p"))
    entidades = Registro.objects.order_by().values_list("entidad", flat=True).distinct()
    return render(request, "bitacora/lista.html", {"pagina": pagina, "entidad": entidad, "entidades": entidades})
