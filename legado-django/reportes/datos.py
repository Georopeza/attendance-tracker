"""Datos del reporte semanal: por empleado, cada día con sus entradas y salidas, y el total.

Solo horas: el reporte no maneja pagos. Es lo que se entrega al ente superior.
"""
from dataclasses import dataclass, field
from datetime import date, timedelta

from django.utils import timezone

from asistencia import services
from personal.models import Empleado
from turnos.services import turnos_del_dia

DIAS_LARGOS = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"]


@dataclass
class DiaReporte:
    fecha: date
    marcas: list            # [(entrada 'HH:MM', salida 'HH:MM' o '' si sigue presente)]
    normales: int = 0
    extra_turno: int = 0
    extra_sin_turno: int = 0
    total: int = 0          # total del día, ya redondeado
    por_revisar: bool = False
    sin_turno: bool = False

    @property
    def nombre(self):
        return DIAS_LARGOS[self.fecha.weekday()]

    @property
    def asistio(self):
        return bool(self.marcas)


@dataclass
class EmpleadoReporte:
    nombre: str
    dias: list = field(default_factory=list)

    def suma(self, campo):
        return sum(getattr(d, campo) for d in self.dias)

    @property
    def dias_asistidos(self):
        return sum(1 for d in self.dias if d.asistio)

    @property
    def total(self):
        return self.suma("total")

    @property
    def por_revisar(self):
        return sum(1 for d in self.dias if d.por_revisar)


@dataclass
class ReporteSemana:
    lunes: date
    empleados: list
    turno_texto: str
    generado: str

    @property
    def domingo(self):
        return self.lunes + timedelta(days=6)

    @property
    def total_equipo(self):
        return sum(e.total for e in self.empleados)


def _hhmm(dt):
    return f"{timezone.localtime(dt):%H:%M}"


def reporte_semana(lunes: date) -> ReporteSemana:
    lunes = services.lunes_de(lunes)
    empleados = []
    for emp in Empleado.activos():
        er = EmpleadoReporte(emp.nombre)
        for d in services.desglose_semana(emp, lunes):
            r = d["resumen"]
            er.dias.append(DiaReporte(
                fecha=d["fecha"],
                marcas=[(_hhmm(t.entrada), _hhmm(t.salida) if t.salida else "") for t in d["tramos"]],
                normales=r.normales, extra_turno=r.extra_turno, extra_sin_turno=r.extra_sin_turno,
                total=r.total, por_revisar=r.por_revisar, sin_turno=d["sin_turno"]))
        empleados.append(er)
    turnos = turnos_del_dia(lunes)
    turno_texto = (f"Turno {min(t.inicio for t in turnos) // 60}:{min(t.inicio for t in turnos) % 60:02d}"
                   f" a {max(t.fin for t in turnos) // 60}:{max(t.fin for t in turnos) % 60:02d}, de lunes a viernes"
                   if turnos else "Sin turno definido")
    return ReporteSemana(lunes, empleados, turno_texto, f"{timezone.localtime():%d/%m/%Y %H:%M}")


def hhmm(minutos: int) -> str:
    return f"{minutos // 60}:{minutos % 60:02d}"


NOTAS = [
    "Las horas normales son las trabajadas dentro del turno. Las extra son las posteriores al fin del turno.",
    "Lo trabajado antes del inicio del turno no se cuenta.",
    "En los días sin turno (sábado y domingo) todas las horas se cuentan como extra.",
    "El total de cada día se redondea: de 0 a 15 min se baja a la hora, de 45 a 59 min se sube. "
    "De 16 a 44 min queda exacto (marcado con *).",
]
