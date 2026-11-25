from django.db import models


def dias_laborables():
    return [0, 1, 2, 3, 4]


class Turno(models.Model):
    """Molde de horario. No se asigna a personas: solo sirve para medir las horas."""

    nombre = models.CharField(max_length=60)
    inicio = models.TimeField(default="09:00")
    fin = models.TimeField(default="16:00")
    # Días de la semana en que rige (0 = lunes ... 6 = domingo).
    dias = models.JSONField(default=dias_laborables)
    activo = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.nombre} {self.inicio:%H:%M}-{self.fin:%H:%M}"


class ExcepcionTurno(models.Model):
    """Cambio puntual para una fecha (p. ej. turno hasta las 16:30, o sin turno)."""

    fecha = models.DateField(unique=True)
    turno = models.ForeignKey(Turno, null=True, blank=True, on_delete=models.CASCADE,
                              help_text="Vacío = ese día no hay turno.")
    inicio = models.TimeField(null=True, blank=True)
    fin = models.TimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.fecha}: {self.turno or 'sin turno'}"
