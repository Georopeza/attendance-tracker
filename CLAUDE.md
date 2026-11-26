# Sala Tricolor: contexto para sesiones de desarrollo

Sistema de control de asistencia y horas para una coordinación (6 empleados, varios coordinadores).
**No maneja pagos**: solo horas, que se entregan a un ente superior.

Lee antes de tocar nada: `docs/REQUISITOS.md` (qué se pidió y qué está decidido), `docs/PLAN.md`
(etapas) y `docs/ETAPA_1.md` (seguimiento). La maqueta de las pantallas está en
`docs/maqueta/maquetas.html` (ábrela en el navegador): es la referencia visual.

## Reglas que no se deben romper

- Idioma de la interfaz y mensajes: **español**.
- Los empleados **no tienen acceso**. No hay asignación de turnos a personas. Todos los coordinadores
  son iguales.
- Horas guardadas en UTC, mostradas en `America/Caracas`.
- El cálculo de horas vive solo en `asistencia/horas.py` (módulo puro). Cualquier cambio de regla se
  cambia ahí y con pruebas. Los totales del día **no se guardan**, se calculan desde los tramos.
- Redondeo sobre el total del día: 0–15 baja, 45–59 sube, 16–44 exacto y "por revisar".
- Antes del inicio del turno no cuenta; día sin turno = todo extra de día sin turno (otro color).
- **Archivar, no eliminar** empleados con historial. Confirmación antes de archivar/borrar.
- Todo cambio de datos se registra en la bitácora (`bitacora.models.registrar`).
- Colores de horas: normales verde azulado, extra tras turno azul, extra día sin turno violeta,
  "por revisar" ámbar.

## Principio de diseño: rápido y simple

El uso diario es **marcar y listo**. La pantalla Hoy es la principal y debe seguir simple:
- Tarjeta = nombre, estado y un botón grande (Entró / Salió / Volvió). Correcciones, horas y avisos van
  escondidos en "Detalle y correcciones"; los cálculos se ven en el resumen semanal.
- Dos formas de marcar, ambas disponibles: **en el momento** (un toque) y **al final del día**
  (lista con casillas y el horario del turno ya puesto, un solo guardar).
- Menú mínimo: Hoy, Semana, Configuración. Lo que se toca poco vive en Configuración.
- No agregar elementos a la tarjeta ni al menú principal sin pedirlo.

## Comandos

```bash
python manage.py migrate
python manage.py cargar_ejemplo     # datos de ejemplo
python manage.py runserver
pytest                              # debe pasar siempre antes de commitear
```

## Flujo de trabajo

- Rama de desarrollo: `ccr-7cfa70cc-z8j2vu`. No tocar la principal ni abrir PR sin que se pida.
- Mantén `docs/ETAPA_1.md` al día al terminar cada pieza.
