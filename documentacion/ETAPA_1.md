# Etapa 1: seguimiento (versión Django, histórica)

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

## Hecho (implementación)

- [x] Menú y navegación; plantilla base con Tailwind y HTMX (por CDN).
- [x] Empleados: lista, agregar, editar, archivar con confirmación, reactivar, eliminar solo sin horas.
- [x] Turnos: lista, calendario semanal, excepciones por fecha, cambio de horario con vigencia, baja.
- [x] Disponibilidad: ficha editable, varias franjas por día, validación de cruces, copiar de otro
  empleado, nueva vigencia e historial de vigencias.
- [x] Hoy: marcación en bloque, deshacer, día sin turno, navegar a días pasados, corregir el día
  (agregar, editar y quitar tramos).
- [x] Hoy simplificado: tarjeta mínima, dos modos de marcar (en el momento y al final del día), menú
  reducido a Hoy / Semana / Configuración.
- [x] Bitácora: pantalla de consulta con filtro por entidad.
- [x] Coordinadores: crear y desactivar accesos.
- [x] Preparado para la nube: `Procfile`, `build.sh`, ajustes de seguridad con `DEBUG=0`.

## Por hacer

- [ ] Despliegue en la nube con HTTPS (falta decidir hosting, dominio y usuario inicial).
- [x] Estilos compilados y servidos desde el propio sitio (`frontend/construir.sh`), sin CDN.
- [ ] Revisión del diseño por la coordinación y ajustes.
- [ ] Prueba de dos coordinadores a la vez en dispositivos reales.

## Criterios de aceptación

- Dos coordinadores en dispositivos distintos marcan al mismo tiempo y ven los cambios sin recargar.
- Los casos del cálculo de horas dan los resultados esperados en las pruebas automáticas.
- Se puede agregar, editar y archivar un empleado sin perder su historial.
- Cada cambio aparece en la bitácora.
- Todo se usa bien desde un celular.
