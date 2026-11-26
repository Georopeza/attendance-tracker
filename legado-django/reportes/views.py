from django.contrib.auth.decorators import login_required
from django.http import Http404, HttpResponse
from django.utils import timezone

from asistencia.views import _fecha

from . import excel, pdf
from .datos import reporte_semana

TIPOS = {"xlsx": ("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", excel.construir),
         "pdf": ("application/pdf", pdf.construir)}


@login_required
def semana(request, formato):
    """Descarga el resumen semanal (?semana=AAAA-MM-DD, cualquier día de la semana)."""
    if formato not in TIPOS:
        raise Http404
    rep = reporte_semana(_fecha(request.GET.get("semana"), timezone.localdate()))
    tipo, construir = TIPOS[formato]
    resp = HttpResponse(construir(rep), content_type=tipo)
    resp["Content-Disposition"] = f'attachment; filename="horas-semana-{rep.lunes:%Y-%m-%d}.{formato}"'
    return resp
