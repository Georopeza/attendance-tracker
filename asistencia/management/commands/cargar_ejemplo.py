"""Datos de ejemplo para probar el esqueleto: python manage.py cargar_ejemplo"""
from datetime import date, datetime, time, timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from asistencia.models import Tramo
from disponibilidad.models import Disponibilidad
from personal.models import Empleado
from turnos.models import Turno


class Command(BaseCommand):
    def handle(self, *args, **opts):
        Turno.objects.get_or_create(nombre="General", defaults={"inicio": time(9), "fin": time(16)})
        nombres = ["Ana Pérez", "Luis Mora", "María Rojas", "Carlos Díaz", "Rosa Linares", "José Silva"]
        emps = [Empleado.objects.get_or_create(nombre=n)[0] for n in nombres]
        vigente = date.today() - timedelta(days=7)
        for emp, dias in zip(emps, ([0, 1, 2], [0, 1, 2, 3, 4], [1, 2, 3], [0, 3, 4], [0, 1, 2, 3, 4], [4, 5, 6])):
            for d in dias:
                Disponibilidad.objects.get_or_create(empleado=emp, dia=d, vigente_desde=vigente,
                                                     defaults={"desde": time(9), "hasta": time(16)})
        tz = timezone.get_current_timezone()
        ayer = timezone.localdate() - timedelta(days=1)
        if not Tramo.objects.exists():
            for emp, (a, b) in zip(emps[:3], [((8, 0), (11, 0)), ((9, 2), (16, 40)), ((9, 0), (15, 50))]):
                Tramo.objects.create(
                    empleado=emp,
                    entrada=timezone.make_aware(datetime.combine(ayer, time(*a)), tz),
                    salida=timezone.make_aware(datetime.combine(ayer, time(*b)), tz))
        self.stdout.write("Datos de ejemplo cargados.")
