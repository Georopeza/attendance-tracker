from django.contrib import admin

from .models import Empleado


@admin.register(Empleado)
class EmpleadoAdmin(admin.ModelAdmin):
    list_display = ("nombre", "archivado")
    list_filter = ("archivado",)
