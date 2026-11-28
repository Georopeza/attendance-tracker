# Control de Asistencia: contexto para sesiones de desarrollo

Sistema **genérico** de control de asistencia y horas (nació para un equipo de 6 personas, pero no está atado
a ningún lugar): **una sola persona lo usa, desde el celular**. No lleva marca ni nombres propios en el código.
**No maneja pagos**: solo horas, que se entregan a un ente superior.

## Estado actual (importante)

La aplicación vigente es la **PWA del celular en `docs/`** (la carpeta se llama así porque GitHub Pages solo
publica la raíz o `/docs`) (JavaScript sin servidor; datos en el teléfono;
sin internet; PDF generado en el teléfono). El proyecto Django en `legado-django/`
fue la primera versión (computador/nube) y queda **solo como referencia**; no se sigue desarrollando.
Decisiones del coordinador: un solo usuario, sin coordinadores ni bitácora, sin nube, móvil (Android y
iPhone), informes en PDF y Excel. Se mantiene: disponibilidad, sugerencia con registro
de avisos, cierre de semana con versiones y motivo, copia de seguridad.

Lógica en `docs/js/`: `horas.js` (cálculo puro), `acciones.js` (cambios), `servicios.js` (consultas),
`vistas.js` (pantallas), `pdf.js`, `excel.js` (Excel de horas) y el módulo de visitas: `visitas.js` (lógica pura),
`visitas-vistas.js` (pantallas), `visitas-informes.js` (PDF y Excel de visitas), `atomos.js` (piezas visuales). Pruebas: `node --test pruebas/*.test.js`. Prueba de punta a punta en un
celular simulado: `pruebas/e2e-movil.cjs` y `pruebas/e2e-visitas.cjs` (Playwright; servir `docs/` en el puerto 8780). Ver `docs/LEEME.md`.

Lee antes de tocar nada: `documentacion/REQUISITOS.md` (qué se pidió y qué está decidido) y
`documentacion/PLAN.md` (recorrido del proyecto).

## Reglas que no se deben romper

- Idioma de la interfaz y mensajes: **español**.
- Las personas registradas **no usan** la app. No hay asignación de turnos a personas. Una sola persona la usa.
- Las horas se guardan como minutos del día en la **zona horaria elegida en Ajustes** (por defecto la del teléfono); "hoy" y "ahora" salen de esa zona.
- **Genérico:** no poner nombres de lugares, marcas ni banderas en el código, la interfaz ni los textos. Se dice "personas", no "empleados"; "responsable", no "coordinador".
- El cálculo de horas vive solo en `docs/js/horas.js` (módulo puro; `legado-django/asistencia/horas.py` es su equivalente de referencia). Cualquier cambio de regla se
  cambia ahí y con pruebas. Los totales del día **no se guardan**, se calculan desde los tramos.
- Redondeo sobre el total del día: 0–15 baja, 45–59 sube, 16–44 exacto y "por revisar".
- Antes del inicio del turno no cuenta; día sin turno = todo extra de día sin turno (otro color).
- **Archivar, no eliminar** empleados con historial. Confirmación antes de archivar/borrar.
- No hay bitácora de cambios (se descartó). Las correcciones en semanas cerradas guardan su motivo.
- Las duraciones se muestran en palabras (`hTxt`/`difTxt` en `horas.js`: "7 h 38 min"), nunca como `7:38`; las horas del reloj sí van como `09:02`. La app no ofrece datos de ejemplo: solo las pruebas los cargan (`docs/js/ejemplo.js`).
- Colores de horas: normales verde azulado, extra tras turno azul, extra día sin turno violeta,
  "por revisar" ámbar.

## Módulo de visitas (opcional)

Viene **encendido por defecto** y se puede apagar en Ajustes (`visitas.elegido` distingue si alguien lo decidió; si nadie lo eligió rige el valor de fábrica). Agrega la pestaña Visitas (ver `documentacion/REQUISITOS.md`, sección 11). Reglas: toda
visita se anota (con o sin recorrido); un recorrido puede juntar varios grupos; el guía sale de la lista de
personas; tipos de visitante, grupos de edad y extras son **configurables** (no escribir "museo", "escuela"
ni rangos fijos en el código: los valores por defecto viven en `visitasPorDefecto()` de `store.js`). Validar
todo antes de crear nombres o recorridos (no dejar efectos si hay error). Probar con `pruebas/visitas.test.js`,
`pruebas/excel.test.js` y `pruebas/e2e-visitas.cjs`.

## Principio de diseño: rápido y simple

El uso diario es **marcar y listo**. La pantalla Hoy es la principal y debe seguir simple:
- Tarjeta = nombre, estado, un botón grande (Entró / Salió / Volvió) y debajo uno pequeño para marcar a otra
  hora ("Marcar hora de entrada / salida / regreso", para cuando se olvidó marcar en el momento; no acepta
  horas futuras). Correcciones, horas y avisos van escondidos en "Detalle y correcciones" (incluye "Cambiar
  hora exacta"); los cálculos se ven en el resumen semanal.
- Marcar a varias personas: botones "Todos los que faltan entraron / Todos los presentes salieron" (a la hora del turno, que se ve en el botón) y **"Elegir personas…"**: casillas, una hora común y "Entraron / Salieron" (`marcarVarios` en `acciones.js`).
- **Tablets:** las pantallas de uso diario (Hoy, Semana, Mes) usan `ancho: true` en `RUTAS` y cuadrícula (`md:grid-cols-2 xl:grid-cols-3`) con botones de 48px; en teléfono, una columna con botones de 56px. Se comprueba con `pruebas/e2e-tablet.cjs`.
- **Semanas pasadas:** Semana → "Registrar o corregir las horas de esta semana" (`editar-semana.js`, borrador + `guardarSemana`, todo o nada; en semanas entregadas pide motivo). Probar con `pruebas/e2e-semana-pasada.cjs`.
- Dos formas de marcar, ambas disponibles: **en el momento** (un toque) y **al final del día**
  (lista con casillas y el horario del turno ya puesto, un solo guardar).
- Menú mínimo: Hoy, Semana, Configuración. Lo que se toca poco vive en Configuración.
- No agregar elementos a la tarjeta ni al menú principal sin pedirlo.

## Comandos

PWA: `node --test pruebas/*.test.js` y `frontend/construir.sh` (estilos). Subir `VERSION` en `docs/sw.js` al cambiar la app (el botón Más → "Buscar y actualizar" compara esa versión con la de internet; `pruebas/e2e-actualizar.cjs` lo comprueba). El service worker deja pasar directo a internet cualquier petición con `?red`.
Versión Django (referencia, dentro de `legado-django/`):

```bash
python manage.py migrate
python manage.py cargar_ejemplo     # datos de ejemplo
python manage.py runserver
pytest                              # debe pasar siempre antes de commitear
```

## Flujo de trabajo

- Rama de desarrollo: `ccr-7cfa70cc-z8j2vu`. No tocar la principal ni abrir PR sin que se pida.
- Al cambiar reglas o decisiones, actualiza `documentacion/REQUISITOS.md`.
