from django.urls import path

from . import views

urlpatterns = [path("", views.cuadricula, name="disponibilidad")]
