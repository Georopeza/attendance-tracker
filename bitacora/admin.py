from django.contrib import admin

from .models import Registro


@admin.register(Registro)
class RegistroAdmin(admin.ModelAdmin):
    list_display = ("creado", "usuario", "entidad", "accion", "motivo")
    list_filter = ("entidad", "accion")
    readonly_fields = [f.name for f in Registro._meta.fields]

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False
