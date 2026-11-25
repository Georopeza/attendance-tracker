"""Pruebas del cálculo de horas (módulo puro, sin base de datos)."""
import pytest

from asistencia.horas import Turno, calcular_dia, redondear

GENERAL = [Turno(9 * 60, 16 * 60)]


def m(h, mi=0):
    return h * 60 + mi


def test_ana_va_y_viene_la_hora_antes_del_turno_no_cuenta():
    r = calcular_dia([(m(8), m(11)), (m(14), m(16))], GENERAL)
    assert (r.normales, r.extra_turno, r.antes_turno, r.total) == (m(4), 0, m(1), m(4))
    assert not r.por_revisar


def test_luis_7_38_queda_exacto_y_por_revisar():
    r = calcular_dia([(m(9, 2), m(16, 40))], GENERAL)
    assert r.normales == m(6, 58) and r.extra_turno == 40
    assert r.total_real == m(7, 38) and r.total == m(7, 38) and r.por_revisar


def test_rosa_6_50_sube_a_7():
    r = calcular_dia([(m(9), m(15, 50))], GENERAL)
    assert r.total_real == m(6, 50) and r.total == m(7) and not r.por_revisar


def test_dia_sin_turno_todo_es_extra_sin_turno():
    r = calcular_dia([(m(9), m(14))], [])
    assert (r.normales, r.extra_turno, r.extra_sin_turno, r.total) == (0, 0, m(5), m(5))


def test_turno_hasta_16_30_es_configurable():
    r = calcular_dia([(m(9), m(16, 30))], [Turno(m(9), m(16, 30))])
    assert r.normales == m(7, 30) and r.extra_turno == 0 and r.por_revisar


@pytest.mark.parametrize("minutos,esperado,revisar", [
    (0, 0, False), (15, 0, False), (16, 16, True), (30, 30, True), (44, 44, True),
    (45, 60, False), (59, 60, False), (m(7, 15), m(7), False), (m(7, 45), m(8), False),
])
def test_bordes_del_redondeo(minutos, esperado, revisar):
    assert redondear(minutos) == (esperado, revisar)


def test_tramo_en_curso_o_invertido_no_suma():
    assert calcular_dia([(m(10), m(10))], GENERAL).total == 0
    assert calcular_dia([(m(11), m(10))], GENERAL).total == 0


def test_con_dos_turnos_cada_tramo_se_mide_contra_su_turno():
    turnos = [Turno(m(8), m(12)), Turno(m(14), m(18))]
    r = calcular_dia([(m(8), m(11)), (m(14), m(16))], turnos)
    assert r.normales == m(5) and r.extra_turno == 0
