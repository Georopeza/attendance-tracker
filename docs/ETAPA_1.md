# Etapa 1: seguimiento

Objetivo: que la coordinación, desde la nube y con varios coordinadores a la vez, pueda iniciar sesión,
gestionar empleados, turnos y disponibilidad, marcar entradas y salidas con el cálculo de horas correcto,
verlo en tiempo real y dejar todo en bitácora.

## Hecho (esqueleto)

- [x] Proyecto Django, SQLite local / PostgreSQL por `DATABASE_URL`, zona horaria de Venezuela.
- [x] Modelos: Empleado, Turno, ExcepcionTurno, Disponibilidad, Tramo, Registro (bitácora).
- [x] `asistencia/horas.py` con pruebas (ejemplos de la maqueta, bordes del redondeo, varios turnos).
- [x] Hoy: tarjetas con HTMX, Entró/Salió, ±15 min, actualización cada 5 s.
- [x] Resumen semanal, desglose por empleado y corrección de día (adelantado de la etapa 2).
- [x] Cuadrícula de disponibilidad (solo lectura).

## Por hacer

- [ ] Menú y diseño final de pantallas (según `docs/maqueta/maquetas.html`).
- [ ] Empleados: lista, agregar, editar, archivar con confirmación, reactivar.
- [ ] Turnos: molde, calendario semanal, excepciones por fecha (pantallas propias).
- [ ] Disponibilidad: ficha editable, varias franjas, copiar de otro empleado, vigencia.
- [ ] Hoy: marcación en bloque, deshacer, día sin turno, navegar a días pasados.
- [ ] Bitácora: pantalla de consulta con filtros.
- [ ] Coordinadores: crear y desactivar accesos.
- [ ] Despliegue en la nube con HTTPS.

## Criterios de aceptación

- Dos coordinadores en dispositivos distintos marcan al mismo tiempo y ven los cambios sin recargar.
- Los casos del cálculo de horas dan los resultados esperados en las pruebas automáticas.
- Se puede agregar, editar y archivar un empleado sin perder su historial.
- Cada cambio aparece en la bitácora.
- Todo se usa bien desde un celular.
