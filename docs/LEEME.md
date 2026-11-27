# Control de Asistencia (app para el celular)

Aplicación web instalable (PWA) para llevar la asistencia y las horas. Funciona sin internet y
**todos los datos se guardan solo en el teléfono**. No hay servidor ni cuentas.

## Qué incluye
Hoy (marcar en el momento o al final del día), resumen semanal y mensual con desglose, cierre de semana,
corrección de días, personas, turnos, disponibilidad, registro de visitas con recorridos (opcional), sugerencia de quién debería venir, informes semanales y mensuales
en PDF y Excel (compartir o descargar) y copia de seguridad.

## Probarla en un computador
```bash
cd docs && python3 -m http.server 8080      # luego abrir http://localhost:8080
node --test pruebas/*.test.js              # pruebas de la lógica (desde la raíz del repositorio)
```

## Publicarla (para instalarla en el teléfono)
Hay que servir la carpeta `docs/` desde cualquier hosting de archivos estáticos con HTTPS
(Cloudflare Pages, Netlify, GitHub Pages...). Directorio de publicación: `docs`. Sin paso de compilación.
Después, en el teléfono: abrir el enlace → "Agregar a pantalla de inicio".

## Si se cambia el código
- Estilos: `frontend/construir.sh` (Tailwind compilado a `docs/css/app.css`).
- Subir el número `VERSION` de `docs/sw.js` para que los teléfonos descarguen la versión nueva.

## Datos
Se guardan en el almacenamiento del navegador del teléfono (clave `asistencia:v1`). La pantalla
**Más → Copia de seguridad** exporta e importa un archivo `.json`.
