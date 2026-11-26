from django.conf import settings
from django.db import models


class Registro(models.Model):
    """Bitácora de cambios: quién, cuándo, qué había antes y qué hay ahora."""

    usuario = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, on_delete=models.SET_NULL)
    creado = models.DateTimeField(auto_now_add=True)
    entidad = models.CharField(max_length=60)
    objeto_id = models.PositiveBigIntegerField(null=True)
    accion = models.CharField(max_length=60)
    antes = models.JSONField(null=True, blank=True)
    despues = models.JSONField(null=True, blank=True)
    motivo = models.CharField(max_length=300, blank=True)

    class Meta:
        ordering = ["-creado"]


def registrar(usuario, entidad, objeto_id, accion, antes=None, despues=None, motivo=""):
    return Registro.objects.create(
        usuario=usuario if getattr(usuario, "pk", None) else None,
        entidad=entidad, objeto_id=objeto_id, accion=accion,
        antes=antes, despues=despues, motivo=motivo,
    )


def foto(obj, *campos):
    """Valores de un objeto como texto, para guardar el 'antes' y el 'después'."""
    return {c: (None if getattr(obj, c) is None else str(getattr(obj, c))) for c in campos}
