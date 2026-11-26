from django.db import models


def dias_laborables():
    return [0, 1, 2, 3, 4]


DIAS_SEMANA = [(0, "Lunes"), (1, "Martes"), (2, "Miércoles"), (3, "Jueves"), (4, "Viernes"), (5, "Sábado"), (6, "Domingo")]


class Turno(models.Model):
    """Molde de horario. No se asigna a personas: solo sirve para medir las horas."""

    nombre = models.CharField(max_length=60)
    inicio = models.TimeField(default="09:00")
    fin = models.TimeField(default="16:00")
    # Días de la semana en que rige (0 = lunes ... 6 = domingo).
    dias = models.JSONField(default=dias_laborables)
    # Vigencia: un cambio de horario crea una versión nueva; las semanas pasadas no se alteran.
    vigente_desde = models.DateField(null=True, blank=True, help_text="Vacío = desde siempre.")
    vigente_hasta = models.DateField(null=True, blank=True, help_text="Vacío = sin fecha de fin.")

    def rige_en(self, fecha) -> bool:
        return ((self.vigente_desde is None or self.vigente_desde <= fecha)
                and (self.vigente_hasta is None or fecha <= self.vigente_hasta)
                and fecha.weekday() in self.dias)

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
