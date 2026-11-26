from django.urls import path

from . import views

urlpatterns = [
    path("", views.lista, name="empleados"),
    path("nuevo/", views.crear, name="empleado_nuevo"),
    path("<int:pk>/editar/", views.editar, name="empleado_editar"),
    path("<int:pk>/archivar/", views.archivar, name="empleado_archivar"),
    path("<int:pk>/reactivar/", views.reactivar, name="empleado_reactivar"),
    path("<int:pk>/eliminar/", views.eliminar, name="empleado_eliminar"),
]
