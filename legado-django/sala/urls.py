from django.contrib import admin
from django.contrib.auth import views as auth_views
from django.urls import include, path

from . import views

urlpatterns = [
    path("admin/", admin.site.urls),
    path("acceso/", auth_views.LoginView.as_view(), name="login"),
    path("salir/", auth_views.LogoutView.as_view(), name="logout"),
    path("configuracion/", views.configuracion, name="configuracion"),
    path("empleados/", include("personal.urls")),
    path("turnos/", include("turnos.urls")),
    path("disponibilidad/", include("disponibilidad.urls")),
    path("reportes/", include("reportes.urls")),
    path("bitacora/", include("bitacora.urls")),
    path("coordinadores/", include("cuentas.urls")),
    path("", include("asistencia.urls")),
]
