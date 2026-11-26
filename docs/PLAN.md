# Plan de desarrollo

## Stack

**Django + PostgreSQL + HTMX + Tailwind**, pytest. En la nube con HTTPS y copias de seguridad.
Local: SQLite sin configurar. Nube: `DATABASE_URL`, `SECRET_KEY`, `DEBUG=0`, `ALLOWED_HOSTS`,
`CSRF_TRUSTED_ORIGINS`.

Apps: `personal`, `turnos`, `disponibilidad`, `asistencia` (con `horas.py`, cálculo puro), `bitacora`.
Los totales del día nunca se guardan: se calculan desde los tramos, así una corrección siempre se refleja.

## Etapas

1. **Base**: login, empleados (CRUD con archivar), turnos y excepciones, disponibilidad (cuadrícula y
   ficha), pantalla Hoy (tramos, ±15 min, marcación en bloque, historial del día), cálculo de horas,
   tiempo real, bitácora y validaciones.
2. **Equilibrio**: resumen semanal con promedio, desglose por empleado con corrección de día,
   sugerencia y registro de avisos.
3. **Reportes**: cierre de semana con versiones, historial, Excel y PDF semanal y mensual.

## Estado

- [x] Esqueleto: modelos, cálculo de horas con pruebas, Hoy, resumen semanal, desglose y corrección de día.
- [ ] Etapa 1 completa (ver `ETAPA_1.md`).
- [ ] Etapa 2.
- [ ] Etapa 3.

## Pendientes de infraestructura

1. Hosting (propuesta: Render o Railway).
2. Usuario inicial del coordinador.
3. Dominio propio o el del hosting.
4. Desarrollo en la rama `ccr-7cfa70cc-z8j2vu`, sin tocar la principal.
