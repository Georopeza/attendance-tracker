from django.urls import path

from . import views

urlpatterns = [
    path("", views.cuadricula, name="disponibilidad"),
    path("<int:empleado_id>/", views.ficha, name="disponibilidad_ficha"),
    path("<int:empleado_id>/franja/", views.franja_agregar, name="franja_agregar"),
    path("<int:empleado_id>/copiar/", views.copiar, name="disponibilidad_copiar"),
    path("<int:empleado_id>/vigencia/", views.nueva_vigencia, name="disponibilidad_vigencia"),
    path("franja/<int:pk>/quitar/", views.franja_quitar, name="franja_quitar"),
]
