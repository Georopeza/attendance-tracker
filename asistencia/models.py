from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

from personal.models import Empleado


class Tramo(models.Model):
    """Un 'entró / salió'. Un empleado puede tener varios tramos el mismo día.

    Las horas se guardan en UTC; salida vacía = sigue presente.
    """

    empleado = models.ForeignKey(Empleado, on_delete=models.PROTECT, related_name="tramos")
    entrada = models.DateTimeField()
    salida = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["entrada"]

    @property
    def fecha(self):
        return timezone.localtime(self.entrada).date()

    def clean(self):
        if self.salida and self.salida <= self.entrada:
            raise ValidationError("La salida no puede ser anterior a la entrada.")
        if self.salida and timezone.localtime(self.salida).date() != self.fecha:
            raise ValidationError("Un tramo no puede cruzar la medianoche.")
        otros = Tramo.objects.filter(empleado=self.empleado).exclude(pk=self.pk)
        for o in otros:
            fin_o = o.salida or timezone.now()
            fin_s = self.salida or timezone.now()
            if self.entrada < fin_o and o.entrada < fin_s:
                raise ValidationError("El tramo se cruza con otro del mismo empleado.")

    def __str__(self):
        return f"{self.empleado} {timezone.localtime(self.entrada):%d/%m %H:%M}"
