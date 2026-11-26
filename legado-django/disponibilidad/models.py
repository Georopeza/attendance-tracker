from django.core.exceptions import ValidationError
from django.db import models

from personal.models import Empleado

DIAS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"]


class Disponibilidad(models.Model):
    """Una franja en la que un empleado puede venir. Lo registra la coordinación."""

    empleado = models.ForeignKey(Empleado, on_delete=models.CASCADE, related_name="franjas")
    dia = models.PositiveSmallIntegerField(choices=list(enumerate(DIAS)))  # 0 = lunes
    desde = models.TimeField()
    hasta = models.TimeField()
    vigente_desde = models.DateField(help_text="Los cambios no alteran semanas anteriores.")

    class Meta:
        ordering = ["empleado", "dia", "desde"]

    def clean(self):
        if not self.empleado_id or self.desde is None or self.hasta is None:
            return  # el formulario completa el empleado y la vigencia antes de validar de nuevo
        if self.hasta <= self.desde:
            raise ValidationError("La hora final debe ser posterior a la inicial.")
        cruces = Disponibilidad.objects.filter(
            empleado=self.empleado, dia=self.dia, vigente_desde=self.vigente_desde,
            desde__lt=self.hasta, hasta__gt=self.desde,
        ).exclude(pk=self.pk)
        if cruces.exists():
            raise ValidationError("Las franjas del mismo día no pueden cruzarse.")

    def __str__(self):
        return f"{self.empleado} {DIAS[self.dia]} {self.desde:%H:%M}-{self.hasta:%H:%M}"
