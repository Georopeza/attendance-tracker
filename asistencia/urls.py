from django.urls import path

from . import views

urlpatterns = [
    path("", views.hoy, name="hoy"),
    path("hoy/tarjetas/", views.hoy_tarjetas, name="hoy_tarjetas"),
    path("hoy/marcar/<int:empleado_id>/", views.marcar, name="marcar"),
    path("hoy/ajustar/<int:empleado_id>/<str:sentido>/", views.ajustar, name="ajustar"),
    path("semana/", views.semana, name="semana"),
    path("semana/desglose/<int:empleado_id>/", views.desglose, name="desglose"),
    path("semana/dia/<int:empleado_id>/<str:fecha>/", views.dia_editar, name="dia_editar"),
]
