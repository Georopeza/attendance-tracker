from django.urls import path

from . import views

urlpatterns = [
    path("", views.lista, name="turnos"),
    path("nuevo/", views.crear, name="turno_nuevo"),
    path("<int:pk>/cambiar/", views.cambiar, name="turno_cambiar"),
    path("<int:pk>/baja/", views.dar_de_baja, name="turno_baja"),
    path("excepciones/nueva/", views.excepcion_nueva, name="excepcion_nueva"),
    path("excepciones/<int:pk>/eliminar/", views.excepcion_eliminar, name="excepcion_eliminar"),
]
