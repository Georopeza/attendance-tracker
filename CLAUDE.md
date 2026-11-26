# Sala Tricolor: contexto para sesiones de desarrollo

Sistema de control de asistencia y horas (6 empleados, **una sola persona lo usa, desde el celular**).
**No maneja pagos**: solo horas, que se entregan a un ente superior.

## Estado actual (importante)

La aplicación vigente es la **PWA del celular en `app/`** (JavaScript sin servidor; datos en el teléfono;
sin internet; PDF generado en el teléfono). El proyecto Django de la raíz (`asistencia/`, `turnos/`, etc.)
fue la primera versión (computador/nube) y queda **solo como referencia**; no se sigue desarrollando.
Decisiones del coordinador: un solo usuario, sin coordinadores ni bitácora, sin nube, móvil (Android y
iPhone), reporte en PDF (Excel descartado por ahora). Se mantiene: disponibilidad, sugerencia con registro
de avisos, cierre de semana con versiones y motivo, copia de seguridad.

Lógica en `app/js/`: `horas.js` (cálculo puro), `acciones.js` (cambios), `servicios.js` (consultas),
`vistas.js` (pantallas), `pdf.js`. Pruebas: `node --test pruebas/*.test.js`. Prueba de punta a punta en un
celular simulado:  (Playwright; servir  en el puerto 8780). Ver `app/LEEME.md`.

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

PWA: `node --test pruebas/*.test.js` y `frontend/construir-app.sh` (estilos).
Versión Django (referencia):

```bash
python manage.py migrate
python manage.py cargar_ejemplo     # datos de ejemplo
python manage.py runserver
pytest                              # debe pasar siempre antes de commitear
```

## Flujo de trabajo

- Rama de desarrollo: `ccr-7cfa70cc-z8j2vu`. No tocar la principal ni abrir PR sin que se pida.
- Mantén `docs/ETAPA_1.md` al día al terminar cada pieza.
