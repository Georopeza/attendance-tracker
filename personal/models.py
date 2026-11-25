from django.db import models


class Empleado(models.Model):
    """Empleados: nunca se eliminan con historial, se archivan."""

    nombre = models.CharField(max_length=120)
    archivado = models.BooleanField(default=False)
    creado = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["nombre"]

    def __str__(self):
        return self.nombre

    @classmethod
    def activos(cls):
        return cls.objects.filter(archivado=False)
