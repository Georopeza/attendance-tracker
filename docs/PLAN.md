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
- [x] Etapa 1: funcionalidad implementada y con pruebas; falta despliegue (ver `ETAPA_1.md`).
- [ ] Etapa 2.
- [ ] Etapa 3.

## Decisión final: app para el celular (reemplaza a lo anterior)

Un solo usuario, desde el celular (Android y iPhone), sin computador. Se construyó una **PWA** en `app/`:
datos en el teléfono, sin internet, reporte semanal en PDF para compartir, copia de seguridad en archivo.
Se descartaron coordinadores, bitácora y Excel. Pendiente: publicar la carpeta `app/` en un hosting
estático con HTTPS para poder instalarla (el repositorio es privado, así que GitHub Pages gratis no sirve
salvo que se haga público; alternativas: Cloudflare Pages o Netlify).

## Decisión previa: uso local (reemplazada por la app del celular)

El sistema se usará **en un computador local**, sin nube ni hosting. El coordinador comparte la
información exportando el resumen semanal a **Excel y PDF** (con entradas, salidas y totales por persona)
y, si hace falta, pasando una copia de los datos. La exportación pasa a ser la siguiente prioridad.
Pendiente: instalador o acceso directo, copias automáticas, definir sistema operativo y qué significa
"compartir" (reportes o datos completos).

## Hosting gratuito (descartado; se conserva como referencia)

- Supabase es una base de datos PostgreSQL en la nube (no ejecuta Django). Sirve como **base de datos**
  gratuita (500 MB; se pausa si pasa una semana sin actividad; sin copias automáticas en el plan gratis).
- La aplicación Django necesita además un servicio gratuito donde correr: Render (se "duerme" tras
  15 min sin uso y tarda cerca de un minuto en despertar). La base de datos gratuita de Render expira a los
  30 días, por eso se usa Supabase (o Neon) en su lugar.
- Conexión: `DATABASE_URL` apuntando al "session pooler" de Supabase (Render gratis solo tiene IPv4).
- Copias de seguridad: hay que exportar la base periódicamente (tarea pendiente).

## Pendientes de infraestructura

1. Confirmar hosting (propuesta anterior: Render + Supabase, ambos gratuitos).
2. Usuario inicial del coordinador.
3. Dominio propio o el del hosting (el gratuito es del tipo `nombre.onrender.com`).
4. Desarrollo en la rama `ccr-7cfa70cc-z8j2vu`, sin tocar la principal.
