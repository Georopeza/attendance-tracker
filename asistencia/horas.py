"""Cálculo de horas de un día. Módulo puro: no toca la base de datos ni las pantallas.

Todo se maneja en minutos desde la medianoche (hora de Venezuela).

Reglas:
  - Dentro de un turno: horas normales.
  - Después del fin del último turno: extra tras turno.
  - Antes del inicio del primer turno (o entre turnos): no cuenta.
  - Día sin turnos: todo es extra de día sin turno.
  - Redondeo sobre el total del día: 0-15 min baja, 45-59 sube, 16-44 queda
    exacto y se marca "por revisar" para que la coordinación decida.
"""
from dataclasses import dataclass
from typing import Sequence

MINUTOS_DIA = 24 * 60


@dataclass(frozen=True)
class Turno:
    inicio: int
    fin: int


@dataclass(frozen=True)
class ResumenDia:
    normales: int = 0
    extra_turno: int = 0
    extra_sin_turno: int = 0
    antes_turno: int = 0       # informativo: no cuenta
    total_real: int = 0        # normales + extras, sin redondear
    total: int = 0             # total del día redondeado
    por_revisar: bool = False


def _solape(a: int, b: int, c: int, d: int) -> int:
    return max(0, min(b, d) - max(a, c))


def redondear(total: int) -> tuple[int, bool]:
    """Devuelve (total redondeado, por_revisar)."""
    resto = total % 60
    base = total - resto
    if resto <= 15:
        return base, False
    if resto >= 45:
        return base + 60, False
    return total, True


def calcular_dia(tramos: Sequence[tuple[int, int]], turnos: Sequence[Turno]) -> ResumenDia:
    """tramos: pares (entrada, salida) en minutos. Con varios turnos, cada tramo
    se mide contra el turno en el que cae."""
    normales = extra_turno = extra_sin = antes = 0
    fin_ultimo = max((t.fin for t in turnos), default=None)
    inicio_primero = min((t.inicio for t in turnos), default=None)

    for entrada, salida in tramos:
        if salida <= entrada:
            continue
        if not turnos:
            extra_sin += salida - entrada
            continue
        normales += sum(_solape(entrada, salida, t.inicio, t.fin) for t in turnos)
        extra_turno += _solape(entrada, salida, fin_ultimo, MINUTOS_DIA)
        antes += _solape(entrada, salida, 0, inicio_primero)

    total_real = normales + extra_turno + extra_sin
    total, revisar = redondear(total_real)
    return ResumenDia(normales, extra_turno, extra_sin, antes, total_real, total, revisar)


def hhmm(minutos: int) -> str:
    return f"{minutos // 60}:{minutos % 60:02d}"
