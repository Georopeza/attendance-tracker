from django.urls import path

from . import views

urlpatterns = [path("semana.<str:formato>", views.semana, name="reporte_semana")]
