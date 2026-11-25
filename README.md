# Sala Tricolor

Control de asistencia y horas para la coordinación. No maneja pagos: solo horas.

> **Estado: esqueleto.** Muestra cómo se implementarán las pantallas y el cálculo de horas.
> Falta para la versión final: CRUD completo de empleados y turnos en pantallas propias,
> ficha de disponibilidad editable, marcación en bloque, cierre de semana, Excel/PDF y despliegue.

## Estructura

| App | Contenido |
|---|---|
| `asistencia/horas.py` | Cálculo de horas del día (módulo puro, sin base de datos) |
| `asistencia/` | Tramos de entrada/salida, pantalla **Hoy**, resumen semanal, desglose y corrección de día |
| `turnos/` | Turno (molde) y excepciones por fecha |
| `disponibilidad/` | Franjas por empleado y día, cuadrícula del equipo |
| `personal/` | Empleados (se archivan, no se eliminan) |
| `bitacora/` | Registro de quién cambió qué, antes y después, con motivo |

## Reglas de horas (`asistencia/horas.py`)

- Dentro del turno: normales. Después del fin del turno: extra. Antes del inicio: no cuenta.
- Día sin turno (p. ej. sábado/domingo): todo es extra de día sin turno.
- Redondeo sobre el total del día: 0–15 min baja, 45–59 sube, 16–44 queda exacto y se marca *por revisar*.
- Horas guardadas en UTC, mostradas en hora de Venezuela (`America/Caracas`).

## Cómo probarlo en local

```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py cargar_ejemplo          # 6 empleados de ejemplo
python manage.py createsuperuser         # tu usuario de coordinador
python manage.py runserver
pytest                                   # pruebas
```

En la nube: definir `DATABASE_URL` (PostgreSQL), `SECRET_KEY`, `DEBUG=0`, `ALLOWED_HOSTS`
y `CSRF_TRUSTED_ORIGINS`.
