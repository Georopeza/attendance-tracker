from django.contrib import admin

from .models import Disponibilidad


@admin.register(Disponibilidad)
class DisponibilidadAdmin(admin.ModelAdmin):
    list_display = ("empleado", "dia", "desde", "hasta", "vigente_desde")
    list_filter = ("empleado", "dia")
