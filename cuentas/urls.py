from django.urls import path

from . import views

urlpatterns = [
    path("", views.lista, name="coordinadores"),
    path("nuevo/", views.crear, name="coordinador_nuevo"),
    path("<int:pk>/activo/<str:activo>/", views.activar, name="coordinador_activar"),
]
