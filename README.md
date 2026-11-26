# Control de Asistencia

Aplicación para el celular que lleva la **asistencia y las horas** de un equipo, y genera un **PDF semanal**
con la entrada, la salida y el total de cada persona. Pensada para que **una sola persona** la use de forma
rápida y sencilla. Sirve para cualquier grupo: un salón, un taller, una escuela, voluntarios…

- **Funciona sin internet** y se instala como una app (Android e iPhone).
- **Tus datos se quedan en tu teléfono.** No hay servidor, ni cuentas, ni envío de datos a ningún lado.
- **No maneja pagos:** solo horas. El PDF se comparte con quien las gestione.

## Qué hace
- **Hoy:** marcar *Entró / Salió / Volvió* con un toque, o llenar el día al final con una lista. Marcación en bloque.
- **Semana:** total por persona (normales, extra, días asistidos), desglose día por día, promedio del equipo,
  cierre de semana con versiones y corrección de días con motivo.
- **Horas:** dentro del turno son normales; después del fin del turno, extra; sin turno, todo es extra.
  El total del día se redondea a 15 minutos (los casos intermedios se marcan *por revisar*).
- **Personas, turnos y disponibilidad** (con vigencias por fecha), y una **sugerencia** de quién debería venir
  según las horas de la semana, con registro de a quién se avisó.
- **Copia de seguridad** en un archivo, **ajustes** (nombre y zona horaria) y **PDF** para compartir.

## Usarla
Abre la dirección publicada en el teléfono y elige **Agregar a pantalla de inicio**
(Chrome en Android; Safari → Compartir en iPhone). Después abre la app desde su ícono.

## Estructura
| Carpeta | Contenido |
|---|---|
| [`docs/`](docs/LEEME.md) | La app (sitio estático que publica GitHub Pages) |
| `pruebas/` | Pruebas de la lógica y una prueba de punta a punta en un celular simulado |
| `frontend/` | Compilación de los estilos |
| `documentacion/` | Requisitos, plan y decisiones |
| `legado-django/` | Primera versión (computador/nube), solo como referencia |

## Desarrollo
```bash
node --test pruebas/*.test.js            # lógica
cd docs && python3 -m http.server 8780   # servir la app; luego: node pruebas/e2e-movil.cjs
frontend/construir.sh                    # recompilar estilos tras cambiar clases
```
Al cambiar archivos de la app, sube la `VERSION` de `docs/sw.js` para que los teléfonos se actualicen.

## Licencia
[MIT](LICENSE): puedes usar, copiar, modificar y compartir este software, también en tu negocio, siempre que
conserves el aviso de la licencia. Se ofrece "tal cual", sin garantías. Las bibliotecas incluidas en
`docs/vendor/` (jsPDF y jsPDF-AutoTable) también son MIT; ver `docs/vendor/LICENCIAS.txt`.
